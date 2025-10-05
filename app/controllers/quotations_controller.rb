class QuotationsController < ApplicationController
  before_action :require_login
  before_action :set_quotation, only: [ :show, :edit, :update, :destroy, :pdf, :duplicate, :generate_final ]

  def index
    @quotations = current_production_house.quotations.order(created_at: :desc)
  end

  def show
    # Get combinations data from params or session
    combinations_data = params[:combinations] || session[:combinations_data]

    puts "=== QUOTATIONS CONTROLLER SHOW DEBUG ==="
    puts "Params keys: #{params.keys}"
    puts "Combinations in params: #{params[:combinations].present?}"
    puts "Combinations in session: #{session[:combinations_data].present?}"
    puts "Combinations data: #{combinations_data.inspect}"
    puts "Combinations data class: #{combinations_data.class}"
    puts "Combinations data present?: #{combinations_data.present?}"
    puts "=== END CONTROLLER DEBUG ==="

    # Check if a final quotation already exists for this quotation
    if @quotation.final_quotations.any?
      redirect_to @quotation.final_quotations.last
    else
      # Automatically generate final quotation and redirect
      final_quotation = FinalQuotationGenerator.new(@quotation, combinations_data).generate

      # Clear session data after using it
      session.delete(:combinations_data)
      if final_quotation.persisted?
        redirect_to final_quotation
      else
        flash[:alert] = "Failed to generate final quotation"
        redirect_to quotations_path
      end
    end
  end

  def new
    @quotation = current_production_house.quotations.build
    @quotation.build_quotation_detail
    
    # Initialize with empty talent categories (user will add as needed)
    load_form_data
  end

  def create
    # DEBUG: Log all parameters to see what we're receiving
    puts "=== CREATE QUOTATION DEBUG ==="
    puts "All params keys: #{params.keys}"
    puts "Talent params present: #{params[:talent].present?}"
    puts "Territories params present: #{params[:territories].present?}"
    puts "Media types params present: #{params[:media_types].present?}"
    puts "Combinations params present: #{params[:combinations].present?}"
    if params[:combinations].present?
      puts "Combinations structure: #{params[:combinations].to_unsafe_h}"
    end
    puts "Quotation params: #{quotation_params}"
    puts "=== END DEBUG ==="

    @quotation = current_production_house.quotations.build(quotation_params)

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
        # Ensure quotation_detail exists before updating
        @quotation.quotation_detail ||= @quotation.build_quotation_detail
        @quotation.quotation_detail.update(selected_media_types: media_types)
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

      # Store combinations data in session for the show action to use
      session[:combinations_data] = params[:combinations] if params[:combinations].present?

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
        # Ensure quotation_detail exists before updating
        @quotation.quotation_detail ||= @quotation.build_quotation_detail
        @quotation.quotation_detail.update(selected_media_types: media_types)
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

      # Regenerate final quotation with updated data
      @quotation.final_quotations.destroy_all  # Remove old final quotations
      final_quotation = FinalQuotationGenerator.new(@quotation, params[:combinations]).generate

      flash[:notice] = "Quotation updated successfully"
      redirect_to final_quotation
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

  def generate_final
    # Generate final quotation from current form data
    final_quotation = FinalQuotationGenerator.new(@quotation, params[:combinations]).generate

    if final_quotation.persisted?
      flash[:notice] = "Final quotation generated successfully"
      redirect_to final_quotation
    else
      flash[:alert] = "Failed to generate final quotation"
      redirect_to @quotation
    end
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
      :commercial_type,
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
        :adjusted_rate, :overtime_hours, :standby_days, :description, :_destroy,
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

    puts "=== PROCESSING TALENT CATEGORIES ==="
    puts "Talent params structure: #{params[:talent].to_unsafe_h}"

    params[:talent].each do |category_id, category_data|
      puts "Processing category #{category_id}: #{category_data}"

      # Handle the current form structure: talent[category_id][field_name]
      description = category_data[:description]
      talent_count = category_data[:talent_count].to_i
      adjusted_rate = category_data[:adjusted_rate].to_f
      days_count = category_data[:days_count].to_i
      rehearsal_days = category_data[:rehearsal_days].to_i
      travel_days = category_data[:travel_days].to_i
      down_days = category_data[:down_days].to_i
      overtime_hours = category_data[:overtime_hours].to_f

      # Skip if no meaningful data
      next if talent_count == 0 && adjusted_rate == 0 && description.blank?

      puts "Creating talent category: count=#{talent_count}, rate=#{adjusted_rate}, desc=#{description}"

      # Create or find talent category
      talent_category = @quotation.talent_categories.find_or_create_by(
        category_type: category_id
      )

      # Update talent category fields
      talent_category.update!(
        description: description,
        adjusted_rate: adjusted_rate,
        overtime_hours: overtime_hours,
        initial_count: talent_count
      )

      # Clear existing day_on_sets and create new one
      talent_category.day_on_sets.destroy_all

      # Create day_on_sets entry if we have talent count
      if talent_count > 0
        day_on_set = talent_category.day_on_sets.create!(
          talent_count: talent_count,
          days_count: days_count > 0 ? days_count : 1,
          description: description,
          adjusted_rate: adjusted_rate,
          rehearsal_days: rehearsal_days,
          down_days: down_days,
          travel_days: travel_days,
          overtime_hours: overtime_hours,
          night_premium: category_data[:night_premium] == "true" || category_data[:night_premium] == "1"
        )
        puts "Created day_on_set: #{day_on_set.attributes}"
      end

      # Process additional talent lines if present
      if category_data[:lines].present?
        category_data[:lines].each do |line_index, line_data|
          line_description = line_data[:description]
          line_talent_count = line_data[:talent_count].to_i
          line_adjusted_rate = line_data[:adjusted_rate].to_f
          line_days_count = line_data[:days_count].to_i
          line_rehearsal_days = line_data[:rehearsal_days].to_i
          line_down_days = line_data[:down_days].to_i
          line_travel_days = line_data[:travel_days].to_i
          line_overtime_hours = line_data[:overtime_hours].to_f

          # Skip empty lines
          next if line_talent_count == 0 && line_adjusted_rate == 0 && line_description.blank?

          puts "Creating additional line: count=#{line_talent_count}, rate=#{line_adjusted_rate}, desc=#{line_description}, rehearsal=#{line_rehearsal_days}, down=#{line_down_days}, travel=#{line_travel_days}, overtime=#{line_overtime_hours}"

          # Create additional day_on_set for this line with individual details
          talent_category.day_on_sets.create!(
            talent_count: line_talent_count,
            days_count: line_days_count > 0 ? line_days_count : 1,
            description: line_description,
            adjusted_rate: line_adjusted_rate,
            rehearsal_days: line_rehearsal_days,
            down_days: line_down_days,
            travel_days: line_travel_days,
            overtime_hours: line_overtime_hours,
            night_premium: line_data[:night_premium] == "true" || line_data[:night_premium] == "1"
          )
        end
      end

      puts "Finished processing category #{category_id}"
    end

    puts "=== FINISHED PROCESSING ALL TALENT CATEGORIES ==="
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
