class DayOnSet < ApplicationRecord
  belongs_to :talent_category

  # Validations
  validates :talent_count, presence: true,
            numericality: { greater_than: 0, only_integer: true }
  validates :days_count, presence: true,
            numericality: { greater_than: 0, only_integer: true }
  validates :adjusted_rate, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :rehearsal_days, numericality: { greater_than_or_equal_to: 0, only_integer: true, allow_nil: true }
  validates :down_days, numericality: { greater_than_or_equal_to: 0, only_integer: true, allow_nil: true }
  validates :travel_days, numericality: { greater_than_or_equal_to: 0, only_integer: true, allow_nil: true }
  validates :overtime_hours, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :buyout_percentage, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
end
