class AddCommercialCountToFinalQuotationTalentLines < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_talent_lines, :commercial_count, :integer
  end
end
