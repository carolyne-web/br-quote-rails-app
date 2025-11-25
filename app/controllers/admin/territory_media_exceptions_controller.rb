class Admin::TerritoryMediaExceptionsController < ApplicationController
  before_action :require_admin
  before_action :set_exception, only: [:edit, :update, :destroy]

  def index
    @exceptions = TerritoryMediaException.all.order(:territory_name, :media_type)
    @grouped_exceptions = @exceptions.group_by(&:territory_name)
  end

  def new
    @exception = TerritoryMediaException.new
  end

  def create
    @exception = TerritoryMediaException.new(exception_params)

    if @exception.save
      flash[:notice] = "Territory media exception created successfully"
      redirect_to admin_territories_path
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @exception.update(exception_params)
      flash[:notice] = "Territory media exception updated successfully"
      redirect_to admin_territories_path
    else
      render :edit
    end
  end

  def destroy
    @exception.destroy
    flash[:notice] = "Territory media exception deleted"
    redirect_to admin_territories_path
  end

  private

  def set_exception
    @exception = TerritoryMediaException.find(params[:id])
  end

  def exception_params
    params.require(:territory_media_exception).permit(:territory_name, :media_type, :percentage, :description)
  end
end