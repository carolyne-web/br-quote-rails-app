fq = FinalQuotation.find(289)
quotation = fq.quotation
combinations_data = JSON.parse(fq.original_combinations_data)

# Delete existing final quotation
puts "Deleting existing final quotation #{fq.id}..."
fq.destroy

# Generate new final quotation with the fixed logic
puts "Generating new final quotation..."
new_fq = FinalQuotationGenerator.new(quotation, combinations_data).generate
puts "Success! Final quotation #{new_fq.id} created"

# Check Group 1 total specifically
group1 = new_fq.final_quotation_groups.find_by(group_number: 1)
usage_lines = group1.final_quotation_talent_lines.select { |line| line.usage_fee.to_f > 0 }

puts "\nGroup 1 Usage Summary:"
total = 0
usage_lines.each do |line|
  puts "  #{line.description}: R#{line.total_line_cost.to_f.to_i}"
  total += line.total_line_cost.to_f
end
puts "  TOTAL: R#{total.to_i}"

puts "\nExpected: R189,000"
puts "Actual: R#{total.to_i}"
puts "Match: #{total.to_i == 189000 ? '✅' : '❌'}"