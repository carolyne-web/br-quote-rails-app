require "test_helper"

class PasswordResetMailerTest < ActionMailer::TestCase
  test "reset_instructions" do
    mail = PasswordResetMailer.reset_instructions
    assert_equal "Reset instructions", mail.subject
    assert_equal [ "to@example.org" ], mail.to
    assert_equal [ "from@example.com" ], mail.from
    assert_match "Hi", mail.body.encoded
  end
end
