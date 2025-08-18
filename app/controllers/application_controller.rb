class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  protect_from_forgery with: :exception

  helper_method :current_user, :logged_in?, :admin_logged_in?, :current_production_house

  def current_user
    @current_user ||= ProductionHouse.find(session[:production_house_id]) if session[:production_house_id]
  rescue ActiveRecord::RecordNotFound
    session[:production_house_id] = nil
    nil
  end

  def current_production_house
    current_user
  end

  def logged_in?
    !!current_user
  end

  def admin_logged_in?
    session[:admin_authenticated] == true
  end

  def require_login
    unless logged_in?
      flash[:alert] = "You must be logged in to access this page"
      redirect_to login_path
    end
  end

  def require_admin
    unless admin_logged_in?
      flash[:alert] = "Admin access required"
      redirect_to admin_login_path
    end
  end
end
