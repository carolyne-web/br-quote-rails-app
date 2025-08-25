class AddSelectedMediaTypesToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :selected_media_types, :text
  end
end
