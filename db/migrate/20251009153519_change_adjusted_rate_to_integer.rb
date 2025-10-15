class ChangeAdjustedRateToInteger < ActiveRecord::Migration[8.0]
  def change
    change_column :talent_categories, :adjusted_rate, :integer
    change_column :day_on_sets, :adjusted_rate, :integer
  end
end
