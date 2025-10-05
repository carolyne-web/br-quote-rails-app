class AddNightPremiumToDayOnSets < ActiveRecord::Migration[8.0]
  def change
    add_column :day_on_sets, :night_premium, :boolean, default: false
  end
end
