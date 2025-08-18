class CreateQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    create_table :quotation_details do |t|
      t.references :quotation, null: false, foreign_key: true
      t.integer :rehearsal_days
      t.integer :travel_days
      t.integer :down_days
      t.string :exclusivity_type
      t.integer :exclusivity_level
      t.boolean :pharmaceutical
      t.string :duration

      t.timestamps
    end
  end
end
