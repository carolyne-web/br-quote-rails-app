class AddCampaignFieldsToQuotations < ActiveRecord::Migration[8.0]
  def change
    add_column :quotations, :campaign_name, :string
    add_column :quotations, :product_type, :string
    add_column :quotations, :is_guaranteed, :boolean, default: false
  end
end
