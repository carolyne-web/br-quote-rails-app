class QuotationTerritory < ApplicationRecord
  belongs_to :quotation
  belongs_to :territory
end
