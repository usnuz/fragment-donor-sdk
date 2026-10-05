# frozen_string_literal: true

require "fragment_donor_sdk"

installed = Gem.loaded_specs.fetch("fragment-donor-sdk").full_gem_path
abort "Consumer loaded source checkout instead of installed gem" unless installed.start_with?(ENV.fetch("FRAGMENT_SMOKE_GEM_HOME"))
calls = 0
transport = lambda do |request|
  calls += 1
  abort "Unexpected service auth" if request.headers.key?("Authorization") || request.headers.key?("X-Api-Key")
  if request.url.end_with?("/wallet-balance/")
    status = 200
    body = { "ok" => true, "address" => "SYNTHETIC_ADDRESS", "ton" => "2.500000001", "usdt_ton" => "9007199254740993.01", "future_field" => "kept" }
  elsif request.method == "POST"
    abort "Wrong purchase headers" unless request.headers["Mnemonic"] == "SYNTHETIC_MNEMONIC" && request.headers["Cookie"] == "session=SYNTHETIC_COOKIE" && request.headers["Content-Type"] == "application/x-www-form-urlencoded"
    abort "Wrong form" unless URI.decode_www_form(request.body).to_h["username"] == "durov"
    status = 400
    body = { "ok" => false, "unconfirmed" => true, "tx_hash" => "SYNTHETIC_TX_HASH", "info" => "Await confirmation SYNTHETIC_MNEMONIC", "future_field" => "kept" }
  else
    status = 200
    body = { "ok" => true, "username" => "durov", "is_premium" => false, "future_field" => "kept" }
  end
  FragmentDonor::HTTPResponse.new(status: status, headers: {}, body: JSON.generate(body))
end
client = FragmentDonor::Client.new(credentials: FragmentDonor::Credentials.new(mnemonic: "SYNTHETIC_MNEMONIC", cookie: "session=SYNTHETIC_COOKIE"), transport: transport, read_retries: 2, automatic_wait: true)
user = client.get_user_info("durov")
abort "User consumer smoke failed" unless user.ok && user.extra["future_field"] == "kept"
balance = client.wallet_balance
abort "Decimal consumer smoke failed" unless balance.usdt_ton == "9007199254740993.01"
%i[buy_stars buy_premium].each do |operation|
  before = calls
  begin
    client.public_send(operation, "durov", operation == :buy_stars ? 50 : 3)
    abort "Unconfirmed purchase falsely successful"
  rescue FragmentDonor::PurchaseOutcomeUnknownError => error
    abort "Uncertainty not exposed" unless error.outcome_unknown? && calls == before + 1
    abort "Reconciliation/redaction failed" unless error.details["tx_hash"] == "SYNTHETIC_TX_HASH" && error.details["info"] == "Await confirmation [REDACTED]"
  end
end
abort "Duplicate consumer requests" unless calls == 4
puts "Ruby installed-gem consumer: four operations, uncertainty, redaction, exact balance PASS"
