class Admin::DashboardController < ApplicationController
  before_action :require_admin

  def index
    @production_houses_count = ProductionHouse.count
    @quotations_count = Quotation.count
    @recent_quotations = Quotation.order(created_at: :desc).limit(10)
    @settings_count = Setting.count
    @territories_count = Territory.count
  end
end
