# app/services/final_quotation_pdf.rb
class FinalQuotationPdf
  include Prawn::View
  require 'net/http'
  require 'json'

  def initialize(final_quotation, currency = 'ZAR')
    @final_quotation = final_quotation
    @currency = currency
    @exchange_rate = fetch_exchange_rate(currency)
    @currency_symbol = get_currency_symbol(currency)
    generate_pdf
  end

  def document
    @document ||= Prawn::Document.new(
      page_size: 'A4',
      page_layout: :portrait,
      margin: [20, 20, 20, 20]
    )
  end

  def fetch_exchange_rate(currency)
    return 1.0 if currency == 'ZAR' # Base currency

    begin
      uri = URI("https://api.exchangerate-api.com/v4/latest/ZAR")
      response = Net::HTTP.get(uri)
      data = JSON.parse(response)

      if data['rates'] && data['rates'][currency]
        data['rates'][currency]
      else
        Rails.logger.warn "Exchange rate not found for #{currency}, using 1.0"
        1.0
      end
    rescue => e
      Rails.logger.error "Failed to fetch exchange rate: #{e.message}"
      1.0 # Fallback to 1.0 on error
    end
  end

  def get_currency_symbol(currency)
    case currency
    when 'ZAR' then 'R'
    when 'USD' then '$'
    when 'EUR' then '€'
    when 'GBP' then '£'
    else currency
    end
  end

  def convert_amount(amount)
    (amount.to_f * @exchange_rate).round(2)
  end

  def format_amount(amount)
    converted = convert_amount(amount)
    # Strip insignificant zeros (e.g., 3750.0 -> 3750, but 3750.50 -> 3750.50)
    formatted = converted == converted.to_i ? converted.to_i : converted
    "#{@currency_symbol}#{number_with_delimiter(formatted)}"
  end

  private

  # Color constants matching the preview page (Tailwind CSS default colors)
  BLUE_PRIMARY = '1173D4'
  GRAY_900 = '111827'  # text-gray-900
  GRAY_700 = '374151'  # text-gray-700
  GRAY_600 = '4B5563'  # text-gray-600
  GRAY_400 = '9CA3AF'  # text-gray-400
  GRAY_200 = 'E5E7EB'  # border-gray-200
  GRAY_100 = 'F3F4F6'  # bg-gray-100
  GRAY_50 = 'F9FAFB'   # bg-gray-50
  BLUE_50 = 'EFF6FF'   # bg-blue-50
  BLUE_100 = 'DBEAFE'  # bg-blue-100
  BLUE_600 = '2563EB'  # text-blue-600
  GREEN_600 = '16A34A' # text-green-600 (Tailwind default)
  RED_700 = 'B91C1C'   # text-red-700
  ORANGE_100 = 'FFEDD5' # bg-orange-100
  ORANGE_800 = '9A3412' # text-orange-800

  def generate_pdf
    add_header
    add_campaign_info
    add_talent_summary
    add_usage_summary
    add_grand_total
    add_footer
  end

  def add_header
    # Header with logo on left and quote number on right
    bounding_box([0, cursor], width: bounds.width, height: 60) do
      # Logo on the left
      bounding_box([0, cursor], width: 200) do
        begin
          # Try to load logo from common Rails paths
          logo_path = Rails.root.join('app', 'assets', 'images', 'logo.png')
          if File.exist?(logo_path)
            image logo_path, height: 50
          else
            # Placeholder if logo doesn't exist
            text "Logo", size: 20, style: :bold, color: BLUE_PRIMARY
          end
        rescue
          # Fallback text if image loading fails
          text "Logo", size: 20, style: :bold, color: BLUE_PRIMARY
        end
      end

      # Quote number and date on the right
      bounding_box([bounds.width - 200, cursor], width: 200) do
        text "Quote ##{@final_quotation.project_number}",
             size: 12,
             style: :bold,
             color: GRAY_900,
             align: :right
        move_down 4
        text Date.today.strftime("%B %d, %Y"),
             size: 9,
             color: GRAY_600,
             align: :right
      end
    end

    move_down 20  # spacing after header
  end

  def add_campaign_info
    # Section heading: Campaign Info
    text "Campaign Info", size: 11, style: :bold, color: GRAY_900  # Section heading: 11pt
    move_down 6  # pt-2

    # Add thin blue separator line for major section
    stroke_color BLUE_100
    line_width 0.5
    stroke_horizontal_rule
    line_width 1  # Reset to default
    move_down 12  # mb-4

    # Create a box for campaign info (reduced padding)
    bounding_box([0, cursor], width: bounds.width, height: 60) do
      # Reduced padding
      pad(8) do
        campaign_data = [
          [
            { content: "Campaign Name", font_style: :normal, size: 9, text_color: GRAY_700 },  # Body text: 9pt
            { content: "Product Type", font_style: :normal, size: 9, text_color: GRAY_700 },
            { content: "Type of Commercial", font_style: :normal, size: 9, text_color: GRAY_700 }
          ],
          [
            { content: @final_quotation.quotation.campaign_name || "N/A", font_style: :bold, size: 9, text_color: GRAY_900 },
            { content: @final_quotation.product_type&.humanize || "N/A", font_style: :bold, size: 9, text_color: GRAY_900 },
            { content: @final_quotation.commercial_type&.humanize || "N/A", font_style: :bold, size: 9, text_color: GRAY_900 }
          ]
        ]

        table(campaign_data, width: bounds.width, cell_style: { borders: [], padding: [4, 6] }) do  # Reduced cell padding
          row(0).text_color = GRAY_700
          row(1).font_style = :bold
        end
      end
    end

    # Show exchange rate if currency is not ZAR
    if @currency != 'ZAR'
      move_down 12

      # Draw a separator line
      stroke_color GRAY_200
      line_width 0.5
      stroke_horizontal_rule
      line_width 1
      move_down 8

      # Get currency name
      currency_names = {
        'USD' => 'US Dollar',
        'EUR' => 'Euro',
        'GBP' => 'British Pound'
      }
      currency_name = currency_names[@currency] || @currency

      # Invert the rate to show "1 USD = X Rand"
      inverted_rate = 1.0 / @exchange_rate

      # Format the exchange rate text
      text "Exchange Rate: 1 #{currency_name} = R#{number_with_precision(inverted_rate, precision: 2)}",
           size: 9,
           color: GRAY_600,
           style: :italic
    end

    move_down 24  # space-y-8 = 32px ≈ 24pt
  end

  def add_talent_summary
    # Section heading: Talent Summary
    text "Talent Summary", size: 11, style: :bold, color: GRAY_900  # Section heading: 11pt
    move_down 6  # pt-2

    # Add thin blue separator line for major section
    stroke_color BLUE_100
    line_width 0.5
    stroke_horizontal_rule
    line_width 1  # Reset to default
    move_down 12  # mb-4

    if @final_quotation.final_quotation_groups.any? && @final_quotation.final_quotation_groups.flat_map(&:final_quotation_talent_lines).any?
      # Get unique talent lines matching the preview logic
      all_talent_lines = @final_quotation.final_quotation_groups.flat_map(&:final_quotation_talent_lines)
      unique_talent_lines = all_talent_lines.group_by { |line| [line.category_type, line.description] }.map { |key, lines| lines.first }

      talent_data = [["Category", "Description", "Talent", "Rate", "Shoot Days", "Rehearsal", "Down Days", "Travel Days", "Overtime", "Night", "Total"]]

      unique_talent_lines.each do |talent_line|
        talent_data << [
          short_category_name(talent_line.category_type),
          talent_line.description.present? ? talent_line.description : '-',
          talent_line.talent_count.to_s,
          format_amount(talent_line.adjusted_rate.to_i),
          talent_line.shoot_days.to_s,
          talent_line.rehearsal_days.to_s,
          talent_line.down_days.to_s,
          talent_line.travel_days.to_s,
          "#{talent_line.overtime_hours} hrs",
          talent_line.has_night_premium ? "Yes" : "No",
          format_amount(talent_line.total_talent_fee)
        ]
      end

      # Check if table will fit on current page, if not start new page
      table_height = (talent_data.length + 1) * 30  # Rough estimate
      start_new_page if cursor < table_height

      # Create table with matching preview colors - full width
      # Category, Description, Rate, and Total will naturally be wider based on content
      # Table headers and cells: reduced size and padding to prevent wrapping
      table(talent_data,
            header: true,
            width: bounds.width,
            cell_style: { size: 8, padding: [4, 4], overflow: :shrink_to_fit }) do  # Reduced size and padding to fit more content
        # Header row - gray background matching preview (bg-gray-50)
        row(0).font_style = :bold
        row(0).background_color = GRAY_50
        row(0).text_color = GRAY_700
        row(0).size = 8  # Reduced to fit headers without wrapping

        # Border styling to match preview (border border-gray-200)
        cells.border_color = GRAY_200
        cells.border_width = 1

        # Category column (text-sm, font-medium, text-gray-900)
        column(0).font_style = :bold
        column(0).text_color = GRAY_900

        # Description column - allow shrinking to fit
        column(1).overflow = :shrink_to_fit

        # Description and other columns (text-sm, text-gray-700)
        column(1..9).text_color = GRAY_700

        # Total column - green color matching preview (text-sm, font-semibold, text-green-600)
        column(10).text_color = GREEN_600
        column(10).font_style = :bold

        # Right align numeric columns (text-right)
        column(3).align = :right
        column(10).align = :right

        # Prevent number wrapping in numeric columns
        column(3).overflow = :shrink_to_fit
        column(3).single_line = true
        column(10).overflow = :shrink_to_fit
        column(10).single_line = true

        # Center align specific columns (text-center)
        column(2).align = :center
        column(4..9).align = :center
      end

      # Talent Summary Total - matching preview styling
      talent_summary_total = unique_talent_lines.sum(&:total_talent_fee)
      move_down 0

      # Create footer row for total (bg-gray-50, font-semibold, border-t)
      total_row = [[
        { content: "Talent Summary Total:", colspan: 10, align: :right, font_style: :bold, size: 8, text_color: GRAY_900, background_color: GRAY_50, padding: [5, 5] },
        { content: format_amount(talent_summary_total), align: :right, font_style: :bold, size: 8, text_color: GREEN_600, background_color: GRAY_50, padding: [5, 5], single_line: true }
      ]]

      table(total_row, width: bounds.width, cell_style: { borders: [ :top ], border_color: GRAY_200, border_width: 1 })
    else
      text "No talent data available", size: 9, color: GRAY_600
    end

    move_down 40  # INCREASED gap between Talent Summary and Usage Summary
  end

  def add_usage_summary
    # Section heading: Usage Summary
    text "Usage Summary", size: 11, style: :bold, color: GRAY_900  # Section heading: 11pt
    move_down 6  # pt-2

    # Add thin blue separator line for major section
    stroke_color BLUE_100
    line_width 0.5
    stroke_horizontal_rule
    line_width 1  # Reset to default
    move_down 12  # mb-4

    @final_quotation.final_quotation_groups.ordered.each_with_index do |group, index|
      # Check if group table will fit on current page, if not start new page
      # Estimate height: group header + details + table rows
      usage_lines = group.final_quotation_talent_lines.select { |line| line.usage_fee.to_f > 0 }
      estimated_height = 150 + (usage_lines.length * 25)  # Rough estimate
      start_new_page if cursor < estimated_height

      # Group section (no background box, just content)
      # Group heading
      text "Group #{group.group_number}", size: 9, style: :bold, color: GRAY_700  # Body text: 9pt
      move_down 9  # mb-3

      # Group details in badge-like format
      # bg-blue-100, text-blue-600, text-sm, font-medium, px-2, py-0.5
      group_details = []

      # Duration
      group_details << "Duration: #{group.duration&.humanize || '1 Year'}"

      # Territories
      if group.selected_territories.is_a?(Array) && group.selected_territories.any?
        territories = group.selected_territories.map { |t| t['name'] }.join(', ')
        group_details << "Territories: #{territories}"
      else
        group_details << "Territories: All Territories"
      end

      # Media Types
      if group.selected_media_types.is_a?(Array) && group.selected_media_types.any?
        media_types = group.selected_media_types.map(&:humanize).join(', ')
        group_details << "Media Types: #{media_types}"
      else
        group_details << "Media Types: All Media"
      end

      # Unlimited options
      group_details << "Unlimited Stills" if group.unlimited_stills
      group_details << "Unlimited Versions" if group.unlimited_versions

      text group_details.join(' • '), size: 9, color: BLUE_600, style: :bold  # Body text: 9pt
      move_down 12  # mb-4

      # Usage breakdown table - only show lines with usage_fee > 0
      # Table styling: text-sm, border, border-gray-200
      # Headers: px-3 py-2, bg-gray-100
      # Cells: px-3 py-2

      if usage_lines.any?
        usage_data = [["Talent", "Day Fee", "Unit", "Exclusivity", "# of Comms", "Buyout %", "Per Talent", "Total (R)"]]

        usage_lines.each do |line|
          # Calculate buyout percentage
          if line.buyout_percentage.present?
            display_percentage = line.buyout_percentage
          elsif line.base_fee > 0
            display_percentage = (line.usage_fee.to_f / line.base_fee.to_f) * 100
          else
            display_percentage = 0
          end

          usage_data << [
            line.description,
            format_amount(line.adjusted_rate.to_i),
            line.talent_count.to_s,
            line.exclusivity_type.present? ? line.exclusivity_type : '-',
            (line.commercial_count || 1).to_s,
            "#{display_percentage.to_i}%",
            format_amount(line.per_talent_amount || (line.total_line_cost / line.talent_count)),
            format_amount(line.total_line_cost)
          ]
        end

        # Create table with matching colors - full width with specified column widths
        # Category/Talent (Description), Rate, and Total are wider; no wrapping
        # Headers and cells: body text 9pt
        table_width = bounds.width
        table(usage_data,
              header: true,
              width: table_width,
              column_widths: {
                0 => table_width * 0.22,  # Talent/Description (wider)
                1 => table_width * 0.13,  # Day Fee/Rate (wider)
                2 => table_width * 0.08,  # Unit
                3 => table_width * 0.13,  # Exclusivity
                4 => table_width * 0.10,  # # of Comms
                5 => table_width * 0.11,  # Buyout %
                6 => table_width * 0.11,  # Per Talent
                7 => table_width * 0.12   # Total (wider)
              },
              cell_style: { size: 9, padding: [6, 9], overflow: :shrink_to_fit }) do  # py-2 px-3; shrink text to prevent wrapping
          # Header row - gray background (bg-gray-100)
          row(0).font_style = :bold
          row(0).background_color = GRAY_100  # Changed from GRAY_50 to match preview
          row(0).text_color = GRAY_700
          row(0).size = 9  # Body text: 9pt

          # Border styling (border, border-gray-200)
          cells.border_color = GRAY_200
          cells.border_width = 1

          # Right align numeric columns (text-right)
          column(1).align = :right
          column(5..7).align = :right

          # Prevent number wrapping in numeric columns
          column(1).single_line = true  # Day Fee
          column(4).single_line = true  # # of Comms
          column(5).single_line = true  # Buyout %
          column(6).single_line = true  # Per Talent
          column(7).single_line = true  # Total

          # Center align specific columns (text-center)
          column(2..4).align = :center

          # Total column styling (font-medium)
          column(7).font_style = :bold
        end

        move_down 0

        # Group total
        group_total = usage_lines.sum(&:total_line_cost)

        # Show guarantee discount if applicable
        # Styling: px-3 py-2, font-semibold, text-red-700, bg-gray-50, border-t
        if @final_quotation.is_guaranteed && group.is_guaranteed
          original_amount = group_total / 0.75
          savings = original_amount - group_total

          guarantee_row = [[
            { content: "Guaranteed (25% Discount):", colspan: 6, align: :right, font_style: :bold, size: 9, text_color: RED_700, background_color: GRAY_50, padding: [6, 9] },
            { content: "-", align: :right, size: 9, text_color: RED_700, background_color: GRAY_50, padding: [6, 9], single_line: true },
            { content: "-#{format_amount(savings.round(2))}", align: :right, font_style: :bold, size: 9, text_color: RED_700, background_color: GRAY_50, padding: [6, 9], single_line: true }
          ]]

          table(guarantee_row, width: table_width, cell_style: { borders: [ :top ], border_color: GRAY_200, border_width: 1 })
          move_down 0
        end

        # Group Total row
        # Styling: px-3 py-2, font-semibold, text-gray-900 / text-blue-600, bg-gray-50, border-t
        total_row = [[
          { content: "Group Total:", colspan: 6, align: :right, font_style: :bold, size: 9, text_color: GRAY_900, background_color: GRAY_50, padding: [6, 9] },
          { content: "-", align: :right, size: 9, text_color: BLUE_600, background_color: GRAY_50, padding: [6, 9], single_line: true },
          { content: format_amount(group_total), align: :right, font_style: :bold, size: 9, text_color: BLUE_600, background_color: GRAY_50, padding: [6, 9], single_line: true }
        ]]

        table(total_row, width: table_width, cell_style: { borders: [ :top ], border_color: GRAY_200, border_width: 1 })
      end

      move_down 12  # mb-4
    end
  end

  def number_with_precision(number, options = {})
    precision = options[:precision] || 0
    format("%.#{precision}f", number.to_f)
  end

  def add_grand_total
    # Check if we have enough space for the grand total section, if not start new page
    start_new_page if cursor < 150

    # Section heading: Grand Total
    text "Grand Total", size: 11, style: :bold, color: GRAY_900  # Section heading: 11pt
    move_down 6  # pt-2

    # Add thin blue separator line for major section
    stroke_color BLUE_100
    line_width 0.5
    stroke_horizontal_rule
    line_width 1  # Reset to default
    move_down 12  # mb-4 (spacing before box)

    # Calculate Grand Total matching the preview logic
    all_talent_lines = @final_quotation.final_quotation_groups.flat_map(&:final_quotation_talent_lines)
    unique_talent_lines = all_talent_lines.group_by { |line| [line.category_type, line.description] }.map { |key, lines| lines.first }
    talent_summary_total = unique_talent_lines.sum(&:total_talent_fee)
    all_group_totals = @final_quotation.final_quotation_groups.sum { |group| group.final_quotation_talent_lines.select { |line| line.usage_fee.to_f > 0 }.sum(&:total_line_cost) }
    grand_total = talent_summary_total + all_group_totals

    # Breakdown of totals
    text "Talent Summary Total: <b>#{format_amount(talent_summary_total)}</b>",
         size: 9, color: GRAY_600, inline_format: true
    move_down 10

    text "All Group Totals: <b>#{format_amount(all_group_totals)}</b>",
         size: 9, color: GRAY_600, inline_format: true
    move_down 16

    # Separator line (border-t, pt-2)
    stroke_color GRAY_200
    stroke_horizontal_rule
    move_down 10

    # Grand Total with label
    table([
      ["Grand Total:", format_amount(grand_total)]
    ], width: bounds.width, cell_style: { borders: [], padding: 0 }) do
      column(0).align = :left
      column(0).size = 12
      column(0).font_style = :bold
      column(0).text_color = GRAY_900
      column(1).align = :right
      column(1).size = 12
      column(1).font_style = :bold
      column(1).text_color = GREEN_600
    end

    move_down 24  # space before footer
  end

  def add_footer
    move_down 15
    # Footer text
    text "This quotation is valid for 30 days from the date of issue.",
         size: 9, color: GRAY_600

    # Check if any group has guarantee
    has_any_guarantee = @final_quotation.final_quotation_groups.any?(&:is_guaranteed)
    if has_any_guarantee
      move_down 8
      # Note: body text, italic
      text "Note: Some groups include a 25% guarantee discount.",
           size: 9, color: GREEN_600, style: :italic
    end
  end

  def number_with_delimiter(number)
    number.to_s.gsub(/(\d)(?=(\d\d\d)+(?!\d))/, "\\1,")
  end

  def short_category_name(category_type)
    case category_type
    when "Lead" then "LD"
    when "Second Lead" then "2L"
    when "Featured Extra" then "FE"
    when "Teenagers" then "TN"
    when "Kids" then "KD"
    when "Walk-on" then "WO"
    when "Extras" then "EX"
    else category_type # Return original if not recognized
    end
  end
end