class UpdateQuotationStatusValues < ActiveRecord::Migration[8.0]
  def up
    # Update existing 'sent' status to 'pending'
    execute "UPDATE quotations SET status = 'pending' WHERE status = 'sent'"
    
    # Add any missing status values that might be needed
    # The enum now supports: draft, pending, under_review, approved, rejected, completed
  end

  def down
    # Rollback: change 'pending' back to 'sent' and 'under_review' to 'pending'
    execute "UPDATE quotations SET status = 'sent' WHERE status = 'pending'"
    execute "UPDATE quotations SET status = 'pending' WHERE status = 'under_review'"
    execute "UPDATE quotations SET status = 'approved' WHERE status = 'completed'"
  end
end
