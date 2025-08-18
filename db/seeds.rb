# Clear existing data
Setting.destroy_all
Territory.destroy_all

# Talent Categories Base Rates (example rates - adjust as needed)
Setting.create!(
  key: 'lead_base_rate',
  value: '5000',
  data_type: 'decimal',
  category: 'talent'
)

Setting.create!(
  key: 'second_lead_base_rate',
  value: '3000',
  data_type: 'decimal',
  category: 'talent'
)

Setting.create!(
  key: 'featured_extra_base_rate',
  value: '1500',
  data_type: 'decimal',
  category: 'talent'
)

Setting.create!(
  key: 'teenager_base_rate',
  value: '1000',
  data_type: 'decimal',
  category: 'talent'
)

Setting.create!(
  key: 'kid_base_rate',
  value: '800',
  data_type: 'decimal',
  category: 'talent'
)

Setting.create!(
  key: 'walk_on_base_rate',
  value: '500',
  data_type: 'decimal',
  category: 'talent'
)

# Duration settings
durations = [
  { key: 'duration_1_month', value: '100', display: 'Up to 1 month' },
  { key: 'duration_3_months', value: '150', display: 'Up to 3 months' },
  { key: 'duration_6_months', value: '200', display: 'Up to 6 months' },
  { key: 'duration_12_months', value: '300', display: 'Up to 12 months' },
  { key: 'duration_18_months', value: '400', display: 'Up to 18 months' },
  { key: 'duration_24_months', value: '500', display: 'Up to 24 months' },
  { key: 'duration_36_months', value: '600', display: 'Up to 36 months' }
]

durations.each do |duration|
  Setting.create!(
    key: duration[:key],
    value: duration[:value],
    data_type: 'decimal',
    category: 'duration'
  )
end

# Import territories from your PDF data
# Individual countries
territories_data = [
  { name: 'Algeria', percentage: 120, media_type: 'all_media' },
  { name: 'Egypt', percentage: 165, media_type: 'all_media' },
  { name: 'Morocco', percentage: 120, media_type: 'all_media' },
  { name: 'Nigeria', percentage: 180, media_type: 'all_media' },
  { name: 'South Africa', percentage: 200, media_type: 'all_media' },
  { name: 'Mexico', percentage: 300, media_type: 'all_media' },
  { name: 'Canada', percentage: 200, media_type: 'all_media' },
  { name: 'USA', percentage: 500, media_type: 'all_media' },
  { name: 'France', percentage: 300, media_type: 'all_media' },
  { name: 'UK', percentage: 300, media_type: 'all_media' },
  # Add all other countries from your PDF...
]

territories_data.each do |territory|
  Territory.create!(territory)
end

# Territory combinations/groups
territory_groups = [
  { name: 'Pan Africa', percentage: 400, media_type: 'all_media', group_name: 'Africa Groups' },
  { name: 'USA & Canada', percentage: 600, media_type: 'all_media', group_name: 'North America Groups' },
  { name: 'Worldwide', percentage: 1200, media_type: 'all_media', group_name: 'Global' },
  # Add all other groups from your PDF...
]

territory_groups.each do |group|
  Territory.create!(group)
end

puts "Seeded #{Setting.count} settings and #{Territory.count} territories"
