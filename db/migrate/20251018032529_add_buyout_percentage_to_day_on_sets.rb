class AddBuyoutPercentageToDayOnSets < ActiveRecord::Migration[8.0]
  def change
    add_column :day_on_sets, :buyout_percentage, :decimal, precision: 6, scale: 2
  end
end
