class CreateQuotationTerritories < ActiveRecord::Migration[8.0]
  def change
    create_table :quotation_territories do |t|
      t.references :quotation, null: false, foreign_key: true
      t.references :territory, null: false, foreign_key: true
      t.boolean :unlimited_stills
      t.boolean :unlimited_versions
      t.decimal :stills_percentage
      t.decimal :versions_percentage

      t.timestamps
    end
  end
end
