require "test_helper"

class QuotationsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get quotations_index_url
    assert_response :success
  end
end
