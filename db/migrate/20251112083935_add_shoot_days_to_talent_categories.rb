class AddShootDaysToTalentCategories < ActiveRecord::Migration[8.0]
  def change
    add_column :talent_categories, :shoot_days, :integer
  end
end
