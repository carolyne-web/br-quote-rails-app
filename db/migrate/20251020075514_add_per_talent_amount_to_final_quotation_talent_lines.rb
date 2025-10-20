class AddPerTalentAmountToFinalQuotationTalentLines < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_talent_lines, :per_talent_amount, :decimal, precision: 12, scale: 2
  end
end
