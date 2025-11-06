# app/services/final_quotation_pdf.rb
class FinalQuotationPdf
  include Prawn::View

  def initialize(final_quotation)
    @final_quotation = final_quotation
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
    add_campaign_info
    add_talent_summary
    add_usage_summary
    add_grand_total
    add_footer
  end

  def add_header
    text "FINAL QUOTATION", size: 24, style: :bold
    text "Quote ##{@final_quotation.project_number}", size: 14, color: "666666"
    move_down 20
  end

  def add_campaign_info
    text "Campaign Information", size: 16, style: :bold
    move_down 10

    campaign_data = [
      ["Campaign Name:", @final_quotation.quotation.campaign_name || "N/A"],
      ["Product Type:", @final_quotation.product_type&.humanize || "N/A"],
      ["Type of Commercial:", @final_quotation.commercial_type&.humanize || "N/A"]
    ]

    table(campaign_data, cell_style: { borders: [], padding: [2, 5] })
    move_down 20
  end

  def add_talent_summary
    text "Talent Summary", size: 16, style: :bold
    move_down 10

    if @final_quotation.final_quotation_groups.any? && @final_quotation.final_quotation_groups.flat_map(&:final_quotation_talent_lines).any?
      talent_data = [["Category", "Description", "Talent", "Rate", "Shoot Days", "Rehearsal", "Down Days", "Travel Days", "Overtime", "Night", "Total"]]

      # Show talent lines from first group only to match the show page
      first_group = @final_quotation.final_quotation_groups.ordered.first
      if first_group
        first_group.final_quotation_talent_lines.each do |talent_line|
          talent_data << [
            talent_line.category_type,
            talent_line.description.present? ? talent_line.description : '-',
            talent_line.talent_count.to_s,
            "R#{number_with_delimiter(talent_line.adjusted_rate.to_i)}",
            talent_line.shoot_days.to_s,
            talent_line.rehearsal_days.to_s,
            talent_line.down_days.to_s,
            talent_line.travel_days.to_s,
            "#{talent_line.overtime_hours} hrs",
            talent_line.has_night_premium ? "Yes" : "No",
            "R#{number_with_delimiter(talent_line.total_talent_fee)}"
          ]
        end
      end

      table(talent_data, header: true, width: bounds.width) do
        row(0).font_style = :bold
        row(0).background_color = "EEEEEE"
      end

      # Talent Summary Total
      first_group_total = @final_quotation.final_quotation_groups.ordered.first&.final_quotation_talent_lines&.sum(&:total_talent_fee) || 0
      move_down 10
      text "Talent Summary Total: R#{number_with_delimiter(first_group_total)}",
           size: 12, style: :bold, color: "0066CC"
    else
      text "No talent data available", size: 10, color: "666666"
    end

    move_down 20
  end

  def add_usage_summary
    text "Usage Summary", size: 16, style: :bold
    move_down 10

    @final_quotation.final_quotation_groups.ordered.each_with_index do |group, index|
      text "Group #{group.group_number}", size: 14, style: :bold
      move_down 5

      # Group details
      group_info = []
      group_info << ["Duration:", group.duration&.humanize || '1 Year']

      if group.selected_territories.is_a?(Array) && group.selected_territories.any?
        territories = group.selected_territories.map { |t| t['name'] }.join(', ')
        group_info << ["Territories:", territories]
      else
        group_info << ["Territories:", "All Territories"]
      end

      if group.selected_media_types.is_a?(Array) && group.selected_media_types.any?
        media_types = group.selected_media_types.map(&:humanize).join(', ')
        group_info << ["Media Types:", media_types]
      else
        group_info << ["Media Types:", "All Media"]
      end

      unlimited_options = []
      unlimited_options << "Unlimited Stills" if group.unlimited_stills
      unlimited_options << "Unlimited Versions" if group.unlimited_versions
      if unlimited_options.any?
        group_info << ["Unlimited Options:", unlimited_options.join(', ')]
      end

      table(group_info, cell_style: { borders: [], padding: [2, 5] })
      move_down 10

      # Usage breakdown table
      usage_data = [["Talent", "Day Fee", "Unit", "Exclusivity", "# of Comms", "Buyout %", "Per Talent", "Total (R)"]]

      group.final_quotation_talent_lines.each do |line|
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
          "R#{number_with_delimiter(line.adjusted_rate.to_i)}",
          line.talent_count.to_s,
          line.exclusivity_type.present? ? line.exclusivity_type : '-',
          (line.commercial_count || 1).to_s,
          "#{display_percentage.floor}%",
          "R#{number_with_delimiter(line.per_talent_amount || (line.total_line_cost / line.talent_count))}",
          "R#{number_with_delimiter(line.total_line_cost)}"
        ]
      end

      table(usage_data, header: true, width: bounds.width) do
        row(0).font_style = :bold
        row(0).background_color = "F0F0F0"
      end

      # Group total
      group_total = group.final_quotation_talent_lines.sum(&:total_line_cost)

      # Show guarantee discount if applicable for this specific group
      if group.is_guaranteed
        original_amount = group_total / 0.75
        savings = original_amount - group_total
        move_down 5
        text "Guaranteed (25% Discount): -R#{number_with_delimiter(savings.round(2))}",
             size: 10, color: "CC0000"
      end

      move_down 5
      text "Group Total: R#{number_with_delimiter(group_total)}",
           size: 12, style: :bold, color: "0066CC"

      move_down 15
    end
  end

  def add_grand_total
    text "Grand Total", size: 18, style: :bold
    move_down 10

    # Calculate Grand Total: Talent Summary Total + All Group Totals
    talent_summary_total = @final_quotation.final_quotation_groups.ordered.first&.final_quotation_talent_lines&.sum(&:total_talent_fee) || 0
    all_group_totals = @final_quotation.final_quotation_groups.sum { |group| group.final_quotation_talent_lines.sum(&:total_line_cost) }
    grand_total = talent_summary_total + all_group_totals

    total_data = [
      ["Talent Summary Total:", "R#{number_with_delimiter(talent_summary_total)}"],
      ["All Group Totals:", "R#{number_with_delimiter(all_group_totals)}"],
      ["", ""],
      ["GRAND TOTAL:", "R#{number_with_delimiter(grand_total)}"]
    ]

    table(total_data, cell_style: { borders: [], padding: [3, 5] }) do
      row(-1).font_style = :bold
      row(-1).size = 16
      row(-1).background_color = "E6F3FF"
    end
  end

  def add_footer
    move_down 30
    text "This quotation is valid for 30 days from the date of issue.", size: 9, color: "666666"

    # Check if any group has guarantee
    has_any_guarantee = @final_quotation.final_quotation_groups.any?(&:is_guaranteed)
    if has_any_guarantee
      move_down 10
      text "Note: Some groups include a 25% guarantee discount.",
           size: 9, color: "00AA00", style: :italic
    end
  end

  def number_with_delimiter(number)
    number.to_s.gsub(/(\d)(?=(\d\d\d)+(?!\d))/, "\\1,")
  end
end