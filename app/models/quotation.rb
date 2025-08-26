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

  STATUS_OPTIONS = [ "draft", "pending", "under_review", "approved", "rejected", "completed" ].freeze
  validates :status, inclusion: { in: STATUS_OPTIONS }

  scope :recent, -> { order(created_at: :desc) }
  scope :needs_attention, -> { where(status: ['pending', 'under_review']) }
  scope :draft, -> { where(status: 'draft') }
  scope :pending, -> { where(status: 'pending') }
  scope :under_review, -> { where(status: 'under_review') }
  scope :approved, -> { where(status: 'approved') }
  scope :rejected, -> { where(status: 'rejected') }
  scope :completed, -> { where(status: 'completed') }

  # Status checker methods
  def draft?
    status == 'draft'
  end

  def pending?
    status == 'pending'
  end

  def under_review?
    status == 'under_review'
  end

  def approved?
    status == 'approved'
  end

  def rejected?
    status == 'rejected'
  end

  def completed?
    status == 'completed'
  end

  def status_badge_class
    case status
    when 'draft'
      'bg-gray-100 text-gray-800'
    when 'pending'
      'bg-yellow-100 text-yellow-800'
    when 'under_review'
      'bg-blue-100 text-blue-800'
    when 'approved'
      'bg-green-100 text-green-800'
    when 'rejected'
      'bg-red-100 text-red-800'
    when 'completed'
      'bg-purple-100 text-purple-800'
    else
      'bg-gray-100 text-gray-800'
    end
  end

  def can_transition_to?(new_status)
    case status
    when 'draft'
      ['pending'].include?(new_status)
    when 'pending'
      ['under_review', 'rejected'].include?(new_status)
    when 'under_review'
      ['approved', 'rejected', 'pending'].include?(new_status)
    when 'approved'
      ['completed'].include?(new_status)
    when 'rejected'
      ['pending'].include?(new_status)
    when 'completed'
      false # completed is final
    else
      false
    end
  end

  def next_statuses
    case status
    when 'draft'
      ['pending']
    when 'pending'
      ['under_review', 'rejected']
    when 'under_review'
      ['approved', 'rejected', 'pending']
    when 'approved'
      ['completed']
    when 'rejected'
      ['pending']
    else
      []
    end
  end

  private

  def generate_project_number
    self.project_number ||= "Q#{Date.current.strftime('%Y%m%d')}#{SecureRandom.hex(3).upcase}"
  end
end
