class CreateTerritoryMediaExceptions < ActiveRecord::Migration[8.0]
  def change
    create_table :territory_media_exceptions do |t|
      t.string :territory_name, null: false
      t.string :media_type, null: false
      t.decimal :percentage, precision: 6, scale: 2, null: false
      t.text :description

      t.timestamps
    end

    # Add unique index to prevent duplicate exceptions for same territory+media combination
    add_index :territory_media_exceptions, [:territory_name, :media_type], unique: true, name: 'index_territory_media_exceptions_unique'

    # Add index for faster lookups
    add_index :territory_media_exceptions, :territory_name
    add_index :territory_media_exceptions, :media_type
  end
end
