// app/javascript/controllers/currency_toggle_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["amount", "selector", "pdfLink", "rateDisplay"]

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

    // Hide rate display when showing ZAR
    if (this.hasRateDisplayTarget) {
      this.rateDisplayTarget.classList.add('hidden')
    }
  }

  async convertAllAmounts(toCurrency) {
    try {
      const rateData = await this.getExchangeRate(this.baseCurrency, toCurrency)
      const { rate, date } = rateData
      const symbol = this.currencySymbols[toCurrency]

      this.amountTargets.forEach(element => {
        const baseAmount = parseFloat(element.dataset.baseAmount)
        const convertedAmount = baseAmount * rate
        element.textContent = `${symbol}${this.formatNumber(convertedAmount)}`
      })

      // Display the exchange rate and date
      this.displayExchangeRate(toCurrency, rate, date)
    } catch (error) {
      console.error('Failed to convert currency:', error)
      alert('Failed to fetch exchange rates. Please try again.')
    }
  }

  displayExchangeRate(toCurrency, rate, date) {
    if (this.hasRateDisplayTarget) {
      // Invert the rate to show "1 USD = X Rand" instead of "1 ZAR = X USD"
      const invertedRate = 1 / rate
      const formattedRate = invertedRate.toFixed(2)
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const currencyNames = {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound'
      }

      this.rateDisplayTarget.innerHTML = `
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Exchange Rate: <strong>1 ${currencyNames[toCurrency]} = R${formattedRate}</strong> (as of ${formattedDate})</span>
        </div>
      `
      this.rateDisplayTarget.classList.remove('hidden')
    }
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Reusing the same API as quotation form
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
    const data = await response.json()

    if (data.rates && data.rates[toCurrency]) {
      return {
        rate: data.rates[toCurrency],
        date: data.date
      }
    } else {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
    }
  }

  formatNumber(number) {
    return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}
