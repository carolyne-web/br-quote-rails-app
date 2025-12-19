#!/usr/bin/env ruby
# Check the current state of quotation 49

q = Quotation.find(49)

puts "=" * 80
puts "QUOTATION 49: #{q.project_name}"
puts "=" * 80

puts "\n📊 TALENT CATEGORIES:"
q.talent_categories.order(:category_type).each do |cat|
  puts "\n  Category #{cat.category_type}:"
  puts "  #{'-' * 60}"

  if cat.day_on_sets.any?
    cat.day_on_sets.each_with_index do |dos, idx|
      puts "    [#{idx}] #{dos.description}"
      puts "        Talent Count: #{dos.talent_count}, Days: #{dos.days_count}, Rate: #{dos.adjusted_rate}"
      puts "        Exclusivity: #{dos.exclusivity_type}, Buyout: #{dos.buyout_percentage}%"
    end
  else
    puts "    (no day_on_sets)"
  end
end

puts "\n\n📋 FINAL QUOTATIONS:"
if q.final_quotations.any?
  q.final_quotations.each do |fq|
    puts "\n  Final Quotation ID: #{fq.id}"
    puts "  Total Talent Lines: #{fq.talent_lines.count}"

    # Group by category
    fq.talent_lines.group_by(&:talent_category_id).each do |cat_id, lines|
      cat = q.talent_categories.find_by(id: cat_id)
      puts "\n  Category #{cat&.category_type || 'Unknown'}:"
      lines.each do |line|
        puts "    - #{line.description} (exclusivity: #{line.exclusivity_type})"
      end
    end
  end
else
  puts "  (no final quotations)"
end

puts "\n" + "=" * 80
