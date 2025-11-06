class FinalQuotationsController < ApplicationController
  before_action :set_final_quotation, only: [:show, :pdf, :duplicate]

  def show
    # Display the final quotation with all calculated values
  end

  def pdf
    # Generate PDF for final quotation using Prawn
    pdf = FinalQuotationPdf.new(@final_quotation)
    send_data pdf.render,
              filename: "quotation_#{@final_quotation.project_number}.pdf",
              type: 'application/pdf',
              disposition: 'attachment'
  end

  def duplicate
    # Create a new quotation based on this final quotation
    redirect_to new_quotation_path(duplicate_from: @final_quotation.id),
                notice: 'Creating new quotation based on this final quotation.'
  end

  private

  def set_final_quotation
    @final_quotation = FinalQuotation.find(params[:id])
  end

end