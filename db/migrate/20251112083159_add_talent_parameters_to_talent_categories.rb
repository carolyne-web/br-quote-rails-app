class AddTalentParametersToTalentCategories < ActiveRecord::Migration[8.0]
  def change
    # Rename existing standby_days to down_days to match form field names
    rename_column :talent_categories, :standby_days, :down_days

    # Add new talent parameter fields
    add_column :talent_categories, :rehearsal_days, :integer
    add_column :talent_categories, :travel_days, :integer
    add_column :talent_categories, :night_premium, :boolean
  end
end
