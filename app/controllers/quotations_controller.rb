class QuotationsController < ApplicationController
  before_action :require_login

  def index
    @quotations = current_production_house.quotations.order(created_at: :desc)
  end
end
