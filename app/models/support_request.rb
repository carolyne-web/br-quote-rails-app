class SupportRequest < ApplicationRecord
  belongs_to :production_house, optional: false

  validates :subject, presence: true, length: { maximum: 255 }
  validates :message, presence: true, length: { maximum: 5000 }
  validates :priority, presence: true, inclusion: { in: [0, 1, 2, 3] }
  validates :status, presence: true, inclusion: { in: [0, 1, 2, 3] }

  # Manual status and priority methods instead of enum due to Rails 8 compatibility
  PRIORITY_OPTIONS = %w[low medium high urgent].freeze
  STATUS_OPTIONS = %w[open in_progress resolved closed].freeze

  def self.priorities
    { 'low' => 0, 'medium' => 1, 'high' => 2, 'urgent' => 3 }
  end

  def self.statuses
    { 'open' => 0, 'in_progress' => 1, 'resolved' => 2, 'closed' => 3 }
  end

  # Priority checker methods
  def low?
    priority == 0
  end

  def medium?
    priority == 1
  end

  def high?
    priority == 2
  end

  def urgent?
    priority == 3
  end

  # Status checker methods
  def open?
    status == 0
  end

  def in_progress?
    status == 1
  end

  def resolved?
    status == 2
  end

  def closed?
    status == 3
  end

  # Scopes
  def self.low
    where(priority: 0)
  end

  def self.medium
    where(priority: 1)
  end

  def self.high
    where(priority: 2)
  end

  def self.urgent
    where(priority: 3)
  end

  def self.open
    where(status: 0)
  end

  def self.in_progress
    where(status: 1)
  end

  def self.resolved
    where(status: 2)
  end

  def self.closed
    where(status: 3)
  end

  scope :recent, -> { order(created_at: :desc) }
  scope :unresolved, -> { where.not(status: [2, 3]) }

  def status_badge_class
    case status
    when 0  # open
      'bg-red-100 text-red-800'
    when 1  # in_progress
      'bg-yellow-100 text-yellow-800'
    when 2  # resolved
      'bg-green-100 text-green-800'
    when 3  # closed
      'bg-gray-100 text-gray-800'
    end
  end

  def priority_badge_class
    case priority
    when 0  # low
      'bg-gray-100 text-gray-800'
    when 1  # medium
      'bg-blue-100 text-blue-800'
    when 2  # high
      'bg-orange-100 text-orange-800'
    when 3  # urgent
      'bg-red-100 text-red-800'
    end
  end

  def status_name
    case status
    when 0 then 'Open'
    when 1 then 'In Progress'
    when 2 then 'Resolved'
    when 3 then 'Closed'
    end
  end

  def priority_name
    case priority
    when 0 then 'Low'
    when 1 then 'Medium'
    when 2 then 'High'
    when 3 then 'Urgent'
    end
  end
end