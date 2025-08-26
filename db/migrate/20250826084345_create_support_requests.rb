class CreateSupportRequests < ActiveRecord::Migration[8.0]
  def change
    create_table :support_requests do |t|
      t.references :production_house, null: false, foreign_key: true
      t.string :subject
      t.text :message
      t.integer :priority
      t.integer :status
      t.text :admin_response

      t.timestamps
    end
  end
end
