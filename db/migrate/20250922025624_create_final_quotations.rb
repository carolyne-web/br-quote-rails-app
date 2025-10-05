class CreateFinalQuotations < ActiveRecord::Migration[8.0]
  def change
    create_table :final_quotations do |t|
      # Link to original quotation
      t.references :quotation, null: false, foreign_key: true

      # Project Information (NO campaign_name as requested)
      t.string :project_name
      t.string :project_number
      t.string :product_type
      t.string :commercial_type
      t.boolean :is_guaranteed, default: false

      # Global shooting details (not per group)
      t.integer :shoot_days
      t.integer :rehearsal_days
      t.integer :travel_days
      t.integer :down_days
      t.integer :overtime_hours

      # Global contract details
      t.string :exclusivity_type
      t.boolean :unlimited_stills
      t.boolean :unlimited_versions

      # Final calculated totals
      t.decimal :total_talent_fee, precision: 10, scale: 2
      t.decimal :total_usage_fee, precision: 10, scale: 2
      t.decimal :total_amount, precision: 10, scale: 2

      t.timestamps
    end

    create_table :final_quotation_groups do |t|
      t.references :final_quotation, null: false, foreign_key: true

      # Group identification
      t.integer :group_number # 1, 2, 3, etc.

      # Group-specific details
      t.string :duration # Can be different per group
      t.json :selected_territories # Territories for this group
      t.json :selected_media_types # Media types for this group

      # Group calculations
      t.decimal :territory_multiplier, precision: 6, scale: 4
      t.decimal :media_multiplier, precision: 6, scale: 4
      t.decimal :duration_multiplier, precision: 6, scale: 4
      t.decimal :exclusivity_multiplier, precision: 6, scale: 4
      t.decimal :group_usage_fee, precision: 10, scale: 2

      t.timestamps
    end

    create_table :final_quotation_talent_lines do |t|
      t.references :final_quotation_group, null: false, foreign_key: true

      # Talent Details
      t.string :description # e.g. "clown"
      t.string :category_type # e.g. "Lead 1", "Lead 2", "Kids"
      t.integer :talent_count
      t.decimal :daily_rate, precision: 8, scale: 2
      t.decimal :rate_adjustment, precision: 8, scale: 2 # +/- amount
      t.decimal :adjusted_rate, precision: 8, scale: 2

      # Days specific to this talent line
      t.integer :shoot_days
      t.integer :rehearsal_days
      t.integer :travel_days
      t.integer :down_days
      t.integer :overtime_hours

      # Night premium - both boolean and amount
      t.boolean :has_night_premium, default: false
      t.decimal :night_premium_amount, precision: 8, scale: 2

      # Calculated fees for this talent line
      t.decimal :base_fee, precision: 8, scale: 2
      t.decimal :rehearsal_fee, precision: 8, scale: 2
      t.decimal :travel_fee, precision: 8, scale: 2
      t.decimal :down_fee, precision: 8, scale: 2
      t.decimal :overtime_fee, precision: 8, scale: 2
      t.decimal :night_fee, precision: 8, scale: 2
      t.decimal :total_talent_fee, precision: 8, scale: 2
      t.decimal :usage_fee, precision: 8, scale: 2
      t.decimal :total_line_cost, precision: 8, scale: 2

      t.timestamps
    end

    create_table :final_quotation_adjustments do |t|
      t.references :final_quotation, null: false, foreign_key: true

      t.string :description
      t.string :adjustment_type # 'discount' or 'surcharge'
      t.decimal :percentage, precision: 5, scale: 2
      t.decimal :amount, precision: 8, scale: 2

      t.timestamps
    end

    add_index :final_quotations, :project_number
    add_index :final_quotations, :created_at
    add_index :final_quotation_groups, [:final_quotation_id, :group_number]
  end
end
