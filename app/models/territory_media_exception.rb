class TerritoryMediaException < ApplicationRecord
  validates :territory_name, presence: true
  validates :media_type, presence: true
  validates :percentage, presence: true, numericality: { greater_than: 0 }
  validates :territory_name, uniqueness: { scope: :media_type, message: "and media type combination already exists" }

  # Dynamic method to get available territory names from database
  def self.territory_names
    Territory.order(:name).pluck(:name).uniq
  end

  # Define available media types (using current form values from /quotations/new)
  # NOTE: 'all_media' is excluded from MEDIA_TYPES because territories already
  # cover all media by default. Exceptions should only be used for specific media types.
  MEDIA_TYPES = [
    'cinema',
    'all_moving',
    'tv',
    'print',
    'internet'
  ].freeze

  # Human-readable media type labels (matching the form labels)
  MEDIA_TYPE_LABELS = {
    'all_media' => 'All Media',
    'cinema' => 'Cinema Only',
    'all_moving' => 'All Moving Media',
    'tv' => 'TV Only',
    'print' => 'All Print Media',
    'internet' => 'Internet Only'
  }.freeze

  validates :media_type, inclusion: { in: MEDIA_TYPES }
  validate :territory_name_exists_in_database

  scope :for_territory, ->(territory_name) { where(territory_name: territory_name) }
  scope :for_media_type, ->(media_type) { where(media_type: media_type) }

  # Class method to find exception for a specific territory and media type combination
  def self.find_exception(territory_name, media_type)
    find_by(territory_name: territory_name, media_type: media_type)
  end

  # Instance method to get human-readable media type label
  def media_type_label
    MEDIA_TYPE_LABELS[media_type] || media_type.humanize
  end

  # Instance method to format percentage for display
  def formatted_percentage
    "#{percentage.to_i}%"
  end

  private

  # Custom validation to check if territory name exists in database
  def territory_name_exists_in_database
    unless Territory.exists?(name: territory_name)
      errors.add(:territory_name, "must be a valid territory from the database")
    end
  end
end