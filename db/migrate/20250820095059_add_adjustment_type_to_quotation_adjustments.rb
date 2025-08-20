class AddAdjustmentTypeToQuotationAdjustments < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_adjustments, :adjustment_type, :string, default: 'discount'
  end
end