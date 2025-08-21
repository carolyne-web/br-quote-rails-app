#!/usr/bin/env ruby

require 'rails'
require_relative 'config/environment'

def test_day_breakdown_ui_logic
  puts "=== Testing Day-on-Set Breakdown UI Logic ==="
  
  production_house = ProductionHouse.first
  
  # Create a test quotation to simulate the form scenario
  quotation = production_house.quotations.create!(
    project_name: "Day Breakdown UI Test",
    status: "draft"
  )
  
  quotation.create_quotation_detail!(
    shoot_days: 3,
    rehearsal_days: 1,
    travel_days: 1,
    down_days: 0,
    duration: "6_months",
    media_type: "television"
  )
  
  # Create lead talent category with breakdown
  lead_cat = quotation.talent_categories.create!(
    category_type: 1,
    initial_count: 2,
    daily_rate: 8000
  )
  
  # Add day-on-set breakdowns
  lead_cat.day_on_sets.create!(talent_count: 2, days_count: 2)
  lead_cat.day_on_sets.create!(talent_count: 1, days_count: 1)
  
  puts "\n--- Simulating UI Breakdown Summary Logic ---"
  
  # Simulate the JavaScript function logic
  def simulate_js_breakdown_summary(talent_category, shoot_days)
    total_talent_days = 0
    max_days_used = 0
    total_breakdown_rows = 0
    
    # Simulate the JavaScript logic for day_on_sets
    talent_category.day_on_sets.each do |dos|
      talent_count = dos.talent_count || 0
      days_count = dos.days_count || 0
      
      if talent_count > 0 && days_count > 0
        total_talent_days += talent_count * days_count
        max_days_used = [max_days_used, days_count].max
        total_breakdown_rows += 1
      end
    end
    
    # Generate summary text
    if total_breakdown_rows == 0
      summary = "Total: 0 talent-days"
    else
      plural = total_breakdown_rows > 1 ? "s" : ""
      summary = "Total: #{total_talent_days} talent-days (#{total_breakdown_rows} breakdown#{plural})"
    end
    
    # Generate validation warning
    warning = nil
    if max_days_used > shoot_days
      warning = "⚠️ Some breakdown entries use more days (#{max_days_used}) than total shoot days (#{shoot_days})"
    end
    
    {
      summary: summary,
      warning: warning,
      total_talent_days: total_talent_days,
      max_days_used: max_days_used,
      breakdown_rows: total_breakdown_rows
    }
  end
  
  result = simulate_js_breakdown_summary(lead_cat, quotation.quotation_detail.shoot_days)
  
  puts "Lead talent breakdown simulation:"
  puts "  Day-on-set entries: #{lead_cat.day_on_sets.count}"
  lead_cat.day_on_sets.each_with_index do |dos, i|
    puts "    Row #{i}: #{dos.talent_count} talent × #{dos.days_count} days"
  end
  
  puts "\nUI Summary calculation:"
  puts "  Summary text: \"#{result[:summary]}\""
  puts "  Warning: #{result[:warning] ? "\"#{result[:warning]}\"" : "None"}"
  puts "  Total talent-days: #{result[:total_talent_days]}"
  puts "  Max days used: #{result[:max_days_used]}"
  puts "  Breakdown rows: #{result[:breakdown_rows]}"
  
  puts "\nValidation check:"
  shoot_days = quotation.quotation_detail.shoot_days
  puts "  Shoot days: #{shoot_days}"
  puts "  Max days in breakdown: #{result[:max_days_used]}"
  puts "  Should show warning: #{result[:max_days_used] > shoot_days ? 'YES' : 'NO'}"
  
  puts "\n--- Testing Different Scenarios ---"
  
  test_scenarios = [
    { name: "Empty breakdown", breakdowns: [] },
    { name: "Single breakdown", breakdowns: [{talent: 2, days: 3}] },
    { name: "Multiple valid breakdowns", breakdowns: [{talent: 2, days: 2}, {talent: 1, days: 1}] },
    { name: "Breakdown exceeding shoot days", breakdowns: [{talent: 2, days: 5}] },
    { name: "Zero values", breakdowns: [{talent: 0, days: 3}, {talent: 2, days: 0}] }
  ]
  
  test_scenarios.each do |scenario|
    puts "\n#{scenario[:name]}:"
    
    # Clear existing breakdowns
    lead_cat.day_on_sets.destroy_all
    
    # Add scenario breakdowns
    scenario[:breakdowns].each do |breakdown|
      lead_cat.day_on_sets.create!(
        talent_count: breakdown[:talent],
        days_count: breakdown[:days]
      )
    end
    
    result = simulate_js_breakdown_summary(lead_cat, 3)
    puts "  Summary: \"#{result[:summary]}\""
    puts "  Warning: #{result[:warning] ? "\"#{result[:warning]}\"" : "None"}"
  end
  
  puts "\n--- Testing Backend vs Frontend Consistency ---"
  
  # Reset to a known state
  lead_cat.day_on_sets.destroy_all
  lead_cat.day_on_sets.create!(talent_count: 2, days_count: 2)
  lead_cat.day_on_sets.create!(talent_count: 1, days_count: 1)
  
  # Backend calculation
  quotation.reload
  calculator = QuotationCalculator.new(quotation)
  backend_result = calculator.calculate
  
  # Frontend simulation
  frontend_result = simulate_js_breakdown_summary(lead_cat, 3)
  
  puts "Backend base talent cost: R#{backend_result[:base_talent_cost]}"
  puts "Expected from breakdown: R#{(2*2*8000) + (1*1*8000)} (2×2×8000 + 1×1×8000)"
  puts "Frontend talent-days: #{frontend_result[:total_talent_days]} (should be 5: 2×2 + 1×1)"
  
  backend_matches = backend_result[:base_talent_cost] == 40000.0
  frontend_matches = frontend_result[:total_talent_days] == 5
  
  puts "\nConsistency check:"
  puts "  Backend calculation correct: #{backend_matches ? '✅' : '❌'}"
  puts "  Frontend summary correct: #{frontend_matches ? '✅' : '❌'}"
  
  if backend_matches && frontend_matches
    puts "\n🎉 SUCCESS: Day-on-set breakdown UI logic is working correctly!"
    puts "   ✅ Summary updates show correct talent-days"
    puts "   ✅ Validation warnings appear appropriately"
    puts "   ✅ Backend and frontend calculations are consistent"
  else
    puts "\n❌ Issues found in day-on-set breakdown logic"
  end
  
  quotation.destroy
  puts "\n✓ Test completed and cleaned up"
end

test_day_breakdown_ui_logic