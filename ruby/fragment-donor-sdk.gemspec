# frozen_string_literal: true

require_relative "lib/fragment_donor_sdk"

Gem::Specification.new do |spec|
  spec.name = "fragment-donor-sdk"
  spec.version = FragmentDonor::VERSION
  spec.summary = "Independent no-service-auth Fragment Donor API SDK"
  spec.description = "Server-side Telegram Stars/Premium integration with typed responses, exact decimal balances, safe error handling and no purchase retries."
  spec.authors = ["Fragment Donor SDK contributors"]
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.2"
  spec.files = Dir["lib/**/*.rb"] + %w[README.md LICENSE CHANGELOG.md]
  spec.require_paths = ["lib"]
  spec.homepage = "https://usnuz.github.io/fragment-donor-sdk/"
  spec.metadata = {
    "source_code_uri" => "https://github.com/usnuz/fragment-donor-sdk/tree/main/ruby",
    "documentation_uri" => "https://usnuz.github.io/fragment-donor-sdk/",
    "changelog_uri" => "https://github.com/usnuz/fragment-donor-sdk/blob/main/ruby/CHANGELOG.md",
    "rubygems_mfa_required" => "true"
  }
  spec.add_dependency "json", ">= 2.6", "< 4"
  spec.add_dependency "net-http", ">= 0.3", "< 1"
  spec.add_dependency "time", ">= 0.2", "< 1"
end
