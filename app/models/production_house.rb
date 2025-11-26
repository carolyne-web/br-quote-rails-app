class ProductionHouse < ApplicationRecord
  has_secure_password

  has_many :quotations, dependent: :destroy
  has_many :support_requests, dependent: :nullify

  validates :name, presence: true, uniqueness: true
  validates :code, presence: true, uniqueness: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: true, allow_blank: true
end
