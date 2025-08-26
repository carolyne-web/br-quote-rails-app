class SupportRequestsController < ApplicationController
  before_action :ensure_logged_in

  def new
    @support_request = SupportRequest.new
  end

  def create
    @support_request = SupportRequest.new(support_request_params)
    @support_request.production_house = current_production_house
    @support_request.status = 0  # open

    if @support_request.save
      flash[:notice] = "Support request submitted successfully. We'll get back to you soon!"
      redirect_to quotations_path
    else
      flash.now[:alert] = "Please correct the errors below."
      render :new
    end
  end

  private

  def support_request_params
    params.require(:support_request).permit(:subject, :message, :priority)
  end

  def ensure_logged_in
    unless logged_in?
      redirect_to login_path
    end
  end
end