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
      flash[:alert] = "Invalid code or password"
      redirect_to login_path
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
    admin_user = AdminUser.find_by(email: params[:email])

    if admin_user && admin_user.authenticate(params[:password])
      session[:admin_user_id] = admin_user.id
      session[:admin_authenticated] = true
      session[:show_admin_welcome] = true
      flash[:notice] = "Welcome back, #{admin_user.name}!"
      redirect_to admin_dashboard_path
    else
      flash.now[:alert] = "Invalid email or password"
      render :admin_new
    end
  end

  def admin_dismiss_welcome
    session[:show_admin_welcome] = false
    head :ok
  end

  def admin_destroy
    session[:admin_authenticated] = nil
    flash[:notice] = "Admin logged out"
    redirect_to root_path
  end
end
