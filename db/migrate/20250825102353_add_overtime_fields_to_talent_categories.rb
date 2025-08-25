class AddOvertimeFieldsToTalentCategories < ActiveRecord::Migration[8.0]
  def change
    add_column :talent_categories, :overtime_hours, :decimal
    add_column :talent_categories, :standby_days, :integer
  end
end
