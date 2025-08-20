require "test_helper"

class QuotationsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get quotations_url
    assert_response :redirect  # Should redirect to login
  end
end
