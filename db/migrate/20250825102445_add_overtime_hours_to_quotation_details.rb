class AddOvertimeHoursToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :overtime_hours, :decimal
  end
end
