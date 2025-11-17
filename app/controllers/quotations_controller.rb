class QuotationsController < ApplicationController
  before_action :require_login
  before_action :set_quotation, only: [ :show, :edit, :update, :destroy, :pdf, :duplicate, :generate_final ]

  def index
    @quotations = current_production_house.quotations.order(created_at: :desc).page(params[:page]).per(25)
  end

  def show
    # Check if a final quotation already exists for this quotation (unless force regenerate)
    if @quotation.final_quotations.any? && params[:regenerate] != 'true'
      # For AJAX requests (inline preview), don't redirect - show the content directly
      if request.xhr?
        @final_quotation = @quotation.final_quotations.last
        render template: 'final_quotations/show'
      else
        redirect_to @quotation.final_quotations.last
      end
    else
      # If regenerating, delete existing final quotations first
      if params[:regenerate] == 'true'
        @quotation.final_quotations.destroy_all
      end

      # Try to get combinations data from params first, then from stored database data
      combinations_data = params[:combinations]
      # Parse JSON string if needed
      if combinations_data.present? && combinations_data.is_a?(String)
        combinations_data = JSON.parse(combinations_data)
      elsif combinations_data.present? && combinations_data.is_a?(ActionController::Parameters)
        # Convert ActionController::Parameters to Hash to support .any? method
        combinations_data = combinations_data.to_h
      end

      # If no params combinations, check if we have stored combinations data in quotation_detail
      if combinations_data.blank? && @quotation.quotation_detail&.combinations_data.present?
        begin
          combinations_data = JSON.parse(@quotation.quotation_detail.combinations_data)
        rescue JSON::ParserError
          Rails.logger.error "Failed to parse stored combinations data"
          combinations_data = nil
        end
      end

      # Check if we have combinations data with calculated values to generate final quotation
      if combinations_data.present? && combinations_data.any? { |combo_id, combo_data| combo_data["calculated_values"].present? }
        Rails.logger.info "✅ Generating final quotation with JavaScript calculated values"
        final_quotation = FinalQuotationGenerator.new(@quotation, combinations_data).generate

        if final_quotation.persisted?
          # Don't clear combinations data - preserve for edit functionality
          # Original comment: Clear the stored combinations data after successful generation
          # @quotation.quotation_detail.update(combinations_data: nil) if @quotation.quotation_detail

          # Handle AJAX requests for inline preview
          if request.xhr?
            @final_quotation = final_quotation
            render template: 'final_quotations/show'
          else
            redirect_to final_quotation
          end
        else
          flash[:alert] = "Failed to generate final quotation"
        end
      else
        # Generate a basic final quotation from the database data without JavaScript calculations
        Rails.logger.info "📝 Generating basic final quotation from database data"
        final_quotation = FinalQuotationGenerator.new(@quotation).generate

        if final_quotation.persisted?
          # Handle AJAX requests for inline preview
          if request.xhr?
            @final_quotation = final_quotation
            render template: 'final_quotations/show'
          else
            redirect_to final_quotation
          end
        else
          flash[:alert] = "Failed to generate final quotation"
          if request.xhr?
            render json: { error: "Failed to generate final quotation" }, status: :unprocessable_entity
          else
            redirect_to quotations_path
          end
        end
      end
    end
  end

  def new
    @quotation = current_production_house.quotations.build
    @quotation.build_quotation_detail

    # Initialize empty stored data for consistency with edit view
    @stored_talent_data = nil
    @stored_combinations_data = nil

    # Initialize with empty talent categories (user will add as needed)
    load_form_data
  end

  def edit
    # Check if we're editing from a final quotation
    if params[:edit_from].present?
      populate_from_final_quotation(params[:edit_from])
    else
      # Load stored combinations data from database for regular edit
      if @quotation.quotation_detail&.combinations_data.present?
        begin
          stored_data = JSON.parse(@quotation.quotation_detail.combinations_data)
          # Handle dual cache format (talent + combinations)
          if stored_data.key?("talent") && stored_data.key?("combinations")
            @stored_talent_data = stored_data["talent"]
            @stored_combinations_data = stored_data["combinations"]
          else
            # Fallback for old format
            @stored_combinations_data = stored_data
            @stored_talent_data = build_talent_data_from_database
          end
          Rails.logger.info "✅ Loaded stored data: #{@stored_talent_data&.keys&.count || 0} talent categories + #{@stored_combinations_data&.keys&.count || 0} combinations"
        rescue JSON::ParserError
          Rails.logger.error "Failed to parse stored combinations data"
          @stored_talent_data = build_talent_data_from_database
          @stored_combinations_data = nil
        end
      else
        # Fallback to building from database
        @stored_talent_data = build_talent_data_from_database
        @stored_combinations_data = nil
      end
    end

    # Load form data with all associations
    load_form_data
  end

  def update
    if @quotation.update(quotation_params)
      # Process talent categories, territories, etc. (reuse existing logic from create)
      process_talent_categories
      process_territories

      # Extract guarantee, exclusivity, and commercials data (same logic as create)
      if params[:combinations].present?
        combinations_data = params[:combinations].is_a?(String) ? JSON.parse(params[:combinations]) : params[:combinations]

        has_guarantee = false
        common_exclusivity = nil
        common_num_commercials = nil

        combinations_data.each do |combo_id, combo_data|
          # Check guarantee
          if combo_data["is_guaranteed"] == "1" || combo_data["is_guaranteed"] == true
            has_guarantee = true
          end

          # Extract exclusivity from exclusivities array or calculated_values (search all combinations)
          if common_exclusivity.nil?
            if combo_data["exclusivities"].present? && combo_data["exclusivities"].any?
              common_exclusivity = combo_data["exclusivities"].first
            elsif combo_data["calculated_values"].present?
              combo_data["calculated_values"].each do |category_id, talent_lines|
                talent_lines.each do |line_id, line_data|
                  if line_data["exclusivity_type"].present? && line_data["exclusivity_type"] != ""
                    common_exclusivity = line_data["exclusivity_type"]
                    break
                  end
                end
                break if common_exclusivity
              end
            end
          end

          # Extract number of commercials (use first non-nil value found)
          if common_num_commercials.nil? && combo_data["num_commercials"].present?
            common_num_commercials = combo_data["num_commercials"].to_i
          end
        end

        # Update quotation with guarantee
        @quotation.update(is_guaranteed: has_guarantee)

        # Update quotation_detail with exclusivity and number of commercials
        @quotation.quotation_detail ||= @quotation.build_quotation_detail
        @quotation.quotation_detail.update(
          exclusivity_type: common_exclusivity,
          number_of_commercials: common_num_commercials
        )

        Rails.logger.info "🏆 Updated - guarantee: #{has_guarantee}, exclusivity: #{common_exclusivity}, commercials: #{common_num_commercials}"
      end

      # Store complete form data cache (talent + combinations) for fast edit loading
      if params[:combinations].present?
        @quotation.quotation_detail ||= @quotation.build_quotation_detail

        # Build and store separated form data cache
        form_cache = build_form_data_cache
        @quotation.quotation_detail.update(combinations_data: form_cache.to_json)

        Rails.logger.info "🏆 Updated dual cache: #{form_cache[:talent].keys.count} talent categories + #{form_cache[:combinations].keys.count} combinations"
      end

      redirect_to @quotation, notice: "Quotation updated successfully"
    else
      load_form_data
      render :edit
    end
  end

  def create
    @quotation = current_production_house.quotations.build(quotation_params)

    # Use campaign_name as project_name if project_name is blank
    if @quotation.project_name.blank? && @quotation.campaign_name.present?
      @quotation.project_name = @quotation.campaign_name
    end

    if @quotation.save
      # Store media types from form
      media_types = []
      if params[:combinations].present?
        # Parse JSON string if needed
        combinations_data = params[:combinations].is_a?(String) ? JSON.parse(params[:combinations]) : params[:combinations]
        combinations_data.each do |combo_id, combo_data|
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

      # Check if any combination has guarantee enabled and extract exclusivity/comms data
      if params[:combinations].present?
        has_guarantee = false
        common_exclusivity = nil
        common_num_commercials = nil

        Rails.logger.info "🛡️ DEBUG: Checking guarantee, exclusivity, and commercials in combinations..."
        combinations_data.each do |combo_id, combo_data|
          Rails.logger.info "🛡️ DEBUG: Combo #{combo_id} - is_guaranteed: #{combo_data["is_guaranteed"].inspect}"

          # Check guarantee
          if combo_data["is_guaranteed"] == "1" || combo_data["is_guaranteed"] == true
            has_guarantee = true
          end

          # Extract exclusivity from exclusivities array or calculated_values (search all combinations)
          if common_exclusivity.nil?
            if combo_data["exclusivities"].present? && combo_data["exclusivities"].any?
              common_exclusivity = combo_data["exclusivities"].first
            elsif combo_data["calculated_values"].present?
              # Look for exclusivity in calculated values
              combo_data["calculated_values"].each do |category_id, talent_lines|
                talent_lines.each do |line_id, line_data|
                  if line_data["exclusivity_type"].present? && line_data["exclusivity_type"] != ""
                    common_exclusivity = line_data["exclusivity_type"]
                    break
                  end
                end
                break if common_exclusivity
              end
            end
          end

          # Extract number of commercials (use first non-nil value found)
          if common_num_commercials.nil? && combo_data["num_commercials"].present?
            common_num_commercials = combo_data["num_commercials"].to_i
          end
        end

        # Update quotation with guarantee
        @quotation.update(is_guaranteed: has_guarantee)

        # Update quotation_detail with exclusivity and number of commercials
        @quotation.quotation_detail ||= @quotation.build_quotation_detail
        @quotation.quotation_detail.update(
          exclusivity_type: common_exclusivity,
          number_of_commercials: common_num_commercials
        )

        Rails.logger.info "🛡️ DEBUG: Updated - guarantee: #{has_guarantee}, exclusivity: #{common_exclusivity}, commercials: #{common_num_commercials}"
      end

      # Calculate totals (product type adjustments are now handled in calculator)
      calculation = QuotationCalculator.new(@quotation).calculate

      @quotation.update(total_amount: calculation[:total])

      # Create history entry
      @quotation.quotation_histories.create(
        action: "created",
        user: current_production_house.name,
        data: { total: calculation[:total] }
      )

      # Store complete form data cache (talent + combinations) for fast edit loading
      if params[:combinations].present?
        # Ensure quotation_detail exists before updating
        @quotation.quotation_detail ||= @quotation.build_quotation_detail

        # Build and store separated form data cache
        form_cache = build_form_data_cache
        @quotation.quotation_detail.update(
          combinations_data: form_cache.to_json
        )

        Rails.logger.info "🏆 Stored dual cache: #{form_cache[:talent].keys.count} talent categories + #{form_cache[:combinations].keys.count} combinations"
      end

      # Store screenshot data from the preview tables
      store_preview_screenshots(@quotation)

      flash[:notice] = "Quotation created successfully"

      # Handle AJAX requests for inline preview
      if request.xhr?
        # Generate or retrieve the final quotation and render its template
        # Try to get combinations data from params first, then from stored database data
        combinations_data = params[:combinations]
        # Parse JSON string if needed
        if combinations_data.present? && combinations_data.is_a?(String)
          combinations_data = JSON.parse(combinations_data)
        elsif combinations_data.present? && combinations_data.is_a?(ActionController::Parameters)
          # Convert ActionController::Parameters to Hash to support .any? method
          combinations_data = combinations_data.permit!.to_h
        end

        # Check if we have combinations data with calculated values to generate final quotation
        if combinations_data.present? && combinations_data.any? { |combo_id, combo_data| combo_data["calculated_values"].present? }
          Rails.logger.info "✅ Generating final quotation with JavaScript calculated values"
          final_quotation = FinalQuotationGenerator.new(@quotation, combinations_data).generate
        else
          # Generate a basic final quotation from the database data without JavaScript calculations
          Rails.logger.info "📝 Generating basic final quotation from database data"
          final_quotation = FinalQuotationGenerator.new(@quotation).generate
        end

        if final_quotation.persisted?
          @final_quotation = final_quotation
          render template: 'final_quotations/show'
        else
          render json: { error: "Failed to generate final quotation" }, status: :unprocessable_entity
        end
      else
        redirect_to @quotation
      end
    else
      load_form_data
      render :new
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
      redirect_to new_quotation
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
    # Parse JSON string if needed
    combinations_data = params[:combinations]
    if combinations_data.present? && combinations_data.is_a?(String)
      combinations_data = JSON.parse(combinations_data)
    end
    final_quotation = FinalQuotationGenerator.new(@quotation, combinations_data).generate

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

  def combinations_params
    params.permit(
      combinations: [
        :is_guaranteed, :media_types, :territories, :unlimited_stills, :unlimited_versions,
        { calculated_values: {} }
      ]
    )
  end

  def load_form_data
    @talent_settings = Setting.where(category: "talent").order(:key)
    @duration_settings = Setting.where(category: "duration").order(:key)
    @territories = Territory.all.order(:name)
    @territory_exceptions = TerritoryMediaException.all
    
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
      # Handle the current form structure: talent[category_id][field_name]
      description = category_data[:description]
      talent_count = category_data[:talent_count].to_i
      adjusted_rate = category_data[:adjusted_rate].to_f
      days_count = category_data[:days_count].to_i
      rehearsal_days = category_data[:rehearsal_days].to_i
      travel_days = category_data[:travel_days].to_i
      down_days = category_data[:down_days].to_i
      overtime_hours = category_data[:overtime_hours].to_f
      night_premium = category_data[:night_premium] == "true" || category_data[:night_premium] == "1"
      # Collect all exclusivities for this category
      exclusivities = []

      # Add category-based exclusivity if present
      if category_data[:exclusivity_type].present?
        exclusivities << category_data[:exclusivity_type]
      end

      # Add line-specific exclusivity if present
      if category_data[:lines].present?
        first_line = category_data[:lines]["0"] || category_data[:lines].values.first
        if first_line && first_line[:exclusivity_type].present?
          exclusivities << first_line[:exclusivity_type]
        end
      end

      # Combine all exclusivities, removing duplicates
      exclusivity_type = exclusivities.uniq.join(", ")

      # Skip if no meaningful data
      next if talent_count == 0 && adjusted_rate == 0 && description.blank?


      # Create or find talent category
      talent_category = @quotation.talent_categories.find_or_create_by(
        category_type: category_id
      )

      # Update talent category fields including all talent parameters
      talent_category.update!(
        description: description,
        adjusted_rate: adjusted_rate,
        initial_count: talent_count,
        shoot_days: days_count,
        overtime_hours: overtime_hours,
        rehearsal_days: rehearsal_days,
        down_days: down_days,
        travel_days: travel_days,
        night_premium: night_premium
      )

      # Clear existing day_on_sets and create new one
      talent_category.day_on_sets.destroy_all

      # Create day_on_sets entry if we have talent count
      if talent_count > 0
        # Get buyout percentage for main category (if submitted)
        main_buyout_percentage = category_data[:buyout_percentage].to_f

        day_on_set = talent_category.day_on_sets.create!(
          talent_count: talent_count,
          days_count: days_count > 0 ? days_count : 1,
          description: description,
          adjusted_rate: adjusted_rate,
          rehearsal_days: rehearsal_days,
          down_days: down_days,
          travel_days: travel_days,
          overtime_hours: overtime_hours,
          night_premium: category_data[:night_premium] == "true" || category_data[:night_premium] == "1",
          exclusivity_type: exclusivity_type,
          buyout_percentage: main_buyout_percentage
        )
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
          line_buyout_percentage = line_data[:buyout_percentage].to_f
          # Collect all exclusivities for this specific line
          line_exclusivities = []

          # Add category-based exclusivity (applies to all lines in this category)
          if category_data[:exclusivity_type].present?
            line_exclusivities << category_data[:exclusivity_type]
          end

          # Add line-specific exclusivity
          if line_data[:exclusivity_type].present?
            line_exclusivities << line_data[:exclusivity_type]
          end

          # Combine all exclusivities for this line
          line_exclusivity_type = line_exclusivities.uniq.join(", ")

          # Skip empty lines
          next if line_talent_count == 0 && line_adjusted_rate == 0 && line_description.blank?


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
            night_premium: line_data[:night_premium] == "true" || line_data[:night_premium] == "1",
            exclusivity_type: line_exclusivity_type,
            buyout_percentage: line_buyout_percentage
          )
        end
      end

    end
  end

  def process_territories
    # Check for territories in combinations structure first
    territory_ids = []

    if params[:combinations].present?
      # Parse JSON string if needed
      combinations_data = params[:combinations].is_a?(String) ? JSON.parse(params[:combinations]) : params[:combinations]
      combinations_data.each do |combo_id, combo_data|
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

  def store_preview_screenshots(quotation)
    return unless quotation.quotation_detail

    screenshots = {}

    # Look for screenshot parameters in the form data
    params.each do |key, value|
      if key.to_s.start_with?("screenshot_group_") && value.present?
        group_number = key.to_s.split("_").last
        screenshots[group_number] = value
        Rails.logger.info "📸 Storing preview content for group #{group_number}"
      end
    end

    # Store screenshots as JSON in quotation_detail
    if screenshots.any?
      quotation.quotation_detail.update(
        preview_screenshots: screenshots.to_json
      )
      Rails.logger.info "✅ Stored #{screenshots.count} preview captures for quotation #{quotation.id}"
    end
  end

  def populate_from_final_quotation(final_quotation_id)
    final_quotation = FinalQuotation.find(final_quotation_id)
    Rails.logger.info "🔄 Loading form data for editing quotation #{@quotation.id} from cached data"

    # Try to load from dual cache first (fast path)
    if @quotation.quotation_detail&.combinations_data.present?
      begin
        cached_data = JSON.parse(@quotation.quotation_detail.combinations_data)

        # Check if this is the new dual cache format
        if cached_data.key?("talent") && cached_data.key?("combinations")
          Rails.logger.info "✅ Using dual cache format with separated talent and combinations"
          @stored_talent_data = cached_data["talent"]
          @stored_combinations_data = cached_data["combinations"]
        else
          Rails.logger.info "⚠️ Old cache format detected, using combinations only"
          @stored_combinations_data = cached_data
          @stored_talent_data = nil
        end
      rescue JSON::ParserError => e
        Rails.logger.error "❌ Failed to parse cached data: #{e.message}"
        @stored_combinations_data = nil
        @stored_talent_data = nil
      end
    end

    # Fallback: rebuild from database if no cache available (slow path)
    if @stored_combinations_data.blank?
      Rails.logger.warn "⚠️ No cached data found, rebuilding from final quotation"
      @stored_combinations_data = build_combinations_data_from_final_quotation(final_quotation)
    end

    # Build talent data from final quotation if not already cached
    if @stored_talent_data.blank?
      Rails.logger.info "🏗️ Building talent data from final quotation for accuracy"
      @stored_talent_data = build_talent_data_from_final_quotation(final_quotation)
    end

    Rails.logger.info "🏆 Edit data loaded: #{@stored_talent_data&.keys&.count || 0} talent categories + #{@stored_combinations_data&.keys&.count || 0} combinations"

  rescue ActiveRecord::RecordNotFound
    flash[:alert] = "Final quotation not found"
  end

  def build_combinations_data_from_final_quotation(final_quotation)
    combinations_data = {}

    final_quotation.final_quotation_groups.each do |group|
      # Build combination data structure from FinalQuotationTalentLine records
      calculated_values = {}
      talent_data = {}

      group.final_quotation_talent_lines.each do |talent_line|
        category_id = map_category_type_to_id(talent_line.category_type)
        next unless category_id

        # Initialize category if not exists
        calculated_values[category_id.to_s] ||= {}

        # Find next available line index for this category
        line_index = calculated_values[category_id.to_s].keys.length

        # Create line data matching the expected format
        calculated_values[category_id.to_s][line_index.to_s] = {
          "day_fee" => talent_line.adjusted_rate.to_s,
          "unit_count" => talent_line.talent_count.to_s,
          "calculated_buyout_percentage" => talent_line.buyout_percentage.to_s,
          "per_talent_amount" => talent_line.per_talent_amount.to_s,
          "total_line_cost" => talent_line.total_line_cost.to_s,
          "description" => talent_line.description,
          "exclusivity_type" => talent_line.exclusivity_type || "",
          "commercial_count" => talent_line.commercial_count.to_s
        }

        # Also build talent data format for JavaScript compatibility
        # Find matching talent category for this combo
        talent_category = @quotation.talent_categories.find_by(category_type: category_id)
        if talent_category
          talent_data[talent_category.id.to_s] = {
            "unit_count" => talent_line.talent_count.to_s,
            "day_fee" => talent_line.adjusted_rate.to_s
          }
        end
      end

      combinations_data["combo_#{group.group_number}"] = {
        "duration" => group.duration,
        "territories" => group.selected_territories.map { |t| t["id"] },
        "media_types" => group.selected_media_types,
        "calculated_values" => calculated_values,
        "talent" => talent_data,
        "num_commercials" => 1,
        "exclusivities" => [],
        "is_guaranteed" => group.is_guaranteed
      }
    end

    combinations_data
  end

  def map_category_type_to_id(category_type)
    # Map category type names to IDs based on standard categories
    case category_type.downcase
    when 'lead' then 1
    when 'second lead' then 2
    when 'featured extra' then 3
    when 'teenagers' then 4
    when 'kids' then 5
    when 'walk-on' then 6
    when 'extras' then 7
    else nil
    end
  end

  def update_talent_categories_from_combinations(combinations_data)
    return unless combinations_data.present?

    combinations_data.each do |combination_key, combo_data|
      talent_data = combo_data["talent"] || {}

      talent_data.each do |talent_category_id, talent_info|
        talent_category = @quotation.talent_categories.find_by(id: talent_category_id)
        next unless talent_category

        talent_count = talent_info["unit_count"].to_i
        talent_category.update(initial_count: talent_count) if talent_count > 0

        Rails.logger.info "Updated talent category #{talent_category_id} with initial_count: #{talent_count}"
      end
    end
  end

  # Build complete form data cache with separated talent and combinations data
  def build_form_data_cache
    # Parse combinations data if it's a JSON string
    combinations_data = params[:combinations] || {}
    if combinations_data.is_a?(String)
      begin
        combinations_data = JSON.parse(combinations_data)
      rescue JSON::ParserError
        Rails.logger.error "Failed to parse combinations data as JSON"
        combinations_data = {}
      end
    end

    cache_data = {
      talent: build_talent_data_from_database,
      combinations: combinations_data
    }

    Rails.logger.info "Built form data cache with #{cache_data[:talent].keys.count} talent categories and #{cache_data[:combinations].keys.count} combinations"
    cache_data
  end

  # Build talent data from database talent_categories (for fallback or cache building)
  def build_talent_data_from_database
    talent_data = {}

    # Group talent categories by category_type to support multiple lines per category
    @quotation.talent_categories.group_by(&:category_type).each do |category_type, categories|
      # For each category, get all talent lines from day_on_sets (which contains the actual talent lines)
      all_lines = []

      categories.each do |talent_category|
        if talent_category.day_on_sets.any?
          # Use day_on_sets data (contains individual talent lines)
          talent_category.day_on_sets.each do |day_on_set|
            all_lines << {
              description: day_on_set.description,
              talent_count: day_on_set.talent_count,
              adjusted_rate: day_on_set.adjusted_rate.to_s,
              days_count: day_on_set.days_count,
              rehearsal_days: day_on_set.rehearsal_days,
              down_days: day_on_set.down_days,
              travel_days: day_on_set.travel_days,
              overtime_hours: day_on_set.overtime_hours,
              night_premium: day_on_set.night_premium
            }
          end
        else
          # Fallback to talent_category data if no day_on_sets
          all_lines << {
            description: talent_category.description,
            talent_count: talent_category.initial_count,
            adjusted_rate: talent_category.adjusted_rate.to_s,
            days_count: talent_category.shoot_days,
            rehearsal_days: talent_category.rehearsal_days,
            down_days: talent_category.down_days,
            travel_days: talent_category.travel_days,
            overtime_hours: talent_category.overtime_hours,
            night_premium: talent_category.night_premium
          }
        end
      end

      talent_data[category_type.to_s] = {
        lines: all_lines
      }
    end

    talent_data
  end

  # Build talent data from final quotation (preserves exact values used in final quotation)
  def build_talent_data_from_final_quotation(final_quotation)
    talent_data = {}

    # Group final quotation talent lines by category
    final_quotation.final_quotation_groups.each do |group|
      group.final_quotation_talent_lines.group_by(&:category_type).each do |category_type, talent_lines|
        category_id = map_category_type_to_id(category_type)
        next unless category_id

        lines = talent_lines.map do |talent_line|
          {
            description: talent_line.description,
            talent_count: talent_line.talent_count,
            adjusted_rate: talent_line.adjusted_rate.to_s,
            days_count: talent_line.days_count || 1,
            rehearsal_days: talent_line.rehearsal_days || 0,
            down_days: talent_line.down_days || 0,
            travel_days: talent_line.travel_days || 0,
            overtime_hours: talent_line.overtime_hours || 0,
            night_premium: talent_line.night_premium || false
          }
        end

        talent_data[category_id.to_s] = {
          lines: lines
        }
      end
    end

    talent_data
  end
end
