import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="dropdown"
export default class extends Controller {
  static targets = ["menu", "toggle"]

  connect() {
    // Close dropdown when clicking outside
    this.boundHandleClickOutside = this.handleClickOutside.bind(this)
  }

  disconnect() {
    document.removeEventListener("click", this.boundHandleClickOutside)
  }

  toggle(event) {
    event.stopPropagation()
    
    if (this.menuTarget.classList.contains("hidden")) {
      this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.menuTarget.classList.remove("hidden")
    document.addEventListener("click", this.boundHandleClickOutside)
  }

  hide() {
    this.menuTarget.classList.add("hidden")
    document.removeEventListener("click", this.boundHandleClickOutside)
  }

  handleClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.hide()
    }
  }
}