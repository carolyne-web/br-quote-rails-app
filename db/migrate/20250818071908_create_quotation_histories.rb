class CreateQuotationHistories < ActiveRecord::Migration[8.0]
  def change
    create_table :quotation_histories do |t|
      t.references :quotation, null: false, foreign_key: true
      t.string :action
      t.string :user
      t.json :data

      t.timestamps
    end
  end
end
