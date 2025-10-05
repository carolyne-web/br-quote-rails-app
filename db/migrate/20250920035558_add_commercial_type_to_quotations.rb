class AddCommercialTypeToQuotations < ActiveRecord::Migration[8.0]
  def change
    add_column :quotations, :commercial_type, :string
  end
end
