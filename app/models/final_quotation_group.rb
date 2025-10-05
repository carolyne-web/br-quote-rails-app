class FinalQuotationGroup < ApplicationRecord
  belongs_to :final_quotation
  has_many :final_quotation_talent_lines, dependent: :destroy

  accepts_nested_attributes_for :final_quotation_talent_lines, allow_destroy: true

  validates :group_number, presence: true
  validates :duration, presence: true
  # Allow empty arrays for territories and media types
  # validates :selected_territories, presence: true
  # validates :selected_media_types, presence: true

  scope :ordered, -> { order(:group_number) }
end