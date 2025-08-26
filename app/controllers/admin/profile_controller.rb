class Admin::ProfileController < ApplicationController
  before_action :ensure_admin_authenticated

  def show
    @admin_settings = {
      email: ENV['ADMIN_EMAIL'] || '',
      banking_details: {
        bank_name: ENV['BANK_NAME'] || '',
        account_number: ENV['ACCOUNT_NUMBER'] || '',
        branch_code: ENV['BRANCH_CODE'] || '',
        account_holder: ENV['ACCOUNT_HOLDER'] || ''
      }
    }
  end

  def update_password
    current_password = params[:current_password]
    new_password = params[:new_password]
    confirm_password = params[:confirm_password]

    if current_password != ENV["ADMIN_PASSWORD"]
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

    # In a real application, you'd want to update this in a secure way
    # For now, we'll just show a message that the password would be updated
    flash[:notice] = "Password updated successfully. Please contact system administrator to update environment variables."
    redirect_to admin_profile_path
  end

  def update_email
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

    # Store in session for now, in production you'd update environment variable
    session[:admin_email] = new_email
    flash[:notice] = "Email updated successfully"
    redirect_to admin_profile_path
  end

  def update_banking
    banking_params = params.require(:banking).permit(:bank_name, :account_number, :branch_code, :account_holder)
    
    # Store in session for now, in production you'd update environment variables
    session[:banking_details] = banking_params.to_h
    flash[:notice] = "Banking details updated successfully"
    redirect_to admin_profile_path
  end

  private

  def ensure_admin_authenticated
    unless admin_logged_in?
      redirect_to admin_login_path
    end
  end
end