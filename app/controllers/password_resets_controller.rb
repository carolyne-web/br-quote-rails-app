class PasswordResetsController < ApplicationController
  before_action :find_token, only: [:edit, :update]

  # GET /forgot_password (new)
  def new
    @user_type = params[:user_type] || 'production_house'
  end

  # POST /forgot_password (create)
  def create
    email = params[:email]
    user_type = params[:user_type]

    if email.blank?
      flash[:alert] = "Please enter your email address"
      redirect_to forgot_password_path(user_type: user_type)
      return
    end

    # Find user based on type
    user = find_user_by_email(email, user_type)

    if user
      # Create password reset token
      token = PasswordResetToken.create!(
        email: email,
        user_type: user_type == 'admin' ? 'AdminUser' : 'ProductionHouse'
      )

      # Send email (or show token for now if email not configured)
      begin
        PasswordResetMailer.reset_instructions(user, token).deliver_now
        flash[:notice] = "Password reset instructions have been sent to #{email}"
      rescue => e
        # If email fails, show the reset link directly (for development)
        flash[:notice] = "Password reset link: #{edit_password_reset_url(token.token)}"
      end
    else
      # Don't reveal whether email exists or not (security best practice)
      flash[:notice] = "If an account exists with that email, password reset instructions have been sent"
    end

    redirect_to user_type == 'admin' ? admin_login_path : login_path
  end

  # GET /password_resets/:token/edit
  def edit
    unless @reset_token
      flash[:alert] = "Invalid or expired password reset link"
      redirect_to root_path
    end
  end

  # PATCH /password_resets/:token
  def update
    unless @reset_token
      flash[:alert] = "Invalid or expired password reset link"
      redirect_to root_path
      return
    end

    password = params[:password]
    password_confirmation = params[:password_confirmation]

    if password.blank? || password_confirmation.blank?
      flash.now[:alert] = "Password and confirmation are required"
      render :edit
      return
    end

    if password != password_confirmation
      flash.now[:alert] = "Passwords don't match"
      render :edit
      return
    end

    if password.length < 6
      flash.now[:alert] = "Password must be at least 6 characters"
      render :edit
      return
    end

    # Find the user and update password
    user = find_user_by_email(@reset_token.email, @reset_token.user_type)

    if user
      user.password = password
      user.password_confirmation = password_confirmation

      if user.save
        @reset_token.mark_as_used!
        flash[:notice] = "Your password has been reset successfully. Please login with your new password."
        redirect_to @reset_token.user_type == 'AdminUser' ? admin_login_path : login_path
      else
        flash.now[:alert] = user.errors.full_messages.join(", ")
        render :edit
      end
    else
      flash[:alert] = "User not found"
      redirect_to root_path
    end
  end

  private

  def find_token
    token = params[:id] || params[:token]
    @reset_token = PasswordResetToken.valid_tokens.find_by(token: token)
  end

  def find_user_by_email(email, user_type)
    if user_type == 'admin'
      AdminUser.find_by(email: email)
    else
      ProductionHouse.find_by(email: email)
    end
  end
end
