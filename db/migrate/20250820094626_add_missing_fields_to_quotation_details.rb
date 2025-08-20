class AddMissingFieldsToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :shoot_days, :integer, default: 1
    add_column :quotation_details, :media_type, :string, default: 'all_media'
    add_column :quotation_details, :unlimited_stills, :boolean, default: false
    add_column :quotation_details, :unlimited_versions, :boolean, default: false
  end
end
