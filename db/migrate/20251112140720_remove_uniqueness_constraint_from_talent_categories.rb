class RemoveUniquenessConstraintFromTalentCategories < ActiveRecord::Migration[8.0]
  def change
    # Remove the unique constraint that prevents multiple talent categories per category_type
    remove_index :talent_categories, name: 'index_talent_categories_on_quotation_id_and_category_type'

    # Add a regular (non-unique) index for performance
    add_index :talent_categories, [:quotation_id, :category_type], name: 'index_talent_categories_on_quotation_id_and_category_type'
  end
end
