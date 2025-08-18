class SessionsController < ApplicationController
  def new
    # Login page
  end

  def create
    production_house = ProductionHouse.find_by(code: params[:code])

    if production_house && production_house.authenticate(params[:password])
      session[:production_house_id] = production_house.id
      flash[:notice] = "Welcome back, #{production_house.name}!"
      redirect_to quotations_path
    else
      flash.now[:alert] = "Invalid code or password"
      render :new
    end
  end

  def destroy
    session[:production_house_id] = nil
    flash[:notice] = "You have been logged out"
    redirect_to root_path
  end

  # Admin login
  def admin_new
    # Admin login page
  end

  def admin_create
    if params[:admin_password] == ENV['ADMIN_PASSWORD']
      session[:admin_authenticated] = true
      flash[:notice] = "Admin access granted"
      redirect_to admin_dashboard_path
    else
      flash.now[:alert] = "Invalid admin password"
      render :admin_new
    end
  end

  def admin_destroy
    session[:admin_authenticated] = nil
    flash[:notice] = "Admin logged out"
    redirect_to root_path
  end
end
