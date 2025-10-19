class AddBuyoutPercentageToFinalQuotationTalentLines < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_talent_lines, :buyout_percentage, :decimal, precision: 6, scale: 2
  end
end
