class CreatePasswordResetTokens < ActiveRecord::Migration[8.0]
  def change
    create_table :password_reset_tokens do |t|
      t.string :token, null: false
      t.string :email, null: false
      t.string :user_type, null: false
      t.datetime :expires_at, null: false
      t.boolean :used, default: false, null: false

      t.timestamps
    end

    add_index :password_reset_tokens, :token, unique: true
    add_index :password_reset_tokens, :email
    add_index :password_reset_tokens, [:email, :user_type]
  end
end
