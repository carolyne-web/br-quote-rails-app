class CreateDayOnSets < ActiveRecord::Migration[8.0]
  def change
    create_table :day_on_sets do |t|
      t.references :talent_category, null: false, foreign_key: true
      t.integer :talent_count
      t.integer :days_count

      t.timestamps
    end
  end
end
