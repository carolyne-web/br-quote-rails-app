class Admin::SupportRequestsController < ApplicationController
  before_action :ensure_admin_authenticated
  before_action :find_support_request, only: [:show, :update]

  def index
    @support_requests = SupportRequest.includes(:production_house)
                                    .recent
                                    .page(params[:page])
                                    
    @unresolved_count = SupportRequest.unresolved.count
    @open_count = SupportRequest.open.count
    @in_progress_count = SupportRequest.in_progress.count
  end

  def show
    @status_options = SupportRequest.statuses.keys.map { |status| [status.humanize, status] }
  end

  def update
    if @support_request.update(support_request_params)
      flash[:notice] = "Support request updated successfully"
      redirect_to admin_support_request_path(@support_request)
    else
      flash[:alert] = "Failed to update support request"
      redirect_to admin_support_request_path(@support_request)
    end
  end

  private

  def find_support_request
    @support_request = SupportRequest.find(params[:id])
  end

  def support_request_params
    params.require(:support_request).permit(:status, :admin_response)
  end

  def ensure_admin_authenticated
    unless admin_logged_in?
      redirect_to admin_login_path
    end
  end
end