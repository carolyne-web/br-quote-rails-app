# app/mailers/quotation_mailer.rb
class QuotationMailer < ApplicationMailer
  def send_quotation(quotation, recipient_email)
    @quotation = quotation
    pdf = QuotationPdf.new(@quotation)
    
    attachments["quotation_#{@quotation.project_number}.pdf"] = {
      mime_type: 'application/pdf',
      content: pdf.render
    }
    
    mail(
      to: recipient_email,
      subject: "Quotation #{@quotation.project_number} - #{@quotation.project_name}"
    )
  end
end