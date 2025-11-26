class AllowNullProductionHouseInSupportRequests < ActiveRecord::Migration[8.0]
  def change
    change_column_null :support_requests, :production_house_id, true
  end
end
