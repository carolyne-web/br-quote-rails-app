# app/services/quotation_pdf.rb
class QuotationPdf
  include Prawn::View

  def initialize(quotation)
    @quotation = quotation
    @calculation = QuotationCalculator.new(@quotation).calculate
    generate_pdf
  end

  def document
    @document ||= Prawn::Document.new(
      page_size: 'A4',
      page_layout: :portrait,
      margin: [40, 40, 40, 40]
    )
  end

  private

  def generate_pdf
    add_header
    add_project_info
    add_talent_breakdown
    add_usage_licensing
    add_multipliers_applied
    add_manual_adjustments
    add_calculation_summary
    add_footer
  end

  def add_header
    text "QUOTATION", size: 24, style: :bold
    text "Quote ##{@quotation.project_number}", size: 14, color: "666666"
    move_down 20
  end

  def add_project_info
    text "Project Information", size: 16, style: :bold
    move_down 10
    
    project_data = [
      ["Production House:", @quotation.production_house.name],
      ["Date:", @quotation.created_at.strftime('%B %d, %Y')],
      ["Status:", @quotation.status.capitalize]
    ]
    
    # Add campaign name (keep only this, remove project name duplication)
    if @quotation.campaign_name.present?
      project_data.insert(0, ["Campaign Name:", @quotation.campaign_name])
    end
    
    if @quotation.product_type.present?
      product_type_display = @quotation.product_type.humanize.titleize + " Product"
      project_data.insert(-2, ["Product Type:", product_type_display])
    end
    
    table(project_data, cell_style: { borders: [], padding: [2, 5] })
    
    move_down 20
  end

  def add_talent_breakdown
    text "Section A: Talent Fees", size: 16, style: :bold
    move_down 10
    
    # Basic talent costs
    text "Base Talent Costs:", size: 12, style: :bold
    move_down 5
    
    talent_data = [["Category", "Quantity", "Daily Rate", "Shoot Days", "Subtotal"]]
    
    @quotation.talent_categories.each do |category|
      talent_data << [
        category.display_name,
        category.initial_count.to_s,
        "R#{number_with_delimiter(category.daily_rate || category.adjusted_rate)}",
        category.total_talent_days.to_s,
        "R#{number_with_delimiter(category.total_cost)}"
      ]
    end
    
    table(talent_data, header: true, width: bounds.width) do
      row(0).font_style = :bold
      row(0).background_color = "EEEEEE"
    end
    
    move_down 15
    
    # Standby days breakdown
    if @calculation[:standby_cost] && @calculation[:standby_cost] > 0
      text "Standby Days (50% of day rate):", size: 12, style: :bold
      move_down 5
      
      standby_details = []
      detail = @quotation.quotation_detail
      if detail
        if detail.rehearsal_days && detail.rehearsal_days > 0
          standby_details << "Rehearsal Days: #{detail.rehearsal_days}"
        end
        if detail.travel_days && detail.travel_days > 0
          standby_details << "Travel Days: #{detail.travel_days}"
        end
        if detail.down_days && detail.down_days > 0
          standby_details << "Down Days: #{detail.down_days}"
        end
      end
      
      text standby_details.join(", "), size: 10
      text "Standby Cost: R#{number_with_delimiter(@calculation[:standby_cost])}", size: 10, style: :bold
      move_down 10
    end
    
    # Overtime breakdown
    if @calculation[:overtime_cost] && @calculation[:overtime_cost] > 0
      text "Overtime (10% of day rate per hour):", size: 12, style: :bold
      move_down 5
      
      overtime_details = []
      detail = @quotation.quotation_detail
      if detail&.overtime_hours && detail.overtime_hours > 0
        overtime_details << "Global Overtime: #{detail.overtime_hours} hours"
      end
      
      @quotation.talent_categories.each do |category|
        if category.overtime_hours && category.overtime_hours > 0
          overtime_details << "#{category.display_name}: #{category.overtime_hours} hours"
        end
      end
      
      if overtime_details.any?
        text overtime_details.join(", "), size: 10
      end
      text "Overtime Cost: R#{number_with_delimiter(@calculation[:overtime_cost])}", size: 10, style: :bold
      move_down 10
    end
    
    # Total talent fee
    text "Total Talent Fee: R#{number_with_delimiter(@calculation[:total_talent_fee] || @calculation[:base_talent_cost])}", 
         size: 12, style: :bold, color: "0066CC"
    
    move_down 20
  end

  def add_usage_licensing
    text "Section B: Usage & Licensing", size: 16, style: :bold
    move_down 10
    
    detail = @quotation.quotation_detail
    
    # Territory Selection
    if @quotation.territories.any?
      text "Territory Selection:", size: 12, style: :bold
      move_down 5
      
      territories_text = @quotation.territories.map { |t| "#{t.name} (#{t.percentage}%)" }.join(", ")
      text territories_text, size: 10
      move_down 10
    end
    
    # Media Selection & Duration
    if detail
      usage_data = []
      
      # Media Type
      if detail.media_type.present?
        media_display = detail.media_type.humanize.titleize
        usage_data << ["Media Type:", media_display]
      end
      
      # Duration
      if detail.duration.present?
        duration_display = case detail.duration
        when '3_months' then 'Up to 3 Months'
        when '6_months' then 'Up to 6 Months'
        when '12_months' then '12 Months'
        when '18_months' then '18 Months'
        when '24_months' then '2 Years'
        when '36_months' then '36 Months'
        else detail.duration.humanize
        end
        usage_data << ["Duration:", duration_display]
      end
      
      # Exclusivity
      if detail.exclusivity_type.present?
        exclusivity_display = detail.exclusivity_type.humanize.titleize
        usage_data << ["Exclusivity:", exclusivity_display]
      end
      
      # Unlimited options
      unlimited_options = []
      unlimited_options << "Unlimited Stills" if detail.unlimited_stills
      unlimited_options << "Unlimited Versions" if detail.unlimited_versions
      if unlimited_options.any?
        usage_data << ["Unlimited Options:", unlimited_options.join(", ")]
      end
      
      if usage_data.any?
        table(usage_data, cell_style: { borders: [], padding: [2, 5] })
        move_down 15
      end
    end
    
    move_down 10
  end

  def add_multipliers_applied
    text "Multipliers Applied:", size: 14, style: :bold
    move_down 10
    
    multiplier_data = []
    
    # Territory multiplier
    if @calculation[:territory_multiplier]
      multiplier_data << ["Territory Multiplier:", "#{(@calculation[:territory_multiplier] * 100).round(1)}%"]
    end
    
    # Media multiplier
    if @calculation[:media_multiplier]
      multiplier_data << ["Media Multiplier:", "#{(@calculation[:media_multiplier] * 100).round(1)}%"]
    end
    
    # Duration multiplier
    if @calculation[:duration_multiplier]
      multiplier_data << ["Duration Multiplier:", "#{(@calculation[:duration_multiplier] * 100).round(1)}%"]
    end
    
    # Exclusivity multiplier
    if @calculation[:exclusivity_multiplier]
      multiplier_data << ["Exclusivity Multiplier:", "#{(@calculation[:exclusivity_multiplier] * 100).round(1)}%"]
    end
    
    if multiplier_data.any?
      table(multiplier_data, cell_style: { borders: [], padding: [2, 5] })
      move_down 15
    end
    
    # Product type adjustments note
    if @quotation.product_type.present? && @quotation.talent_categories.where(category_type: 5).any?
      case @quotation.product_type
      when 'adult'
        text "Note: Kids category reduced by 50% for Adult product", size: 9, style: :italic, color: "FF6600"
      when 'family'
        text "Note: Kids category reduced by 25% for Family product", size: 9, style: :italic, color: "FF6600"
      end
      move_down 10
    end
  end

  def add_manual_adjustments
    adjustments = @quotation.quotation_adjustments
    
    if adjustments.any?
      text "Manual Adjustments:", size: 14, style: :bold
      move_down 10
      
      adjustment_data = [["Description", "Type", "Percentage", "Amount"]]
      
      adjustments.each do |adjustment|
        adjustment_amount = (@calculation[:subtotal] || @calculation[:buyout_fee] || 0) * (adjustment.percentage / 100.0)
        adjustment_data << [
          adjustment.description || "Manual adjustment",
          adjustment.adjustment_type.capitalize,
          "#{adjustment.percentage}%",
          "R#{number_with_delimiter(adjustment_amount.abs)}"
        ]
      end
      
      table(adjustment_data, header: true, width: bounds.width) do
        row(0).font_style = :bold
        row(0).background_color = "EEEEEE"
      end
      
      move_down 15
    end
  end

  def add_calculation_summary
    text "Final Calculation", size: 18, style: :bold
    move_down 10
    
    summary_data = []
    
    # Section A: Talent Fees
    summary_data << ["Base Talent Cost:", "R#{number_with_delimiter(@calculation[:base_talent_cost])}"]
    
    if @calculation[:standby_cost] && @calculation[:standby_cost] > 0
      summary_data << ["Standby Cost:", "R#{number_with_delimiter(@calculation[:standby_cost])}"]
    end
    
    if @calculation[:overtime_cost] && @calculation[:overtime_cost] > 0
      summary_data << ["Overtime Cost:", "R#{number_with_delimiter(@calculation[:overtime_cost])}"]
    end
    
    total_talent_fee = @calculation[:total_talent_fee] || @calculation[:base_talent_cost]
    summary_data << ["Total Talent Fee:", "R#{number_with_delimiter(total_talent_fee)}"]
    
    summary_data << ["", ""]
    
    # Section B: Usage & Licensing
    buyout_fee = @calculation[:buyout_fee] || @calculation[:usage_fee] || 0
    summary_data << ["Buyout Fee:", "R#{number_with_delimiter(buyout_fee)}"]
    
    if @calculation[:manual_adjustment] && @calculation[:manual_adjustment] != 0
      summary_data << ["Manual Adjustments:", "R#{number_with_delimiter(@calculation[:manual_adjustment])}"]
    end
    
    subtotal = buyout_fee + (@calculation[:manual_adjustment] || 0)
    
    # Guarantee discount
    if @quotation.is_guaranteed
      summary_data << ["", ""]
      summary_data << ["Subtotal:", "R#{number_with_delimiter(subtotal)}"]
      guarantee_discount = subtotal * 0.25
      summary_data << ["Guarantee Discount (25%):", "-R#{number_with_delimiter(guarantee_discount)}"]
    end
    
    summary_data << ["", ""]
    summary_data << ["FINAL TOTAL:", "R#{number_with_delimiter(@calculation[:total])}"]
    
    table(summary_data, cell_style: { borders: [], padding: [3, 5] }) do
      row(-1).font_style = :bold
      row(-1).size = 16
      row(-1).background_color = "E6F3FF"
    end
  end

  def add_footer
    move_down 30
    text "This quotation is valid for 30 days from the date of issue.", size: 9, color: "666666"
    
    if @calculation[:worldwide_override]
      move_down 10
      text "Note: Duration of 12 months or less - Worldwide All Media rates applied.", 
           size: 9, color: "FF0000", style: :italic
    end
    
    if @quotation.is_guaranteed
      move_down 10
      text "Note: This quote includes a 25% guarantee discount.", 
           size: 9, color: "00AA00", style: :italic
    end
  end

  def number_with_delimiter(number)
    number.to_s.gsub(/(\d)(?=(\d\d\d)+(?!\d))/, "\\1,")
  end
end