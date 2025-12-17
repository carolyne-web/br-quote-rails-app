# Fix duplicate talent lines across all quotations
# Run this with: rails runner fix_duplicate_talents.rb

puts "=" * 80
puts "FIXING DUPLICATE TALENT LINES"
puts "=" * 80

affected_quotations = []

Quotation.find_each do |quotation|
  quotation.talent_categories.each do |category|
    # Find duplicates by description
    descriptions = category.day_on_sets.map(&:description)
    duplicates = descriptions.select { |d| descriptions.count(d) > 1 }.uniq

    if duplicates.any?
      affected_quotations << quotation.id
      puts "\n⚠️  Quotation #{quotation.id} (#{quotation.project_name}) has duplicates in Category #{category.category_type}:"

      duplicates.each do |duplicate_desc|
        matching_lines = category.day_on_sets.where(description: duplicate_desc).order(:id)
        puts "  Duplicate: '#{duplicate_desc}' (#{matching_lines.count} occurrences)"

        # Keep only the LAST occurrence (most recent), delete earlier ones
        lines_to_delete = matching_lines[0...-1]
        lines_to_delete.each do |line|
          puts "    🗑️  Deleting older duplicate (ID: #{line.id})"
          line.destroy
        end
      end
    end
  end
end

puts "\n" + "=" * 80
if affected_quotations.any?
  puts "✅ Fixed #{affected_quotations.uniq.count} quotations: #{affected_quotations.uniq.join(', ')}"
  puts "\n🔄 Regenerating final quotations for affected quotations..."

  affected_quotations.uniq.each do |q_id|
    quotation = Quotation.find(q_id)
    quotation.final_quotations.destroy_all
    puts "  Regenerating final quotation for Quotation #{q_id}..."
    FinalQuotationGenerator.new(quotation).generate
  end

  puts "\n✅ All done! Fixed #{affected_quotations.uniq.count} quotations."
else
  puts "✅ No duplicates found. All quotations are clean!"
end
puts "=" * 80
