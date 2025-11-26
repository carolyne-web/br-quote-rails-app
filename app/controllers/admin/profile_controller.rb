class Admin::ProfileController < ApplicationController
  before_action :ensure_admin_authenticated

  def show
    @admin_user = current_admin_user
  end

  def update_password
    @admin_user = current_admin_user
    current_password = params[:current_password]
    new_password = params[:new_password]
    confirm_password = params[:confirm_password]

    if !@admin_user.authenticate(current_password)
      flash[:alert] = "Current password is incorrect"
      redirect_to admin_profile_path
      return
    end

    if new_password != confirm_password
      flash[:alert] = "New passwords don't match"
      redirect_to admin_profile_path
      return
    end

    if new_password.length < 6
      flash[:alert] = "New password must be at least 6 characters long"
      redirect_to admin_profile_path
      return
    end

    @admin_user.password = new_password
    @admin_user.password_confirmation = confirm_password

    if @admin_user.save
      flash[:notice] = "Password updated successfully"
      redirect_to admin_profile_path
    else
      flash[:alert] = @admin_user.errors.full_messages.join(", ")
      redirect_to admin_profile_path
    end
  end

  def update_email
    @admin_user = current_admin_user
    new_email = params[:email]

    if new_email.blank?
      flash[:alert] = "Email cannot be blank"
      redirect_to admin_profile_path
      return
    end

    unless new_email.match?(/\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i)
      flash[:alert] = "Please enter a valid email address"
      redirect_to admin_profile_path
      return
    end

    @admin_user.email = new_email

    if @admin_user.save
      flash[:notice] = "Email updated successfully"
      redirect_to admin_profile_path
    else
      flash[:alert] = @admin_user.errors.full_messages.join(", ")
      redirect_to admin_profile_path
    end
  end

  private

  def ensure_admin_authenticated
    unless admin_logged_in?
      redirect_to admin_login_path
    end
  end

  def current_admin_user
    @current_admin_user ||= AdminUser.find_by(id: session[:admin_user_id])
  end

  def admin_logged_in?
    !session[:admin_user_id].nil? && current_admin_user.present?
  end
end
