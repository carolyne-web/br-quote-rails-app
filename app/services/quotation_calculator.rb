class QuotationCalculator
  def initialize(quotation)
    @quotation = quotation
    @detail = quotation.quotation_detail
    @territories = quotation.territories
    @adjustments = quotation.quotation_adjustments
    @talent_categories = quotation.talent_categories.includes(:day_on_sets)
  end

  def calculate
    base_talent_cost = calculate_base_talent_cost
    rehearsal_travel_cost = calculate_rehearsal_travel_cost

    # Apply territory multiplier
    territory_multiplier = calculate_territory_multiplier

    # Apply media multiplier
    media_multiplier = calculate_media_multiplier

    # Apply duration multiplier
    duration_multiplier = calculate_duration_multiplier

    # Apply exclusivity multiplier
    exclusivity_multiplier = calculate_exclusivity_multiplier

    # Calculate usage fee
    usage_fee = base_talent_cost * (territory_multiplier - 1.0) * media_multiplier * duration_multiplier * exclusivity_multiplier

    # Calculate subtotal
    subtotal = base_talent_cost + rehearsal_travel_cost + usage_fee

    # Apply manual adjustments
    manual_adjustment = calculate_manual_adjustments(subtotal)

    # Calculate total
    total = subtotal + manual_adjustment

    {
      base_talent_cost: base_talent_cost.round(2),
      rehearsal_travel_cost: rehearsal_travel_cost.round(2),
      territory_multiplier: territory_multiplier,
      media_multiplier: media_multiplier,
      duration_multiplier: duration_multiplier,
      exclusivity_multiplier: exclusivity_multiplier,
      usage_fee: usage_fee.round(2),
      subtotal: subtotal.round(2),
      manual_adjustment: manual_adjustment.round(2),
      total: total.round(2)
    }
  end

  private

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
      talent_count = category.initial_count

      # Rehearsal days at 50% rate
      total += talent_count * rehearsal_days * daily_rate * 0.5

      # Travel days at 50% rate
      total += talent_count * travel_days * daily_rate * 0.5

      # Down days at 25% rate
      total += talent_count * down_days * daily_rate * 0.25
    end

    total
  end

  def calculate_territory_multiplier
    return 1.0 if @territories.empty?

    # Use the highest percentage among selected territories
    max_percentage = @territories.maximum(:percentage) || 100
    max_percentage / 100.0
  end

  def calculate_media_multiplier
    return 1.0 unless @detail

    case @detail.media_type
    when 'television'
      1.2
    when 'digital'
      1.1
    when 'print'
      0.8
    when 'radio'
      0.7
    when 'cinema'
      1.3
    when 'all_media'
      1.5
    else
      1.0
    end
  end

  def calculate_duration_multiplier
    return 1.0 unless @detail&.duration

    # Get duration setting
    duration_key = "duration_#{@detail.duration}"
    setting = Setting.find_by(key: duration_key)

    return 1.0 unless setting

    setting.typed_value / 100.0
  end

  def calculate_exclusivity_multiplier
    return 1.0 unless @detail&.exclusivity_type

    base_multiplier = case @detail.exclusivity_type
    when 'none'
      1.0
    when 'level_1'
      1.25
    when 'level_2'
      1.5
    when 'level_3'
      1.75
    when 'level_4'
      2.0
    when 'pharma_1'
      1.5
    when 'pharma_2'
      1.75
    when 'pharma_3'
      2.0
    when 'pharma_4'
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

  def calculate_manual_adjustments(subtotal)
    return 0 if @adjustments.empty?

    total_adjustment = 0

    @adjustments.each do |adjustment|
      percentage = adjustment.percentage || 0
      amount = subtotal * (percentage / 100.0)

      # Negative for discounts, positive for surcharges
      if adjustment.adjustment_type == 'discount'
        total_adjustment -= amount
      else
        total_adjustment += amount
      end
    end

    total_adjustment
  end
end
