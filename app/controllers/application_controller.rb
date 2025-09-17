class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  protect_from_forgery with: :exception

  before_action :check_mobile_device

  helper_method :current_user, :logged_in?, :admin_logged_in?, :current_production_house, :admin_notification_count, :mobile_device?

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

  def admin_notification_count
    return 0 unless admin_logged_in?
    
    new_quotations = Quotation.where('created_at > ?', 24.hours.ago).count
    pending_quotations = Quotation.where(status: 'pending').count
    
    new_quotations + pending_quotations
  end

  private

  def mobile_device?
    user_agent = request.user_agent.to_s.downcase
    mobile_patterns = [
      /mobile/, /iphone/, /ipod/, /android/, /blackberry/,
      /palm/, /mini/, /windows\sce/, /palm/, /opera\smini/,
      /nokia/, /samsung/, /sony/, /motorola/, /lg/
    ]
    mobile_patterns.any? { |pattern| user_agent.match(pattern) }
  end

  def check_mobile_device
    if mobile_device?
      render 'shared/mobile_not_supported', layout: 'mobile_message', status: 200
    end
  end
end
