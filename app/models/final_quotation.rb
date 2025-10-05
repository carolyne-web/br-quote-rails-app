class FinalQuotation < ApplicationRecord
  belongs_to :quotation
  has_many :final_quotation_groups, dependent: :destroy
  has_many :final_quotation_adjustments, dependent: :destroy

  accepts_nested_attributes_for :final_quotation_groups, allow_destroy: true
  accepts_nested_attributes_for :final_quotation_adjustments, allow_destroy: true

  validates :project_name, presence: true
  validates :project_number, presence: true
  validates :product_type, presence: true
  validates :commercial_type, presence: true
end