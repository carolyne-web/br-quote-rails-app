class AddDetailsTodayOnSets < ActiveRecord::Migration[8.0]
  def change
    add_column :day_on_sets, :description, :text
    add_column :day_on_sets, :adjusted_rate, :decimal, precision: 8, scale: 2
  end
end
