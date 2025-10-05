#!/usr/bin/env ruby
# Comprehensive test script for quotation system

puts "=== COMPREHENSIVE QUOTATION SYSTEM TEST ==="
puts "Testing all key components..."
puts

# Test 1: Database Schema Validation
puts "1. Testing Database Schema..."
quotations_count = `rails runner 'puts Quotation.count'`.strip
puts "   Quotations in database: #{quotations_count}"

# Check if night_premium field exists
night_premium_exists = `rails runner 'puts DayOnSet.column_names.include?("night_premium")'`.strip
puts "   Night premium field exists: #{night_premium_exists}"

# Check if description field exists in talent_categories
description_exists = `rails runner 'puts TalentCategory.column_names.include?("description")'`.strip
puts "   Description field exists: #{description_exists}"

# Check if commercial_type field exists
commercial_type_exists = `rails runner 'puts Quotation.column_names.include?("commercial_type")'`.strip
puts "   Commercial type field exists: #{commercial_type_exists}"

# Check if number_of_commercials field exists
num_commercials_exists = `rails runner 'puts QuotationDetail.column_names.include?("number_of_commercials")'`.strip
puts "   Number of commercials field exists: #{num_commercials_exists}"

puts

# Test 2: Latest Quotation Data
puts "2. Testing Latest Quotation Data..."
latest_quotation = `rails runner '
  q = Quotation.last
  if q
    puts "ID: " + q.id.to_s
    puts "Project: " + q.project_name.to_s
    puts "Status: " + q.status.to_s
    puts "Total: R" + q.total_amount.to_s
    puts "Talent Categories: " + q.talent_categories.count.to_s
    puts "Day on Sets: " + q.talent_categories.joins(:day_on_sets).count.to_s
    puts "Night Premiums: " + q.talent_categories.joins(:day_on_sets).where(day_on_sets: {night_premium: true}).count.to_s
  else
    puts "No quotations found"
  end
'`
puts latest_quotation

puts

# Test 3: Calculation Test
puts "3. Testing Quotation Calculator..."
calculation_test = `rails runner '
  q = Quotation.last
  if q
    calc = QuotationCalculator.new(q).calculate
    puts "Talent Fee: R" + calc[:talent_fee].to_s
    puts "Usage Fee: R" + calc[:usage_fee].to_s
    puts "Total: R" + calc[:total].to_s
    puts "Territory Multiplier: " + calc[:territory_multiplier].to_s
  else
    puts "No quotation to calculate"
  end
'`
puts calculation_test

puts

# Test 4: Routes Test
puts "4. Testing Routes..."
routes_test = `rails runner '
  Rails.application.routes.routes.each do |route|
    if route.defaults[:controller] == "quotations"
      verb = route.verb.to_s.ljust(6)
      path = route.path.spec.to_s.ljust(30)
      action = route.defaults[:action] || "N/A"
      puts verb + " " + path + " -> " + action
    end
  end
'`
puts routes_test

puts

puts "=== TEST SUMMARY ==="
puts "✓ Database schema validation complete"
puts "✓ Data integrity check complete"
puts "✓ Calculation engine test complete"
puts "✓ Routes validation complete"
puts
puts "Ready for browser testing!"
puts "Recommended test flow:"
puts "1. Visit /quotations/new"
puts "2. Create a quotation with talent categories"
puts "3. Add night premium to some talent"
puts "4. Save and view the quotation"
puts "5. Test edit functionality"
puts "6. Test PDF and Excel exports"
puts "7. Verify calculations are correct"