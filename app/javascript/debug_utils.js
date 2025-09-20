// Debug utilities for browser console
// Usage: Import this in development to get debugging helpers

window.DebugUtils = {
  // Log with timestamp and styling
  log: (message, data = null, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const styles = {
      info: 'color: #2196F3; font-weight: bold',
      warn: 'color: #FF9800; font-weight: bold',
      error: 'color: #F44336; font-weight: bold',
      success: 'color: #4CAF50; font-weight: bold'
    }

    console.log(`%c[${timestamp}] ${message}`, styles[level])
    if (data) console.log(data)
  },

  // QuotationForm specific debugging
  quotation: {
    // Get current form state
    getState: () => {
      const controller = window.quotationFormController
      if (!controller) {
        DebugUtils.log('Quotation controller not found', null, 'error')
        return null
      }

      return {
        baseRates: controller.baseRates,
        territorySearch: controller.territorySearchTarget?.value,
        mediaMultiplier: controller.mediaMultiplierTarget?.value,
        formData: new FormData(document.querySelector('form'))
      }
    },

    // Test calculation functions
    testCalculations: () => {
      const controller = window.quotationFormController
      if (!controller) {
        DebugUtils.log('Quotation controller not found', null, 'error')
        return
      }

      DebugUtils.log('Testing quotation calculations...', null, 'info')

      try {
        const talentLines = controller.getAllTalentLines()
        DebugUtils.log('Talent lines:', talentLines, 'success')

        controller.populateAllTables()
        DebugUtils.log('Tables populated successfully', null, 'success')
      } catch (error) {
        DebugUtils.log('Calculation test failed:', error, 'error')
      }
    },

    // Monitor form changes
    watchFormChanges: () => {
      const form = document.querySelector('form')
      if (!form) {
        DebugUtils.log('No form found', null, 'error')
        return
      }

      form.addEventListener('change', (e) => {
        DebugUtils.log(`Form changed: ${e.target.name || e.target.id}`, {
          element: e.target,
          value: e.target.value,
          type: e.target.type
        })
      })

      DebugUtils.log('Form change monitoring enabled', null, 'success')
    },

    // Log all base rates
    showBaseRates: () => {
      const controller = window.quotationFormController
      if (controller?.baseRates) {
        DebugUtils.log('Current base rates:', controller.baseRates, 'info')
      } else {
        DebugUtils.log('No base rates found', null, 'warn')
      }
    }
  },

  // Network request monitoring
  network: {
    // Monitor fetch requests
    monitorFetch: () => {
      const originalFetch = window.fetch
      window.fetch = function(...args) {
        DebugUtils.log(`Fetch request: ${args[0]}`, args[1], 'info')
        return originalFetch.apply(this, args)
          .then(response => {
            DebugUtils.log(`Fetch response: ${response.status} ${response.statusText}`, response, 'success')
            return response
          })
          .catch(error => {
            DebugUtils.log('Fetch error:', error, 'error')
            throw error
          })
      }
      DebugUtils.log('Fetch monitoring enabled', null, 'success')
    },

    // Monitor AJAX requests
    monitorAjax: () => {
      const originalXHR = window.XMLHttpRequest
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR()
        const originalOpen = xhr.open
        const originalSend = xhr.send

        xhr.open = function(method, url, ...args) {
          this._method = method
          this._url = url
          DebugUtils.log(`XHR ${method}: ${url}`, null, 'info')
          return originalOpen.apply(this, [method, url, ...args])
        }

        xhr.send = function(data) {
          this.addEventListener('load', () => {
            DebugUtils.log(`XHR Response: ${this.status} ${this.statusText}`, {
              method: this._method,
              url: this._url,
              response: this.responseText
            }, 'success')
          })

          this.addEventListener('error', () => {
            DebugUtils.log('XHR Error:', {
              method: this._method,
              url: this._url,
              status: this.status
            }, 'error')
          })

          return originalSend.apply(this, [data])
        }

        return xhr
      }
      DebugUtils.log('AJAX monitoring enabled', null, 'success')
    }
  },

  // Performance monitoring
  performance: {
    // Time a function execution
    timeFunction: (fn, name = 'function') => {
      const start = performance.now()
      const result = fn()
      const end = performance.now()
      DebugUtils.log(`${name} execution time: ${(end - start).toFixed(2)}ms`, null, 'info')
      return result
    },

    // Monitor page load times
    showPageMetrics: () => {
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
        DebugUtils.log('Page load metrics:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        }, 'info')
      }
    }
  },

  // Storage helpers
  storage: {
    // Save debug session data
    save: (key, data) => {
      try {
        localStorage.setItem(`debug_${key}`, JSON.stringify(data))
        DebugUtils.log(`Saved debug data: ${key}`, data, 'success')
      } catch (error) {
        DebugUtils.log('Failed to save debug data:', error, 'error')
      }
    },

    // Load debug session data
    load: (key) => {
      try {
        const data = localStorage.getItem(`debug_${key}`)
        return data ? JSON.parse(data) : null
      } catch (error) {
        DebugUtils.log('Failed to load debug data:', error, 'error')
        return null
      }
    },

    // Clear all debug data
    clear: () => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('debug_'))
        .forEach(key => localStorage.removeItem(key))
      DebugUtils.log('Debug storage cleared', null, 'success')
    }
  },

  // Initialize all debugging features
  init: () => {
    DebugUtils.log('Initializing debug utilities...', null, 'info')

    // Make utils available globally
    window.dbg = DebugUtils

    // Set up common debugging
    DebugUtils.quotation.watchFormChanges()
    DebugUtils.network.monitorFetch()

    DebugUtils.log('Debug utilities ready! Use window.dbg for quick access', {
      'dbg.log()': 'Enhanced logging',
      'dbg.quotation': 'Quotation form debugging',
      'dbg.network': 'Network monitoring',
      'dbg.performance': 'Performance tools',
      'dbg.storage': 'Debug data storage'
    }, 'success')
  }
}

// Auto-initialize in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => DebugUtils.init(), 1000)
  })
}