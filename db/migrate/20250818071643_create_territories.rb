class CreateTerritories < ActiveRecord::Migration[8.0]
  def change
    create_table :territories do |t|
      t.string :name, null: false
      t.string :code
      t.decimal :percentage, precision: 6, scale: 2, default: 100.0
      t.string :media_type, default: 'all_media'
      t.string :group_name
      t.timestamps
    end

    add_index :territories, :code
    add_index :territories, :group_name
    add_index :territories, [ :name, :media_type ], unique: true
  end
end
