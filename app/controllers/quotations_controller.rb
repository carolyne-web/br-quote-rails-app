class QuotationsController < ApplicationController
  before_action :require_login
  before_action :set_quotation, only: [ :show, :edit, :update, :destroy, :pdf, :duplicate ]

  def index
    @quotations = current_production_house.quotations.order(created_at: :desc)
  end

  def show
    @talent_categories = @quotation.talent_categories.includes(:day_on_sets)
    @quotation_detail = @quotation.quotation_detail
    @territories = @quotation.territories
    @adjustments = @quotation.quotation_adjustments

    # Calculate totals
    @calculation = QuotationCalculator.new(@quotation).calculate
  end

  def new
    @quotation = current_production_house.quotations.build
    @quotation.build_quotation_detail
    
    # Initialize with empty talent categories (user will add as needed)
    load_form_data
  end

  def create
    @quotation = current_production_house.quotations.build(quotation_params)

    # Ensure quotation_detail exists if not created through nested attributes
    @quotation.build_quotation_detail unless @quotation.quotation_detail

    # Use campaign_name as project_name if project_name is blank
    if @quotation.project_name.blank? && @quotation.campaign_name.present?
      @quotation.project_name = @quotation.campaign_name
    end

    if @quotation.save
      # Store media types from form
      media_types = []
      if params[:combinations].present?
        params[:combinations].each do |combo_id, combo_data|
          if combo_data[:media_types].present?
            media_types.concat(combo_data[:media_types])
          end
        end
      elsif params[:media_types].present?
        media_types = params[:media_types]
      end

      if media_types.present?
        # Ensure quotation_detail exists and is saved before updating
        if @quotation.quotation_detail
          @quotation.quotation_detail.update(selected_media_types: media_types)
        else
          Rails.logger.error "quotation_detail is nil after quotation save"
        end
      end

      process_talent_categories
      process_territories
      
      # Calculate totals (product type adjustments are now handled in calculator)
      calculation = QuotationCalculator.new(@quotation).calculate
      
      @quotation.update(total_amount: calculation[:total])

      # Create history entry
      @quotation.quotation_histories.create(
        action: "created",
        user: current_production_house.name,
        data: { total: calculation[:total] }
      )

      flash[:notice] = "Quotation created successfully"
      redirect_to @quotation
    else
      load_form_data
      render :new
    end
  end

  def edit
    load_form_data
  end

  def update
    if @quotation.update(quotation_params)
      # Store media types from form
      media_types = []
      if params[:combinations].present?
        params[:combinations].each do |combo_id, combo_data|
          if combo_data[:media_types].present?
            media_types.concat(combo_data[:media_types])
          end
        end
      elsif params[:media_types].present?
        media_types = params[:media_types]
      end

      if media_types.present?
        # Ensure quotation_detail exists and is saved before updating
        if @quotation.quotation_detail
          @quotation.quotation_detail.update(selected_media_types: media_types)
        else
          Rails.logger.error "quotation_detail is nil in update action"
        end
      end

      # Process territories (still needed as it's not nested attributes)
      process_territories

      # Recalculate
      calculation = QuotationCalculator.new(@quotation).calculate
      @quotation.update(total_amount: calculation[:total])

      # Create history entry
      @quotation.quotation_histories.create(
        action: "updated",
        user: current_production_house.name,
        data: { total: calculation[:total] }
      )

      flash[:notice] = "Quotation updated successfully"
      redirect_to @quotation
    else
      load_form_data
      render :edit
    end
  end

  def destroy
    @quotation.destroy
    flash[:notice] = "Quotation deleted"
    redirect_to quotations_path
  end

  def duplicate
    new_quotation = @quotation.dup
    new_quotation.project_number = nil # Will regenerate
    new_quotation.status = "draft"

    if new_quotation.save
      # Duplicate related records
      @quotation.talent_categories.each do |tc|
        new_tc = tc.dup
        new_tc.quotation_id = new_quotation.id
        new_tc.save

        tc.day_on_sets.each do |dos|
          new_dos = dos.dup
          new_dos.talent_category_id = new_tc.id
          new_dos.save
        end
      end

      if @quotation.quotation_detail
        detail = @quotation.quotation_detail.dup
        detail.quotation_id = new_quotation.id
        detail.save
      end

      flash[:notice] = "Quotation duplicated successfully"
      redirect_to edit_quotation_path(new_quotation)
    else
      flash[:alert] = "Failed to duplicate quotation"
      redirect_to @quotation
    end
  end

  def pdf
    pdf = QuotationPdf.new(@quotation)
    send_data pdf.render,
              filename: "quotation_#{@quotation.project_number}.pdf",
              type: "application/pdf",
              disposition: "inline"
  end

  private

  def set_quotation
    @quotation = current_production_house.quotations.find(params[:id])
  end

  def quotation_params
    # Transform quotation_detail to quotation_detail_attributes if needed
    permitted_params = params.require(:quotation).permit(
      :project_name,
      :campaign_name,
      :product_type,
      :is_guaranteed,
      :status,
      quotation_detail_attributes: [
        :id, :shoot_days, :rehearsal_days, :travel_days, :down_days,
        :exclusivity_type, :exclusivity_level, :pharmaceutical,
        :duration, :media_type, :unlimited_stills, :unlimited_versions,
        :overtime_hours, { selected_media_types: [] }
      ],
      talent_categories_attributes: [
        :id, :category_type, :initial_count, :daily_rate,
        :adjusted_rate, :overtime_hours, :standby_days, :_destroy,
        day_on_sets_attributes: [
          :id, :talent_count, :days_count, :_destroy
        ]
      ],
      quotation_adjustments_attributes: [
        :id, :description, :percentage, :adjustment_type, :_destroy
      ]
    )

    # Handle quotation_detail sent as flat structure instead of nested attributes
    if params[:quotation_detail].present? && !permitted_params[:quotation_detail_attributes].present?
      detail_params = params.require(:quotation_detail).permit(
        :shoot_days, :rehearsal_days, :travel_days, :down_days,
        :exclusivity_type, :exclusivity_level, :pharmaceutical,
        :duration, :media_type, :unlimited_stills, :unlimited_versions,
        :overtime_hours, { selected_media_types: [] }
      )
      permitted_params[:quotation_detail_attributes] = detail_params
    end

    permitted_params
  end

  def load_form_data
    @talent_settings = Setting.where(category: "talent").order(:key)
    @duration_settings = Setting.where(category: "duration").order(:key)
    @territories = Territory.all.order(:name)
    
    # Raw exclusivity settings for popup
    @exclusivity_settings = Setting.where(category: "exclusivity").order(:key).map do |setting|
      {
        name: setting.key.gsub('exclusivity_', '').humanize.titleize,
        percentage: setting.typed_value,
        key: setting.key
      }
    end
    
    # Formatted options for dropdowns
    @exclusivity_options = @exclusivity_settings.map do |setting|
      display_name = setting[:percentage] > 0 ? "#{setting[:name]} (+#{setting[:percentage]}%)" : setting[:name]
      [display_name, setting[:key]]
    end
  end

  def process_talent_categories
    return unless params[:talent]

    params[:talent].each do |category_id, category_data|
      # Skip if no talent count specified
      talent_count = category_data[:talent_count].to_i
      next if talent_count == 0

      # Create or find talent category
      talent_category = @quotation.talent_categories.find_or_create_by(
        category_type: category_id
      )

      # Clear existing day_on_sets
      talent_category.day_on_sets.destroy_all

      # Create day_on_sets entry for this talent category
      talent_category.day_on_sets.create(
        talent_count: talent_count,
        days_count: category_data[:days_count].to_i
      )

      # Update talent category with form data
      talent_category.update(
        initial_count: talent_count,
        daily_rate: get_daily_rate(category_id),
        adjusted_rate: category_data[:adjusted_rate].to_f,
        overtime_hours: category_data[:overtime_hours].to_f,
        standby_days: (category_data[:rehearsal_days].to_i +
                      category_data[:down_days].to_i +
                      category_data[:travel_days].to_i)
      )

      # Process lines if they exist (sub-talent within a category)
      if category_data[:lines].present?
        category_data[:lines].each do |line_id, line_data|
          line_count = line_data[:talent_count].to_i
          next if line_count == 0

          talent_category.day_on_sets.create(
            talent_count: line_count,
            days_count: line_data[:days_count].to_i
          )
        end
      end
    end
  end

  def process_territories
    # Check for territories in combinations structure first
    territory_ids = []

    if params[:combinations].present?
      params[:combinations].each do |combo_id, combo_data|
        if combo_data[:territories].present?
          territory_ids.concat(combo_data[:territories])
        end
      end
    elsif params[:territories].present?
      territory_ids = params[:territories]
    end

    return if territory_ids.empty?

    @quotation.quotation_territories.destroy_all

    territory_ids.each do |territory_id|
      territory = Territory.find(territory_id)
      @quotation.quotation_territories.create(
        territory: territory,
        unlimited_stills: params[:unlimited_stills] == "1",
        unlimited_versions: params[:unlimited_versions] == "1",
        stills_percentage: params[:stills_percentage],
        versions_percentage: params[:versions_percentage]
      )
    end
  end

  def get_daily_rate(category_type)
    setting_key = case category_type.to_i
    when 1 then "lead_base_rate"
    when 2 then "second_lead_base_rate"
    when 3 then "featured_extra_base_rate"
    when 4 then "teenager_base_rate"
    when 5 then "kid_base_rate"
    when 6 then "walk_on_base_rate"
    when 7 then "extras_base_rate"
    end

    Setting.find_by(key: setting_key)&.typed_value || 0
  end

end
