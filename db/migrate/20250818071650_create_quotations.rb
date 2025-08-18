class CreateQuotations < ActiveRecord::Migration[8.0]
  def change
    create_table :quotations do |t|
      t.string :project_name, null: false
      t.string :project_number, null: false
      t.references :production_house, null: false, foreign_key: true
      t.string :status, default: 'draft'
      t.decimal :total_amount, precision: 10, scale: 2
      t.timestamps
    end

    add_index :quotations, :project_number, unique: true
    add_index :quotations, :status
  end
end
