# Territory Media Exceptions Seed Data
# Run with: rails runner db/seeds/territory_media_exceptions.rb

puts "Creating territory media exceptions..."

exceptions = [
  # Worldwide exceptions
  { territory: 'Worldwide', media: 'all_media', percentage: 1200, description: 'Worldwide All Media exception' },
  { territory: 'Worldwide', media: 'all_moving', percentage: 1000, description: 'Worldwide All Moving Media exception' },
  { territory: 'Worldwide', media: 'internet', percentage: 600, description: 'Worldwide Internet Only exception' },

  # USA & Canada exceptions
  { territory: 'USA & Canada', media: 'all_media', percentage: 600, description: 'USA & Canada All Media exception' },
  { territory: 'USA & Canada', media: 'all_moving', percentage: 500, description: 'USA & Canada All Moving Media exception (instead of 450%)' },
  { territory: 'USA & Canada', media: 'internet', percentage: 250, description: 'USA & Canada Internet Only exception' }
]

exceptions.each do |ex|
  exception = TerritoryMediaException.find_or_create_by(
    territory_name: ex[:territory],
    media_type: ex[:media]
  ) do |record|
    record.percentage = ex[:percentage]
    record.description = ex[:description]
  end

  if exception.persisted?
    puts "✅ Created: #{ex[:territory]} + #{ex[:media]} = #{ex[:percentage]}%"
  else
    puts "❌ Failed to create: #{ex[:territory]} + #{ex[:media]} - #{exception.errors.full_messages.join(', ')}"
  end
end

puts "Territory media exceptions seeding completed!"
puts "Total exceptions: #{TerritoryMediaException.count}"