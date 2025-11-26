class AddEmailToProductionHouses < ActiveRecord::Migration[8.0]
  def change
    add_column :production_houses, :email, :string
    add_index :production_houses, :email, unique: true
  end
end
