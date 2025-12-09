namespace :territories do
  desc "Seed missing individual country territories"
  task seed_missing: :environment do
    puts "========================================="
    puts "Starting to seed missing territories..."
    puts "Current time: #{Time.current}"
    puts "========================================="

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
    updated_count = 0
    skipped_count = 0
    error_count = 0

    puts "\nProcessing #{countries_all_media.count} territories..."
    puts "-" * 40

    countries_all_media.each do |country|
      begin
        # Find existing territory or create new one
        territory = Territory.find_or_initialize_by(name: country[:name], media_type: 'all_media')

        if territory.new_record?
          # New territory - create it
          territory.percentage = country[:percentage]
          territory.group_name = nil  # Ensure it's marked as individual territory

          if territory.save
            created_count += 1
            puts "  ✓ Created: #{country[:name]} (#{country[:percentage]}%)"
          else
            error_count += 1
            puts "  ✗ Failed to create: #{country[:name]} - #{territory.errors.full_messages.join(', ')}"
          end
        elsif territory.percentage != country[:percentage]
          # Existing territory with different percentage - update it
          old_percentage = territory.percentage
          territory.percentage = country[:percentage]

          if territory.save
            updated_count += 1
            puts "  ↻ Updated: #{country[:name]} (#{old_percentage}% → #{country[:percentage]}%)"
          else
            error_count += 1
            puts "  ✗ Failed to update: #{country[:name]} - #{territory.errors.full_messages.join(', ')}"
          end
        else
          # Existing territory with same data - skip
          skipped_count += 1
          puts "  - Already exists: #{country[:name]} (#{country[:percentage]}%)"
        end
      rescue => e
        error_count += 1
        puts "  ✗ Error processing #{country[:name]}: #{e.message}"
        puts "    #{e.backtrace.first}"
      end
    end

    puts "\n========================================="
    puts "Territory Seeding Complete!"
    puts "========================================="
    puts "Total territories in source list: #{countries_all_media.count}"
    puts "Created: #{created_count}"
    puts "Updated: #{updated_count}"
    puts "Skipped (no changes): #{skipped_count}"
    puts "Errors: #{error_count}"
    puts "-" * 40
    puts "Database Status:"
    puts "  Total territories: #{Territory.count}"
    puts "  Individual territories (no group): #{Territory.where(group_name: nil).count}"
    puts "  Territory groups: #{Territory.where.not(group_name: nil).pluck(:group_name).uniq.count}"
    puts "========================================="
    puts "Completed at: #{Time.current}"
    puts "========================================="
  end
end
