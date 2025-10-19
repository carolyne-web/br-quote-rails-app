class AddUnlimitedFieldsToFinalQuotationGroups < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_groups, :unlimited_stills, :boolean
    add_column :final_quotation_groups, :unlimited_versions, :boolean
  end
end
