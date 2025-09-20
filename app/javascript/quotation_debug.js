// Quotation-specific debugging helpers
// Available in browser console for debugging quotation calculations

window.QuotationDebug = {
  // Monitor all input changes and log calculations
  startCalculationMonitoring: () => {
    const inputs = document.querySelectorAll('input, select, textarea')

    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target

        // Log the change
        console.group(`🔄 Form Change: ${target.name || target.id || target.className}`)
        console.log('Element:', target)
        console.log('Old value:', target.dataset.oldValue || 'unknown')
        console.log('New value:', target.value)
        console.log('Type:', target.type)

        // Store old value for next time
        target.dataset.oldValue = target.value

        // If it's a calculation-related field, trigger debug calculation
        if (QuotationDebug.isCalculationField(target)) {
          setTimeout(() => QuotationDebug.debugCalculation(), 100)
        }

        console.groupEnd()
      })
    })

    console.log('✅ Calculation monitoring started')
  },

  // Check if a field affects calculations
  isCalculationField: (element) => {
    const calculationFields = [
      'talent_category', 'territory', 'duration', 'media_type',
      'exclusivity', 'guarantee', 'rate', 'adjustment', 'buyout'
    ]

    const name = element.name || element.id || ''
    return calculationFields.some(field => name.includes(field))
  },

  // Debug current calculation state
  debugCalculation: () => {
    console.group('🧮 Calculation Debug')

    try {
      // Get form data
      const formData = new FormData(document.querySelector('form'))
      const data = Object.fromEntries(formData.entries())

      console.log('📋 Form Data:', data)

      // Get territory info
      const territories = QuotationDebug.getTerritoryInfo()
      console.log('🌍 Territories:', territories)

      // Get talent categories
      const talentCategories = QuotationDebug.getTalentCategoryInfo()
      console.log('👥 Talent Categories:', talentCategories)

      // Get multipliers
      const multipliers = QuotationDebug.getMultipliers()
      console.log('✖️ Multipliers:', multipliers)

      // Calculate totals if possible
      const totals = QuotationDebug.calculateTotals()
      console.log('💰 Current Totals:', totals)

    } catch (error) {
      console.error('❌ Calculation debug failed:', error)
    }

    console.groupEnd()
  },

  // Extract territory information
  getTerritoryInfo: () => {
    const territoryInputs = document.querySelectorAll('[name*="territory"]')
    const territories = []

    territoryInputs.forEach(input => {
      if (input.checked || (input.type !== 'checkbox' && input.value)) {
        territories.push({
          name: input.value,
          element: input,
          multiplier: input.dataset.multiplier || 'unknown'
        })
      }
    })

    return territories
  },

  // Extract talent category information
  getTalentCategoryInfo: () => {
    const categories = []
    const categoryElements = document.querySelectorAll('[data-category-id]')

    categoryElements.forEach(el => {
      const categoryId = el.dataset.categoryId
      const categoryData = {
        id: categoryId,
        name: el.querySelector('[name*="category_name"]')?.value,
        rate: el.querySelector('[name*="rate"]')?.value,
        days: el.querySelector('[name*="days"]')?.value,
        element: el
      }
      categories.push(categoryData)
    })

    return categories
  },

  // Extract multiplier information
  getMultipliers: () => {
    return {
      territory: document.querySelector('[name*="territory_multiplier"]')?.value || 'auto',
      media: document.querySelector('[name*="media_multiplier"]')?.value || 'auto',
      duration: document.querySelector('[name*="duration"]')?.value,
      exclusivity: document.querySelector('[name*="exclusivity"]')?.checked,
      guarantee: document.querySelector('[name*="guarantee"]')?.value
    }
  },

  // Calculate current totals from visible elements
  calculateTotals: () => {
    const totals = {
      talentFees: 0,
      usageBuyout: 0,
      adjustments: 0,
      total: 0
    }

    // Try to extract from summary elements
    const summaryElements = document.querySelectorAll('[id*="total"], [class*="total"], [id*="summary"]')

    summaryElements.forEach(el => {
      const text = el.textContent || el.value || ''
      const match = text.match(/[\d,]+\.?\d*/)
      if (match) {
        const value = parseFloat(match[0].replace(/,/g, ''))
        if (!isNaN(value)) {
          if (el.id.includes('talent')) totals.talentFees += value
          else if (el.id.includes('usage') || el.id.includes('buyout')) totals.usageBuyout += value
          else if (el.id.includes('adjustment')) totals.adjustments += value
          else if (el.id.includes('total')) totals.total = Math.max(totals.total, value)
        }
      }
    })

    return totals
  },

  // Log all AJAX requests related to quotations
  monitorQuotationRequests: () => {
    const originalFetch = window.fetch

    window.fetch = function(...args) {
      const url = args[0]

      if (url.includes('quotation') || url.includes('calculate')) {
        console.group('📡 Quotation API Request')
        console.log('URL:', url)
        console.log('Options:', args[1])

        return originalFetch.apply(this, args)
          .then(response => {
            console.log('Response Status:', response.status)

            if (response.headers.get('content-type')?.includes('application/json')) {
              return response.clone().json().then(data => {
                console.log('Response Data:', data)
                console.groupEnd()
                return response
              })
            } else {
              console.log('Response Type:', response.headers.get('content-type'))
              console.groupEnd()
              return response
            }
          })
          .catch(error => {
            console.error('Request Failed:', error)
            console.groupEnd()
            throw error
          })
      }

      return originalFetch.apply(this, args)
    }

    console.log('✅ Quotation request monitoring enabled')
  },

  // Test calculation with sample data
  testCalculation: () => {
    console.group('🧪 Test Calculation')

    // Set some test values
    const testData = {
      'quotation[quotation_detail_attributes][duration]': '12_months',
      'quotation[quotation_detail_attributes][media_type]': 'tv',
      'quotation[quotation_detail_attributes][exclusivity]': '1'
    }

    Object.entries(testData).forEach(([name, value]) => {
      const input = document.querySelector(`[name="${name}"]`)
      if (input) {
        input.value = value
        input.dispatchEvent(new Event('change', { bubbles: true }))
        console.log(`✅ Set ${name} = ${value}`)
      } else {
        console.log(`❌ Could not find input: ${name}`)
      }
    })

    console.log('Test data applied. Check calculations...')
    console.groupEnd()
  },

  // Export current state for debugging
  exportDebugData: () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      formData: Object.fromEntries(new FormData(document.querySelector('form'))),
      territories: QuotationDebug.getTerritoryInfo(),
      talentCategories: QuotationDebug.getTalentCategoryInfo(),
      multipliers: QuotationDebug.getMultipliers(),
      totals: QuotationDebug.calculateTotals(),
      domElements: {
        inputs: document.querySelectorAll('input').length,
        selects: document.querySelectorAll('select').length,
        textareas: document.querySelectorAll('textarea').length
      }
    }

    console.log('📊 Debug Data Export:', debugData)

    // Copy to clipboard if possible
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
        .then(() => console.log('✅ Debug data copied to clipboard'))
        .catch(() => console.log('❌ Could not copy to clipboard'))
    }

    return debugData
  },

  // Initialize all debugging features
  init: () => {
    console.log('🚀 Initializing Quotation Debug Tools...')

    QuotationDebug.startCalculationMonitoring()
    QuotationDebug.monitorQuotationRequests()

    // Make available globally with shortcuts
    window.qdbg = QuotationDebug
    window.calcDebug = () => QuotationDebug.debugCalculation()
    window.exportQuote = () => QuotationDebug.exportDebugData()

    console.log('✅ Quotation Debug Tools Ready!')
    console.log('💡 Quick commands:')
    console.log('  - qdbg.debugCalculation() or calcDebug()')
    console.log('  - qdbg.exportDebugData() or exportQuote()')
    console.log('  - qdbg.testCalculation()')
  }
}

// Auto-initialize in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => QuotationDebug.init(), 1500)
  })
}