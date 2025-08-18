class Admin::SettingsController < ApplicationController
  before_action :require_admin

  def index
    @talent_settings = Setting.where(category: "talent").order(:key)
    @duration_settings = Setting.where(category: "duration").order(:key)
    @general_settings = Setting.where(category: "general").order(:key)
  end

  def edit
    @setting = Setting.find(params[:id])
  end

  def update
    @setting = Setting.find(params[:id])

    if @setting.update(setting_params)
      flash[:notice] = "Setting updated successfully"
      redirect_to admin_settings_path
    else
      render :edit
    end
  end

  def bulk_update
    params[:settings].each do |id, value|
      setting = Setting.find(id)
      setting.update(value: value)
    end

    flash[:notice] = "Settings updated successfully"
    redirect_to admin_settings_path
  end

  private

  def setting_params
    params.require(:setting).permit(:value)
  end
end
