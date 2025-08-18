class CreateTalentCategories < ActiveRecord::Migration[8.0]
  def change
    create_table :talent_categories do |t|
      t.references :quotation, null: false, foreign_key: true
      t.integer :category_type, null: false
      t.integer :initial_count, default: 0
      t.decimal :daily_rate, precision: 8, scale: 2
      t.decimal :adjusted_rate, precision: 8, scale: 2
      t.timestamps
    end

    add_index :talent_categories, [:quotation_id, :category_type], unique: true
  end
end
