class ProfileController < ApplicationController
  before_action :ensure_production_house_authenticated

  def show
    @production_house = current_production_house
  end

  def update_password
    @production_house = current_production_house
    current_password = params[:current_password]
    new_password = params[:new_password]
    confirm_password = params[:confirm_password]

    if !@production_house.authenticate(current_password)
      flash[:alert] = "Current password is incorrect"
      redirect_to profile_path
      return
    end

    if new_password != confirm_password
      flash[:alert] = "New passwords don't match"
      redirect_to profile_path
      return
    end

    if new_password.length < 6
      flash[:alert] = "New password must be at least 6 characters long"
      redirect_to profile_path
      return
    end

    @production_house.password = new_password
    @production_house.password_confirmation = confirm_password

    if @production_house.save
      flash[:notice] = "Password updated successfully"
      redirect_to profile_path
    else
      flash[:alert] = @production_house.errors.full_messages.join(", ")
      redirect_to profile_path
    end
  end

  def update_email
    @production_house = current_production_house
    new_email = params[:email]

    if new_email.blank?
      flash[:alert] = "Email cannot be blank"
      redirect_to profile_path
      return
    end

    unless new_email.match?(/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i)
      flash[:alert] = "Please enter a valid email address"
      redirect_to profile_path
      return
    end

    @production_house.email = new_email

    if @production_house.save
      flash[:notice] = "Email updated successfully"
      redirect_to profile_path
    else
      flash[:alert] = @production_house.errors.full_messages.join(", ")
      redirect_to profile_path
    end
  end

  private

  def ensure_production_house_authenticated
    unless production_house_logged_in?
      redirect_to login_path
    end
  end

  def current_production_house
    @current_production_house ||= ProductionHouse.find_by(id: session[:production_house_id])
  end

  def production_house_logged_in?
    !session[:production_house_id].nil? && current_production_house.present?
  end
end
