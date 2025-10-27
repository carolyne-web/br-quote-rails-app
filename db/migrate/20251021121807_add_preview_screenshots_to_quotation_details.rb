class AddPreviewScreenshotsToQuotationDetails < ActiveRecord::Migration[8.0]
  def change
    add_column :quotation_details, :preview_screenshots, :text
  end
end
