require "test_helper"

class Admin::ProductionHousesControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_production_houses_url
    assert_response :redirect
  end

  test "should get new" do
    get new_admin_production_house_url
    assert_response :redirect
  end

  test "should get create" do
    post admin_production_houses_url
    assert_response :redirect
  end

  test "should get edit" do
    get edit_admin_production_house_url(production_houses(:one))
    assert_response :redirect
  end

  test "should get update" do
    patch admin_production_house_url(production_houses(:one))
    assert_response :redirect
  end

  test "should get destroy" do
    delete admin_production_house_url(production_houses(:one))
    assert_response :redirect
  end
end
