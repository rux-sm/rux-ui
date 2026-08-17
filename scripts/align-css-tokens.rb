# frozen_string_literal: true

file_path = ARGV.fetch(0, "rux-ui/css/tokens.css")
source = File.read(file_path)
lines = source.split("\n", -1)
declaration = /^(\s*)(--[\w-]+):[ \t]*(\S.*)$/
group_start = 0

align_group = lambda do |group_end|
  matches = lines[group_start...group_end].map { |line| declaration.match(line) }
  next if matches.empty? || matches.any?(&:nil?)

  longest_name = matches.map { |match| match[2].length }.max

  (group_start...group_end).each do |index|
    match = declaration.match(lines[index])
    padding = " " * (longest_name - match[2].length + 1)
    lines[index] = "\t#{match[2]}:#{padding}#{match[3]}"
  end
end

(0..lines.length).each do |index|
  next if index < lines.length && declaration.match?(lines[index])

  align_group.call(index)
  group_start = index + 1
end

output = lines.join("\n")
File.write(file_path, output) if output != source
