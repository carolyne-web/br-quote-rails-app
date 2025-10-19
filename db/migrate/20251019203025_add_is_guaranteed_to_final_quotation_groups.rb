class AddIsGuaranteedToFinalQuotationGroups < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_groups, :is_guaranteed, :boolean
  end
end
