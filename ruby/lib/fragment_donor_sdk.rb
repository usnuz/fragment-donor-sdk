# frozen_string_literal: true

require "json"
require "net/http"
require "time"
require "uri"

module FragmentDonor
  VERSION = "0.1.0"
  DEFAULT_BASE_URL = "https://fragment.donor.uz"

  class Error < StandardError
    attr_reader :status, :code, :retry_after, :details

    def initialize(message, status: nil, code: nil, retry_after: nil, details: nil)
      super(message)
      @status, @code, @retry_after = status, code, retry_after
      @details = details
    end
  end

  class ValidationError < Error; end
  class APIError < Error; end
  class RateLimitError < APIError; end
  class UnavailableError < APIError; end
  class TimeoutError < Error; end
  class NetworkError < Error; end
  class MalformedResponseError < Error; end

  class Credentials
    attr_reader :mnemonic, :cookie, :wallet_version, :wallet_address, :provider_key, :proxy, :user_agent

    def initialize(mnemonic: nil, cookie: nil, wallet_version: "auto", wallet_address: nil, provider_key: nil, proxy: nil, user_agent: nil)
      @mnemonic, @cookie, @wallet_version, @wallet_address = mnemonic, cookie, wallet_version, wallet_address
      @provider_key, @proxy, @user_agent = provider_key, proxy, user_agent
      freeze
    end

    def inspect = "#<FragmentDonor::Credentials [REDACTED]>"
    alias to_s inspect
    def to_json(*) = { credentials: "[REDACTED]" }.to_json
  end

  # Unknown fields remain in extra; decimal balances remain String values.
  UserInfo = Struct.new(:ok, :username, :is_premium, :extra, keyword_init: true) do
    def inspect = "#<FragmentDonor::UserInfo response=[REDACTED]>"
    alias to_s inspect
  end
  Purchase = Struct.new(:ok, :data, :extra, keyword_init: true) do
    def inspect = "#<FragmentDonor::Purchase response=[REDACTED]>"
    alias to_s inspect
  end
  WalletBalance = Struct.new(:ok, :address, :ton, :usdt_ton, :extra, keyword_init: true) do
    def inspect = "#<FragmentDonor::WalletBalance response=[REDACTED]>"
    alias to_s inspect
  end

  Request = Struct.new(:method, :url, :headers, :body, keyword_init: true) do
    def inspect = "#<FragmentDonor::Request #{method} [REDACTED]>"
    alias to_s inspect
  end
  HTTPResponse = Struct.new(:status, :headers, :body, keyword_init: true)

  class NetHTTPTransport
    def initialize(connect_timeout:, request_timeout:)
      @connect_timeout, @request_timeout = connect_timeout, request_timeout
    end

    def call(request)
      uri = URI(request.url)
      # nil disables ambient proxy discovery. Proxy header is a Fragment provider
      # parameter, not a proxy for transmitting wallet credentials to this API.
      http = Net::HTTP.new(uri.host, uri.port, nil)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = @connect_timeout
      http.read_timeout = @request_timeout
      http.write_timeout = @request_timeout
      http.max_retries = 0 # SDK alone decides bounded GET retry; never hidden POST retry.
      klass = request.method == "GET" ? Net::HTTP::Get : Net::HTTP::Post
      http_request = klass.new(uri.request_uri, request.headers)
      http_request.body = request.body if request.body
      response = http.request(http_request)
      # Net::HTTP does not follow Location. Never implement implicit redirects.
      HTTPResponse.new(status: response.code.to_i, headers: response.each_header.to_h, body: response.body.to_s)
    end

    def inspect = "#<FragmentDonor::NetHTTPTransport>"
  end

  class Client
    USERNAME = /\A@?[A-Za-z][A-Za-z0-9_]{3,31}\z/
    WALLET_VERSIONS = %w[auto v5r1 v4r2 v3r2].freeze
    PAYMENT_METHODS = %w[usdt_ton ton].freeze

    def initialize(base_url: DEFAULT_BASE_URL, credentials: Credentials.new, connect_timeout: 5, request_timeout: 30,
                   read_retries: 0, automatic_wait: false, max_wait: 60, transport: nil, sleeper: nil, clock: nil, allow_local_http: false)
      @base = URI(base_url)
      loopback = %w[localhost 127.0.0.1 ::1].include?(@base.host)
      valid_scheme = @base.scheme == "https" || (allow_local_http && @base.scheme == "http" && loopback)
      unless valid_scheme && @base.host && !@base.userinfo && !@base.query && !@base.fragment
        raise ValidationError, "HTTPS base URL without credentials/query is required"
      end
      valid_timeout = ->(value) { value.is_a?(Numeric) && value.respond_to?(:finite?) && value.finite? && value.respond_to?(:positive?) && value.positive? }
      unless read_retries.is_a?(Integer) && (0..2).cover?(read_retries) && valid_timeout.call(connect_timeout) && valid_timeout.call(request_timeout) && valid_timeout.call(max_wait) && max_wait <= 60
        raise ValidationError, "Invalid retry/timeout configuration"
      end
      @credentials, @read_retries, @automatic_wait, @max_wait = credentials, read_retries, automatic_wait, max_wait
      @transport = transport || NetHTTPTransport.new(connect_timeout: connect_timeout, request_timeout: request_timeout)
      @sleeper = sleeper || ->(seconds) { sleep(seconds) }
      @clock = clock || -> { Time.now }
    rescue URI::InvalidURIError
      raise ValidationError.new("Invalid base URL"), cause: nil
    end

    def inspect = "#<FragmentDonor::Client credentials=[REDACTED]>"
    alias to_s inspect
    def to_json(*) = { client: "[REDACTED]" }.to_json

    def get_user_info(username)
      validate_username(username)
      data = request("GET", "/get-user-info/", query: { username: username })
      unless data["username"].nil? || data["username"].is_a?(String)
        raise MalformedResponseError, "Unexpected username type"
      end
      if data.key?("is_premium") && ![true, false].include?(data["is_premium"])
        raise MalformedResponseError, "Unexpected is_premium type"
      end
      UserInfo.new(ok: true, username: data["username"], is_premium: data["is_premium"], extra: extras(data, %w[ok username is_premium]))
    end

    def buy_stars(username, amount, payment_method: nil)
      validate_username(username)
      unless amount.is_a?(Integer) && (50..1_000_000).cover?(amount)
        raise ValidationError, "Stars amount must be an integer from 50 to 1000000"
      end
      buy("/buy-stars/", username, "amount", amount, payment_method)
    end

    def buy_premium(username, duration, payment_method: nil)
      validate_username(username)
      unless duration.is_a?(Integer) && [3, 6, 12].include?(duration)
        raise ValidationError, "Premium duration must be 3, 6 or 12 months"
      end
      buy("/buy-premium/", username, "duration", duration, payment_method)
    end

    # Backend accepts GET and POST; SDK deliberately uses GET.
    def wallet_balance
      data = request("GET", "/wallet-balance/", wallet: true)
      unless %w[address ton usdt_ton].all? { |key| data[key].is_a?(String) }
        raise MalformedResponseError, "Wallet address and decimal balances must be strings"
      end
      WalletBalance.new(ok: true, address: data["address"], ton: data["ton"], usdt_ton: data["usdt_ton"], extra: extras(data, %w[ok address ton usdt_ton]))
    end

    private

    def validate_username(username)
      raise ValidationError, "Invalid username" unless username.is_a?(String) && USERNAME.match?(username)
    end

    def buy(path, username, field, quantity, payment_method)
      if payment_method && !PAYMENT_METHODS.include?(payment_method)
        raise ValidationError, "payment_method must be usdt_ton or ton"
      end
      form = { "username" => username, field => quantity.to_s }
      form["payment_method"] = payment_method if payment_method
      data = request("POST", path, form: form, wallet: true, purchase: true)
      Purchase.new(ok: true, data: data["data"], extra: extras(data, %w[ok data]))
    end

    def extras(data, known)
      data.reject { |key, _| known.include?(key) }.freeze
    end

    def headers(wallet, purchase)
      result = { "Accept" => "application/json" }
      return result unless wallet

      if @credentials.mnemonic.to_s.strip.empty?
        raise ValidationError, "Mnemonic is required for wallet/purchase operations"
      end
      if purchase && @credentials.cookie.to_s.strip.empty?
        raise ValidationError, "Cookie is required for purchases"
      end
      version = @credentials.wallet_version || "auto"
      raise ValidationError, "Invalid Wallet-Version" unless WALLET_VERSIONS.include?(version)

      result["Mnemonic"] = @credentials.mnemonic
      result["Wallet-Version"] = version
      { "Wallet-Address" => @credentials.wallet_address, "Api-Key" => @credentials.provider_key }.each do |key, value|
        result[key] = value unless value.to_s.empty?
      end
      if purchase
        result["Cookie"] = @credentials.cookie
        { "Proxy" => @credentials.proxy, "User-Agent" => @credentials.user_agent }.each do |key, value|
          result[key] = value unless value.to_s.empty?
        end
      end
      if result.values.any? { |value| !value.is_a?(String) || value.match?(/[\r\n]/) }
        raise ValidationError, "Invalid header value"
      end
      result
    end

    def request(method, path, query: nil, form: nil, wallet: false, purchase: false)
      uri = @base.dup
      uri.path = @base.path.delete_suffix("/") + path
      uri.query = URI.encode_www_form(query) if query
      request_headers = headers(wallet, purchase)
      request_headers["Content-Type"] = "application/x-www-form-urlencoded" if form
      request_data = Request.new(method: method, url: uri.to_s, headers: request_headers.freeze, body: form && URI.encode_www_form(form))
      attempts, limit = 0, purchase ? 0 : @read_retries
      loop do
        begin
          response = safe_transport(request_data)
          return parse_response(response)
        rescue Error => error
          raise error, cause: nil if attempts >= limit
          wait = retry_delay(error, attempts)
          raise error, cause: nil unless wait
          @sleeper.call(wait)
          attempts += 1
        end
      end
    end

    def safe_transport(request_data)
      @transport.call(request_data)
    rescue Net::OpenTimeout, Net::ReadTimeout, Net::WriteTimeout, Timeout::Error
      raise TimeoutError.new("Transport timed out; sensitive details omitted"), cause: nil
    rescue StandardError
      raise NetworkError.new("Transport failed; sensitive details omitted"), cause: nil
    end

    def parse_response(response)
      status = response.status
      begin
        data = JSON.parse(response.body)
      rescue JSON::ParserError
        data = nil
      end
      data = nil unless data.is_a?(Hash)
      wait = retry_after(response.headers, data || {})
      if !(200..299).cover?(status)
        klass = case status
                when 400, 422 then ValidationError
                when 429 then RateLimitError
                when 503 then UnavailableError
                else APIError
                end
        message = data && %w[error reason info message].filter_map { |key| data[key] if data[key].is_a?(String) && !data[key].empty? }.first
        message = "HTTP request failed" unless message.is_a?(String)
        code = data && data["error_code"]
        code = nil unless code.is_a?(String)
        raise klass.new(redact(message), status: status, code: code && redact(code), retry_after: wait, details: data && safe_details(data)), cause: nil
      end
      unless data && [true, false].include?(data["ok"])
        raise MalformedResponseError.new("Expected JSON object with boolean ok", status: status), cause: nil
      end
      if data["ok"] == false
        message = %w[error reason info].filter_map { |key| data[key] if data[key].is_a?(String) && !data[key].empty? }.first
        message = "API reported failure" unless message.is_a?(String)
        raise APIError.new(redact(message), status: status, retry_after: wait, details: safe_details(data)), cause: nil
      end
      data
    end

    def retry_after(headers, data)
      hints = [data["retry_after"], data["flood_wait"]]
      header = headers.find { |key, _| key.to_s.casecmp?("Retry-After") }&.last
      if header
        begin
          hints << Float(header)
        rescue ArgumentError, TypeError
          begin
            hints << Time.httpdate(header) - @clock.call
          rescue ArgumentError, TypeError
            # Ignore malformed retry headers; never expose raw header content.
          end
        end
      end
      parsed = hints.filter_map do |hint|
        begin
          number = Float(hint)
          number if number.finite? && number >= 0 && number <= 31_536_000
        rescue ArgumentError, TypeError
          nil
        end
      end
      parsed.max
    end

    def retry_delay(error, attempt)
      wait = 2**attempt
      if error.is_a?(RateLimitError) || error.is_a?(UnavailableError)
        return nil unless @automatic_wait
        wait = error.retry_after || wait
      elsif !error.is_a?(TimeoutError) && !error.is_a?(NetworkError) && !(error.status && (500..599).cover?(error.status))
        return nil
      end
      wait <= @max_wait ? wait : nil
    end

    def redact(message)
      secrets = [@credentials.mnemonic, @credentials.mnemonic.to_s.split.join(" "), @credentials.cookie, @credentials.provider_key, @credentials.proxy]
      begin
        proxy = URI(@credentials.proxy.to_s)
        secrets += [proxy.user, proxy.password].compact.map { |value| URI::DEFAULT_PARSER.unescape(value) }
      rescue URI::InvalidURIError
        # Invalid provider configuration still cannot be echoed as a raw secret.
      end
      @credentials.cookie.to_s.split(";").each do |part|
        value = part.strip.split("=", 2)[1]
        secrets += [value, value&.delete_prefix('"')&.delete_suffix('"')]
      end
      variants = secrets.compact.reject(&:empty?).flat_map do |value|
        [value, URI::DEFAULT_PARSER.unescape(value), URI.encode_www_form_component(value)]
      end
      variants.reduce(message.to_s) { |text, secret| text.gsub(secret, "[REDACTED]") }
    end

    def safe_details(value)
      case value
      when Hash
        sensitive = %w[mnemonic seed cookie session stringsession password proxypassword proxy apikey providerkey authorization token]
        value.to_h do |key, item|
          normalized = key.to_s.downcase.delete("-_")
          [key, sensitive.include?(normalized) ? "[REDACTED]" : safe_details(item)]
        end.freeze
      when Array then value.map { |item| safe_details(item) }.freeze
      when String then redact(value)
      else value
      end
    end
  end
end
