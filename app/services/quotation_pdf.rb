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
    add_schedule_details
    add_territories
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
    
    table([
      ["Project Name:", @quotation.project_name],
      ["Production House:", @quotation.production_house.name],
      ["Date:", @quotation.created_at.strftime('%B %d, %Y')],
      ["Status:", @quotation.status.capitalize]
    ], cell_style: { borders: [], padding: [2, 5] })
    
    move_down 20
  end

  def add_talent_breakdown
    text "Talent Breakdown", size: 16, style: :bold
    move_down 10
    
    talent_data = [["Category", "Quantity", "Daily Rate", "Days", "Total"]]
    
    @quotation.talent_categories.each do |category|
      talent_data << [
        category.display_name,
        category.initial_count.to_s,
        "R#{number_with_delimiter(category.daily_rate)}",
        category.total_talent_days.to_s,
        "R#{number_with_delimiter(category.total_cost)}"
      ]
    end
    
    table(talent_data, header: true, width: bounds.width) do
      row(0).font_style = :bold
      row(0).background_color = "EEEEEE"
    end
    
    move_down 20
  end

  def add_schedule_details
    if @quotation.quotation_detail
      text "Schedule Details", size: 16, style: :bold
      move_down 10
      
      detail = @quotation.quotation_detail
      schedule_data = [
        ["Shoot Days:", detail.shoot_days || 1],
        ["Rehearsal Days:", detail.rehearsal_days || 0],
        ["Travel Days:", detail.travel_days || 0],
        ["Down Days:", detail.down_days || 0]
      ]
      
      table(schedule_data, cell_style: { borders: [], padding: [2, 5] })
      move_down 20
    end
  end

  def add_territories
    if @quotation.territories.any?
      text "Territories", size: 16, style: :bold
      move_down 10
      
      territories_text = @quotation.territories.map { |t| "#{t.name} (#{t.percentage}%)" }.join(", ")
      text territories_text, size: 10
      move_down 20
    end
  end

  def add_calculation_summary
    text "Total Calculation", size: 18, style: :bold
    move_down 10
    
    summary_data = [
      ["Base Talent Cost:", "R#{number_with_delimiter(@calculation[:base_talent_cost])}"],
      ["Rehearsal/Travel:", "R#{number_with_delimiter(@calculation[:rehearsal_travel_cost])}"],
      ["Usage Fee:", "R#{number_with_delimiter(@calculation[:usage_fee])}"]
    ]
    
    if @calculation[:manual_adjustment] != 0
      summary_data << ["Adjustments:", "R#{number_with_delimiter(@calculation[:manual_adjustment])}"]
    end
    
    summary_data << ["", ""]
    summary_data << ["TOTAL:", "R#{number_with_delimiter(@calculation[:total])}"]
    
    table(summary_data, cell_style: { borders: [], padding: [3, 5] }) do
      row(-1).font_style = :bold
      row(-1).size = 14
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
  end

  def number_with_delimiter(number)
    number.to_s.gsub(/(\d)(?=(\d\d\d)+(?!\d))/, "\\1,")
  end
end