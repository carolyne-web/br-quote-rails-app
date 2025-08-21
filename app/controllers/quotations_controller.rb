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

    # Initialize talent categories
    TalentCategory::TYPES.each do |type, _|
      @quotation.talent_categories.build(category_type: type)
    end

    load_form_data
  end

  def create
    @quotation = current_production_house.quotations.build(quotation_params)

    if @quotation.save
      # Process territories (still needed as it's not nested attributes)
      process_territories

      # Calculate and save totals
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
      :status,
      quotation_detail_attributes: [
        :id, :shoot_days, :rehearsal_days, :travel_days, :down_days,
        :exclusivity_type, :exclusivity_level, :pharmaceutical,
        :duration, :media_type, :unlimited_stills, :unlimited_versions
      ],
      talent_categories_attributes: [
        :id, :category_type, :initial_count, :daily_rate,
        :adjusted_rate, :_destroy,
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
    return unless params[:talent_categories]

    params[:talent_categories].each do |category_id, category_data|
      talent_category = @quotation.talent_categories.find_or_create_by(
        category_type: category_id
      )

      talent_category.update(
        initial_count: category_data[:count].to_i,
        daily_rate: get_daily_rate(category_id),
        adjusted_rate: category_data[:adjusted_rate]
      )

      # Process days on set
      if category_data[:days_on_set]
        talent_category.day_on_sets.destroy_all

        category_data[:days_on_set].each do |_, dos_data|
          next if dos_data[:talent_count].to_i == 0

          talent_category.day_on_sets.create(
            talent_count: dos_data[:talent_count].to_i,
            days_count: dos_data[:days_count].to_i
          )
        end
      end
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
    end

    Setting.find_by(key: setting_key)&.typed_value || 0
  end
end
