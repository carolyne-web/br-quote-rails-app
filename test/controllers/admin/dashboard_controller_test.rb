require "test_helper"

class Admin::DashboardControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_dashboard_url
    assert_response :redirect  # Should redirect to admin login
  end
end
