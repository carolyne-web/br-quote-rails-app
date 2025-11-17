#!/usr/bin/env ruby
# Test script for database storage validation

q = Quotation.find(341)
puts "Current database state:"
puts "- is_guaranteed: #{q.is_guaranteed}"
puts "- exclusivity_type: #{q.quotation_detail.exclusivity_type.inspect}"
puts "- number_of_commercials: #{q.quotation_detail.number_of_commercials}"

# Extract data from JSON
data = JSON.parse(q.quotation_detail.combinations_data)
puts "\nAnalyzing #{data.keys.count} combinations..."

data.each do |combo_id, combo_data|
  puts "\nCombo #{combo_id}:"
  puts "  - guarantee: #{combo_data['is_guaranteed']}"
  puts "  - commercials: #{combo_data['num_commercials']}"

  # Check for exclusivity in calculated_values
  if combo_data['calculated_values'].present?
    combo_data['calculated_values'].each do |cat_id, lines|
      lines.each do |line_id, line_data|
        if line_data['exclusivity_type'].present? && !line_data['exclusivity_type'].empty?
          puts "  - exclusivity found: #{line_data['exclusivity_type']}"
        end
      end
    end
  end
end

# Test the improved controller logic that searches all combinations
has_guarantee = false
common_exclusivity = nil
common_num_commercials = nil

# Search through ALL combinations (like the updated controller does)
data.each do |combo_id, combo_data|
  # Check guarantee
  if combo_data['is_guaranteed'] == "1" || combo_data['is_guaranteed'] == true
    has_guarantee = true
  end

  # Extract exclusivity (search all combinations until found)
  if common_exclusivity.nil?
    if combo_data['exclusivities'].present? && combo_data['exclusivities'].any?
      common_exclusivity = combo_data['exclusivities'].first
    elsif combo_data['calculated_values'].present?
      combo_data['calculated_values'].each do |cat_id, lines|
        lines.each do |line_id, line_data|
          if line_data['exclusivity_type'].present? && !line_data['exclusivity_type'].empty?
            common_exclusivity = line_data['exclusivity_type']
            break
          end
        end
        break if common_exclusivity
      end
    end
  end

  # Extract number of commercials (use first non-nil value found)
  if common_num_commercials.nil? && combo_data['num_commercials'].present?
    common_num_commercials = combo_data['num_commercials'].to_i
  end
end

puts "\nController extraction would result in:"
puts "- guarantee: #{has_guarantee}"
puts "- exclusivity: #{common_exclusivity}"
puts "- commercials: #{common_num_commercials}"

# Update the database to match
q.update(is_guaranteed: has_guarantee)
q.quotation_detail.update(
  exclusivity_type: common_exclusivity,
  number_of_commercials: common_num_commercials
)

puts "\nDatabase updated. Final state:"
puts "- is_guaranteed: #{q.reload.is_guaranteed}"
puts "- exclusivity_type: #{q.quotation_detail.exclusivity_type}"
puts "- number_of_commercials: #{q.quotation_detail.number_of_commercials}"