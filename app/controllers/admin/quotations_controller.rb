class Admin::QuotationsController < ApplicationController
  before_action :require_admin

  def index
    @quotations = Quotation.includes(:production_house)
                          .order(created_at: :desc)
    
    # Filter by status if provided
    if params[:status].present?
      @quotations = @quotations.where(status: params[:status])
    end
    
    # Filter by production house if provided
    if params[:production_house_id].present?
      @quotations = @quotations.where(production_house_id: params[:production_house_id])
    end
    
    # Search by project name if provided
    if params[:search].present?
      @quotations = @quotations.where("project_name ILIKE ?", "%#{params[:search]}%")
    end
    
    @production_houses = ProductionHouse.order(:name)
    @statuses = Quotation::STATUS_OPTIONS
  end

  def show
    @quotation = Quotation.find(params[:id])
    @quotation_detail = @quotation.quotation_detail
    @talent_categories = @quotation.talent_categories
    @territories = @quotation.quotation_territories.includes(:territory)
    
    # Calculate totals for the breakdown
    @calculation = QuotationCalculator.new(@quotation).calculate
  end

  def pdf
    @quotation = Quotation.find(params[:id])
    pdf = QuotationPdf.new(@quotation)
    send_data pdf.render,
              filename: "quotation_#{@quotation.project_number}.pdf",
              type: "application/pdf",
              disposition: "inline"
  end
end