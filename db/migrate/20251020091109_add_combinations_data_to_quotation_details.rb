class AddCombinationsDataToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :combinations_data, :text
  end
end
