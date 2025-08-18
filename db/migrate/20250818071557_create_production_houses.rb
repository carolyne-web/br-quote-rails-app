class CreateProductionHouses < ActiveRecord::Migration[8.0]
  def change
    create_table :production_houses do |t|
      t.string :name, null: false
      t.string :password_digest, null: false
      t.string :code, null: false
      t.timestamps
    end

    add_index :production_houses, :code, unique: true
    add_index :production_houses, :name, unique: true
  end
end
