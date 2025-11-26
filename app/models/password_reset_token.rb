class PasswordResetToken < ApplicationRecord
  validates :token, presence: true, uniqueness: true
  validates :email, presence: true
  validates :user_type, presence: true, inclusion: { in: %w[AdminUser ProductionHouse] }
  validates :expires_at, presence: true

  before_validation :generate_token, on: :create
  before_validation :set_expiration, on: :create
  before_validation :set_used_default, on: :create

  scope :valid_tokens, -> { where(used: false).where('expires_at > ?', Time.current) }
  scope :for_email, ->(email) { where(email: email) }

  def expired?
    expires_at < Time.current
  end

  def mark_as_used!
    update(used: true)
  end

  private

  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(32)
  end

  def set_expiration
    self.expires_at ||= 2.hours.from_now
  end

  def set_used_default
    self.used = false if used.nil?
  end
end
