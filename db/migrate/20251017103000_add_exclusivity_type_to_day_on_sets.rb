class AddExclusivityTypeToDayOnSets < ActiveRecord::Migration[8.0]
  def change
    add_column :day_on_sets, :exclusivity_type, :string
  end
end