class Quotation < ApplicationRecord
  belongs_to :production_house, optional: true

  has_many :talent_categories, dependent: :destroy
  has_many :quotation_territories, dependent: :destroy
  has_many :territories, through: :quotation_territories
  has_many :quotation_adjustments, dependent: :destroy
  has_many :quotation_histories, dependent: :destroy
  has_one :quotation_detail, dependent: :destroy

  # Accept nested attributes for proper form processing
  accepts_nested_attributes_for :quotation_detail, allow_destroy: true
  accepts_nested_attributes_for :talent_categories, allow_destroy: true
  accepts_nested_attributes_for :quotation_adjustments, allow_destroy: true

  validates :project_name, presence: true
  validates :project_number, presence: true, uniqueness: true

  before_validation :generate_project_number, on: :create

  STATUS_OPTIONS = [ "draft", "sent", "approved", "rejected" ].freeze
  validates :status, inclusion: { in: STATUS_OPTIONS }

  private

  def generate_project_number
    self.project_number ||= "Q#{Date.current.strftime('%Y%m%d')}#{SecureRandom.hex(3).upcase}"
  end
end
