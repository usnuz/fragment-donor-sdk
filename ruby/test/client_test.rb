# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/fragment_donor_sdk"

class FragmentDonorClientTest < Minitest::Test
  FIXTURE = JSON.parse(File.read(File.expand_path("../../contract/fixtures.json", __dir__)))

  def credentials
    FragmentDonor::Credentials.new(mnemonic: FIXTURE["credentials"]["mnemonic"], cookie: FIXTURE["credentials"]["cookie"], provider_key: FIXTURE["credentials"]["provider_key"], wallet_version: "v5r1", wallet_address: "SYNTHETIC_ADDRESS", proxy: "http://SYNTHETIC_PROXY", user_agent: "SYNTHETIC_AGENT")
  end

  def response(status, fixture, headers = {})
    data = fixture.is_a?(String) ? fixture : JSON.generate(fixture)
    FragmentDonor::HTTPResponse.new(status: status, headers: headers, body: data)
  end

  def client(transport, **options)
    FragmentDonor::Client.new(credentials: credentials, transport: transport, sleeper: ->(_) {}, **options)
  end

  def test_all_operation_contract_mappings_unknown_fields_and_decimal_precision
    %w[get_user_info buy_stars buy_premium wallet_balance].each do |operation|
      calls = 0
      transport = lambda do |request|
        calls += 1
        contract = FIXTURE["operations"][operation]
        uri = URI(request.url)
        assert_equal contract["method"], request.method
        assert_equal contract["path"], uri.path
        refute request.headers.key?("Authorization")
        refute request.headers.key?("X-Api-Key")
        if operation == "get_user_info"
          assert_equal "@durov", URI.decode_www_form(uri.query).to_h["username"]
          refute request.headers.key?("Mnemonic")
          refute request.headers.key?("Cookie")
          response(200, FIXTURE["responses"]["user_info"])
        else
          assert_equal credentials.mnemonic, request.headers["Mnemonic"]
          assert_equal credentials.provider_key, request.headers["Api-Key"]
          assert_equal "v5r1", request.headers["Wallet-Version"]
          assert_equal "SYNTHETIC_ADDRESS", request.headers["Wallet-Address"]
          if operation == "wallet_balance"
            refute request.headers.key?("Cookie")
            refute request.headers.key?("Proxy")
            response(200, FIXTURE["responses"]["wallet_balance"])
          else
            assert_equal credentials.cookie, request.headers["Cookie"]
            assert_equal "http://SYNTHETIC_PROXY", request.headers["Proxy"]
            assert_equal "SYNTHETIC_AGENT", request.headers["User-Agent"]
            assert_equal "application/x-www-form-urlencoded", request.headers["Content-Type"]
            form = URI.decode_www_form(request.body).to_h
            assert_equal "@durov", form["username"]
            assert_equal "ton", form["payment_method"]
            assert_equal operation == "buy_stars" ? "50" : "3", form[operation == "buy_stars" ? "amount" : "duration"]
            response(200, FIXTURE["responses"]["purchase"])
          end
        end
      end
      sdk = client(transport)
      result = case operation
               when "get_user_info" then sdk.get_user_info("@durov")
               when "buy_stars" then sdk.buy_stars("@durov", 50, payment_method: "ton")
               when "buy_premium" then sdk.buy_premium("@durov", 3, payment_method: "ton")
               else sdk.wallet_balance
               end
      assert result.extra.key?("future_field")
      assert_equal 1, calls
      next unless operation == "wallet_balance"
      assert_equal "9007199254740993.01", result.usdt_ton
      assert_equal "2.500000001", result.ton
    end
  end

  def test_errors_and_retry_hints
    [[400, "validation", FragmentDonor::APIError, nil], [429, "flood_wait", FragmentDonor::RateLimitError, 42], [503, "unavailable", FragmentDonor::UnavailableError, 5]].each do |status, fixture, klass, wait|
      sdk = client(->(_) { response(status, FIXTURE["responses"][fixture], "Retry-After" => "2") })
      error = assert_raises(klass) { sdk.get_user_info("durov") }
      assert_equal wait || 2, error.retry_after
      assert_equal status, error.status
    end
    sdk = client(->(_) { response(200, "bad json") })
    assert_raises(FragmentDonor::MalformedResponseError) { sdk.get_user_info("durov") }
    sdk = client(->(_) { response(200, FIXTURE["responses"]["upstream_error"]) })
    assert_raises(FragmentDonor::APIError) { sdk.get_user_info("durov") }
  end

  def test_http_date_and_long_wait_are_not_retried_early
    now = Time.utc(2026, 1, 1)
    calls = 0
    sdk = client(lambda { |_|
      calls += 1
      response(429, { "ok" => false }, "Retry-After" => (now + 75).httpdate)
    }, read_retries: 2, automatic_wait: true, clock: -> { now })
    error = assert_raises(FragmentDonor::RateLimitError) { sdk.get_user_info("durov") }
    assert_equal 75, error.retry_after
    assert_equal 1, calls
  end

  def test_purchases_never_repeat_under_any_failure
    failures = [[429, FIXTURE["responses"]["flood_wait"]], [503, FIXTURE["responses"]["unavailable"]], [500, { "ok" => false }], [200, "bad json"], [:timeout, nil], [:network, nil]]
    %i[buy_stars buy_premium].each do |operation|
      failures.each do |status, payload|
        calls, waits = 0, 0
        sdk = FragmentDonor::Client.new(credentials: credentials, read_retries: 2, automatic_wait: true, sleeper: ->(_) { waits += 1 }, transport: lambda { |_|
          calls += 1
          raise Net::ReadTimeout, credentials.mnemonic if status == :timeout
          raise IOError, credentials.cookie if status == :network
          response(status, payload)
        })
        error = assert_raises(FragmentDonor::Error) { sdk.public_send(operation, "durov", operation == :buy_stars ? 50 : 3) }
        assert_equal 1, calls
        assert_equal 0, waits
        refute_includes error.inspect, credentials.mnemonic
        refute_includes error.full_message, credentials.cookie
        assert_nil error.cause
      end
    end
  end

  def test_read_retries_opt_in_and_bounded
    [[0, false, 1], [2, false, 1], [2, true, 3]].each do |retries, auto, expected|
      calls = 0
      sdk = client(lambda { |_|
        calls += 1
        response(429, FIXTURE["responses"]["flood_wait"])
      }, read_retries: retries, automatic_wait: auto)
      assert_raises(FragmentDonor::RateLimitError) { sdk.get_user_info("durov") }
      assert_equal expected, calls
    end
  end

  def test_redaction_in_error_debug_and_json
    text = [credentials.mnemonic, credentials.cookie, credentials.provider_key].join(" ")
    sdk = client(->(_) { response(400, { "ok" => false, "error" => text }) })
    error = assert_raises(FragmentDonor::APIError) { sdk.buy_stars("durov", 50) }
    output = [error.inspect, error.full_message, sdk.inspect, sdk.to_json, credentials.inspect, credentials.to_json].join(" ")
    [credentials.mnemonic, credentials.cookie, credentials.provider_key].each { |secret| refute_includes output, secret }
  end

  def test_redirect_is_an_error_and_not_another_request
    calls = 0
    sdk = client(lambda { |_|
      calls += 1
      response(307, "redirect", "Location" => "https://example.invalid")
    })
    error = assert_raises(FragmentDonor::APIError) { sdk.buy_stars("durov", 50) }
    assert_equal 307, error.status
    assert_equal 1, calls
  end

  def test_local_validation_and_no_provider_key
    sdk = client(->(_) { flunk "unexpected request" })
    assert_raises(FragmentDonor::ValidationError) { sdk.get_user_info("bad username") }
    assert_raises(FragmentDonor::ValidationError) { sdk.buy_stars("durov", 49) }
    assert_raises(FragmentDonor::ValidationError) { sdk.buy_premium("durov", 1) }
    assert_raises(FragmentDonor::ValidationError) { sdk.buy_stars("durov", 50, payment_method: "bad") }
    assert_raises(FragmentDonor::ValidationError) { FragmentDonor::Client.new(base_url: "http://example.com") }
    assert_raises(FragmentDonor::ValidationError) { FragmentDonor::Client.new(read_retries: 3) }
    sdk = FragmentDonor::Client.new(credentials: FragmentDonor::Credentials.new(mnemonic: credentials.mnemonic), transport: lambda { |request|
      refute request.headers.key?("Api-Key")
      response(200, FIXTURE["responses"]["wallet_balance"])
    })
    assert sdk.wallet_balance.ok
  end

  def test_normalized_seed_cookie_value_proxy_parts_and_response_inspect
    seed = credentials.mnemonic.split.join(" ")
    seed = "SYNTHETIC_A SYNTHETIC_B" unless seed.include?(" ")
    token = "SYNTHETIC_COOKIE_TOKEN"
    configured = FragmentDonor::Credentials.new(mnemonic: seed.gsub(" ", "   "), cookie: "stel_ssid=#{token}", proxy: "http://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY%20PASSWORD@example.invalid")
    text = [seed, token, "SYNTHETIC_PROXY_USER", "SYNTHETIC_PROXY PASSWORD"].join(" ")
    sdk = FragmentDonor::Client.new(credentials: configured, transport: ->(_) { response(400, { "ok" => false, "error" => text, "error_code" => text }) })
    error = assert_raises(FragmentDonor::APIError) { sdk.buy_stars("durov", 50) }
    output = [error.message, error.code, error.inspect, error.full_message].join(" ")
    [seed, token, "SYNTHETIC_PROXY_USER", "SYNTHETIC_PROXY PASSWORD"].each { |secret| refute_includes output, secret }
    models = [FragmentDonor::UserInfo.new(username: text, extra: { "future_field" => text }), FragmentDonor::Purchase.new(data: text, extra: { "future_field" => text }), FragmentDonor::WalletBalance.new(address: text, extra: { "future_field" => text })]
    models.each do |model|
      refute_includes model.inspect, token
      refute_includes model.to_s, seed
      assert_equal text, model.extra["future_field"] # explicit raw access remains available
    end
  end

  def test_structured_errors_keep_reconciliation_details_and_redact
    payload = { "ok" => false, "info" => "Transaction unconfirmed", "tx_hash" => "SYNTHETIC_TX_HASH", "unconfirmed" => true, "transient" => true,
                "future_field" => { "balance" => "9007199254740993.01", "echo" => credentials.mnemonic, "cookie" => "ANOTHER_SYNTHETIC_SECRET", "array" => [credentials.provider_key] } }
    sdk = client(->(_) { response(400, payload) })
    error = assert_raises(FragmentDonor::PurchaseOutcomeUnknownError) { sdk.buy_stars("durov", 50) }
    assert error.outcome_unknown?
    assert_equal "Transaction unconfirmed", error.message
    assert_equal "SYNTHETIC_TX_HASH", error.details["tx_hash"]
    assert_equal true, error.details["unconfirmed"]
    assert_equal true, error.details["transient"]
    assert_equal "9007199254740993.01", error.details["future_field"]["balance"]
    [credentials.mnemonic, credentials.provider_key, "ANOTHER_SYNTHETIC_SECRET"].each { |secret| refute_includes error.details.to_json, secret }
  end

  def test_nan_infinity_and_non_numeric_timeouts_are_rejected
    %i[connect_timeout request_timeout max_wait].each do |option|
      [Float::INFINITY, Float::NAN, -Float::INFINITY, 0, "bad"].each do |value|
        assert_raises(FragmentDonor::ValidationError) { FragmentDonor::Client.new(**{ option => value }) }
      end
    end
  end

  def test_purchase_outcomes_never_claim_unconfirmed_rejected_or_retry
    cases = [
      [400, { "ok" => false, "unconfirmed" => true, "tx_hash" => "SYNTHETIC_TX_HASH", "info" => "Await confirmation", "transient" => true }, FragmentDonor::PurchaseOutcomeUnknownError, true],
      [200, { "ok" => false, "unconfirmed" => true }, FragmentDonor::PurchaseOutcomeUnknownError, true],
      [200, { "ok" => true, "unconfirmed" => true }, FragmentDonor::PurchaseOutcomeUnknownError, true],
      [400, { "ok" => false, "reason" => "Not a user" }, FragmentDonor::APIError, false],
      [400, { "ok" => false, "unconfirmed" => "true" }, FragmentDonor::APIError, false],
      [429, { "ok" => false, "error_code" => "FLOOD_WAIT" }, FragmentDonor::RateLimitError, false],
      [503, { "ok" => false, "error_code" => "RATE_LIMIT_UNAVAILABLE" }, FragmentDonor::UnavailableError, false],
      [503, { "ok" => false }, FragmentDonor::UnavailableError, true],
      [500, { "ok" => false }, FragmentDonor::APIError, true],
      [307, "redirect", FragmentDonor::APIError, true],
      [200, "not JSON", FragmentDonor::MalformedResponseError, true],
      [:timeout, nil, FragmentDonor::TimeoutError, true],
      [:network, nil, FragmentDonor::NetworkError, true]
    ]
    %i[buy_stars buy_premium].each do |operation|
      cases.each do |status, payload, klass, unknown|
        calls, waits = 0, 0
        sdk = FragmentDonor::Client.new(credentials: credentials, read_retries: 2, automatic_wait: true, sleeper: ->(_) { waits += 1 }, transport: lambda { |_|
          calls += 1
          raise Net::ReadTimeout if status == :timeout
          raise IOError if status == :network
          response(status, payload)
        })
        error = assert_raises(klass) { sdk.public_send(operation, "durov", operation == :buy_stars ? 50 : 3) }
        assert_equal unknown, error.outcome_unknown?
        assert_equal 1, calls
        assert_equal 0, waits
        refute_kind_of FragmentDonor::ValidationError, error
        if klass == FragmentDonor::PurchaseOutcomeUnknownError && status == 400
          assert_equal "SYNTHETIC_TX_HASH", error.details["tx_hash"]
          assert_equal true, error.details["transient"]
        end
      end
    end
    error = assert_raises(FragmentDonor::ValidationError) { client(->(_) { flunk "local validation sent request" }).buy_stars("durov",49) }
    refute error.outcome_unknown?
  end
end
