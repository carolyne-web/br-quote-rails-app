// Console Commands - Quick debugging commands for the browser console
// Available in development mode only

window.ConsoleCommands = {
  // Quick access to common debugging tasks
  help: () => {
    console.log(`
🔧 CONSOLE DEBUGGING COMMANDS

📋 General:
  help()                    - Show this help
  inspect(element)          - Inspect DOM element with detailed info
  findElement(selector)     - Find and highlight elements
  clearLogs()               - Clear console logs

💰 Quotation Specific:
  calcDebug()               - Debug current calculation state
  exportQuote()             - Export quotation data for debugging
  testQuote()               - Run test calculation
  watchForm()               - Monitor form changes
  rates()                   - Show current base rates

🌐 Network:
  watchAjax()               - Monitor AJAX requests
  watchFetch()              - Monitor fetch requests

⚡ Performance:
  pageMetrics()             - Show page load metrics
  timeIt(fn, name)          - Time function execution

💾 Storage:
  saveDebug(key, data)      - Save debug data
  loadDebug(key)            - Load debug data
  clearDebug()              - Clear debug storage

Example usage:
  calcDebug()               // Debug quotation calculations
  inspect('#total-amount')  // Inspect the total amount element
  timeIt(() => myFunction(), 'My Function')  // Time a function
    `)
  },

  // Enhanced element inspector
  inspect: (selector) => {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector

    if (!element) {
      console.error('❌ Element not found:', selector)
      return
    }

    console.group(`🔍 Element Inspector: ${element.tagName}`)
    console.log('Element:', element)
    console.log('ID:', element.id || 'none')
    console.log('Classes:', element.className || 'none')
    console.log('Name:', element.name || 'none')
    console.log('Value:', element.value || 'none')
    console.log('Text:', element.textContent?.slice(0, 100) || 'none')
    console.log('Computed Style:', window.getComputedStyle(element))
    console.log('Data attributes:', Object.fromEntries(
      Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => [attr.name, attr.value])
    ))

    // Highlight element temporarily
    const originalBorder = element.style.border
    element.style.border = '3px solid red'
    setTimeout(() => {
      element.style.border = originalBorder
    }, 2000)

    console.groupEnd()
    return element
  },

  // Find and highlight elements
  findElement: (selector) => {
    const elements = document.querySelectorAll(selector)

    if (elements.length === 0) {
      console.error('❌ No elements found for:', selector)
      return
    }

    console.log(`✅ Found ${elements.length} element(s):`, elements)

    // Highlight all found elements
    elements.forEach((el, index) => {
      const originalBorder = el.style.border
      el.style.border = '2px solid blue'

      setTimeout(() => {
        el.style.border = originalBorder
      }, 3000)

      console.log(`[${index}]:`, el)
    })

    return elements
  },

  // Clear console logs
  clearLogs: () => {
    console.clear()
    console.log('🧹 Console cleared')
  }
}

// Set up global shortcuts for common commands
window.help = ConsoleCommands.help
window.inspect = ConsoleCommands.inspect
window.findElement = ConsoleCommands.findElement
window.clearLogs = ConsoleCommands.clearLogs

// Quotation shortcuts (will be available once quotation_debug loads)
window.rates = () => {
  if (window.quotationFormController?.baseRates) {
    console.table(window.quotationFormController.baseRates)
  } else {
    console.log('❌ Base rates not available')
  }
}

window.watchForm = () => {
  if (window.DebugUtils?.quotation?.watchFormChanges) {
    window.DebugUtils.quotation.watchFormChanges()
  } else {
    console.log('❌ Form watcher not available')
  }
}

window.testQuote = () => {
  if (window.QuotationDebug?.testCalculation) {
    window.QuotationDebug.testCalculation()
  } else {
    console.log('❌ Quotation test not available')
  }
}

// Network shortcuts
window.watchAjax = () => {
  if (window.DebugUtils?.network?.monitorAjax) {
    window.DebugUtils.network.monitorAjax()
  } else {
    console.log('❌ AJAX watcher not available')
  }
}

window.watchFetch = () => {
  if (window.DebugUtils?.network?.monitorFetch) {
    window.DebugUtils.network.monitorFetch()
  } else {
    console.log('❌ Fetch watcher not available')
  }
}

// Performance shortcuts
window.pageMetrics = () => {
  if (window.DebugUtils?.performance?.showPageMetrics) {
    window.DebugUtils.performance.showPageMetrics()
  } else {
    console.log('❌ Performance metrics not available')
  }
}

window.timeIt = (fn, name = 'function') => {
  if (window.DebugUtils?.performance?.timeFunction) {
    return window.DebugUtils.performance.timeFunction(fn, name)
  } else {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`)
    return result
  }
}

// Storage shortcuts
window.saveDebug = (key, data) => {
  if (window.DebugUtils?.storage?.save) {
    window.DebugUtils.storage.save(key, data)
  } else {
    console.log('❌ Debug storage not available')
  }
}

window.loadDebug = (key) => {
  if (window.DebugUtils?.storage?.load) {
    return window.DebugUtils.storage.load(key)
  } else {
    console.log('❌ Debug storage not available')
    return null
  }
}

window.clearDebug = () => {
  if (window.DebugUtils?.storage?.clear) {
    window.DebugUtils.storage.clear()
  } else {
    console.log('❌ Debug storage not available')
  }
}

// Auto-initialize in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('🎮 Console Commands Ready!')
      console.log('💡 Type help() for available commands')

      // Show a welcome message with key shortcuts
      console.log(`
🚀 QUICK START:
  help()        - Show all commands
  calcDebug()   - Debug quotation calculations
  inspect('#id') - Inspect any element
  rates()       - Show current rates
      `)
    }, 2000)
  })
}