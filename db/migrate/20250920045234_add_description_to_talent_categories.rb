class AddDescriptionToTalentCategories < ActiveRecord::Migration[8.0]
  def change
    add_column :talent_categories, :description, :text
  end
end
