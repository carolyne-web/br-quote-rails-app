class FinalQuotationAdjustment < ApplicationRecord
  belongs_to :final_quotation

  validates :description, presence: true
  validates :adjustment_type, presence: true, inclusion: { in: %w[discount surcharge] }
  validates :percentage, presence: true, numericality: { greater_than: 0 }
  validates :amount, presence: true, numericality: true
end