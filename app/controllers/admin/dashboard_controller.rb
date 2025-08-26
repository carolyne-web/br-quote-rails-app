class Admin::DashboardController < ApplicationController
  before_action :require_admin

  def index
    @production_houses_count = ProductionHouse.count
    @quotations_count = Quotation.count
    @recent_quotations = Quotation.includes(:production_house).order(created_at: :desc).limit(10)
    @settings_count = Setting.count
    @territories_count = Territory.count
    @support_requests_count = SupportRequest.count
    
    # Notification counts
    @new_quotations_count = Quotation.where('created_at > ?', 24.hours.ago).count
    @pending_quotations_count = Quotation.where(status: 'pending').count
  end
end
