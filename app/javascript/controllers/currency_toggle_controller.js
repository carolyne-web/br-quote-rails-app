// app/javascript/controllers/currency_toggle_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["amount", "selector", "pdfLink"]

  connect() {
    console.log("Currency toggle controller connected")
    this.baseCurrency = "ZAR"
    this.currencySymbols = {
      'ZAR': 'R',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    }
  }

  async change(event) {
    const selectedCurrency = event.target.value
    console.log(`💱 Currency changed to ${selectedCurrency}`)

    // Update PDF download link with currency parameter
    this.updatePdfLink(selectedCurrency)

    if (selectedCurrency === 'ZAR') {
      // Reset to original ZAR amounts
      this.resetToZAR()
    } else {
      // Convert all amounts to selected currency
      await this.convertAllAmounts(selectedCurrency)
    }
  }

  updatePdfLink(currency) {
    if (this.hasPdfLinkTarget) {
      const baseUrl = this.pdfLinkTarget.dataset.baseUrl
      const separator = baseUrl.includes('?') ? '&' : '?'
      this.pdfLinkTarget.href = `${baseUrl}${separator}currency=${currency}`
      console.log(`📄 PDF link updated to: ${this.pdfLinkTarget.href}`)
    }
  }

  resetToZAR() {
    this.amountTargets.forEach(element => {
      const baseAmount = parseFloat(element.dataset.baseAmount)
      element.textContent = `R${this.formatNumber(baseAmount)}`
    })
  }

  async convertAllAmounts(toCurrency) {
    try {
      const exchangeRate = await this.getExchangeRate(this.baseCurrency, toCurrency)
      const symbol = this.currencySymbols[toCurrency]

      this.amountTargets.forEach(element => {
        const baseAmount = parseFloat(element.dataset.baseAmount)
        const convertedAmount = baseAmount * exchangeRate
        element.textContent = `${symbol}${this.formatNumber(convertedAmount)}`
      })
    } catch (error) {
      console.error('Failed to convert currency:', error)
      alert('Failed to fetch exchange rates. Please try again.')
    }
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Reusing the same API as quotation form
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
    const data = await response.json()

    if (data.rates && data.rates[toCurrency]) {
      return data.rates[toCurrency]
    } else {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
    }
  }

  formatNumber(number) {
    return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}
