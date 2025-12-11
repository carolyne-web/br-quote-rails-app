class RemoveAllMediaExceptions < ActiveRecord::Migration[8.0]
  def up
    # Remove redundant 'all_media' exceptions since territories already cover all media by default
    TerritoryMediaException.where(media_type: 'all_media').destroy_all

    say "Removed all 'all_media' exceptions (redundant - territories already cover all media)"
  end

  def down
    # Cannot restore deleted exceptions - would need to recreate manually if needed
    say "Cannot restore deleted 'all_media' exceptions"
  end
end
