class CreateQuotationAdjustments < ActiveRecord::Migration[8.0]
  def change
    create_table :quotation_adjustments do |t|
      t.references :quotation, null: false, foreign_key: true
      t.string :description
      t.decimal :percentage

      t.timestamps
    end
  end
end
