class AddExclusivityTypeToTalentCategories < ActiveRecord::Migration[8.0]
  def change
    add_column :talent_categories, :exclusivity_type, :string
  end
end
