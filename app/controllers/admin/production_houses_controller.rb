class Admin::ProductionHousesController < ApplicationController
  before_action :require_admin
  before_action :set_production_house, only: [ :edit, :update, :destroy ]

  def index
    @production_houses = ProductionHouse.all.order(:name)
  end

  def new
    @production_house = ProductionHouse.new
  end

  def create
    @production_house = ProductionHouse.new(production_house_params)

    if @production_house.save
      flash[:notice] = "Production house created successfully"
      redirect_to admin_production_houses_path
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @production_house.update(production_house_params)
      flash[:notice] = "Production house updated successfully"
      redirect_to admin_production_houses_path
    else
      render :edit
    end
  end

  def destroy
    @production_house.destroy
    flash[:notice] = "Production house deleted"
    redirect_to admin_production_houses_path
  end

  private

  def set_production_house
    @production_house = ProductionHouse.find(params[:id])
  end

  def production_house_params
    params.require(:production_house).permit(:name, :code, :password, :password_confirmation)
  end
end
