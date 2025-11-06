class AddOriginalCombinationsDataToFinalQuotations < ActiveRecord::Migration[8.0]
  def change
    add_column :final_quotations, :original_combinations_data, :text
  end
end
