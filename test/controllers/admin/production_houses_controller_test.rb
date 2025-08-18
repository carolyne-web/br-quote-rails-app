require "test_helper"

class Admin::ProductionHousesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_production_houses_index_url
    assert_response :success
  end

  test "should get new" do
    get admin_production_houses_new_url
    assert_response :success
  end

  test "should get create" do
    get admin_production_houses_create_url
    assert_response :success
  end

  test "should get edit" do
    get admin_production_houses_edit_url
    assert_response :success
  end

  test "should get update" do
    get admin_production_houses_update_url
    assert_response :success
  end

  test "should get destroy" do
    get admin_production_houses_destroy_url
    assert_response :success
  end
end
