# app/services/quotation_calculator.rb
class QuotationCalculator
  def initialize(quotation)
    @quotation = quotation
    @detail = quotation.quotation_detail
    @territories = quotation.territories
    @adjustments = quotation.quotation_adjustments
    @talent_categories = quotation.talent_categories.includes(:day_on_sets)
  end

  def calculate
    standard_calculation
  end

  private


  def parse_duration_months(duration)
    return nil unless duration
    
    case duration
    when '1_month' then 1
    when '3_months' then 3
    when '6_months' then 6
    when '12_months' then 12
    when '18_months' then 18
    when '24_months' then 24
    when '36_months' then 36
    else nil
    end
  end


  def standard_calculation
    # A) Talent Fees (includes base + standby + overtime)
    base_talent_cost = calculate_base_talent_cost
    standby_cost = calculate_standby_cost
    overtime_cost = calculate_overtime_cost
    total_talent_fee = base_talent_cost + standby_cost + overtime_cost
    
    # B) Usage/Buyout (only base talent fees get multiplied, not standby/overtime)
    territory_multiplier = calculate_territory_multiplier
    media_multiplier = calculate_media_multiplier
    duration_multiplier = calculate_duration_multiplier
    exclusivity_multiplier = calculate_exclusivity_multiplier
    
    # Calculate usage/buyout per category with campaign adjustments
    usage_buyout_total = calculate_usage_buyout_by_category(
      base_talent_cost, 
      territory_multiplier, 
      media_multiplier, 
      duration_multiplier, 
      exclusivity_multiplier
    )
    
    # Additional options (applied to base talent fees only)
    additional_fees = 0
    additional_fees += base_talent_cost * 0.15 if @detail&.unlimited_stills
    additional_fees += base_talent_cost * 0.15 if @detail&.unlimited_versions
    
    # Apply guarantee discount if selected (25% off usage/buyout only)
    if @quotation.is_guaranteed
      usage_buyout_total = usage_buyout_total * 0.75
    end
    
    # C) Total = A + B + Additional Options
    manual_adjustment = calculate_manual_adjustments(usage_buyout_total)
    total = total_talent_fee + usage_buyout_total + additional_fees + manual_adjustment
    
    {
      base_talent_cost: base_talent_cost.round(2),
      standby_cost: standby_cost.round(2),
      overtime_cost: overtime_cost.round(2),
      total_talent_fee: total_talent_fee.round(2),
      territory_multiplier: territory_multiplier,
      media_multiplier: media_multiplier,
      duration_multiplier: duration_multiplier,
      exclusivity_multiplier: exclusivity_multiplier,
      usage_buyout_total: usage_buyout_total.round(2),
      additional_fees: additional_fees.round(2),
      manual_adjustment: manual_adjustment.round(2),
      total: total.round(2)
    }
  end

  def calculate_base_talent_cost
    total = 0

    @talent_categories.each do |category|
      if category.day_on_sets.any?
        # Use day-on-set breakdown with adjusted rate
        rate_to_use = category.adjusted_rate || category.daily_rate || 0
        category.day_on_sets.each do |dos|
          total += dos.talent_count * dos.days_count * rate_to_use
        end
      else
        # Use simple calculation
        shoot_days = @detail&.shoot_days || 1
        total += category.initial_count * shoot_days * (category.adjusted_rate || category.daily_rate || 0)
      end
    end

    total
  end

  def calculate_rehearsal_travel_cost
    return 0 unless @detail

    total = 0
    rehearsal_days = @detail.rehearsal_days || 0
    travel_days = @detail.travel_days || 0
    down_days = @detail.down_days || 0

    @talent_categories.each do |category|
      daily_rate = category.adjusted_rate || category.daily_rate || 0
      
      # Determine talent count for rehearsal/travel/down days
      # Business rule: ALL hired talent (initial_count) participate in 
      # rehearsal/travel/down days regardless of their specific shooting schedule
      # This is because:
      # - Rehearsal: All talent typically rehearse together
      # - Travel: All talent travel to location regardless of when they shoot
      # - Down days: All talent must be available/on standby
      talent_count = category.initial_count

      # Alternative logic (if needed): Use average talent per day from breakdown
      # if category.day_on_sets.any?
      #   total_talent_days = category.day_on_sets.sum { |dos| dos.talent_count * dos.days_count }
      #   total_shoot_days = category.day_on_sets.sum(&:days_count)
      #   talent_count = (total_talent_days.to_f / total_shoot_days).round if total_shoot_days > 0
      # end

      # Rehearsal days at 50% rate
      total += talent_count * rehearsal_days * daily_rate * 0.5

      # Travel days at 50% rate
      total += talent_count * travel_days * daily_rate * 0.5

      # Down days at 50% rate
      total += talent_count * down_days * daily_rate * 0.5
    end

    total
  end

  def calculate_standby_cost
    total = 0
    @talent_categories.each do |category|
      daily_rate = category.adjusted_rate || category.daily_rate
      
      # Use category-specific standby_days if available, otherwise use global
      standby_days = category.standby_days || 
                    ((@detail&.rehearsal_days || 0) + 
                     (@detail&.travel_days || 0) + 
                     (@detail&.down_days || 0))
      
      total += category.initial_count * daily_rate * standby_days * 0.5
    end
    total
  end

  def calculate_overtime_cost
    total = 0
    @talent_categories.each do |category|
      # Use category-specific overtime_hours if available, otherwise use global
      overtime_hours = category.overtime_hours || @detail&.overtime_hours || 0
      
      if overtime_hours > 0
        daily_rate = category.adjusted_rate || category.daily_rate
        hourly_rate = daily_rate * 0.1 # 10% of day rate per hour
        total += category.initial_count * hourly_rate * overtime_hours
      end
    end
    
    total
  end

  def calculate_territory_multiplier
    return 1.0 if @territories.empty?

    # Check for territory percentage override based on duration
    total_percentage = @territories.sum(:percentage)
    duration_months = parse_duration_months(@detail&.duration)
    
    # Territory override logic for specific durations
    if should_apply_territory_override?(duration_months, total_percentage)
      return 12.0  # Use Worldwide (1200%) instead of sum
    end

    # NEW LOGIC: Additive territories (sum all percentages)
    total_percentage / 100.0
  end

  def should_apply_territory_override?(duration_months, total_percentage)
    return false unless duration_months && total_percentage
    
    # Only apply to 12, 24, 36 month durations
    thresholds = {
      12 => 1200,  # 12 months: ≥1200%
      24 => 2400,  # 24 months: ≥2400% 
      36 => 3600   # 36 months: ≥3600%
    }
    
    threshold = thresholds[duration_months]
    return false unless threshold
    
    total_percentage >= threshold
  end

  def calculate_media_multiplier
    return 1.0 unless @detail
    
    # Check for territory override - if active, force All Media
    total_percentage = @territories.sum(:percentage)
    duration_months = parse_duration_months(@detail&.duration)
    
    if should_apply_territory_override?(duration_months, total_percentage)
      return 1.0  # Force All Media = 100% when territory override is active
    end
    
    # Get media types from the form submission
    media_types = []
    if @quotation.respond_to?(:media_types) && @quotation.media_types.present?
      media_types = @quotation.media_types
    elsif @detail.respond_to?(:selected_media_types) && @detail.selected_media_types.present?
      media_types = @detail.selected_media_types
    end
    
    return 1.0 if media_types.empty?
    
    # NEW MEDIA LOGIC to match frontend
    if media_types.include?('all_media')
      1.0 # All Media = 100%
    elsif media_types.count == 1 && media_types.include?('all_moving')
      0.75 # All Moving Media alone = 75%
    elsif media_types.count == 1
      0.5 # One other media = 50%
    elsif media_types.count == 2
      0.75 # Two media (including All Moving Media + other) = 75%
    elsif media_types.count >= 3
      1.0 # Three or more media = 100%
    else
      1.0 # Default
    end
  end

  def calculate_duration_multiplier
    return 1.0 unless @detail&.duration

    # Calculate time-based adjustments based on duration rules
    case @detail.duration
    when '3_months'
      0.5   # Up to 3 Months
    when '6_months' 
      0.75  # Up to 6 Months
    when '12_months'
      1.0   # 12 Months (base)
    when '18_months'
      1.75  # 18 Months
    when '24_months'
      2.0   # 2 Years
    when '36_months'
      3.0   # 36 Months
    else
      1.0   # Default
    end
  end

  def calculate_exclusivity_multiplier
    return 1.0 unless @detail&.exclusivity_type

    base_multiplier = case @detail.exclusivity_type
    when "none"
      1.0
    when "level_1"
      1.25
    when "level_2"
      1.5
    when "level_3"
      1.75
    when "level_4"
      2.0
    when "pharma_1"
      1.5
    when "pharma_2"
      1.75
    when "pharma_3"
      2.0
    when "pharma_4"
      2.5
    else
      1.0
    end

    # Add extra for unlimited options
    extra = 0
    extra += 0.15 if @detail.unlimited_stills
    extra += 0.15 if @detail.unlimited_versions

    base_multiplier + extra
  end

  def apply_kids_adjustment(buyout_fee)
    return buyout_fee unless @quotation.talent_categories.where(category_type: 5).any? # Kids category
    return buyout_fee unless @quotation.product_type.present?
    
    # Calculate the Kids portion of the buyout
    kids_category = @quotation.talent_categories.find_by(category_type: 5)
    return buyout_fee unless kids_category
    
    # Calculate Kids talent fee
    kids_talent_fee = calculate_kids_talent_fee(kids_category)
    
    # Calculate total talent fee
    total_talent_fee = calculate_total_talent_fee_for_kids_adjustment
    
    # Calculate Kids portion of the buyout
    kids_portion = (kids_talent_fee / total_talent_fee) * buyout_fee
    non_kids_portion = buyout_fee - kids_portion
    
    # Apply product type adjustment to Kids portion only
    adjusted_kids_portion = case @quotation.product_type
    when 'adult'
      kids_portion * 0.5  # Reduce by 50%
    when 'family' 
      kids_portion * 0.75 # Reduce by 25%
    else
      kids_portion # No adjustment for 'kids' product
    end
    
    # Return adjusted total
    non_kids_portion + adjusted_kids_portion
  end

  def calculate_kids_talent_fee(kids_category)
    daily_rate = kids_category.adjusted_rate || kids_category.daily_rate || 0
    standby_days = (@detail&.rehearsal_days || 0) + (@detail&.travel_days || 0) + (@detail&.down_days || 0)
    overtime_hours = kids_category.overtime_hours || (@detail&.overtime_hours || 0)
    
    # Base talent fee
    base_fee = if kids_category.day_on_sets.any?
      kids_category.day_on_sets.sum { |dos| dos.talent_count * dos.days_count * daily_rate }
    else
      shoot_days = @detail&.shoot_days || 1
      kids_category.initial_count * shoot_days * daily_rate
    end
    
    # Standby fee
    standby_fee = kids_category.initial_count * daily_rate * standby_days * 0.5
    
    # Overtime fee
    overtime_fee = kids_category.initial_count * (daily_rate * 0.1) * overtime_hours
    
    base_fee + standby_fee + overtime_fee
  end

  def calculate_total_talent_fee_for_kids_adjustment
    base_talent_cost = calculate_base_talent_cost
    standby_cost = calculate_standby_cost
    overtime_cost = calculate_overtime_cost
    base_talent_cost + standby_cost + overtime_cost
  end

  def calculate_usage_buyout_by_category(base_talent_cost, territory_multiplier, media_multiplier, duration_multiplier, exclusivity_multiplier)
    total_usage_buyout = 0
    total_multiplier = territory_multiplier * media_multiplier * duration_multiplier * exclusivity_multiplier
    
    @talent_categories.each do |category|
      # Calculate base fees for this category only
      category_base_fees = calculate_category_base_fees(category)
      
      # Apply multipliers to get usage/buyout for this category
      category_usage_buyout = category_base_fees * total_multiplier
      
      # Apply campaign type adjustments (only to kids category)
      if category.category_type == 5 && @quotation.product_type.present? # Kids category
        case @quotation.product_type
        when 'adult'
          category_usage_buyout *= 0.5  # 50% reduction
        when 'family'
          category_usage_buyout *= 0.75 # 25% reduction
        # 'kids' product type gets no reduction (100%)
        end
      end
      
      total_usage_buyout += category_usage_buyout
    end
    
    total_usage_buyout
  end

  def calculate_category_base_fees(category)
    if category.day_on_sets.any?
      # Use day-on-set breakdown with adjusted rate
      rate_to_use = category.adjusted_rate || category.daily_rate || 0
      category.day_on_sets.sum { |dos| dos.talent_count * dos.days_count * rate_to_use }
    else
      # Use simple calculation
      shoot_days = @detail&.shoot_days || 1
      (category.adjusted_rate || category.daily_rate || 0) * category.initial_count * shoot_days
    end
  end

  def calculate_manual_adjustments(subtotal)
    return 0 if @adjustments.empty?

    total_adjustment = 0

    @adjustments.each do |adjustment|
      percentage = adjustment.percentage || 0
      amount = subtotal * (percentage / 100.0)

      # Negative for discounts, positive for surcharges
      if adjustment.adjustment_type == "discount"
        total_adjustment -= amount
      else
        total_adjustment += amount
      end
    end

    total_adjustment
  end
end