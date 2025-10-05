class FinalQuotationTalentLine < ApplicationRecord
  belongs_to :final_quotation_group

  validates :description, presence: true
  validates :category_type, presence: true
  validates :talent_count, presence: true, numericality: { greater_than: 0 }
  validates :daily_rate, presence: true, numericality: { greater_than: 0 }
  validates :adjusted_rate, presence: true, numericality: { greater_than: 0 }

  before_save :calculate_totals

  private

  def calculate_totals
    # Calculate base fees
    self.base_fee = talent_count * adjusted_rate * shoot_days
    self.rehearsal_fee = talent_count * adjusted_rate * rehearsal_days * 0.5
    self.travel_fee = talent_count * adjusted_rate * travel_days * 0.5
    self.down_fee = talent_count * adjusted_rate * down_days * 0.5

    # Calculate overtime
    hourly_rate = adjusted_rate * 0.1
    self.overtime_fee = talent_count * hourly_rate * overtime_hours

    # Calculate night premium
    self.night_fee = has_night_premium ? night_premium_amount : 0

    # Calculate total talent fee
    self.total_talent_fee = base_fee + rehearsal_fee + travel_fee + down_fee + overtime_fee + night_fee

    # Total line cost includes usage fee
    self.total_line_cost = total_talent_fee + usage_fee
  end
end