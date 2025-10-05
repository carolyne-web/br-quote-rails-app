class FinalQuotationsController < ApplicationController
  before_action :set_final_quotation, only: [:show, :edit, :update, :pdf, :duplicate]

  def show
    # Display the final quotation with all calculated values
  end

  def edit
    # Edit functionality for final quotations
  end

  def update
    if @final_quotation.update(final_quotation_params)
      redirect_to @final_quotation, notice: 'Final quotation was successfully updated.'
    else
      render :edit
    end
  end

  def pdf
    # Generate PDF for final quotation
    render pdf: "quotation_#{@final_quotation.project_number}",
           template: 'final_quotations/pdf',
           layout: 'pdf.html'
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

  def final_quotation_params
    params.require(:final_quotation).permit(
      :project_name, :project_number, :product_type, :commercial_type,
      :is_guaranteed, :shoot_days, :rehearsal_days, :travel_days, :down_days,
      :overtime_hours, :exclusivity_type, :unlimited_stills, :unlimited_versions,
      final_quotation_groups_attributes: [
        :id, :group_number, :duration, :selected_territories, :selected_media_types,
        final_quotation_talent_lines_attributes: [
          :id, :description, :category_type, :talent_count, :daily_rate,
          :rate_adjustment, :adjusted_rate, :shoot_days, :rehearsal_days,
          :travel_days, :down_days, :overtime_hours, :has_night_premium,
          :night_premium_amount, :_destroy
        ]
      ],
      final_quotation_adjustments_attributes: [
        :id, :description, :adjustment_type, :percentage, :amount, :_destroy
      ]
    )
  end
end