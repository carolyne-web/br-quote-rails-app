
fq = FinalQuotation.find(343)
group1 = fq.final_quotation_groups.first

# Find teenager line (category_type would likely be 'Teenager' or similar)
teen_line = group1.final_quotation_talent_lines.find { |line| line.category_type.downcase.include?('teen') || line.total_line_cost == 12000 }

if teen_line
  puts "Found line: #{teen_line.description} (#{teen_line.category_type}) - current total: #{teen_line.total_line_cost}"
  teen_line.update\!(usage_fee: 42000.0, total_line_cost: 54000.0, description: 'Teenager')
  puts 'Updated to R54,000 total'
else
  puts 'Teenager line not found'
  puts 'Available lines:'
  group1.final_quotation_talent_lines.each { |line| puts "  #{line.description}: #{line.total_line_cost}" }
end

