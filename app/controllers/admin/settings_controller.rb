class Admin::SettingsController < ApplicationController
  before_action :require_admin

  def index
    @talent_settings = Setting.where(category: "talent").order(:key)
    @duration_settings = Setting.where(category: "duration").order(:key)
    @exclusivity_settings = Setting.where(category: "exclusivity").order(:key)
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

  def create
    if params[:exclusivity_name].present? && params[:exclusivity_percentage].present?
      key = "exclusivity_#{params[:exclusivity_name].downcase.gsub(/[^a-z0-9]/, '_').gsub(/_+/, '_').gsub(/^_|_$/, '')}"
      
      # Check if key already exists
      if Setting.exists?(key: key)
        flash[:alert] = "An exclusivity type with this name already exists. Please choose a different name."
        redirect_to admin_settings_path
        return
      end
      
      setting = Setting.create(
        key: key,
        value: params[:exclusivity_percentage].to_i,
        category: "exclusivity",
        data_type: "integer"
      )
      
      if setting.persisted?
        flash[:notice] = "Exclusivity type '#{params[:exclusivity_name].humanize.titleize}' added successfully with #{params[:exclusivity_percentage]}% rate"
      else
        flash[:alert] = "Failed to create exclusivity type: #{setting.errors.full_messages.join(', ')}"
      end
    else
      flash[:alert] = "Please provide both category name and percentage"
    end
    
    redirect_to admin_settings_path
  end

  def bulk_update
    if params[:settings].present?
      params[:settings].each do |id, value|
        setting = Setting.find(id)
        setting.update(value: value)
      end
      flash[:notice] = "Settings updated successfully"
    else
      flash[:alert] = "No settings to update"
    end
    
    redirect_to admin_settings_path
  end
  
  def destroy
    @setting = Setting.find(params[:id])
    if @setting.category == "exclusivity"
      @setting.destroy
      flash[:notice] = "Exclusivity type deleted successfully"
    else
      flash[:alert] = "Cannot delete this setting"
    end
    redirect_to admin_settings_path
  end

  private

  def setting_params
    params.require(:setting).permit(:value)
  end
end
