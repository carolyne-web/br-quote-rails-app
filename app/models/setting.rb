class Setting < ApplicationRecord
  validates :key, presence: true, uniqueness: true

  CATEGORIES = [ "talent", "duration", "media", "general", "exclusivity", "product_type" ].freeze
  DATA_TYPES = [ "string", "integer", "decimal", "boolean", "json" ].freeze

  validates :category, inclusion: { in: CATEGORIES }
  validates :data_type, inclusion: { in: DATA_TYPES }

  def typed_value
    case data_type
    when "integer"
      value.to_i
    when "decimal"
      value.to_f
    when "boolean"
      value == "true"
    when "json"
      JSON.parse(value) rescue {}
    else
      value
    end
  end
end
