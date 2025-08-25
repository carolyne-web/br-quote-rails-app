class QuotationDetail < ApplicationRecord
  belongs_to :quotation
  
  # Handle selected_media_types as JSON array
  def selected_media_types
    JSON.parse(self[:selected_media_types] || '[]')
  rescue JSON::ParserError
    []
  end
  
  def selected_media_types=(value)
    self[:selected_media_types] = value.to_json
  end
end
