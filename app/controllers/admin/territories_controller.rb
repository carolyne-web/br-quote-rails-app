class Admin::TerritoriesController < ApplicationController
  before_action :require_admin
  before_action :set_territory, only: [:edit, :update, :destroy]

  def index
    @territories = Territory.all.order(:name)
    @grouped_territories = @territories.group_by(&:group_name)
  end

  def new
    @territory = Territory.new
  end

  def create
    @territory = Territory.new(territory_params)

    if @territory.save
      flash[:notice] = "Territory created successfully"
      redirect_to admin_territories_path
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @territory.update(territory_params)
      flash[:notice] = "Territory updated successfully"
      redirect_to admin_territories_path
    else
      render :edit
    end
  end

  def destroy
    @territory.destroy
    flash[:notice] = "Territory deleted"
    redirect_to admin_territories_path
  end

  def bulk_update
    params[:territories].each do |id, percentage|
      territory = Territory.find(id)
      territory.update(percentage: percentage)
    end

    flash[:notice] = "Territories updated successfully"
    redirect_to admin_territories_path
  end

  private

  def set_territory
    @territory = Territory.find(params[:id])
  end

  def territory_params
    params.require(:territory).permit(:name, :code, :percentage, :media_type, :group_name)
  end
end
