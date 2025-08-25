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
    # Check for worldwide override condition
    if should_use_worldwide?
      apply_worldwide_calculation
    else
      standard_calculation
    end
  end

  private

  def should_use_worldwide?
    return false unless @detail
    
    # Only apply worldwide override if:
    # 1. Duration is 12 months or less
    # 2. No specific territories are selected (empty territories)
    duration_months = parse_duration_months(@detail.duration)
    duration_months && duration_months <= 12 && @territories.empty?
  end

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

  def apply_worldwide_calculation
    # When duration <= 12 months, use Worldwide All Media
    territory_multiplier = 12.0 # Worldwide = 1200%
    
    # Section A: Talent Fees
    base_talent_cost = calculate_base_talent_cost
    standby_cost = calculate_standby_cost
    overtime_cost = calculate_overtime_cost
    
    total_talent_fee = base_talent_cost + standby_cost + overtime_cost
    
    # Section B: Usage & Licensing
    media_multiplier = 1.0 # All Media = 100%
    duration_multiplier = calculate_duration_multiplier
    exclusivity_multiplier = calculate_exclusivity_multiplier
    
    # Add unlimited options
    additional_multiplier = 0
    additional_multiplier += 0.15 if @detail&.unlimited_stills
    additional_multiplier += 0.15 if @detail&.unlimited_versions
    
    # Calculate buyout
    total_multiplier = territory_multiplier * media_multiplier * duration_multiplier * 
                      exclusivity_multiplier * (1 + additional_multiplier)
    
    buyout_fee = total_talent_fee * (total_multiplier / 100.0)
    
    # Apply product type adjustments for kids
    buyout_fee = apply_kids_adjustment(buyout_fee)
    
    # Apply guarantee discount if selected (25% off buyout)
    if @quotation.is_guaranteed
      buyout_fee = buyout_fee * 0.75
    end
    
    manual_adjustment = calculate_manual_adjustments(buyout_fee)
    total = buyout_fee + manual_adjustment
    
    {
      base_talent_cost: base_talent_cost.round(2),
      standby_cost: standby_cost.round(2),
      overtime_cost: overtime_cost.round(2),
      total_talent_fee: total_talent_fee.round(2),
      territory_multiplier: territory_multiplier,
      media_multiplier: media_multiplier,
      duration_multiplier: duration_multiplier,
      exclusivity_multiplier: exclusivity_multiplier,
      buyout_fee: buyout_fee.round(2),
      manual_adjustment: manual_adjustment.round(2),
      total: total.round(2),
      worldwide_override: true
    }
  end

  def standard_calculation
    # Section A: Talent Fees
    base_talent_cost = calculate_base_talent_cost
    standby_cost = calculate_standby_cost
    overtime_cost = calculate_overtime_cost
    
    total_talent_fee = base_talent_cost + standby_cost + overtime_cost
    
    # Section B: Usage & Licensing
    territory_multiplier = calculate_territory_multiplier
    media_multiplier = calculate_media_multiplier
    duration_multiplier = calculate_duration_multiplier
    exclusivity_multiplier = calculate_exclusivity_multiplier
    
    # Add unlimited options
    additional_multiplier = 0
    additional_multiplier += 0.15 if @detail&.unlimited_stills
    additional_multiplier += 0.15 if @detail&.unlimited_versions
    
    # Calculate buyout
    total_multiplier = territory_multiplier * media_multiplier * duration_multiplier * 
                      exclusivity_multiplier * (1 + additional_multiplier)
    
    buyout_fee = total_talent_fee * (total_multiplier / 100.0)
    
    # Apply product type adjustments for kids
    buyout_fee = apply_kids_adjustment(buyout_fee)
    
    # Apply guarantee discount if selected (25% off buyout)
    if @quotation.is_guaranteed
      buyout_fee = buyout_fee * 0.75
    end
    
    manual_adjustment = calculate_manual_adjustments(buyout_fee)
    total = buyout_fee + manual_adjustment
    
    {
      base_talent_cost: base_talent_cost.round(2),
      standby_cost: standby_cost.round(2),
      overtime_cost: overtime_cost.round(2),
      total_talent_fee: total_talent_fee.round(2),
      territory_multiplier: territory_multiplier,
      media_multiplier: media_multiplier,
      duration_multiplier: duration_multiplier,
      exclusivity_multiplier: exclusivity_multiplier,
      buyout_fee: buyout_fee.round(2),
      manual_adjustment: manual_adjustment.round(2),
      total: total.round(2),
      worldwide_override: false
    }
  end

  def calculate_base_talent_cost
    total = 0

    @talent_categories.each do |category|
      if category.day_on_sets.any?
        # Use day-on-set breakdown
        category.day_on_sets.each do |dos|
          total += dos.talent_count * dos.days_count * (category.adjusted_rate || category.daily_rate || 0)
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
      standby_days = (@detail&.rehearsal_days || 0) + 
                    (@detail&.travel_days || 0) + 
                    (@detail&.down_days || 0)
      
      total += category.initial_count * daily_rate * standby_days * 0.5
    end
    total
  end

  def calculate_overtime_cost
    total = 0
    @talent_categories.each do |category|
      if category.overtime_hours && category.overtime_hours > 0
        daily_rate = category.adjusted_rate || category.daily_rate
        hourly_rate = daily_rate * 0.1 # 10% of day rate per hour
        total += category.initial_count * hourly_rate * category.overtime_hours
      end
    end
    
    # Also check detail-level overtime
    if @detail&.overtime_hours && @detail.overtime_hours > 0
      @talent_categories.each do |category|
        daily_rate = category.adjusted_rate || category.daily_rate
        hourly_rate = daily_rate * 0.1 # 10% of day rate per hour
        total += category.initial_count * hourly_rate * @detail.overtime_hours
      end
    end
    
    total
  end

  def calculate_territory_multiplier
    return 1.0 if @territories.empty?

    # Check for special territory exceptions first
    territory_names = @territories.pluck(:name)
    
    # Handle territory exceptions with fixed percentages
    if territory_names.include?('Worldwide')
      return 12.0  # 1200%
    elsif territory_names.include?('USA')
      return 5.0   # 500%
    elsif territory_names.include?('Western Europe (excl. UK)')
      return 5.0   # 500%
    elsif territory_names.include?('Western Europe (incl. UK)')
      return 6.0   # 600%
    elsif territory_names.include?('Europe (excl. UK)')
      return 6.0   # 600%
    elsif territory_names.include?('Europe (incl. UK)')
      return 7.5   # 750%
    else
      # For all other territories, use the highest percentage from database
      max_percentage = @territories.maximum(:percentage) || 100
      max_percentage / 100.0
    end
  end

  def calculate_media_multiplier
    return 1.0 unless @detail
    
    # Handle array-based media selection (new format from plan)
    if @detail.respond_to?(:selected_media_types) && @detail.selected_media_types.present?
      selected_media = @detail.selected_media_types
      
      case selected_media.count
      when 1
        0.5 # One media = 50% of All Media
      when 2
        0.75 # Two media = 75% of All Media
      else
        1.0 # Three or more = All Media (100%)
      end
    else
      # Existing string-based media type logic (backward compatibility)
      case @detail.media_type
      when "all_media"
        1.0    # 100% (base usage)
      when "all_moving_media"
        0.75   # 75% of All Media
      when "all_stills", "all_stills_media"
        0.75   # 75% of All Media
      when "all_non_broadcast", "all_non_broadcast_media"
        0.75   # 75% of All Media
      when "one_media", "one_medium_only"
        0.5    # 50% of All Media
      when "two_media", "two_media_only"
        0.75   # 75% of All Media
      when "three_or_more_media", "three_media", "multiple_media"
        1.0    # 100% of All Media
      when "stand_alone_ooh", "ooh", "out_of_home"
        1.0    # 100% of All Media
      when "television", "tv"
        1.0    # Individual medium treated as base
      when "digital", "online"
        1.0    # Individual medium treated as base
      when "print"
        1.0    # Individual medium treated as base
      when "radio"
        1.0    # Individual medium treated as base
      when "cinema"
        1.0    # Individual medium treated as base
      else
        1.0
      end
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