class PasswordResetMailer < ApplicationMailer
  def reset_instructions(user, token)
    @user = user
    @token = token
    @reset_url = edit_password_reset_url(token.token)

    # Determine user name and type
    @user_name = user.is_a?(AdminUser) ? user.name : user.name
    @user_type = user.is_a?(AdminUser) ? "Admin" : "Production House"

    mail(
      to: user.email,
      subject: "Password Reset Instructions"
    )
  end
end
