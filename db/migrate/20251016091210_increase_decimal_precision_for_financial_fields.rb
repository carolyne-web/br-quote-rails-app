class IncreaseDecimalPrecisionForFinancialFields < ActiveRecord::Migration[8.0]
  def change
    # Increase precision from 8,2 to 12,2 for all financial fields
    # This allows values up to 9,999,999,999.99 instead of 999,999.99

    # final_quotation_talent_lines table
    change_column :final_quotation_talent_lines, :daily_rate, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :rate_adjustment, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :adjusted_rate, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :night_premium_amount, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :base_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :rehearsal_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :travel_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :down_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :overtime_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :night_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :total_talent_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :usage_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotation_talent_lines, :total_line_cost, :decimal, precision: 12, scale: 2

    # final_quotations table totals
    change_column :final_quotations, :total_talent_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotations, :total_usage_fee, :decimal, precision: 12, scale: 2
    change_column :final_quotations, :total_amount, :decimal, precision: 12, scale: 2

    # day_on_sets table
    change_column :day_on_sets, :adjusted_rate, :decimal, precision: 12, scale: 2

    # talent_categories table
    change_column :talent_categories, :daily_rate, :decimal, precision: 12, scale: 2
    change_column :talent_categories, :adjusted_rate, :decimal, precision: 12, scale: 2
  end
end