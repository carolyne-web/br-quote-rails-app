namespace :territories do
  desc "Seed missing individual country territories"
  task seed_missing: :environment do
    puts "Starting to seed missing territories..."

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

    created_count = 0
    skipped_count = 0

    countries_all_media.each do |country|
      territory = Territory.find_or_initialize_by(name: country[:name], media_type: 'all_media')

      if territory.new_record?
        territory.percentage = country[:percentage]
        if territory.save
          created_count += 1
          puts "  ✓ Created: #{country[:name]}"
        else
          puts "  ✗ Failed to create: #{country[:name]} - #{territory.errors.full_messages.join(', ')}"
        end
      else
        skipped_count += 1
        puts "  - Skipped (already exists): #{country[:name]}"
      end
    end

    puts "\n========================================="
    puts "Territory Seeding Complete!"
    puts "========================================="
    puts "Total territories in list: #{countries_all_media.count}"
    puts "Created: #{created_count}"
    puts "Skipped (already existed): #{skipped_count}"
    puts "Total territories in database: #{Territory.count}"
    puts "Individual territories: #{Territory.where(group_name: nil).count}"
    puts "========================================="
  end
end
