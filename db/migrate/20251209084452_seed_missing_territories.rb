class SeedMissingTerritories < ActiveRecord::Migration[8.0]
  def up
    # This migration only ADDS missing territories, it does NOT delete or modify existing data

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

    # Only create territories that don't exist yet (safe operation)
    countries_all_media.each do |country|
      Territory.find_or_create_by!(name: country[:name], media_type: 'all_media') do |territory|
        territory.percentage = country[:percentage]
      end
    end

    puts "✅ Seeded #{countries_all_media.count} individual country territories (only created missing ones)"
  end

  def down
    # Intentionally left empty - we don't want to delete territories on rollback
    # as they may be in use by quotations
  end
end
