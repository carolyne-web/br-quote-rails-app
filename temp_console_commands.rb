
# Check territory exceptions for USA and moving media
puts 'Territory Exceptions:'
TerritoryMediaException.all.each do |ex|
  puts "Territory: #{ex.territory&.name}, Media: #{ex.media_type}, Percentage: #{ex.percentage_multiplier}%"
end

puts '
Territories:'
Territory.where("name ILIKE ?", "%usa%").or(Territory.where("name ILIKE ?", "%united%")).each do |t|
  puts "#{t.id}: #{t.name}"
end

puts '
USA Moving Media Exceptions:'
usa_territories = Territory.where("name ILIKE ?", "%usa%").or(Territory.where("name ILIKE ?", "%united%"))
usa_territories.each do |territory|
  exceptions = TerritoryMediaException.where(territory: territory, media_type: 'moving')
  exceptions.each do |ex|
    puts "#{territory.name} - #{ex.media_type}: #{ex.percentage_multiplier}%"
  end
end

