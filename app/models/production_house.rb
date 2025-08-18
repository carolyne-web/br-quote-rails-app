class ProductionHouse < ApplicationRecord
  has_secure_password

  has_many :quotations, dependent: :destroy

  validates :name, presence: true, uniqueness: true
  validates :code, presence: true, uniqueness: true
end
