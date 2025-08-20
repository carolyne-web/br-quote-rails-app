require "test_helper"

class Admin::TerritoriesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_territories_url
    assert_response :redirect
  end

  test "should get new" do
    get new_admin_territory_url
    assert_response :redirect
  end

  test "should get create" do
    post admin_territories_url
    assert_response :redirect
  end

  test "should get edit" do
    get edit_admin_territory_url(territories(:one))
    assert_response :redirect
  end

  test "should get update" do
    patch admin_territory_url(territories(:one))
    assert_response :redirect
  end

  test "should get destroy" do
    delete admin_territory_url(territories(:one))
    assert_response :redirect
  end
end
