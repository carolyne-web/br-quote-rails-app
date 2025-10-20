class FinalQuotationGenerator
  def initialize(quotation, combinations_data = nil)
    @quotation = quotation
    @combinations_data = combinations_data
    @detail = quotation.quotation_detail
    @calculation = QuotationCalculator.new(quotation).calculate
  end

  def generate
    ActiveRecord::Base.transaction do
      final_quotation = create_final_quotation
      create_groups_and_talent_lines(final_quotation)
      create_adjustments(final_quotation)
      final_quotation
    end
  rescue => e
    Rails.logger.error "Failed to generate final quotation: #{e.message}"
    raise e
  end

  private

  def create_final_quotation
    FinalQuotation.create!(
      quotation: @quotation,
      project_name: @quotation.project_name,
      project_number: @quotation.project_number,
      product_type: @quotation.product_type,
      commercial_type: @quotation.commercial_type || "Commercial",
      is_guaranteed: @quotation.is_guaranteed,

      # Global shooting details
      shoot_days: @detail&.shoot_days || 1,
      rehearsal_days: @detail&.rehearsal_days || 0,
      travel_days: @detail&.travel_days || 0,
      down_days: @detail&.down_days || 0,
      overtime_hours: @detail&.overtime_hours || 0,

      # Global contract details
      exclusivity_type: @detail&.exclusivity_type,
      unlimited_stills: has_unlimited_stills?,
      unlimited_versions: has_unlimited_versions?,

      # Final calculated totals
      total_talent_fee: @calculation[:total_talent_fee],
      total_usage_fee: @calculation[:usage_buyout_total],
      total_amount: @calculation[:total]
    )
  end

  def create_groups_and_talent_lines(final_quotation)
    if @combinations_data.present?
      # Create separate groups for each combination
      @combinations_data.each_with_index do |(combo_id, combo_data), index|
        create_group_from_combination(final_quotation, combo_id, combo_data, index + 1)
      end
    else
      # Fallback: create single group with all data
      create_single_group(final_quotation)
    end
  end

  def create_talent_line_from_day_on_set(group, category, day_on_set, combo_id = nil, combo_exclusivities = [], calculated_values = {})
    # Use day_on_set data for individual line details
    daily_rate = category.daily_rate || 0
    adjusted_rate = day_on_set.adjusted_rate || category.adjusted_rate || daily_rate
    rate_adjustment = adjusted_rate - daily_rate

    # Get description from day_on_set (individual line) or fallback to category
    description = day_on_set.description.present? ? day_on_set.description :
                  (category.description.present? ? category.description : get_category_description(category.category_type))

    # Debug: Show what calculated_values we received
    Rails.logger.info "🔍 DEBUGGING calculated_values for #{description}:"
    Rails.logger.info "   calculated_values present: #{calculated_values.present?}"
    Rails.logger.info "   calculated_values: #{calculated_values.inspect}"

    # Check if we have JavaScript calculated values to use exact preview data
    if calculated_values.present? && calculated_values["day_fee"].present?
      Rails.logger.info "✅ Using EXACT JavaScript-calculated values for #{description}"
      Rails.logger.info "   Per Talent: R#{calculated_values["per_talent_amount"]}, Total: R#{calculated_values["total_line_cost"]}, Buyout: #{calculated_values["calculated_buyout_percentage"]}%"

      # Use JavaScript-calculated values directly - THESE ARE THE EXACT VALUES FROM PREVIEW
      talent_count = calculated_values["unit_count"].to_i
      buyout_percentage = calculated_values["calculated_buyout_percentage"].to_f
      per_talent_amount = calculated_values["per_talent_amount"].to_f
      total_line_cost = calculated_values["total_line_cost"].to_f

      # Use JavaScript-captured exclusivity and commercial count
      js_exclusivity = calculated_values["exclusivity_type"]
      line_exclusivity = js_exclusivity.present? ? js_exclusivity : determine_exclusivity_for_line(combo_exclusivities, category, day_on_set)
      js_commercial_count = calculated_values["commercial_count"]
    else
      Rails.logger.info "📝 No JavaScript values available - calculating from database data for #{description}"

      # Fallback to database calculations
      talent_count = day_on_set.talent_count
      buyout_percentage = day_on_set.buyout_percentage || 0.0
      line_exclusivity = determine_exclusivity_for_line(combo_exclusivities, category, day_on_set)
      js_commercial_count = 1 # Default to 1 commercial

      # Calculate basic values from database data
      daily_rate = day_on_set.adjusted_rate || category.adjusted_rate || 0
      base_fee = daily_rate * day_on_set.days_count * talent_count
      per_talent_amount = base_fee / talent_count if talent_count > 0
      total_line_cost = base_fee
    end

    # Calculate individual component fees by working backwards from the exact totals
    shoot_days = @detail&.shoot_days || 1
    rehearsal_days = day_on_set.rehearsal_days || 0
    travel_days = day_on_set.travel_days || 0
    down_days = day_on_set.down_days || 0
    overtime_hours = day_on_set.overtime_hours || 0
    days_count = day_on_set.days_count || shoot_days

    # Calculate the base talent fees (this should match what was used in JavaScript)
    base_fee = talent_count * adjusted_rate * days_count
    rehearsal_fee = talent_count * adjusted_rate * rehearsal_days * 0.5
    travel_fee = talent_count * adjusted_rate * travel_days * 0.5
    down_fee = talent_count * adjusted_rate * down_days * 0.5
    overtime_fee = talent_count * (adjusted_rate * 0.1) * overtime_hours * days_count

    # Night premium: 50% of base rate for first shoot day only (if night premium is enabled)
    night_fee = if day_on_set.night_premium
      talent_count * adjusted_rate * 0.5 # 50% of day rate for talent count
    else
      0
    end

    total_talent_fee = base_fee + rehearsal_fee + travel_fee + down_fee + overtime_fee + night_fee

    # Calculate usage fee from the exact JavaScript totals
    # total_line_cost = total_talent_fee + usage_fee, so:
    usage_fee = total_line_cost - total_talent_fee
    usage_fee = [usage_fee, 0].max # Ensure non-negative

    group.final_quotation_talent_lines.create!(
      description: description,
      category_type: get_category_type_name(category.category_type),
      talent_count: talent_count,
      daily_rate: daily_rate,
      rate_adjustment: rate_adjustment,
      adjusted_rate: adjusted_rate,

      # Days specific to this talent line
      shoot_days: days_count,
      rehearsal_days: rehearsal_days,
      travel_days: travel_days,
      down_days: down_days,
      overtime_hours: overtime_hours,

      # Calculated fees
      base_fee: base_fee,
      rehearsal_fee: rehearsal_fee,
      travel_fee: travel_fee,
      down_fee: down_fee,
      overtime_fee: overtime_fee,
      night_fee: night_fee,
      total_talent_fee: total_talent_fee,
      usage_fee: usage_fee,
      total_line_cost: total_line_cost,
      buyout_percentage: buyout_percentage,

      # Night premium
      has_night_premium: day_on_set.night_premium || false,
      night_premium_amount: night_fee,

      # Exclusivity - use JavaScript-captured exclusivity if available, otherwise combination-specific
      exclusivity_type: line_exclusivity,

      # Commercial count - use JavaScript-captured value if available, otherwise default to 1
      commercial_count: js_commercial_count&.to_i || 1,

      # Per talent amount - store the exact JavaScript-calculated value
      per_talent_amount: per_talent_amount
    )
  end

  def create_talent_line(group, category)
    # Skip if no talent count - defensive programming
    return if category.initial_count <= 0

    # Calculate fees for this specific talent line
    daily_rate = category.daily_rate || 0
    adjusted_rate = category.adjusted_rate || daily_rate
    rate_adjustment = adjusted_rate - daily_rate

    # Calculate individual fees
    shoot_days = @detail&.shoot_days || 1
    rehearsal_days = @detail&.rehearsal_days || 0
    travel_days = @detail&.travel_days || 0
    down_days = @detail&.down_days || 0
    overtime_hours = category.overtime_hours || @detail&.overtime_hours || 0

    base_fee = category.initial_count * adjusted_rate * shoot_days
    rehearsal_fee = category.initial_count * adjusted_rate * rehearsal_days * 0.5
    travel_fee = category.initial_count * adjusted_rate * travel_days * 0.5
    down_fee = category.initial_count * adjusted_rate * down_days * 0.5
    overtime_fee = category.initial_count * (adjusted_rate * 0.1) * overtime_hours * shoot_days
    night_fee = 0 # TODO: Implement night premium logic

    total_talent_fee = base_fee + rehearsal_fee + travel_fee + down_fee + overtime_fee + night_fee

    # Calculate usage fee for this talent line using group-specific multipliers
    usage_fee = calculate_talent_line_usage_fee(category, base_fee, group)

    group.final_quotation_talent_lines.create!(
      description: category.description.present? ? category.description : get_category_description(category.category_type),
      category_type: get_category_type_name(category.category_type),
      talent_count: category.initial_count,
      daily_rate: daily_rate,
      rate_adjustment: rate_adjustment,
      adjusted_rate: adjusted_rate,

      # Days specific to this talent line
      shoot_days: shoot_days,
      rehearsal_days: rehearsal_days,
      travel_days: travel_days,
      down_days: down_days,
      overtime_hours: overtime_hours,

      # Night premium (to be implemented)
      has_night_premium: false,
      night_premium_amount: 0,

      # Calculated fees
      base_fee: base_fee,
      rehearsal_fee: rehearsal_fee,
      travel_fee: travel_fee,
      down_fee: down_fee,
      overtime_fee: overtime_fee,
      night_fee: night_fee,
      total_talent_fee: total_talent_fee,
      usage_fee: usage_fee,
      total_line_cost: total_talent_fee + usage_fee,

      # Exclusivity - fallback to nil for old method
      exclusivity_type: nil
    )
  end

  def calculate_talent_line_usage_fee(category, base_fee, group = nil)
    # Use group-specific multipliers if group is provided, otherwise use global
    if group
      multiplier = group.territory_multiplier *
                  group.media_multiplier *
                  group.duration_multiplier *
                  group.exclusivity_multiplier
    else
      multiplier = @calculation[:territory_multiplier] *
                  @calculation[:media_multiplier] *
                  @calculation[:duration_multiplier] *
                  @calculation[:exclusivity_multiplier]
    end

    usage_fee = base_fee * multiplier

    # Apply kids category adjustments if applicable
    if category.category_type == 5 && @quotation.product_type.present?
      case @quotation.product_type
      when 'adult'
        usage_fee *= 0.5  # 50% reduction
      when 'family'
        usage_fee *= 0.75 # 25% reduction
      end
    end

    # Apply guarantee discount if applicable
    if @quotation.is_guaranteed
      usage_fee *= 0.75
    end

    usage_fee
  end

  def create_adjustments(final_quotation)
    @quotation.quotation_adjustments.each do |adjustment|
      final_quotation.final_quotation_adjustments.create!(
        description: adjustment.description,
        adjustment_type: adjustment.adjustment_type,
        percentage: adjustment.percentage,
        amount: (@calculation[:usage_buyout_total] * (adjustment.percentage / 100.0))
      )
    end
  end

  def get_selected_territories
    @quotation.territories.map { |t| { id: t.id, name: t.name, percentage: t.percentage } }
  end

  def get_selected_media_types
    @detail&.selected_media_types || []
  end

  def get_category_description(category_type)
    # Map category type to description
    case category_type.to_i
    when 1 then "Lead Actor"
    when 2 then "Second Lead"
    when 3 then "Featured Extra"
    when 4 then "Teenager"
    when 5 then "Kid"
    when 6 then "Walk-on"
    when 7 then "Extra"
    else "Unknown"
    end
  end

  def get_category_type_name(category_type)
    case category_type.to_i
    when 1 then "Lead"
    when 2 then "Second Lead"
    when 3 then "Featured Extra"
    when 4 then "Teenagers"
    when 5 then "Kids"
    when 6 then "Walk-on"
    when 7 then "Extras"
    else "Unknown"
    end
  end

  def create_group_from_combination(final_quotation, combo_id, combo_data, group_number)
    # Extract territories for this combination
    territories = []
    if combo_data["territories"].present?
      combo_data["territories"].each do |territory_id|
        territory = Territory.find_by(id: territory_id)
        if territory
          territories << { id: territory.id, name: territory.name, percentage: territory.percentage }
        end
      end
    end

    # Extract media types for this combination
    media_types = combo_data["media_types"] || []

    # Extract exclusivities for this combination
    combo_exclusivities = combo_data["exclusivities"] || []

    # Calculate multipliers for this specific combination
    # Handle empty duration strings and provide fallback
    duration_value = combo_data["duration"]
    final_duration = (duration_value.present? && duration_value != "") ? duration_value : (@detail&.duration || "12_months")

    # Calculate group-specific multipliers
    group_calculations = calculate_group_multipliers(territories, media_types, final_duration)


    # Check if this specific combination has unlimited options
    group_unlimited_stills = combo_data["unlimited_stills"] == "1"
    group_unlimited_versions = combo_data["unlimited_versions"] == "1"

    # Check if this specific combination has guarantee enabled
    group_is_guaranteed = combo_data["is_guaranteed"] == "1"

    group = final_quotation.final_quotation_groups.create!(
      group_number: group_number,
      duration: final_duration,
      selected_territories: territories.present? ? territories : [],
      selected_media_types: media_types.present? ? media_types : [],

      # Group-specific unlimited options
      unlimited_stills: group_unlimited_stills,
      unlimited_versions: group_unlimited_versions,

      # Group-specific guarantee status
      is_guaranteed: group_is_guaranteed,

      # Group-specific calculations
      territory_multiplier: group_calculations[:territory_multiplier],
      media_multiplier: group_calculations[:media_multiplier],
      duration_multiplier: group_calculations[:duration_multiplier],
      exclusivity_multiplier: group_calculations[:exclusivity_multiplier],
      group_usage_fee: group_calculations[:usage_buyout_total]
    )

    # Extract calculated values for this combination
    calculated_values = combo_data["calculated_values"] || {}

    # Create talent lines for this group
    create_talent_lines_for_group(group, combo_id, combo_exclusivities, calculated_values)
  end

  def create_single_group(final_quotation)
    group = final_quotation.final_quotation_groups.create!(
      group_number: 1,
      duration: @detail&.duration || "12_months",
      selected_territories: get_selected_territories,
      selected_media_types: get_selected_media_types,

      # Group calculations
      territory_multiplier: @calculation[:territory_multiplier],
      media_multiplier: @calculation[:media_multiplier],
      duration_multiplier: @calculation[:duration_multiplier],
      exclusivity_multiplier: @calculation[:exclusivity_multiplier],
      group_usage_fee: @calculation[:usage_buyout_total]
    )

    # Create talent lines for this group
    create_talent_lines_for_group(group, nil, [], {})
  end

  def calculate_group_multipliers(territories, media_types, duration)
    # Calculate territory multiplier for this group
    territory_multiplier = territories.sum { |territory| territory[:percentage].to_f } / 100.0

    # Calculate media multiplier for this group
    media_multiplier = calculate_media_multiplier(media_types)

    # Calculate duration multiplier for this group
    duration_multiplier = calculate_duration_multiplier(duration)

    # Exclusivity multiplier remains global for the quotation
    exclusivity_multiplier = @calculation[:exclusivity_multiplier]

    # Calculate total multiplier and usage fee for this group
    total_multiplier = territory_multiplier * media_multiplier * duration_multiplier * exclusivity_multiplier

    # Calculate usage buyout total for this group (base talent fee * total multiplier)
    # For now, use the global talent fee total - in future could be group-specific
    base_talent_fee = @calculation[:total_talent_fee]
    usage_buyout_total = base_talent_fee * total_multiplier

    {
      territory_multiplier: territory_multiplier,
      media_multiplier: media_multiplier,
      duration_multiplier: duration_multiplier,
      exclusivity_multiplier: exclusivity_multiplier,
      total_multiplier: total_multiplier,
      usage_buyout_total: usage_buyout_total
    }
  end

  def calculate_media_multiplier(media_types)
    # Use the existing media multiplier calculation logic
    return 1.0 if media_types.blank?

    # Check if "all_media" is selected
    if media_types.include?("all_media")
      return 1.0
    end

    # Otherwise calculate based on specific media types
    # This logic should match the existing QuotationCalculator
    multiplier = 0.0

    media_types.each do |media_type|
      case media_type
      when "tv", "cinema", "all_moving"
        multiplier += 0.5
      when "print", "internet"
        multiplier += 0.25
      when "radio"
        multiplier += 0.1
      end
    end

    [multiplier, 0.1].max # Minimum 10% multiplier
  end

  def calculate_duration_multiplier(duration)
    # Use the existing duration multiplier calculation logic
    case duration
    when "3_months" then 0.5
    when "6_months" then 0.75
    when "12_months" then 1.0
    when "18_months" then 1.25
    when "24_months" then 1.5
    when "36_months" then 2.0
    else 1.0
    end
  end

  def create_talent_lines_for_group(group, combo_id = nil, combo_exclusivities = [], calculated_values = {})
    # Create talent lines - one per day_on_set (individual line)
    @quotation.talent_categories.includes(:day_on_sets).each do |category|
      category.day_on_sets.each_with_index do |day_on_set, line_index|
        # Skip if no talent count
        next if day_on_set.talent_count <= 0

        # Get calculated values for this specific category and line
        category_calculated = calculated_values[category.category_type.to_s] || {}
        line_calculated = category_calculated[line_index.to_s] || {}

        create_talent_line_from_day_on_set(group, category, day_on_set, combo_id, combo_exclusivities, line_calculated)
      end
    end
  end

  def has_unlimited_stills?
    # Check if any combination has unlimited stills enabled
    if @combinations_data.present?
      @combinations_data.any? { |combo_id, combo_data| combo_data["unlimited_stills"] == "1" }
    else
      # Fallback to quotation details if no combinations data
      @detail&.unlimited_stills || false
    end
  end

  def has_unlimited_versions?
    # Check if any combination has unlimited versions enabled
    if @combinations_data.present?
      @combinations_data.any? { |combo_id, combo_data| combo_data["unlimited_versions"] == "1" }
    else
      # Fallback to quotation details if no combinations data
      @detail&.unlimited_versions || false
    end
  end

  private

  def determine_exclusivity_for_line(combo_exclusivities, category, day_on_set)
    # Check if there are combination-specific exclusivities for this talent line
    if combo_exclusivities.present?
      # Filter out invalid entries and convert to readable format
      exclusivity_names = combo_exclusivities.filter_map do |exclusivity|
        next if exclusivity.blank? || exclusivity == "0" || exclusivity == 0

        if exclusivity.is_a?(Hash) && exclusivity['name'].present? && exclusivity['percentage'].present?
          "#{exclusivity['name']} #{exclusivity['percentage']}%"
        elsif exclusivity.is_a?(String) && exclusivity.include?("%")
          exclusivity
        else
          nil
        end
      end

      return exclusivity_names.join(", ") if exclusivity_names.any?
    end

    # Fall back to day_on_set exclusivity if no combination-specific exclusivities
    day_on_set.exclusivity_type
  end
end