class AddNumberOfCommercialsToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :number_of_commercials, :integer, default: 1
  end
end
