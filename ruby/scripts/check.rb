# frozen_string_literal: true

require "rbconfig"

root = File.expand_path("..", __dir__)
files = Dir.chdir(root) { (Dir["{lib,test,scripts,smoke}/**/*.rb"] + Dir["*.gemspec"]).map { |path| File.expand_path(path) } }
abort "Ruby gate found no source files" if files.empty?
files.each do |path|
  text = File.read(path)
  abort "Formatting violation: #{path}" if text.include?("\t") || text.lines.any? { |line| line.match?(/[ \t]+\r?\n\z/) } || !text.end_with?("\n")
  abort "Syntax violation: #{path}" unless system(RbConfig.ruby, "-c", path)
end
puts "Ruby syntax and whitespace-format gate PASS (#{files.length} files)"
