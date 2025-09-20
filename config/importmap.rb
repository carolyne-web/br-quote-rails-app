# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Debug utilities (development only)
pin "debug_utils", to: "debug_utils.js"
pin "quotation_debug", to: "quotation_debug.js"
pin "console_commands", to: "console_commands.js"
pin "edit_page_debug", to: "edit_page_debug.js"
