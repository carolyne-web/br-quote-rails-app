class AddDaysFieldsToDayOnSets < ActiveRecord::Migration[8.0]
  def change
    add_column :day_on_sets, :rehearsal_days, :integer
    add_column :day_on_sets, :down_days, :integer
    add_column :day_on_sets, :travel_days, :integer
    add_column :day_on_sets, :overtime_hours, :decimal
  end
end
