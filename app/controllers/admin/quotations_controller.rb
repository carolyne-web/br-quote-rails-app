class Admin::QuotationsController < ApplicationController
  before_action :require_admin

  def index
    @quotations = Quotation.includes(:production_house, final_quotations: { final_quotation_groups: :final_quotation_talent_lines })
                          .order(created_at: :desc)

    # Filter by production house if provided
    if params[:production_house_id].present?
      @quotations = @quotations.where(production_house_id: params[:production_house_id])
    end

    # Search by project name if provided
    if params[:search].present?
      @quotations = @quotations.where("project_name ILIKE ?", "%#{params[:search]}%")
    end

    @production_houses = ProductionHouse.order(:name)
  end

  def show
    @quotation = Quotation.find(params[:id])

    # Get or create the final quotation for this quotation
    @final_quotation = @quotation.final_quotations.last

    # If no final quotation exists, generate one
    unless @final_quotation
      @final_quotation = FinalQuotationGenerator.new(@quotation).generate
    end

    @quotation_detail = @quotation.quotation_detail
    @talent_categories = @quotation.talent_categories
    @territories = @quotation.quotation_territories.includes(:territory)

    # Calculate totals for the breakdown
    @calculation = QuotationCalculator.new(@quotation).calculate
  end

  def pdf
    @quotation = Quotation.find(params[:id])

    # Get or create the final quotation for this quotation
    final_quotation = @quotation.final_quotations.last

    unless final_quotation
      final_quotation = FinalQuotationGenerator.new(@quotation).generate
    end

    # Get currency from params, default to ZAR
    currency = params[:currency] || 'ZAR'

    # Use FinalQuotationPdf for consistent formatting
    pdf = FinalQuotationPdf.new(final_quotation, currency)
    send_data pdf.render,
              filename: "quotation_#{@quotation.project_number}_#{currency}.pdf",
              type: "application/pdf",
              disposition: "inline"
  end
end