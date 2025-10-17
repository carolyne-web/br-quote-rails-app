class AddExclusivityTypeToFinalQuotationTalentLines < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotation_talent_lines, :exclusivity_type, :string
  end
end