# frozen_string_literal: true

require "fileutils"
require "rubygems/package"
require "rbconfig"
require "tmpdir"

root = File.expand_path("..", __dir__)
artifact = File.join(root, "fragment-donor-sdk-0.1.2.gem")
abort "Build the gem before this smoke" unless File.file?(artifact)
package = Gem::Package.new(artifact)
expected = %w[lib/fragment_donor_sdk.rb README.md LICENSE CHANGELOG.md]
abort "Unexpected gem payload: #{package.contents}" unless package.contents.sort == expected.sort
Dir.mktmpdir("fragment-donor-gem-smoke-") do |work|
  package.extract_files(File.join(work, "inspect"))
  expected.each do |relative|
    text = File.binread(File.join(work, "inspect", relative))
    %w[BEGIN\ PRIVATE\ KEY BEGIN\ RSA\ PRIVATE\ KEY SYNTHETIC_SESSION_NOT_REAL SYNTHETIC_PROVIDER_KEY_NOT_REAL].each do |marker|
      abort "Sensitive/test fixture payload leaked into gem: #{relative}" if text.include?(marker)
    end
  end
  gem_home = File.join(work, "gems")
  gem_command = File.join(RbConfig::CONFIG.fetch("bindir"), "gem")
  abort "Local artifact installation failed" unless system(RbConfig.ruby, gem_command, "install", "--local", "--ignore-dependencies", "--no-document", "--install-dir", gem_home, artifact)
  environment = { "GEM_HOME" => gem_home, "GEM_PATH" => ([gem_home] + Gem.path).join(File::PATH_SEPARATOR), "FRAGMENT_SMOKE_GEM_HOME" => gem_home }
  abort "Installed-gem consumer failed" unless system(environment, RbConfig.ruby, File.join(__dir__, "consumer.rb"), chdir: work)
end
puts "Ruby gem allowlist/fixture-secret exclusion and isolated installed consumer PASS"
