class Admin::SettingsController < ApplicationController
  before_action :require_admin

  def index
    # Order talent settings by hierarchy, not alphabetically
    talent_order = [
      "lead_base_rate",
      "second_lead_base_rate", 
      "featured_extra_base_rate",
      "teenager_base_rate",
      "kid_base_rate",
      "walk_on_base_rate",
      "extras_base_rate"
    ]
    
    # Load all talent settings and sort them in Ruby to avoid complex SQL
    all_talent_settings = Setting.where(category: "talent").to_a
    @talent_settings = talent_order.map { |key| 
      all_talent_settings.find { |setting| setting.key == key } 
    }.compact
    
    # Order duration settings chronologically
    duration_order = [
      "duration_3_months",
      "duration_6_months", 
      "duration_12_months",
      "duration_18_months",
      "duration_24_months",
      "duration_36_months"
    ]
    
    all_duration_settings = Setting.where(category: "duration").to_a
    @duration_settings = duration_order.map { |key| 
      all_duration_settings.find { |setting| setting.key == key } 
    }.compact
    @exclusivity_settings = Setting.where(category: "exclusivity").order(:key)
    @general_settings = Setting.where(category: "general").order(:key)
    
    # New settings categories for BR Quotation System
    # Order media settings chronologically 
    media_order = [
      "media_one_type",
      "media_two_types",
      "media_three_or_more"
    ]
    
    all_media_settings = Setting.where(category: "media").to_a
    @media_settings = media_order.map { |key| 
      all_media_settings.find { |setting| setting.key == key } 
    }.compact
    @product_type_settings = Setting.where(category: "product_type").order(:key)
    
    # Create default media settings if they don't exist
    create_default_media_settings if @media_settings.empty?
    
    # Create default product type settings if they don't exist  
    create_default_product_type_settings if @product_type_settings.empty?
    
    # Create default duration multiplier settings if they don't exist
    create_default_duration_settings if @duration_settings.empty?
    
    # Reload after creation with chronological ordering
    all_media_settings = Setting.where(category: "media").to_a
    @media_settings = media_order.map { |key| 
      all_media_settings.find { |setting| setting.key == key } 
    }.compact
    @product_type_settings = Setting.where(category: "product_type").order(:key)
    
    # Apply chronological ordering to reloaded duration settings as well
    all_duration_settings = Setting.where(category: "duration").to_a
    @duration_settings = duration_order.map { |key| 
      all_duration_settings.find { |setting| setting.key == key } 
    }.compact
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

  def create_default_media_settings
    media_defaults = [
      { key: "media_one_type", value: 50, description: "One media type selected" },
      { key: "media_two_types", value: 75, description: "Two media types selected" },
      { key: "media_three_or_more", value: 100, description: "Three or more media types selected" }
    ]
    
    media_defaults.each do |setting|
      Setting.create!(
        key: setting[:key],
        value: setting[:value],
        category: "media",
        data_type: "integer"
      )
    end
  end

  def create_default_product_type_settings
    product_type_defaults = [
      { key: "product_type_adult_kids_adjustment", value: 50, description: "Adult product Kids category reduction" },
      { key: "product_type_family_kids_adjustment", value: 25, description: "Family product Kids category reduction" }
    ]
    
    product_type_defaults.each do |setting|
      Setting.create!(
        key: setting[:key],
        value: setting[:value],
        category: "product_type",
        data_type: "integer"
      )
    end
  end

  def create_default_duration_settings
    duration_defaults = [
      { key: "duration_3_months", value: 50, description: "Up to 3 months multiplier" },
      { key: "duration_6_months", value: 75, description: "Up to 6 months multiplier" },
      { key: "duration_12_months", value: 100, description: "12 months multiplier (base)" },
      { key: "duration_18_months", value: 175, description: "18 months multiplier" },
      { key: "duration_24_months", value: 200, description: "2 years multiplier" },
      { key: "duration_36_months", value: 300, description: "36 months multiplier" }
    ]
    
    duration_defaults.each do |setting|
      Setting.create!(
        key: setting[:key],
        value: setting[:value],
        category: "duration",
        data_type: "integer"
      )
    end
  end
end
