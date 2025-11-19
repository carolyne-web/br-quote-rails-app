class AddCurrencyToFinalQuotations < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotations, :currency, :string
  end
end
