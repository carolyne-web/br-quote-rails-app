require "test_helper"

class Admin::SettingsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_settings_url
    assert_response :redirect
  end

  test "should get edit" do
    get edit_admin_setting_url(settings(:one))
    assert_response :redirect
  end

  test "should get update" do
    patch admin_setting_url(settings(:one))
    assert_response :redirect
  end
end
