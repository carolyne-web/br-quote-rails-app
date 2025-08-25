# db/seeds.rb
# Clear existing data
puts "Clearing existing data..."
Setting.destroy_all
Territory.destroy_all
ProductionHouse.destroy_all

# Create default admin production house for testing
ProductionHouse.create!(
  name: "Demo Production House",
  code: "DEMO001",
  password: "password123"
)

puts "Created demo production house (code: DEMO001, password: password123)"

# Talent Categories Base Rates
talent_rates = [
  { key: 'lead_base_rate', value: '5000', display: 'Lead' },
  { key: 'second_lead_base_rate', value: '3000', display: 'Second Lead' },
  { key: 'featured_extra_base_rate', value: '1500', display: 'Featured Extra' },
  { key: 'teenager_base_rate', value: '1000', display: 'Teenager' },
  { key: 'kid_base_rate', value: '800', display: 'Kid' },
  { key: 'walk_on_base_rate', value: '500', display: 'Walk-on' },
  { key: 'extras_base_rate', value: '300', display: 'Extras' }
]

talent_rates.each do |rate|
  Setting.create!(
    key: rate[:key],
    value: rate[:value],
    data_type: 'decimal',
    category: 'talent'
  )
end

# Duration settings
durations = [
  { key: 'duration_1_month', value: '100' },
  { key: 'duration_3_months', value: '150' },
  { key: 'duration_6_months', value: '200' },
  { key: 'duration_12_months', value: '300' },
  { key: 'duration_18_months', value: '400' },
  { key: 'duration_24_months', value: '500' },
  { key: 'duration_36_months', value: '600' }
]

durations.each do |duration|
  Setting.create!(
    key: duration[:key],
    value: duration[:value],
    data_type: 'decimal',
    category: 'duration'
  )
end

# Exclusivity settings
exclusivity_settings = [
  { key: 'exclusivity_none', value: '100' },
  { key: 'exclusivity_level_1', value: '125' },
  { key: 'exclusivity_level_2', value: '150' },
  { key: 'exclusivity_level_3', value: '175' },
  { key: 'exclusivity_level_4', value: '200' },
  { key: 'exclusivity_pharma_1', value: '150' },
  { key: 'exclusivity_pharma_2', value: '175' },
  { key: 'exclusivity_pharma_3', value: '200' },
  { key: 'exclusivity_pharma_4', value: '250' }
]

exclusivity_settings.each do |setting|
  Setting.create!(
    key: setting[:key],
    value: setting[:value],
    data_type: 'decimal',
    category: 'general'
  )
end

# Individual Countries - All Media
countries_all_media = [
  # Africa
  { name: 'Algeria', percentage: 120 },
  { name: 'Egypt', percentage: 165 },
  { name: 'Morocco', percentage: 120 },
  { name: 'Nigeria', percentage: 180 },
  { name: 'South Africa', percentage: 200 },
  
  # North America
  { name: 'Mexico', percentage: 300 },
  { name: 'Canada', percentage: 200 },
  { name: 'USA', percentage: 500 },
  
  # South America
  { name: 'Argentina', percentage: 175 },
  { name: 'Brazil', percentage: 300 },
  { name: 'Colombia', percentage: 165 },
  
  # Europe
  { name: 'Austria', percentage: 120 },
  { name: 'Belarus', percentage: 100 },
  { name: 'Belgium', percentage: 120 },
  { name: 'Czech Republic', percentage: 120 },
  { name: 'Denmark', percentage: 120 },
  { name: 'Finland', percentage: 120 },
  { name: 'France', percentage: 300 },
  { name: 'Germany', percentage: 300 },
  { name: 'Greece', percentage: 120 },
  { name: 'Hungary', percentage: 120 },
  { name: 'Ireland', percentage: 120 },
  { name: 'Italy', percentage: 300 },
  { name: 'Netherlands', percentage: 165 },
  { name: 'Norway', percentage: 120 },
  { name: 'Poland', percentage: 240 },
  { name: 'Portugal', percentage: 120 },
  { name: 'Romania', percentage: 165 },
  { name: 'Russia', percentage: 300 },
  { name: 'Spain', percentage: 300 },
  { name: 'Sweden', percentage: 120 },
  { name: 'Switzerland', percentage: 120 },
  { name: 'Ukraine', percentage: 240 },
  { name: 'UK', percentage: 300 },
  { name: 'Serbia & Montenegro', percentage: 120 },
  
  # Asia
  { name: 'China', percentage: 300 },
  { name: 'Hong Kong', percentage: 120 },
  { name: 'India', percentage: 300 },
  { name: 'Indonesia', percentage: 240 },
  { name: 'Japan', percentage: 300 },
  { name: 'Korea South', percentage: 240 },
  { name: 'Malaysia', percentage: 165 },
  { name: 'Pakistan', percentage: 165 },
  { name: 'Philippines', percentage: 180 },
  { name: 'Singapore', percentage: 120 },
  { name: 'Taiwan', percentage: 180 },
  { name: 'Thailand', percentage: 240 },
  
  # Middle East
  { name: 'Saudi Arabia', percentage: 120 },
  { name: 'Turkey', percentage: 240 },
  { name: 'UAE inc Dubai', percentage: 120 },
  
  # Australasia/Pacific
  { name: 'Australia', percentage: 210 },
  { name: 'New Zealand', percentage: 100 }
]

countries_all_media.each do |country|
  Territory.create!(
    name: country[:name],
    percentage: country[:percentage],
    media_type: 'all_media'
  )
end

# Territory Combinations
territory_combinations = [
  # Africa Groups
  { name: 'Pan Africa', percentage: 400, group_name: 'Africa Combinations' },
  { name: 'Sub-Sahara excl South Africa', percentage: 310, group_name: 'Africa Combinations' },
  { name: 'Central Africa', percentage: 200, group_name: 'Africa Combinations' },
  { name: 'North Africa', percentage: 250, group_name: 'Africa Combinations' },
  
  # Americas Groups
  { name: 'Central America', percentage: 300, group_name: 'Americas Combinations' },
  { name: 'Caribbean', percentage: 200, group_name: 'Americas Combinations' },
  { name: 'Central America & Caribbean', percentage: 400, group_name: 'Americas Combinations' },
  { name: 'USA & Mexico', percentage: 600, group_name: 'Americas Combinations' },
  { name: 'USA & Canada', percentage: 600, group_name: 'Americas Combinations' },
  { name: 'South America', percentage: 400, group_name: 'Americas Combinations' },
  { name: 'Latin America', percentage: 400, group_name: 'Americas Combinations' },
  
  # Europe Groups
  { name: 'Scandinavia', percentage: 250, group_name: 'Europe Combinations' },
  { name: 'West Europe (incl UK)', percentage: 600, group_name: 'Europe Combinations' },
  { name: 'West Europe (excl UK)', percentage: 500, group_name: 'Europe Combinations' },
  { name: 'German Speaking', percentage: 400, group_name: 'Europe Combinations' },
  { name: 'East Europe', percentage: 400, group_name: 'Europe Combinations' },
  { name: 'All Europe (excl UK)', percentage: 600, group_name: 'Europe Combinations' },
  { name: 'All Europe (incl UK)', percentage: 750, group_name: 'Europe Combinations' },
  { name: 'Central Europe', percentage: 350, group_name: 'Europe Combinations' },
  { name: 'CEE (Excl Russia)', percentage: 400, group_name: 'Europe Combinations' },
  { name: 'CEE (incl Russia)', percentage: 500, group_name: 'Europe Combinations' },
  { name: 'CIS (excl Russia)', percentage: 400, group_name: 'Europe Combinations' },
  { name: 'CIS (incl Russia)', percentage: 500, group_name: 'Europe Combinations' },
  
  # Asia & Middle East Groups
  { name: 'All Asia', percentage: 600, group_name: 'Asia Combinations' },
  { name: 'South East Asia', percentage: 300, group_name: 'Asia Combinations' },
  { name: 'Near & Middle East', percentage: 300, group_name: 'Middle East Combinations' },
  { name: 'Mid E & N Afr (MENA)', percentage: 600, group_name: 'Middle East Combinations' },
  { name: 'Pan Arabic', percentage: 400, group_name: 'Middle East Combinations' },
  { name: 'Gulf Co-operation Council', percentage: 400, group_name: 'Middle East Combinations' },
  
  # Pacific Groups
  { name: 'Austral/Pacific (incl Austrl)', percentage: 400, group_name: 'Pacific Combinations' },
  { name: 'Austral/Pacific (excl Austrl)', percentage: 300, group_name: 'Pacific Combinations' },
  
  # Global Groups
  { name: 'EMEA Countries', percentage: 1200, group_name: 'Global Combinations' },
  { name: 'BRICS Countries', percentage: 800, group_name: 'Global Combinations' },
  { name: 'Worldwide', percentage: 1200, group_name: 'Global Combinations' },
  { name: 'USA, Mexico, Canada', percentage: 700, group_name: 'Global Combinations' }
]

territory_combinations.each do |combo|
  Territory.create!(
    name: combo[:name],
    percentage: combo[:percentage],
    media_type: 'all_media',
    group_name: combo[:group_name]
  )
end

puts "Seeded #{Setting.count} settings and #{Territory.count} territories"