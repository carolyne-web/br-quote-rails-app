class Territory < ApplicationRecord
  # Validations
  validates :name, presence: true, uniqueness: { scope: :media_type }
  validates :percentage, presence: true,
            numericality: { greater_than: 0, less_than_or_equal_to: 10000 }

  # Convert empty string to nil for group_name (individual territories)
  before_save :normalize_group_name

  private

  def normalize_group_name
    self.group_name = nil if group_name.blank?
  end
end
