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
    
    # Use campaign_name as project_name if project_name is blank
    if @quotation.project_name.blank? && @quotation.campaign_name.present?
      @quotation.project_name = @quotation.campaign_name
    end

    if @quotation.save
      # Store media types from form
      if params[:media_types].present?
        @quotation.quotation_detail.update(selected_media_types: params[:media_types])
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
      if params[:media_types].present?
        @quotation.quotation_detail.update(selected_media_types: params[:media_types])
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
    params.require(:quotation).permit(
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
  end

  def load_form_data
    @talent_settings = Setting.where(category: "talent").order(:key)
    @duration_settings = Setting.where(category: "duration").order(:key)
    @territories = Territory.all.order(:name)
    @exclusivity_options = Setting.where(category: "exclusivity").order(:value).map do |setting|
      name = setting.key.gsub('exclusivity_', '').humanize.titleize
      percentage = setting.typed_value
      display_name = percentage > 0 ? "#{name} (+#{percentage}%)" : name
      [display_name, setting.key]
    end
  end

  def process_talent_categories
    return unless params[:talent]

    params[:talent].each do |category_id, category_data|
      next unless category_data[:combinations].present?
      
      # Create or find talent category
      talent_category = @quotation.talent_categories.find_or_create_by(
        category_type: category_id
      )

      # Clear existing day_on_sets (old structure)
      talent_category.day_on_sets.destroy_all

      # Calculate totals from combinations
      total_count = 0
      total_talent_days = 0
      weighted_rate = 0
      
      category_data[:combinations].each do |index, combination|
        rate = combination[:rate].to_f
        count = combination[:count].to_i
        days = combination[:days].to_i
        
        next if count == 0 || days == 0
        
        total_count += count
        total_talent_days += (count * days)
        weighted_rate += (rate * count)
        
        # Create day_on_sets entries to maintain compatibility with existing calculator
        talent_category.day_on_sets.create(
          talent_count: count,
          days_count: days,
          # Store the custom rate in a way that can be retrieved
        )
      end
      
      # Set average rate and total count for compatibility
      avg_rate = total_count > 0 ? weighted_rate / total_count : get_daily_rate(category_id)
      
      talent_category.update(
        initial_count: total_count,
        daily_rate: get_daily_rate(category_id),
        adjusted_rate: avg_rate,
        # Store standby/overtime data
        overtime_hours: category_data[:overtime_hours].to_f,
        standby_days: (category_data[:rehearsal_days].to_i + 
                      category_data[:down_days].to_i + 
                      category_data[:travel_days].to_i)
      )
    end
  end

  def process_territories
    return unless params[:territories]

    @quotation.quotation_territories.destroy_all

    params[:territories].each do |territory_id|
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
