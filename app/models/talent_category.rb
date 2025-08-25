class TalentCategory < ApplicationRecord
  belongs_to :quotation
  has_many :day_on_sets, dependent: :destroy

  # Accept nested attributes for day-on-set breakdowns
  accepts_nested_attributes_for :day_on_sets, allow_destroy: true

  # Auto-set daily rate before validation if not present
  before_validation :set_default_daily_rate, if: :daily_rate_blank?

  # Define category types as constants
  TYPES = {
    1 => "Lead",
    2 => "Second Lead", 
    3 => "Featured Extra",
    4 => "Teenager",
    5 => "Kid",
    6 => "Walk-on",
    7 => "Extras"
  }.freeze

  def display_name
    TYPES[category_type] || "Unknown"
  end

  def icon
    case category_type
    when 1 then "★"
    when 2 then "☆"
    when 3 then "◆"
    when 4 then "♦"
    when 5 then "♥"
    when 6 then "•"
    when 7 then "○"
    else "○"
    end
  end

  def default_daily_rate
    setting_key = case category_type
    when 1 then "lead_base_rate"
    when 2 then "second_lead_base_rate"
    when 3 then "featured_extra_base_rate"
    when 4 then "teenager_base_rate"
    when 5 then "kid_base_rate"
    when 6 then "walk_on_base_rate"
    when 7 then "extras_base_rate"
    end

    Setting.find_by(key: setting_key)&.typed_value || 0
  end

  def total_talent_days
    if day_on_sets.any?
      day_on_sets.sum { |dos| dos.talent_count * dos.days_count }
    else
      initial_count * (quotation.quotation_detail&.shoot_days || 1)
    end
  end

  def total_cost
    rate = adjusted_rate || daily_rate || default_daily_rate

    if day_on_sets.any?
      day_on_sets.sum { |dos| dos.talent_count * dos.days_count * rate }
    else
      initial_count * (quotation.quotation_detail&.shoot_days || 1) * rate
    end
  end

  private

  def daily_rate_blank?
    daily_rate.blank? || daily_rate == 0
  end

  def set_default_daily_rate
    self.daily_rate = default_daily_rate
  end
end
