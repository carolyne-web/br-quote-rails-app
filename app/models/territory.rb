class Territory < ApplicationRecord
  # Validations
  validates :name, presence: true, uniqueness: { scope: :media_type }
  validates :percentage, presence: true,
            numericality: { greater_than: 0, less_than_or_equal_to: 10000 }
end
