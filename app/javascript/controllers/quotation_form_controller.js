// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  // Store references to bound event handlers for cleanup
  constructor(...args) {
    super(...args)
    this.boundDocumentClickHandler = this.handleDocumentClick.bind(this)
    this.documentListenerAttached = false
  }

  connect() {
    console.log('Quotation form controller connected')

    // Make controller available globally for HTML callback functions
    window.quotationFormController = this

    // Prevent Enter key from submitting the form
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
      }
    })

    // Clear exclusivity data for new quotes to prevent persistence
    if (window.location.pathname.includes('/quotations/new')) {
      console.log('New quotation detected - clearing exclusivity data')
      window.exclusivityData = {}
    }

    // Initialize arrays first
    this.baseRates = {}

    this.setupTalentButtons()
    this.setupMediaTypeLogic()
    this.setupManualAdjustments()
    this.setupMainRowEventListeners()
    this.setupProductTypeListeners()
    this.setupDurationLogic()
    this.setupCommercialLogic()
    this.setupRateValidation()
    this.setupComboSummaryUpdate()
    this.setupTablePopulation()
    this.setupExclusivityPopup()
    this.setupCurrencyAndGuaranteeListeners()
    this.setupFormSubmissionHandler()

    // Make functions available globally
    window.removeTalentCategory = (categoryId) => this.removeTalentCategory(categoryId)
    window.removeCombination = (categoryId, index) => this.removeCombination(categoryId, index)
    window.quotationController = this
    
    // Add test functions for debugging
    window.testTablePopulation = () => this.populateAllTables()
    window.testGetTalentLines = () => {
      console.log('Testing getAllTalentLines...')
      return this.getAllTalentLines()
    }
    
    this.loadBaseRates()
  }

  disconnect() {
    console.log('Quotation form controller disconnecting - cleaning up event listeners')
    // Only remove if this instance owns the global listener
    if (window.quotationDocumentClickHandler === this.boundDocumentClickHandler) {
      document.removeEventListener('click', this.boundDocumentClickHandler)
      window.quotationDocumentListenerAttached = false
      window.quotationDocumentClickHandler = null
      console.log('Global document click listener removed')
    }
  }

  setupMainRowEventListeners() {
    // Add event listeners to the main input rows (not additional lines)
    document.querySelectorAll('.talent-input-row').forEach(row => {
      const categoryId = this.getCategoryIdFromRow(row)
      if (categoryId) {
        // Add input event listeners
        row.querySelectorAll('input[type="number"]').forEach(input => {
          input.addEventListener('input', () => {
            console.log('Input changed, calculating total for category:', categoryId)
            this.calculateCategoryTotal(categoryId)
          })
        })
        
        // Rate adjustment now handled by built-in number input arrows
        
        // Night button handling is now done via event delegation in setupTalentButtons()
      }
    })
  }

  getCategoryIdFromRow(row) {
    // Try to find category ID from various data attributes or input names
    const inputWithName = row.querySelector('input[name*="talent["]')
    if (inputWithName) {
      const match = inputWithName.name.match(/talent\[(\d+)\]/)
      return match ? match[1] : null
    }
    return null
  }

  loadBaseRates() {
    // Load base rates directly from the form input values (which are set from Rails Settings)
    document.querySelectorAll('[data-adjusted-rate-input]').forEach(input => {
      const categoryId = input.dataset.adjustedRateInput
      const baseRate = Math.round(parseFloat(input.value)) || 0
      if (baseRate > 0) {
        this.baseRates[categoryId] = baseRate
      }
    })
    
    // Fallback to default 5000 if no base rate is found
    Object.keys(this.baseRates).forEach(categoryId => {
      if (!this.baseRates[categoryId] || this.baseRates[categoryId] === 0) {
        this.baseRates[categoryId] = 5000
      }
    })
  }

  initializeNightButtonStates() {
    // Direct event listeners for each night button
    document.querySelectorAll('.night-btn').forEach(btn => {
      const hasActiveClasses = btn.classList.contains('bg-yellow-100') && 
                              btn.classList.contains('border-yellow-400') && 
                              btn.classList.contains('text-yellow-800')
      
      // Set data-active based on visual state
      btn.dataset.active = hasActiveClasses ? 'true' : 'false'
      
      // Add direct click listener to this button
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.toggleNightButton(btn)
      })
      
      // Update hidden field to match
      let hiddenField = btn.parentElement.querySelector('[name*="night_premium"]')
      if (!hiddenField) {
        hiddenField = btn.parentElement.querySelector('.night-premium')
      }
      if (!hiddenField) {
        hiddenField = btn.closest('.talent-input-row').querySelector('[name*="night_premium"]')
      }
      
      if (hiddenField) {
        hiddenField.value = btn.dataset.active
      } else {
      }
    })
  }

  toggleNightButton(btn) {
    console.log('Night button clicked directly!')
    const categoryId = btn.dataset.category
    const isActive = btn.dataset.active === 'true'
    console.log(`Night button - CategoryId: ${categoryId}, IsActive: ${isActive}`)
    
    // Toggle the button state
    btn.dataset.active = isActive ? 'false' : 'true'
    console.log(`After toggle - btn.dataset.active: ${btn.dataset.active}`)
    
    // Update visual state
    if (btn.dataset.active === 'true') {
      btn.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
      btn.classList.remove('border-gray-300', 'hover:bg-yellow-50')
      console.log('Night button activated - CSS classes applied:', btn.className)
    } else {
      btn.classList.remove('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
      btn.classList.add('border-gray-300', 'hover:bg-yellow-50')
      console.log('Night button deactivated - CSS classes applied:', btn.className)
    }
    
    // Update the hidden field
    let hiddenField = btn.parentElement.querySelector('[name*="night_premium"]')
    if (!hiddenField) {
      hiddenField = btn.parentElement.querySelector('.night-premium')
    }
    if (!hiddenField) {
      hiddenField = btn.closest('.talent-input-row').querySelector('[name*="night_premium"]')
    }
    
    if (hiddenField) {
      hiddenField.value = btn.dataset.active
      console.log(`Night button updated: ${btn.dataset.active}, hidden field value: ${hiddenField.value}`)
    } else {
      console.error('Could not find night premium hidden field for button:', btn)
    }
    
    // Force recalculation
    if (categoryId) {
      console.log('Triggering calculation after night button toggle for category:', categoryId)
      this.calculateCategoryTotal(categoryId)
    }
  }

  setupTalentButtons() {
    console.log('setupTalentButtons() called')
    // Initialize night button states to ensure visual and data sync
    this.initializeNightButtonStates()
    
    document.querySelectorAll('.talent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryId = e.target.closest('.talent-btn').dataset.category
        const categorySection = document.getElementById(`talent-category-${categoryId}`)
        const clickedBtn = e.target.closest('.talent-btn')
        
        if (categorySection) {
          // Check if already active (tab-like toggle behavior)
          const isActive = clickedBtn.classList.contains('bg-blue-500')
          
          if (isActive) {
            // Deactivate tab - hide section and reset button
            categorySection.classList.add('hidden')
            clickedBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500')
            clickedBtn.classList.add('border-gray-300', 'hover:bg-blue-50')
            
            // Clear combinations when deactivating but preserve main form inputs
            const combinationsList = categorySection.querySelector('.combinations-list')
            if (combinationsList) {
              combinationsList.innerHTML = ''
            }
            
            // Reset main rate input to base rate (don't leave it at 0)
            const mainRateInput = categorySection.querySelector('[data-adjusted-rate-input]')
            if (mainRateInput && mainRateInput.value === '0') {
              const baseRate = this.baseRates[categoryId] || 5000
              mainRateInput.value = baseRate
            }
            this.calculateCategoryTotal(categoryId)
          } else {
            // First, deactivate all other tabs (but preserve their data)
            document.querySelectorAll('.talent-btn').forEach(otherBtn => {
              const otherCategoryId = otherBtn.dataset.category
              const otherCategorySection = document.getElementById(`talent-category-${otherCategoryId}`)
              
              if (otherCategoryId !== categoryId) {
                // Hide other category sections (but keep their data)
                if (otherCategorySection) {
                  otherCategorySection.classList.add('hidden')
                }
                
                // Reset other button appearances
                otherBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500')
                otherBtn.classList.add('border-gray-300', 'hover:bg-blue-50')
              }
            })
            
            // Activate clicked tab - show section and update button
            categorySection.classList.remove('hidden')
            
            // Update button appearance to active tab style
            clickedBtn.classList.add('bg-blue-500', 'text-white', 'border-blue-500')
            clickedBtn.classList.remove('border-gray-300', 'hover:bg-blue-50')
            
            // Ensure rate input has base rate if it's 0 or empty
            const mainRateInput = categorySection.querySelector('[data-adjusted-rate-input]')
            if (mainRateInput && (!mainRateInput.value || mainRateInput.value === '0')) {
              const baseRate = this.baseRates[categoryId] || 5000
              mainRateInput.value = baseRate
            }
            
            // Setup event listeners for this category's input rows
            this.setupCategoryEventListeners(categoryId)
            
            // Add first combination if none exist
            const combinationsList = categorySection.querySelector('.combinations-list')
            if (combinationsList && combinationsList.children.length === 0) {
              this.addCombination(categoryId)
            }
            
            // Setup standby and overtime input listeners for this category
            this.setupStandbyOvertimeListeners(categoryId)
          }
        }
      })
    })
    
    // Setup add combination buttons using event delegation
    // Use global flag to ensure only one listener is ever attached
    if (!window.quotationDocumentListenerAttached) {
      console.log('Attaching global document click listener')
      document.addEventListener('click', this.boundDocumentClickHandler)
      window.quotationDocumentListenerAttached = true
      window.quotationDocumentClickHandler = this.boundDocumentClickHandler
    } else {
      console.log('Global document click listener already attached, replacing handler')
      // Remove old handler and attach new one
      document.removeEventListener('click', window.quotationDocumentClickHandler)
      document.addEventListener('click', this.boundDocumentClickHandler)
      window.quotationDocumentClickHandler = this.boundDocumentClickHandler
    }
  }

  handleDocumentClick(e) {
    // Allow commercial count inputs to function normally
    if (e.target.classList.contains('commercial-count-input')) {
      return
    }

    // Handle add combination buttons
    if (e.target.closest('.add-combination-btn')) {
      const btn = e.target.closest('.add-combination-btn')
      const categoryId = btn.dataset.category
      this.addCombination(categoryId)
      return
    }

    // Handle remove category buttons
    if (e.target.closest('[data-remove-category]')) {
      const btn = e.target.closest('[data-remove-category]')
      const categoryId = btn.dataset.category
      console.log('Remove category button clicked for category:', categoryId)
      this.removeTalentCategory(categoryId)
      return
    }

    // Handle + Line button functionality
    if (e.target.closest('.add-line-btn')) {
      console.log('Add line button clicked!')
      const btn = e.target.closest('.add-line-btn')
      const categoryId = btn.dataset.category
      console.log(`Button categoryId: ${categoryId}`)
      this.addTalentLine(categoryId)
      return
    }

    // Handle Remove Line button functionality
    if (e.target.closest('.remove-line-btn')) {
      const btn = e.target.closest('.remove-line-btn')
      const lineRow = btn.closest('.talent-input-row')
      const categoryId = btn.dataset.category
      if (lineRow) {
        lineRow.remove()
        if (categoryId) {
          this.calculateCategoryTotal(categoryId)
        }
      }
      return
    }

    // Night buttons now handled by direct event listeners in initializeNightButtonStates()
    // No delegation needed to avoid conflicts
  }

  addTalentLine(categoryId) {
    console.log(`addTalentLine called for category: ${categoryId}`)

    // Debounce: prevent rapid clicks with category-specific tracking
    const debounceKey = `addingLine_${categoryId}`
    if (this.addingLine || this[debounceKey]) {
      console.log('⚠️ Already adding line, ignoring click')
      return
    }
    this.addingLine = true
    this[debounceKey] = true

    const additionalLinesContainer = document.querySelector(`[data-category="${categoryId}"].additional-lines`)
    if (!additionalLinesContainer) {
      console.error(`Could not find additional lines container for category ${categoryId}`)
      this.addingLine = false
      const debounceKey = `addingLine_${categoryId}`
      this[debounceKey] = false
      return
    }
    
    const lineIndex = additionalLinesContainer.children.length
    const lineHtml = `
      <tr class="talent-input-row" data-line-index="${lineIndex}">
        <!-- Description -->
        <td class="p-1">
          <input type="text" name="talent[${categoryId}][lines][${lineIndex}][description]" value=""
                 placeholder="Description"
                 class="talent-description w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-left bg-gray-50"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </td>
        
        <!-- Talent Count -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][talent_count]" min="0" max="99" value="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center talent-count"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </td>
        
        <!-- Rate Adjustment -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][adjusted_rate]" value="${this.baseRates[categoryId] || 5000}"
                 step="100" min="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center rate-adjustment"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </td>
        
        <!-- Days Count -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][days_count]" min="1" value="1"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center days-input"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </td>
        
        <!-- Rehearsal Days -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][rehearsal_days]" min="0" value="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center rehearsal-days"
                 data-category="${categoryId}" data-line="${lineIndex}" title="50% of day rate">
        </td>
        
        <!-- Down Days -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][down_days]" min="0" value="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center down-days"
                 data-category="${categoryId}" data-line="${lineIndex}" title="50% of day rate">
        </td>
        
        <!-- Travel Days -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][travel_days]" min="0" value="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center travel-days"
                 data-category="${categoryId}" data-line="${lineIndex}" title="50% of day rate">
        </td>
        
        <!-- Overtime Hours -->
        <td class="p-1">
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][overtime_hours]" min="0" step="0.5" value="0"
                 class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-center overtime-hours"
                 data-category="${categoryId}" data-line="${lineIndex}" title="10% of day rate per hour">
        </td>
        
        <!-- Night Button -->
        <td class="p-1 text-center">
          <button type="button" class="night-btn w-full px-2 py-1 text-xs border-2 border-gray-300 rounded hover:bg-yellow-50 hover:border-yellow-300 transition-colors font-medium"
                  data-active="false" data-category="${categoryId}" data-line="${lineIndex}" title="Night shoot calculation">
            + Night Fee
          </button>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][night_count]" min="1" value="1"
                 class="nights-input w-full px-1 py-1 text-xs border border-gray-300 rounded text-center hidden"
                 data-category="${categoryId}" data-line="${lineIndex}" placeholder="Nights">
          <input type="hidden" name="talent[${categoryId}][lines][${lineIndex}][night_premium]" value="false"
                 class="night-premium" data-category="${categoryId}" data-line="${lineIndex}">
        </td>
        
        <!-- Remove Line Button -->
        <td class="p-1 text-center">
          <button type="button" class="remove-line-btn w-full px-2 py-1 text-xs text-red-600 rounded font-medium"
                  data-category="${categoryId}" data-line="${lineIndex}">
            - Remove
          </button>
        </td>
      </tr>
    `
    
    additionalLinesContainer.insertAdjacentHTML('beforeend', lineHtml)
    this.setupLineEventListeners(categoryId, lineIndex)
    
    // Also setup category-wide listeners to ensure new line is included
    this.setupCategoryEventListeners(categoryId)
    
    // Add direct event listener to the new night button
    const newNightBtn = additionalLinesContainer.querySelector(`[data-line-index="${lineIndex}"] .night-btn`)
    if (newNightBtn) {
      newNightBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.toggleNightButton(newNightBtn)
      })
    }

    this.calculateCategoryTotal(categoryId)

    // Reset debounce flags after a short delay
    setTimeout(() => {
      this.addingLine = false
      const debounceKey = `addingLine_${categoryId}`
      this[debounceKey] = false
    }, 500)
  }

  setupCategoryEventListeners(categoryId) {
    const categorySection = document.getElementById(`talent-category-${categoryId}`)
    if (!categorySection) return
    
    // Set up event listeners for all input rows in this category
    const inputRows = categorySection.querySelectorAll('.additional-lines .talent-input-row')
    inputRows.forEach(row => {
      // Add event listeners to all number inputs in this row
      row.querySelectorAll('input[type="number"]').forEach(input => {
        // Remove any existing listener to avoid duplicates
        input.removeEventListener('input', input._categoryListener)
        
        // Create new listener function
        input._categoryListener = () => {
          this.calculateCategoryTotal(categoryId)
        }
        
        // Add the listener
        input.addEventListener('input', input._categoryListener)
      })
    })
  }

  setupLineEventListeners(categoryId, lineIndex) {
    const lineRow = document.querySelector(`[data-line-index="${lineIndex}"]`)
    if (!lineRow) return
    
    // Add event listeners to all inputs in this line
    lineRow.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        this.calculateCategoryTotal(categoryId)
      })
    })
    
    // Rate adjustment now handled by built-in number input arrows
    
    // Night button handling is done via event delegation in setupTalentButtons()
    // No need for direct listeners here to avoid conflicts
  }

  addCombination(categoryId) {
    const combinationsList = document.querySelector(`#talent-category-${categoryId} .combinations-list`)
    if (!combinationsList) {
      console.error(`Could not find combinations list for category ${categoryId}`)
      return
    }
    const index = combinationsList.children.length
    const baseRate = this.baseRates[categoryId] || 5000
    
    const combinationHtml = `
      <div class="combination-row mb-3 p-3 bg-white rounded-lg border flex items-center gap-3" data-combination-index="${index}">
        <!-- Number of Talent -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-600 whitespace-nowrap">Talent:</label>
          <input type="number" name="talent[${categoryId}][combinations][${index}][count]" min="1" max="1000" value="1"
                 class="w-16 border rounded px-2 py-1 text-sm text-center talent-count" data-category="${categoryId}" data-index="${index}">
        </div>
        
        <span class="text-gray-400">×</span>
        
        <!-- Days -->
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-600 whitespace-nowrap">Days:</label>
          <input type="number" name="talent[${categoryId}][combinations][${index}][days]" min="1" value="1"
                 class="w-16 border rounded px-2 py-1 text-sm text-center shoot-days" data-category="${categoryId}" data-index="${index}">
        </div>
        
        <span class="text-gray-400">@</span>
        
        <!-- Rate with +/- Controls -->
        <div class="flex items-center gap-1">
          <label class="text-sm font-medium text-gray-600 whitespace-nowrap">R</label>
          <button type="button" class="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs rate-decrease" data-category="${categoryId}" data-index="${index}">-</button>
          <input type="number" name="talent[${categoryId}][combinations][${index}][rate]" value="${baseRate}" step="100" min="0" 
                 class="w-20 text-center border rounded px-1 py-1 text-xs rate-input" data-category="${categoryId}" data-index="${index}">
          <button type="button" class="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs rate-increase" data-category="${categoryId}" data-index="${index}">+</button>
        </div>
        
        <span class="text-gray-400">=</span>
        
        <!-- Combination Total -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-blue-600 combination-total" data-category="${categoryId}" data-index="${index}">
            R${this.formatNumber(baseRate)}
          </span>
        </div>
        
        <!-- Remove Button -->
        <button type="button" class="ml-auto text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50" onclick="removeCombination(${categoryId}, ${index})">
          ✕
        </button>
      </div>
    `
    
    combinationsList.insertAdjacentHTML('beforeend', combinationHtml)
    this.setupCombinationEventListeners(categoryId, index)
    this.calculateCategoryTotal(categoryId)
  }

  setupCombinationEventListeners(categoryId, index) {
    const combination = document.querySelector(`[data-combination-index="${index}"]`)
    
    if (!combination) {
      console.error(`Could not find combination with index ${index}`)
      return
    }
    
    // Rate increase/decrease buttons
    combination.querySelector('.rate-decrease').addEventListener('click', () => {
      const input = combination.querySelector('.rate-input')
      const currentValue = parseInt(input.value) || 0
      input.value = Math.max(0, currentValue - 100)
      this.calculateCombinationTotal(categoryId, index)
    })
    
    combination.querySelector('.rate-increase').addEventListener('click', () => {
      const input = combination.querySelector('.rate-input')
      const currentValue = parseInt(input.value) || 0
      input.value = currentValue + 100
      this.calculateCombinationTotal(categoryId, index)
    })
    
    // Input change listeners
    combination.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        this.calculateCombinationTotal(categoryId, index)
      })
    })
  }

  setupStandbyOvertimeListeners(categoryId) {
    const section = document.getElementById(`talent-category-${categoryId}`)
    if (!section) return
    
    // Setup standby inputs
    section.querySelectorAll('[data-standby-input]').forEach(input => {
      input.addEventListener('input', () => {
        this.calculateCategoryTotal(categoryId)
      })
    })
    
    // Setup overtime input
    const overtimeInput = section.querySelector('[data-overtime-input]')
    if (overtimeInput) {
      overtimeInput.addEventListener('input', () => {
        this.calculateCategoryTotal(categoryId)
      })
    }
  }

  calculateCombinationTotal(categoryId, index) {
    const combination = document.querySelector(`[data-combination-index="${index}"]`)
    const rate = Math.round(parseFloat(combination.querySelector('.rate-input').value)) || 0
    const count = parseInt(combination.querySelector('.talent-count').value) || 0
    const days = parseInt(combination.querySelector('.shoot-days').value) || 0
    
    const total = rate * count * days
    combination.querySelector('.combination-total').textContent = `R${this.formatNumber(total)}`
    
    this.calculateCategoryTotal(categoryId)
  }

  calculateCategoryTotal(categoryId) {
    const section = document.getElementById(`talent-category-${categoryId}`)
    if (!section) {
      return
    }
    
    const baseRate = this.baseRates[categoryId] || 5000
    let categoryTotal = 0
    
    // Calculate ALL lines (first row + additional lines)
    const allLines = section.querySelectorAll('.additional-lines .talent-input-row')
    allLines.forEach((line) => {
      const lineTotal = this.calculateLineTotal(line, baseRate)
      categoryTotal += lineTotal
    })
    
    // Update display
    const totalDisplay = section.querySelector(`#category-total-${categoryId}`)
    if (totalDisplay) {
      totalDisplay.textContent = `R${this.formatNumber(categoryTotal)}`
    }
    
    // Update category totals display
    this.updateCategoryTotalsDisplay()
    
    // Trigger global quote preview update
    if (typeof updateQuotePreview === 'function') {
      updateQuotePreview()
    }
  }

  calculateLineTotal(lineRow, baseRate) {
    // Get values from the row
    const talentCount = parseInt(lineRow.querySelector('[name*="talent_count"], .talent-count')?.value) || 0
    
    // If no talent, return 0 immediately (no point calculating anything)
    if (talentCount === 0) {
      return 0
    }
    
    const adjustedRate = Math.round(parseFloat(lineRow.querySelector('[name*="adjusted_rate"], .rate-adjustment')?.value)) || baseRate
    const shootDays = parseInt(lineRow.querySelector('[name*="days_count"], [name*="shoot_days"], .shoot-days')?.value) || 0
    const rehearsalDays = parseInt(lineRow.querySelector('[name*="rehearsal_days"], .rehearsal-days')?.value) || 0
    const downDays = parseInt(lineRow.querySelector('[name*="down_days"], .down-days')?.value) || 0
    const travelDays = parseInt(lineRow.querySelector('[name*="travel_days"], .travel-days')?.value) || 0
    const overtimeHours = parseFloat(lineRow.querySelector('[name*="overtime_hours"], .overtime-hours')?.value) || 0
    
    // Check if night is active (check both data attribute and visual state as fallback)
    const nightBtn = lineRow.querySelector('.night-btn')
    const dataActive = nightBtn?.dataset.active === 'true'
    const visuallyActive = nightBtn && nightBtn.classList.contains('bg-yellow-100') && 
                          nightBtn.classList.contains('border-yellow-400') && 
                          nightBtn.classList.contains('text-yellow-800')
    const isNightActive = dataActive || visuallyActive
    
    let lineTotal = 0
    
    // Base shoot days cost
    lineTotal += talentCount * adjustedRate * shootDays
    
    // Rehearsal at 50% rate
    lineTotal += talentCount * adjustedRate * 0.5 * rehearsalDays
    
    // Down days at 50% rate  
    lineTotal += talentCount * adjustedRate * 0.5 * downDays
    
    // Travel days at 50% rate
    lineTotal += talentCount * adjustedRate * 0.5 * travelDays
    
    // Overtime at 10% rate per hour multiplied by shoot days
    lineTotal += talentCount * adjustedRate * 0.1 * overtimeHours * shootDays
    
    // Night calculation: 1 × rate × talent × 0.5 (applies to first shoot day only)
    if (isNightActive) {
      const nightCost = 1 * adjustedRate * talentCount * 0.5
      lineTotal += nightCost
    }
    
    
    return lineTotal
  }

  removeCombination(categoryId, index) {
    const combination = document.querySelector(`[data-combination-index="${index}"]`)
    if (combination) {
      combination.remove()
      this.calculateCategoryTotal(categoryId)
    }
  }

  setupMediaTypeLogic() {
    // Set up media type logic for combination-based media types
    this.setupCombinationMediaLogic()
  }

  setupCombinationMediaLogic() {
    // Use event delegation for dynamically created combinations
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('combination-media')) {
        const comboId = e.target.getAttribute('data-combo')
        this.handleMediaTypeChange(e.target, comboId)
      }
    })
  }

  handleMediaTypeChange(checkbox, comboId) {
    const allMediaCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="all_media"]`)
    const allMovingCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="all_moving"]`)
    const allPrintCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="print"]`)
    const tvCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="tv"]`)
    const internetCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="internet"]`)
    const cinemaCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="cinema"]`)

    // If "All Media" is selected, disable all others and auto-check them
    if (checkbox.value === 'all_media' && checkbox.checked) {
      document.querySelectorAll(`input[name="combinations[${comboId}][media_types][]"]:not([value="all_media"])`).forEach(otherCheckbox => {
        otherCheckbox.checked = true
        otherCheckbox.disabled = true
        otherCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      })
    }
    // If "All Media" is unchecked, enable all others and uncheck everything
    else if (checkbox.value === 'all_media' && !checkbox.checked) {
      document.querySelectorAll(`input[name="combinations[${comboId}][media_types][]"]:not([value="all_media"])`).forEach(otherCheckbox => {
        otherCheckbox.checked = false
        otherCheckbox.disabled = false
        otherCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      })
    }
    // If "All Moving Media" is selected
    else if (checkbox.value === 'all_moving' && checkbox.checked) {
      // Auto-check TV, Internet, Cinema
      if (tvCheckbox) tvCheckbox.checked = true
      if (internetCheckbox) internetCheckbox.checked = true  
      if (cinemaCheckbox) cinemaCheckbox.checked = true
      
      // Disable All Print Media and All Media
      if (allPrintCheckbox) {
        allPrintCheckbox.disabled = true
        allPrintCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = true
        allMediaCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
    }
    // If "All Moving Media" is unchecked
    else if (checkbox.value === 'all_moving' && !checkbox.checked) {
      // Uncheck TV, Internet, Cinema
      if (tvCheckbox) tvCheckbox.checked = false
      if (internetCheckbox) internetCheckbox.checked = false
      if (cinemaCheckbox) cinemaCheckbox.checked = false
      
      // Re-enable All Print Media and All Media
      if (allPrintCheckbox) {
        allPrintCheckbox.disabled = false
        allPrintCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = false
        allMediaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
    }
    // If "All Print Media" is selected
    else if (checkbox.value === 'print' && checkbox.checked) {
      // Auto-check Internet
      if (internetCheckbox) internetCheckbox.checked = true
      
      // Uncheck and disable TV
      if (tvCheckbox) {
        tvCheckbox.checked = false
        tvCheckbox.disabled = true
        tvCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
      
      // Disable All Moving Media, individual moving options, and All Media
      if (allMovingCheckbox) {
        allMovingCheckbox.disabled = true
        allMovingCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
      if (cinemaCheckbox) {
        cinemaCheckbox.disabled = true
        cinemaCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = true
        allMediaCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      }
    }
    // If "All Print Media" is unchecked
    else if (checkbox.value === 'print' && !checkbox.checked) {
      // Uncheck Internet
      if (internetCheckbox) internetCheckbox.checked = false
      
      // Re-enable All Moving Media, individual moving options, and All Media
      if (allMovingCheckbox) {
        allMovingCheckbox.disabled = false
        allMovingCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
      if (tvCheckbox) {
        tvCheckbox.disabled = false
        tvCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
      if (cinemaCheckbox) {
        cinemaCheckbox.disabled = false
        cinemaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = false
        allMediaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
      }
    }
    // Handle TV, Internet, Cinema individual selections
    else if (['tv', 'internet', 'cinema'].includes(checkbox.value)) {
      const tvChecked = tvCheckbox && tvCheckbox.checked
      const internetChecked = internetCheckbox && internetCheckbox.checked
      const cinemaChecked = cinemaCheckbox && cinemaCheckbox.checked
      
      // Special case: If "All Print Media" was checked but user unchecks Internet
      if (checkbox.value === 'internet' && allPrintCheckbox && allPrintCheckbox.checked && !internetChecked) {
        allPrintCheckbox.checked = false
        // Re-enable All Moving Media, individual moving options, and All Media
        if (allMovingCheckbox) {
          allMovingCheckbox.disabled = false
          allMovingCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
        if (tvCheckbox) {
          tvCheckbox.disabled = false
          tvCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
        if (cinemaCheckbox) {
          cinemaCheckbox.disabled = false
          cinemaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
        if (allMediaCheckbox) {
          allMediaCheckbox.disabled = false
          allMediaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
      }
      // If user manually selects all three, auto-check "All Moving Media"
      else if (tvChecked && internetChecked && cinemaChecked && allMovingCheckbox && !allMovingCheckbox.checked) {
        allMovingCheckbox.checked = true
        // Disable All Print Media and All Media
        if (allPrintCheckbox) {
          allPrintCheckbox.disabled = true
          allPrintCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
        }
        if (allMediaCheckbox) {
          allMediaCheckbox.disabled = true
          allMediaCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
        }
      } 
      // If "All Moving Media" was checked but user unchecks one of TV/Internet/Cinema
      else if (allMovingCheckbox && allMovingCheckbox.checked && !(tvChecked && internetChecked && cinemaChecked)) {
        allMovingCheckbox.checked = false
        // Re-enable All Print Media and All Media
        if (allPrintCheckbox) {
          allPrintCheckbox.disabled = false
          allPrintCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
        if (allMediaCheckbox) {
          allMediaCheckbox.disabled = false
          allMediaCheckbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
        }
      }
    }
    // If any other checkbox is selected, uncheck "All Media"
    else if (checkbox.value !== 'all_media' && checkbox.checked && allMediaCheckbox) {
      allMediaCheckbox.checked = false
    }
    
    // Recalculate all combinations to update media multipliers
    this.recalculateAllCombinations()
  }

  calculateMediaMultiplier() {
    const selected = document.querySelectorAll('input[name="media_types[]"]:checked')
    const allMediaSelected = document.querySelector('input[value="all_media"]:checked')
    const allMovingSelected = document.querySelector('input[value="all_moving"]:checked')
    const allPrintSelected = document.querySelector('input[value="print"]:checked')
    let multiplier = 1.0
    
    if (allMediaSelected) {
      multiplier = 1.0 // All Media = 100%
    } else if (allMovingSelected && allPrintSelected) {
      // All Moving + All Print should auto-select All Media, but just in case
      multiplier = 1.0 // = 100%
    } else if (allMovingSelected) {
      multiplier = 0.75 // All Moving Media = 75%
    } else if (allPrintSelected) {
      multiplier = 0.75 // All Print Media = 75%
    } else if (selected.length === 1) {
      multiplier = 0.5 // One individual media = 50%
    } else if (selected.length >= 3) {
      multiplier = 1.0 // Three or more individual media = 100%
    } else if (selected.length === 2) {
      multiplier = 0.75 // Two individual media = 75%
    } else {
      multiplier = 1.0 // No selection defaults to 100%
    }
    
    // Update display
    const multiplierDisplay = document.getElementById('media-multiplier')
    if (multiplierDisplay) {
      multiplierDisplay.textContent = `${Math.round(multiplier * 100)}%`
    }
    
    return multiplier
  }


  setupManualAdjustments() {
    const addAdjustmentBtn = document.querySelector('.add-adjustment')
    if (addAdjustmentBtn) {
      addAdjustmentBtn.addEventListener('click', () => {
        this.addAdjustmentRow()
      })
    }
  }

  setupProductTypeListeners() {
    // Add event listeners to product type radio buttons
    const productTypeRadios = document.querySelectorAll('input[name="quotation[product_type]"]')
    console.log(`🔍 Found ${productTypeRadios.length} product type radio buttons`)
    productTypeRadios.forEach(radio => {
      const handleProductTypeChange = () => {
        console.log(`🔄 Product Type selected: ${radio.value} - recalculating Kids totals...`)
        
        // Update category totals when product type changes (affects kids reduction)
        this.updateCategoryTotalsDisplay()
        
        // Trigger Kids talent recalculation specifically
        this.recalculateKidsTalentTotals()
        
        // Recalculate all combination totals to apply new product factors
        this.recalculateAllCombinations()
        
        // IMPORTANT: Also update quote preview tables with new kids discount
        this.populateAllTables()
      }
      
      // Listen for both click and change events to ensure immediate response
      radio.addEventListener('click', handleProductTypeChange)
      radio.addEventListener('change', handleProductTypeChange)
    })
  }

  recalculateKidsTalentTotals() {
    // Trigger buyout table recalculation (same as when talent input changes)
    console.log(`🧒 Triggering buyout table recalculation for Product Type change`)
    
    try {
      this.populateAllTables()
    } catch (error) {
      console.error('Error in populateAllTables():', error)
    }
  }

  recalculateAllCombinations() {
    // Find all combination elements and recalculate their totals
    const combinations = document.querySelectorAll('[data-combination-index]')
    console.log(`🔄 Found ${combinations.length} combinations to recalculate`)
    
    combinations.forEach(combination => {
      const index = combination.getAttribute('data-combination-index')
      const categoryId = combination.closest('[data-category]')?.getAttribute('data-category')
      
      if (categoryId && index !== null) {
        console.log(`🔄 Recalculating combination: Category ${categoryId}, Index ${index}`)
        this.calculateCombinationTotal(parseInt(categoryId), parseInt(index))
        
        // Special logging for Kids category
        if (categoryId === '5') {
          console.log(`🧒 Kids combination found and recalculated: Category ${categoryId}, Index ${index}`)
        }
      } else {
        console.log(`⚠️ Could not find categoryId or index for combination`, combination)
      }
    })
  }

  setupDurationLogic() {
    // Add event listeners for duration changes
    const durationSelect = document.querySelector('select[name*="duration"]')
    if (durationSelect) {
      durationSelect.addEventListener('change', () => {
        this.checkTerritoryOverrides()
      })
      
      // Check on page load
      this.checkTerritoryOverrides()
    }
    
    // Add event listeners to territory checkboxes to update tags and check overrides
    document.querySelectorAll('.territory-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateTerritoryTags()
        this.checkTerritoryOverrides()
      })
    })
    
    // Also listen to combination territory checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('combination-territory-checkbox')) {
        this.checkTerritoryOverrides()
      }
    })
  }

  checkTerritoryOverrides() {
    // Get current duration
    const durationSelect = document.querySelector('select[name*="duration"]')
    if (!durationSelect) return
    
    const duration = durationSelect.value
    const durationMonths = this.parseDurationMonths(duration)
    
    // Only apply logic to 12, 24, 36 month durations
    const thresholds = {
      12: 1200,  // 12 months: ≥1200%
      24: 2400,  // 24 months: ≥2400% 
      36: 3600   // 36 months: ≥3600%
    }
    
    const threshold = thresholds[durationMonths]
    if (!threshold) {
      // For durations not in the list (3, 6, 18 months), clear any override notices
      this.clearOverrideNotices()
      return
    }
    
    // Check each combination
    document.querySelectorAll('[data-combo]').forEach(comboElement => {
      const comboId = comboElement.getAttribute('data-combo')
      if (!comboId) return
      
      this.checkComboTerritoryOverride(comboId, threshold, durationMonths)
    })
  }

  checkComboTerritoryOverride(comboId, threshold, durationMonths) {
    // Calculate total percentage for this combo
    const selectedTerritories = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`)
    let totalPercentage = 0
    
    selectedTerritories.forEach(checkbox => {
      const percentage = parseFloat(checkbox.dataset.percentage) || 0
      totalPercentage += percentage
    })
    
    if (totalPercentage >= threshold) {
      // Show override notice
      this.showTerritoryOverrideNotice(comboId, totalPercentage, threshold, durationMonths)
      
      // Force All Media selection for this combo
      this.forceAllMediaForCombo(comboId)
      
    } else {
      // Remove override notice if it exists
      this.hideTerritoryOverrideNotice(comboId)
    }
  }

  showTerritoryOverrideNotice(comboId, actualPercentage, threshold, durationMonths) {
    let noticeContainer = document.getElementById(`territory-override-notice-${comboId}`)
    
    // Create notice container if it doesn't exist
    if (!noticeContainer) {
      noticeContainer = document.createElement('div')
      noticeContainer.id = `territory-override-notice-${comboId}`
      noticeContainer.className = 'bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-4 rounded'
      
      // Find where to insert the notice (after territory selection section)
      const comboContent = document.querySelector(`[data-combo="${comboId}"].combination-content`)
      if (comboContent) {
        const territorySection = comboContent.querySelector('.territories-list')?.parentElement?.parentElement
        if (territorySection) {
          territorySection.appendChild(noticeContainer)
        }
      }
    }
    
    noticeContainer.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-orange-800">Territory Override Active</h3>
          <p class="text-sm text-orange-700 mt-1">
            Selected territories total ${actualPercentage}% which exceeds the ${threshold}% threshold for ${durationMonths} month duration. 
            <strong>Worldwide (1200%) + All Media rates will be applied instead.</strong>
          </p>
        </div>
      </div>
    `
  }

  hideTerritoryOverrideNotice(comboId) {
    const noticeContainer = document.getElementById(`territory-override-notice-${comboId}`)
    if (noticeContainer) {
      noticeContainer.remove()
    }
  }

  clearOverrideNotices() {
    document.querySelectorAll('[id^="territory-override-notice-"]').forEach(notice => {
      notice.remove()
    })
  }

  forceAllMediaForCombo(comboId) {
    const allMediaCheckbox = document.querySelector(`input[name="combinations[${comboId}][media_types][]"][value="all_media"]`)
    if (allMediaCheckbox && !allMediaCheckbox.checked) {
      allMediaCheckbox.checked = true
      // Trigger the media logic to disable other options
      allMediaCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  getWorldwideTerritory() {
    // Find the Worldwide territory checkbox by looking for the territory with name "Worldwide"
    const territories = document.querySelectorAll('.territory-checkbox')
    return Array.from(territories).find(checkbox => {
      const label = checkbox.closest('label')
      const nameElement = label?.querySelector('.font-medium')
      return nameElement?.textContent.trim() === 'Worldwide'
    })
  }

  getWorldwideTerritoryForCombo(comboId) {
    // Find the Worldwide territory checkbox for a specific combination
    const territories = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]`)
    return Array.from(territories).find(checkbox => {
      const label = checkbox.closest('label')
      const nameElement = label?.querySelector('.font-medium')
      return nameElement?.textContent.trim() === 'Worldwide'
    })
  }

  updateTerritoryTagsForCombo(comboId) {
    // Update territory tags for a specific combination
    const checkedTerritories = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`)
    const territoryNames = Array.from(checkedTerritories).map(checkbox => {
      return checkbox.getAttribute('data-territory-name')
    }).filter(name => name)

    const tagsContainer = document.querySelector(`.selected-territory-tags[data-combo="${comboId}"]`)
    if (tagsContainer) {
      if (territoryNames.length > 0) {
        tagsContainer.innerHTML = territoryNames.map(name => 
          `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${name}
            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeTerritory('${name}', ${comboId})">×</button>
          </span>`
        ).join('')
      } else {
        tagsContainer.innerHTML = ''
      }
    }
  }

  updateTerritoryTags() {
    const checkedTerritories = document.querySelectorAll('.territory-checkbox:checked')
    const territoryNames = Array.from(checkedTerritories).map(checkbox => {
      const label = checkbox.closest('label')
      const nameElement = label?.querySelector('.font-medium')
      return nameElement?.textContent.trim()
    }).filter(name => name)
    
    // Find or create territory tags container
    let tagsContainer = document.getElementById('territory-tags')
    if (!tagsContainer) {
      // Create tags container below Usage & Licensing title
      const usageSection = document.getElementById('licensing')
      const titleDiv = usageSection?.querySelector('.flex.items-center.justify-between')
      if (titleDiv) {
        tagsContainer = document.createElement('div')
        tagsContainer.id = 'territory-tags'
        tagsContainer.className = 'mb-4'
        titleDiv.parentNode.insertBefore(tagsContainer, titleDiv.nextSibling)
      }
    }
    
    if (tagsContainer) {
      if (territoryNames.length > 0) {
        tagsContainer.innerHTML = `
          <div class="flex flex-wrap gap-2 mt-2">
            <span class="text-xs text-gray-500">Selected territories:</span>
            ${territoryNames.map(name => 
              `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${name}</span>`
            ).join('')}
          </div>
        `
      } else {
        tagsContainer.innerHTML = ''
      }
    }
  }

  addAdjustmentRow() {
    const container = document.getElementById('adjustments-container')
    if (!container) return
    
    const index = container.children.length
    const adjustmentHtml = `
      <div class="adjustment-row flex gap-3 items-center mb-3 p-3 border rounded-lg">
        <input type="text" 
               name="quotation[quotation_adjustments_attributes][${index}][description]" 
               placeholder="Adjustment description" 
               class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        <input type="number" 
               name="quotation[quotation_adjustments_attributes][${index}][percentage]" 
               placeholder="%" 
               step="0.01" 
               class="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        <select name="quotation[quotation_adjustments_attributes][${index}][adjustment_type]" 
                class="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          <option value="discount">Discount</option>
          <option value="surcharge">Surcharge</option>
        </select>
        <button type="button" class="text-red-500 hover:text-red-700 text-sm" onclick="this.closest('.adjustment-row').remove()">
          Remove
        </button>
      </div>
    `
    
    container.insertAdjacentHTML('beforeend', adjustmentHtml)
  }

  removeTalentCategory(categoryId) {
    const categorySection = document.getElementById(`talent-category-${categoryId}`)
    const talentBtn = document.querySelector(`.talent-btn[data-category="${categoryId}"]`)
    
    if (categorySection) {
      categorySection.classList.add('hidden')
      
      // Clear all combinations
      const combinationsList = categorySection.querySelector('.combinations-list')
      if (combinationsList) {
        combinationsList.innerHTML = ''
      }
      
      // Clear all input values in this section
      categorySection.querySelectorAll('input').forEach(input => {
        input.value = input.type === 'number' ? '0' : ''
      })
    }
    
    if (talentBtn) {
      // Reset button to inactive tab state
      talentBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500')
      talentBtn.classList.add('border-gray-300', 'hover:bg-blue-50')
      talentBtn.style.opacity = '1'
      talentBtn.style.pointerEvents = 'auto'
    }
    
    // Recalculate totals
    this.calculateCategoryTotal(categoryId)

    // Update all combo tables to reflect the removed category
    this.populateAllTables()
  }

  // Utility method to format numbers with commas
  formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  updateCategoryTotalsDisplay() {
    const categoryTotalsList = document.getElementById('category-totals-list')
    const talentBaseTotal = document.getElementById('talent-base-total')
    const talentGrandTotal = document.getElementById('talent-grand-total')
    
    if (!categoryTotalsList || !talentGrandTotal) return
    
    let totalAmount = 0
    let baseTotalAmount = 0
    let extrasBaseAmount = 0
    let kidsBaseAmount = 0
    let categoryTotalsHtml = ''
    
    // Get all talent buttons to find available categories
    document.querySelectorAll('.talent-btn').forEach(btn => {
      const categoryId = btn.dataset.category
      const categoryName = btn.textContent.trim()
      const categorySection = document.getElementById(`talent-category-${categoryId}`)
      const categoryTotalDisplay = document.getElementById(`category-total-${categoryId}`)
      
      if (categorySection && categoryTotalDisplay) {
        const totalText = categoryTotalDisplay.textContent || 'R0'
        const totalValue = parseInt(totalText.replace(/[R,]/g, '')) || 0
        
        if (totalValue > 0) {
          // Get talent count for this category
          let talentCount = 0
          
          // Count talent from first row
          const firstRow = categorySection.querySelector('.talent-input-row')
          if (firstRow) {
            talentCount += parseInt(firstRow.querySelector('[name*="talent_count"], .talent-count')?.value) || 0
          }
          
          // Count talent from additional lines
          const additionalLines = categorySection.querySelectorAll('[data-line-index] .talent-count')
          additionalLines.forEach(input => {
            talentCount += parseInt(input.value) || 0
          })
          
          if (talentCount > 0) {
            // Get the actual adjusted rate from the form inputs
            let adjustedRate = this.baseRates[categoryId] || 5000
            
            // Check first row for adjusted rate
            const firstRow = categorySection.querySelector('.talent-input-row')
            if (firstRow) {
              const rateInput = firstRow.querySelector('[name*="adjusted_rate"], .rate-adjustment')
              if (rateInput && rateInput.value) {
                adjustedRate = Math.round(parseFloat(rateInput.value)) || adjustedRate
              }
            }
            
            // Calculate base total (just rate × talent, no days)
            const baseCategoryTotal = adjustedRate * talentCount
            baseTotalAmount += baseCategoryTotal
            
            // Track extras and kids base amounts separately
            if (categoryName.toLowerCase().trim().includes('extras')) {
              extrasBaseAmount += baseCategoryTotal
            }
            
            // Track kids base amount (category_type == 5)
            if (categoryId == '5') {
              kidsBaseAmount += baseCategoryTotal
            }
            
            categoryTotalsHtml += `
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-700">${talentCount} ${categoryName}</span>
                <span class="font-semibold text-gray-800">R${this.formatNumber(totalValue)}</span>
              </div>
            `
          }
          
          totalAmount += totalValue
        }
      }
    })
    
    if (categoryTotalsHtml === '') {
      categoryTotalsHtml = '<div class="text-gray-500 italic text-sm">No talent selected</div>'
    }
    
    // Get product type for kids reduction calculation
    const productTypeInput = document.querySelector('input[name="quotation[product_type]"]:checked')
    const productType = productTypeInput ? productTypeInput.value : null
    
    // Calculate kids reduction based on product type
    let kidsReduction = 0
    if (productType && kidsBaseAmount > 0) {
      switch (productType) {
        case 'adult':
          kidsReduction = kidsBaseAmount * 0.5  // 50% reduction
          break
        case 'family':
          kidsReduction = kidsBaseAmount * 0.25  // 25% reduction (keep 75%)
          break
        case 'kids':
          kidsReduction = 0  // No reduction (keep 100%)
          break
      }
    }
    
    // Calculate base total excluding extras and applying kids reduction
    const baseTotalAmountExcludingExtras = baseTotalAmount - extrasBaseAmount - kidsReduction
    
    // Add base total excluding extras if there is a base total
   
    
    // Store the value excluding extras for reuse
    this.baseTotalExcludingExtras = baseTotalAmountExcludingExtras
    
    categoryTotalsList.innerHTML = categoryTotalsHtml

    if (talentBaseTotal) {
      talentBaseTotal.textContent = `R${this.formatNumber(baseTotalAmount)}`
    }
    const talentBaseExcludingExtras = document.getElementById('talent-base-excluding-extras')
  if (talentBaseExcludingExtras) {
    talentBaseExcludingExtras.textContent = `R${this.formatNumber(baseTotalAmountExcludingExtras)}`
  }
    talentGrandTotal.textContent = `R${this.formatNumber(totalAmount)}`
  }

  searchTerritories(event) {
    const searchTerm = event.target.value.toLowerCase()
    const comboId = event.target.dataset.combo

    // Find the specific territory list for this combo/group
    const territoryList = document.querySelector(`.territories-list[data-combo="${comboId}"]`)
    if (!territoryList) {
      console.error(`Territory list not found for combo ${comboId}`)
      return
    }

    const territories = territoryList.querySelectorAll('.territory-item')

    territories.forEach(territory => {
      const name = territory.dataset.name.toLowerCase()
      const code = territory.dataset.code?.toLowerCase() || ''

      if (searchTerm.length >= 1) {
        if (name.includes(searchTerm) || code.includes(searchTerm)) {
          territory.style.display = 'block'
        } else {
          territory.style.display = 'none'
        }
      } else {
        territory.style.display = 'block'
      }
    })
  }


  parseDurationMonths(duration) {
    const mapping = {
      '1_month': 1,
      '3_months': 3,
      '6_months': 6,
      '12_months': 12,
      '18_months': 18,
      '24_months': 24,
      '36_months': 36
    }
    return mapping[duration]
  }


  validateTalentAllocation() {
    let valid = true
    document.querySelectorAll('[data-category]').forEach(category => {
      const categoryId = category.dataset.category
      const initialCount = parseInt(document.querySelector(`[data-category-count="${categoryId}"]`).value)
      
      if (initialCount > 0) {
        const dayOnSets = category.querySelectorAll('.days-on-set-row')
        let totalAllocated = 0
        
        dayOnSets.forEach(row => {
          const talentCount = parseInt(row.querySelector('[name*="talent_count"]').value) || 0
          totalAllocated += talentCount
        })
        
        if (totalAllocated !== initialCount && dayOnSets.length > 0) {
          valid = false
          alert(`Talent allocation mismatch for category ${categoryId}. Expected ${initialCount}, got ${totalAllocated}`)
        }
      }
    })
    
    return valid
  }

  setupCommercialLogic() {
    // Initialize commercial percentage variable
    this.commercialPercentage = 100
    
    // Add event listeners to commercial type radio buttons
    const commercialTypeRadios = document.querySelectorAll('input[name="quotation[commercial_type]"]')
    commercialTypeRadios.forEach(radio => {
      radio.addEventListener('change', this.handleCommercialTypeChange.bind(this))
    })

    // Add event listeners to combination commercial inputs
    this.setupComboCommercialListeners()
  }


  getOrdinal(number) {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const mod100 = number % 100
    return number + (suffixes[(mod100 - 20) % 10] || suffixes[mod100] || suffixes[0])
  }

  getCommercialPercentage(comboId = null, categoryId = null, lineIndex = null) {
    // If specific row parameters are provided, get commercial count from that row's input
    if (comboId && categoryId !== null && lineIndex !== null) {
      console.log(`🔢 Getting commercial percentage for combo:${comboId}, category:${categoryId}, line:${lineIndex}`)

      const commercialTypeInput = document.querySelector('input[name="quotation[commercial_type]"]:checked')
      const commercialsCountInput = document.querySelector(`.commercial-count-input[data-combo="${comboId}"][data-category="${categoryId}"][data-line="${lineIndex}"]`)

      console.log('🔢 Commercial type input:', commercialTypeInput)
      console.log('🔢 Commercial count input:', commercialsCountInput)

      if (!commercialTypeInput || !commercialsCountInput) {
        console.log('🔢 Missing inputs, returning 100%')
        return 100 // Default to 100% if no commercial info
      }

      const commercialType = commercialTypeInput.value
      const numberOfCommercials = parseInt(commercialsCountInput.value) || 1

      console.log(`🔢 Commercial type: ${commercialType}, count: ${numberOfCommercials}`)

      // If only 1 commercial, return 100% (no multiplier)
      if (numberOfCommercials <= 1) {
        console.log('🔢 Only 1 commercial, returning 100%')
        return 100
      }

      let totalPercentage = 0

      for (let i = 1; i <= numberOfCommercials; i++) {
        if (commercialType === 'non_brand') {
          if (i === 1) totalPercentage += 100
          else if (i === 2) totalPercentage += 50
          else totalPercentage += 25
        } else if (commercialType === 'brand') {
          if (i === 1) totalPercentage += 100
          else if (i === 2) totalPercentage += 75
          else totalPercentage += 50
        }
      }

      console.log(`🔢 Calculated total percentage: ${totalPercentage}%`)
      return totalPercentage
    }

    // Legacy fallback - return 100% if no specific row info
    console.log('🔢 No row-specific info, returning 100%')
    return 100
  }

  setupRateValidation() {
    // Add validation to all rate input fields to prevent negative values
    document.addEventListener('input', (e) => {
      // Check if the input is a rate field
      if (e.target.matches('[data-adjusted-rate-input], .rate-input, .rate-adjustment') ||
          e.target.name?.includes('adjusted_rate') || 
          e.target.name?.includes('rate')) {
        
        const value = parseFloat(e.target.value)
        if (value < 0) {
          e.target.value = 0
          console.log('Rate value corrected to 0 (was negative)')
        }
      }
    })
  }

  setupComboSummaryUpdate() {
    // Set up event listeners to update the combo summary heading
    this.updateAllComboSummaries()

    // Listen for duration changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('select[name*="duration"]')) {
        this.updateAllComboSummaries()
      }
    })

    // Listen for territory changes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('territory-checkbox') ||
          e.target.classList.contains('combination-territory-checkbox')) {
        this.updateAllComboSummaries()
      }
    })

    // Listen for media type changes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('combination-media')) {
        this.updateAllComboSummaries()
      }
    })

    // Listen for unlimited options changes
    document.addEventListener('change', (e) => {
      if (e.target.matches('[name*="unlimited_stills"]') ||
          e.target.matches('[name*="unlimited_versions"]')) {
        this.updateAllComboSummaries()
      }
    })
  }

  updateAllComboSummaries() {
    // Update all existing combo summaries
    document.querySelectorAll('.combo-summary-pills').forEach(pillsContainer => {
      const comboId = pillsContainer.getAttribute('data-combo')
      if (comboId) {
        this.updateComboSummary(parseInt(comboId))
      }
    })
  }

  injectExclusivityDataIntoForm() {
    // Convert exclusivity data from window.exclusivityData to form fields before submission
    if (!window.exclusivityData) {
      console.log('❌ No window.exclusivityData found - skipping injection')
      return
    }

    console.log('🔄 Injecting exclusivity data into form...', window.exclusivityData)

    // Remove any existing exclusivity hidden fields
    document.querySelectorAll('input[name*="exclusivity_type"], input[name*="exclusivities"]').forEach(field => {
      field.remove()
    })

    // Find the main quotation form (not logout or other forms)
    const form = document.querySelector('form[data-controller="quotation-form"]') ||
                 document.querySelector('form:not(.button_to)') ||
                 this.element.querySelector('form')

    if (!form) {
      console.log('❌ No suitable form found for exclusivity injection')
      return
    }

    console.log('📝 Using form for injection:', form)

    // Create category-specific exclusivity data instead of global
    Object.keys(window.exclusivityData).forEach(comboId => {
      const exclusivities = window.exclusivityData[comboId] || []

      exclusivities.forEach((exclusivity, index) => {
        console.log(`🔍 Checking exclusivity:`, exclusivity)
        console.log(`   isLineSpecific: ${exclusivity.isLineSpecific}`)
        console.log(`   categoryId: ${exclusivity.categoryId}`)
        console.log(`   lineIndex: ${exclusivity.lineIndex}`)

        if (exclusivity.isLineSpecific && exclusivity.categoryId && exclusivity.lineIndex !== undefined) {
          // Create line-specific exclusivity field
          const lineExclusivityField = document.createElement('input')
          lineExclusivityField.type = 'hidden'
          lineExclusivityField.name = `talent[${exclusivity.categoryId}][lines][${exclusivity.lineIndex}][exclusivity_type]`
          lineExclusivityField.value = `${exclusivity.name} ${exclusivity.percentage}%`
          form.appendChild(lineExclusivityField)

          console.log(`✅ Added line-specific exclusivity: ${exclusivity.name} ${exclusivity.percentage}% for category ${exclusivity.categoryId}, line ${exclusivity.lineIndex}`)
        } else if (exclusivity.categories && exclusivity.categories.length > 0) {
          // Apply category-based exclusivity to main talent category (not sub-lines)
          exclusivity.categories.forEach(categoryId => {
            const categoryExclusivityField = document.createElement('input')
            categoryExclusivityField.type = 'hidden'
            categoryExclusivityField.name = `talent[${categoryId}][exclusivity_type]`
            categoryExclusivityField.value = `${exclusivity.name} ${exclusivity.percentage}%`
            form.appendChild(categoryExclusivityField)

            console.log(`✅ Added category-based exclusivity: ${exclusivity.name} ${exclusivity.percentage}% for category ${categoryId}`)
          })
        } else {
          // Fallback for non-line-specific exclusivities
          const globalField = document.createElement('input')
          globalField.type = 'hidden'
          globalField.name = `combinations[${comboId}][exclusivities][${index}][name]`
          globalField.value = exclusivity.name
          form.appendChild(globalField)

          const percentageField = document.createElement('input')
          percentageField.type = 'hidden'
          percentageField.name = `combinations[${comboId}][exclusivities][${index}][percentage]`
          percentageField.value = exclusivity.percentage
          form.appendChild(percentageField)

          console.log(`✅ Added general exclusivity: ${exclusivity.name} ${exclusivity.percentage}% for combo ${comboId}`)
        }
      })
    })

    // Also add detailed exclusivity data for combinations (for potential future use)
    Object.keys(window.exclusivityData).forEach(comboId => {
      const exclusivities = window.exclusivityData[comboId] || []

      exclusivities.forEach((exclusivity, index) => {
        const nameField = document.createElement('input')
        nameField.type = 'hidden'
        nameField.name = `combinations[${comboId}][exclusivities][${index}][name]`
        nameField.value = exclusivity.name
        form.appendChild(nameField)

        const percentageField = document.createElement('input')
        percentageField.type = 'hidden'
        percentageField.name = `combinations[${comboId}][exclusivities][${index}][percentage]`
        percentageField.value = exclusivity.percentage
        form.appendChild(percentageField)

        const categoriesField = document.createElement('input')
        categoriesField.type = 'hidden'
        categoriesField.name = `combinations[${comboId}][exclusivities][${index}][categories]`
        categoriesField.value = JSON.stringify(exclusivity.categories || [])
        form.appendChild(categoriesField)

        if (exclusivity.isLineSpecific) {
          const lineSpecificField = document.createElement('input')
          lineSpecificField.type = 'hidden'
          lineSpecificField.name = `combinations[${comboId}][exclusivities][${index}][is_line_specific]`
          lineSpecificField.value = 'true'
          form.appendChild(lineSpecificField)

          const categoryIdField = document.createElement('input')
          categoryIdField.type = 'hidden'
          categoryIdField.name = `combinations[${comboId}][exclusivities][${index}][category_id]`
          categoryIdField.value = exclusivity.categoryId
          form.appendChild(categoryIdField)

          const lineIndexField = document.createElement('input')
          lineIndexField.type = 'hidden'
          lineIndexField.name = `combinations[${comboId}][exclusivities][${index}][line_index]`
          lineIndexField.value = exclusivity.lineIndex
          form.appendChild(lineIndexField)
        }
      })
    })

    // Also inject line-specific exclusivities from window.lineExclusivityData
    if (window.lineExclusivityData) {
      console.log('🔍 Injecting line-specific exclusivities from lineExclusivityData:', window.lineExclusivityData)

      Object.keys(window.lineExclusivityData).forEach(lineKey => {
        const lineExclusivities = window.lineExclusivityData[lineKey] || []

        lineExclusivities.forEach(exclusivity => {
          const lineExclusivityField = document.createElement('input')
          lineExclusivityField.type = 'hidden'
          lineExclusivityField.name = `talent[${exclusivity.categoryId}][lines][${exclusivity.lineIndex}][exclusivity_type]`
          lineExclusivityField.value = `${exclusivity.name} ${exclusivity.percentage}%`
          form.appendChild(lineExclusivityField)

          console.log(`✅ Added line-specific exclusivity from lineExclusivityData: ${exclusivity.name} ${exclusivity.percentage}% for category ${exclusivity.categoryId}, line ${exclusivity.lineIndex}`)
        })
      })
    }
  }

  updateComboSummary(comboId) {
    const pillsContainer = document.querySelector(`.combo-summary-pills[data-combo="${comboId}"]`)
    if (!pillsContainer) return

    const pills = []

    // Add duration pill
    const durationSelect = document.querySelector(`select[name*="combinations[${comboId}][duration]"]`)
    if (durationSelect && durationSelect.value) {
      const durationText = this.formatDurationText(durationSelect.value)
      pills.push(durationText)
    }

    // Add territory pills
    const territories = this.getSelectedTerritories(comboId)
    pills.push(...territories)

    // Add media type pills
    const mediaTypes = this.getSelectedMediaTypes(comboId)
    pills.push(...mediaTypes)

    // Add unlimited stills pill
    const unlimitedStillsCheckbox = document.querySelector(`input[name="combinations[${comboId}][unlimited_stills]"]:checked`)
    if (unlimitedStillsCheckbox) {
      pills.push('Unlimited Stills')
    }

    // Add unlimited versions pill
    const unlimitedVersionsCheckbox = document.querySelector(`input[name="combinations[${comboId}][unlimited_versions]"]:checked`)
    if (unlimitedVersionsCheckbox) {
      pills.push('Unlimited Versions')
    }

    // Render all pills
    if (pills.length > 0) {
      pillsContainer.innerHTML = pills.map(pill =>
        `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${pill}</span>`
      ).join('')
    } else {
      pillsContainer.innerHTML = ''
    }
  }

  formatDurationText(duration) {
    const durationMap = {
      '1_month': '1 Month',
      '3_months': '3 Months',
      '6_months': '6 Months',
      '12_months': '12 Months',
      '18_months': '18 Months',
      '24_months': '24 Months',
      '36_months': '36 Months'
    }
    return durationMap[duration] || duration
  }

  getSelectedTerritories(comboId) {
    const territories = []
    document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`).forEach(checkbox => {
      const territoryName = checkbox.getAttribute('data-territory-name')
      if (territoryName) {
        territories.push(territoryName)
      }
    })
    return territories
  }

  getSelectedMediaTypes(comboId) {
    const checkedBoxes = document.querySelectorAll(`.combination-media[data-combo="${comboId}"]:checked`)
    const mediaTypes = []
    
    // Check for parent categories first (highest priority)
    let hasAllMedia = false
    let hasAllMovingMedia = false
    let hasAllPrintMedia = false
    
    checkedBoxes.forEach(checkbox => {
      const label = checkbox.closest('label').textContent.trim()
      if (label.includes('All Media')) {
        hasAllMedia = true
      } else if (label.includes('All Moving Media')) {
        hasAllMovingMedia = true
      } else if (label.includes('All Print Media')) {
        hasAllPrintMedia = true
      }
    })
    
    // Display only the parent categories, not subcategories
    if (hasAllMedia) {
      mediaTypes.push('All Media')
    } else {
      if (hasAllMovingMedia) {
        mediaTypes.push('All Moving Media')
      }
      if (hasAllPrintMedia) {
        mediaTypes.push('All Print Media')
      }
      
      // Only show individual media types if no parent categories are selected
      if (!hasAllMovingMedia && !hasAllPrintMedia) {
        checkedBoxes.forEach(checkbox => {
          const label = checkbox.closest('label').textContent.trim()
          if (!label.includes('All Media') && !label.includes('All Moving Media') && !label.includes('All Print Media')) {
            mediaTypes.push(label)
          }
        })
      }
    }
    
    return mediaTypes
  }

  setupTablePopulation() {
    // Initial population
    this.populateAllTables()
    
    // Re-populate when relevant form data changes
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('talent-description') ||
          e.target.name?.includes('description') ||
          e.target.name?.includes('adjusted_rate') ||
          e.target.name?.includes('talent_count') ||
          e.target.matches('[data-description-input]') ||
          e.target.matches('[data-adjusted-rate-input]') ||
          e.target.matches('[data-talent-input]')) {
        console.log('Form input changed, repopulating tables:', e.target)
        this.populateAllTables()
      }
    })
    
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('combination-media') || 
          e.target.classList.contains('combination-territory-checkbox') ||
          e.target.matches('select[name*="duration"]') ||
          e.target.matches('select[name*="exclusivity"]') ||
          e.target.matches('[name*="unlimited_stills"]') ||
          e.target.matches('[name*="unlimited_versions"]')) {
        this.populateAllTables()
      }
    })
  }

  populateAllTables() {
    // Find all active combo tabs to ensure we populate all existing combos
    const activeTabs = document.querySelectorAll('.combination-tab')
    const comboIds = Array.from(activeTabs).map(tab => parseInt(tab.getAttribute('data-combo'))).filter(id => !isNaN(id))

    console.log('🔍 populateAllTables - Found combo IDs:', comboIds)

    comboIds.forEach(comboId => {
      // Ensure combo table exists before populating
      let tbody = document.querySelector(`.quote-preview-rows[data-combo="${comboId}"]`)
      if (!tbody) {
        console.log(`⚠️ Combo table ${comboId} missing, checking if combo table section exists...`)
        const comboTableSection = document.querySelector(`.combo-table-section[data-combo="${comboId}"]`)
        if (!comboTableSection) {
          console.log(`❌ Combo table section ${comboId} completely missing - this combo may have been removed`)
          return
        }
        // If section exists but tbody is missing, something went wrong with the HTML structure
        tbody = comboTableSection.querySelector('.quote-preview-rows')
        if (tbody) {
          tbody.setAttribute('data-combo', comboId)
          console.log(`✅ Fixed missing data-combo attribute for combo ${comboId}`)
        }
      }

      if (tbody) {
        console.log(`📋 Populating combo table ${comboId}`)
        this.populateComboTable(comboId)
      } else {
        console.log(`❌ Could not find or restore tbody for combo ${comboId}`)
      }
    })
  }

  populateComboTable(comboId, guaranteeState = null) {
    console.log(`🔄 populateComboTable called for combo ${comboId}`)
    const tbody = document.querySelector(`.quote-preview-rows[data-combo="${comboId}"]`)
    if (!tbody) {
      console.log(`❌ No tbody found for combo ${comboId}`)
      return
    }

    // Preserve current commercial count values before regenerating
    const existingCommercialValues = {}
    tbody.querySelectorAll('.commercial-count-input').forEach(input => {
      const key = `${input.dataset.category}_${input.dataset.line}`
      existingCommercialValues[key] = input.value
      console.log(`💾 Preserving commercial count for ${key}: ${input.value}`)
    })

    // Determine guarantee state for this combo
    let isGuaranteedForCombo = false
    if (guaranteeState !== null) {
      // Use passed guarantee state to avoid timing issues
      isGuaranteedForCombo = guaranteeState
    } else {
      // Fallback to reading from DOM (for initial load or when no state passed)
      const guaranteeCheckbox = document.querySelector(`.guarantee-checkbox[data-combo="${comboId}"]`)
      isGuaranteedForCombo = guaranteeCheckbox && guaranteeCheckbox.checked
      // For initial load when no checkbox exists yet, default to false
    }

    const rows = []
    let totalAmount = 0

    // Get all talent categories and their lines
    const talentCategories = this.getAllTalentLines()
    
    talentCategories.forEach(category => {
      category.lines.forEach((line, lineIndex) => {
        const dayFee = parseFloat(line.adjustedRate || line.dailyRate || 0)
        const unit = parseInt(line.initialCount || 0)

        // Get exclusivities that apply to this talent category
        const categoryId = this.getCategoryIdFromDescription(line.description || category.name)
        const categoryExclusivities = this.getExclusivitiesForCategory(comboId, categoryId)

        // Get line-specific exclusivities for this exact talent line
        const lineSpecificExclusivities = this.getExclusivitiesForSpecificLine(comboId, categoryId, lineIndex)

        // Combine both types of exclusivities
        const applicableExclusivities = [...categoryExclusivities, ...lineSpecificExclusivities]
        
        // Calculate row-specific buyout percentage with Product Type logic
        let rowBuyoutPercentage = this.calculateRowBuyoutPercentage(comboId, applicableExclusivities, categoryId, dayFee, lineIndex)
        
        // Apply guarantee reduction if enabled for this combo
        const originalBuyoutPercentage = rowBuyoutPercentage
        if (isGuaranteedForCombo) {
          rowBuyoutPercentage = rowBuyoutPercentage * 0.75 // Reduce by 25%
          console.log(`🛡️ Guarantee applied: ${originalBuyoutPercentage}% → ${rowBuyoutPercentage}%`)
        } else {
          console.log(`🛡️ No guarantee: Using original ${rowBuyoutPercentage}%`)
        }
        
        // Working Total = DayFee × (BuyoutPercentage/100) × ProductFactor
        const buyoutMultiplier = rowBuyoutPercentage / 100
        const productFactor = this.lastProductFactor || 1.0
        const totalRands = dayFee * unit * buyoutMultiplier * productFactor
        
        console.log(`💰 WORKING TOTAL CALCULATION - CategoryID: ${categoryId}`)
        console.log(`💰 DayFee: R${dayFee}, Unit: ${unit}, BuyoutPercentage: ${rowBuyoutPercentage}%`)
        console.log(`💰 this.lastProductFactor: ${this.lastProductFactor}, productFactor: ${productFactor}`)
        console.log(`💰 Formula: ${dayFee} × ${unit} × ${buyoutMultiplier} × ${productFactor} = R${totalRands}`)
        
        totalAmount += totalRands
        
        // Generate exclusivity pills for this row
        const allExclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
        const lineKey = `${categoryId}_${lineIndex}`
        const lineExclusivities = (window.lineExclusivityData && window.lineExclusivityData[lineKey]) || []

        const rowExclusivityPills = applicableExclusivities.map(ex => {
          let originalIndex = -1

          // For line-specific exclusivities, check if it exists in window.lineExclusivityData
          if (ex.isLineSpecific || (ex.categoryId !== undefined && ex.lineIndex !== undefined)) {
            originalIndex = lineExclusivities.findIndex(original => {
              return original.name === ex.name &&
                     original.percentage === ex.percentage &&
                     original.categoryId === parseInt(categoryId) &&
                     original.lineIndex === parseInt(lineIndex)
            })
          } else {
            // For category-based exclusivities, check window.exclusivityData
            originalIndex = allExclusivities.findIndex(original => {
              return original.name === ex.name &&
                     original.percentage === ex.percentage &&
                     !original.isLineSpecific
            })
          }

          // Determine if this is a line-specific exclusivity
          const isLineSpecific = ex.isLineSpecific || (ex.categoryId !== undefined && ex.lineIndex !== undefined)
          const pillType = isLineSpecific ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
          const title = isLineSpecific ? 'Remove line-specific exclusivity' : 'Remove from this row only'

          return `<span class="inline-flex items-center px-1 py-0.5 ${pillType} text-xs rounded-full">
            ${ex.name} ${ex.percentage}%
            <button type="button" class="ml-1 hover:font-bold remove-exclusivity-pill" data-combo="${comboId}" data-index="${originalIndex}" data-category="${categoryId}" data-line-index="${lineIndex}" title="${title}">×</button>
          </span>`
        }).join('')

        rows.push(`
          <tr class="border-b border-gray-200">
            <td class="py-2 px-3 text-sm text-gray-900 border-r border-gray-300">${line.description || category.name}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">R${this.formatNumber(dayFee)}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-center border-r border-gray-300">${unit}</td>
            <td class="py-2 px-3 text-sm text-gray-900 border-r border-gray-300">
              <div class="flex items-center justify-start gap-2">
                <button type="button" class="exclusivity-plus-btn w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0" data-combo="${comboId}" data-category="${categoryId}" data-line-index="${lineIndex}" data-talent-description="${line.description || category.name}" title="Add Exclusivity">
                  +
                </button>
                <div class="flex flex-wrap gap-1">
                  ${rowExclusivityPills}
                </div>
              </div>
            </td>
            <td class="py-2 px-3 text-sm text-gray-900 text-center border-r border-gray-300">
              <input type="number" min="1" max="20" step="1" value="${existingCommercialValues[`${categoryId}_${lineIndex}`] || 1}" name="talent[${categoryId}][lines][${lineIndex}][commercial_count]" id="commercial_count_${comboId}_${categoryId}_${lineIndex}" class="w-16 px-2 py-1 text-xs text-center border rounded commercial-count-input focus:outline-none focus:ring-2 focus:ring-blue-500" data-combo="${comboId}" data-category="${categoryId}" data-line="${lineIndex}" style="-webkit-appearance: auto; -moz-appearance: textfield-multiline;">
            </td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">${Math.floor(rowBuyoutPercentage)}%</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">R${this.formatNumber(totalRands / unit)}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right">R${this.formatNumber(totalRands)}</td>
          </tr>
        `)
      })
    })

    // Add guarantee, total, and currency rows
    if (totalAmount > 0) {
      // Guarantee row
      rows.push(`
        <tr class="border-t border-gray-300 bg-gray-50">
          <td class="py-2 px-3 text-sm text-gray-700" colspan="7">
            <label class="flex items-center">
              <input type="checkbox" class="guarantee-checkbox mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" data-combo="${comboId}" ${isGuaranteedForCombo ? 'checked' : ''}>
              <span class="text-sm font-medium text-gray-700">Would you like to guarantee?</span>
            </label>
          </td>
          <td class="py-2 px-3 text-sm text-gray-900 text-right font-medium">
            <span class="guarantee-amount" data-combo="${comboId}"></span>
          </td>
        </tr>
      `)

      // Commercial breakdown rows (show only if commercial type is selected)
      const commercialTypeInput = document.querySelector('input[name="quotation[commercial_type]"]:checked')
      const hasCommercialType = commercialTypeInput && commercialTypeInput.value
      const commercialBreakdown = this.getCommercialBreakdownForCombo(comboId, totalAmount)

      if (hasCommercialType && commercialBreakdown.length > 0) {
        let commercialTotal = 0
        commercialBreakdown.forEach(commercial => {
          commercialTotal += commercial.amount
          rows.push(`
            <tr class="commercial-breakdown-row" data-combo="${comboId}">
              <td class="py-1 px-3 text-xs text-gray-600 pl-8" colspan="7">
                ${commercial.label}
              </td>
              <td class="py-1 px-3 text-xs text-gray-700 text-right">
                R${this.formatNumber(commercial.amount)}
              </td>
            </tr>
          `)
        })

        // Update totalAmount to reflect commercial total instead of base amount
        totalAmount = commercialTotal
      }
      
      // Total row
      rows.push(`
        <tr class="bg-gray-50">
          <td class="py-2 px-3 text-sm text-gray-700 font-medium" colspan="7">Total:</td>
          <td class="py-2 px-3 text-sm text-gray-900 text-right font-medium">
            <span class="total-zar-amount" data-combo="${comboId}" data-base-amount="${totalAmount}">R${this.formatNumber(totalAmount)}</span>
          </td>
        </tr>
      `)
      
      // Currency row
      rows.push(`
        <tr class="border-b-2 border-gray-400 bg-gray-100 font-semibold">
          <td class="py-3 px-3 text-sm text-gray-900" colspan="7">
            <select class="currency-selector text-xs border border-gray-300 rounded px-auto py-1 bg-gray-50 text-gray-700 focus:border-gray-400 focus:outline-none" data-combo="${comboId}">
              <option value="" selected>Select Currency</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </td>
          <td class="py-3 px-3 text-sm text-gray-900 text-right font-semibold">
            <span class="currency-amount" data-combo="${comboId}" data-base-amount="${totalAmount}"></span>
          </td>
        </tr>
      `)
    }

    tbody.innerHTML = rows.join('')

    // Use event delegation instead of direct event listeners to avoid conflicts
    console.log(`🔢 Setting up event delegation for combo ${comboId} commercial inputs`)

    // Remove any existing event listeners for this combo first
    tbody.removeEventListener('input', this.commercialInputHandler)
    tbody.removeEventListener('change', this.commercialInputHandler)

    // Create bound handler if it doesn't exist
    if (!this.commercialInputHandler) {
      this.commercialInputHandler = (e) => {
        if (e.target.classList.contains('commercial-count-input')) {
          console.log('🔢 Commercial input event:', e.type, 'value:', e.target.value)
          const comboId = e.target.dataset.combo
          console.log('🔢 Will repopulate table for combo:', comboId)

          // Small delay to ensure value is properly set
          setTimeout(() => {
            console.log('🔢 Calling populateComboTable now...')
            this.populateComboTable(parseInt(comboId))
          }, 50)
        }
      }
    }

    // Add event delegation
    tbody.addEventListener('input', this.commercialInputHandler)
    tbody.addEventListener('change', this.commercialInputHandler)

    // Count and log the inputs for debugging
    const commercialInputs = tbody.querySelectorAll('.commercial-count-input')
    console.log(`🔢 Found ${commercialInputs.length} commercial count inputs for combo ${comboId}`)

    commercialInputs.forEach((input, index) => {
      console.log(`🔢 Input ${index}:`, input.value, 'disabled:', input.disabled, 'readonly:', input.readOnly)
    })

    // Initialize amounts with proper currency conversion
    if (totalAmount > 0) {
      this.updateAllAmounts(comboId)
    }
    
    // Remove external combo total since we're using the table total row now
    // const totalElement = document.querySelector(`.combo-total[data-combo="${comboId}"]`)
    // if (totalElement) {
    //   totalElement.textContent = `R${this.formatNumber(totalAmount)}`
    // }
  }

  getAllTalentLines() {
    const categories = []
    const categoryNames = {
      1: 'Lead',
      2: 'Second Lead',
      3: 'Featured Extra',
      4: 'Teenager',
      5: 'Kid'
    }
    
    const categoryAbbreviations = {
      1: 'LD',
      2: '2L',
      3: 'FE',
      4: 'TN',
      5: 'KD'
    }
    
    // Only process categories 1-5 as requested
    document.querySelectorAll('[id^="talent-category-"]').forEach(section => {
      const categoryId = section.id.replace('talent-category-', '')
      const categoryIdNum = parseInt(categoryId)
      
      // Only include categories 1-5
      if (categoryIdNum < 1 || categoryIdNum > 5) {
        return
      }
      
      const categoryName = categoryNames[categoryIdNum]
      const categoryAbbr = categoryAbbreviations[categoryIdNum]
      const lines = []
      
      // Get all talent input rows in the additional-lines section of this category
      const inputRows = section.querySelectorAll('.additional-lines .talent-input-row')
      
      inputRows.forEach((row) => {
        // Use the same selectors as the existing working code
        const descriptionField = row.querySelector('.talent-description, [name*="description"]')
        const rateField = row.querySelector('[name*="adjusted_rate"]') || 
                         row.querySelector(`[data-adjusted-rate-input="${categoryId}"]`)
        const countField = row.querySelector('[name*="talent_count"]') ||
                          row.querySelector(`[data-talent-input="${categoryId}"]`)
        
        const description = descriptionField?.value || ''
        const rate = rateField?.value || 0
        const count = countField?.value || 0
        
        // Only include rows that have actual talent count > 0 AND (description OR rate > 0)
        // This prevents showing fake data with 0 units
        if (parseInt(count) > 0 && (description.trim() || parseFloat(rate) > 0)) {
          // Format description with category abbreviation if description exists
          const formattedDescription = description.trim() 
            ? `${categoryAbbr} - ${description.trim()}`
            : categoryName
          
          lines.push({
            description: formattedDescription,
            adjustedRate: parseFloat(rate) || 0,
            dailyRate: parseFloat(rate) || 0,
            initialCount: parseInt(count) || 0
          })
        }
      })
      
      if (lines.length > 0) {
        categories.push({
          name: categoryName,
          lines: lines
        })
      }
    })
    
    return categories
  }

  calculateBuyoutPercentage(comboId) {
    // Get combo-specific settings
    const durationSelect = document.querySelector(`select[name*="combinations[${comboId}][duration]"]`)
    const duration = durationSelect?.value || ''
    
    const territoryCheckboxes = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`)
    const territories = Array.from(territoryCheckboxes).map(cb => ({
      percentage: parseFloat(cb.getAttribute('data-percentage') || 0)
    }))
    
    const mediaCheckboxes = document.querySelectorAll(`.combination-media[data-combo="${comboId}"]:checked`)
    const mediaTypes = Array.from(mediaCheckboxes).map(cb => cb.value)
    
    const unlimitedStills = document.querySelector(`input[name*="combinations[${comboId}][unlimited_stills]"]:checked`)
    const unlimitedVersions = document.querySelector(`input[name*="combinations[${comboId}][unlimited_versions]"]:checked`)
    
    // NEW FORMULA:
    // Core Buyout Factor = duration × territory × media
    const durationMultiplier = this.getDurationMultiplier(duration)
    const territoryMultiplier = this.getTerritoryMultiplier(territories, duration)
    const mediaMultiplier = this.getMediaMultiplier(mediaTypes, territories, duration)
    const coreBuyoutFactor = durationMultiplier * territoryMultiplier * mediaMultiplier
    
    // Buyout % = (Core Buyout Factor × 100)
    //          + (unlimited options % × Core Buyout Factor)
    //          + (custom exclusivities % × Core Buyout Factor)
    
    let percentage = coreBuyoutFactor * 100
    
    // Add unlimited options (percentage of core factor)
    if (unlimitedStills) percentage += 15 * coreBuyoutFactor
    if (unlimitedVersions) percentage += 15 * coreBuyoutFactor
    
    // Add custom exclusivity percentages (percentage of core factor)
    const customExclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
    const totalExclusivityPercentage = customExclusivities.reduce((sum, ex) => sum + ex.percentage, 0)
    percentage += totalExclusivityPercentage * coreBuyoutFactor

    // Apply commercial multiplier based on commercial type and number of commercials
    const commercialMultiplier = this.getCommercialPercentage(comboId) / 100
    percentage *= commercialMultiplier

    return percentage
  }

  calculateRowBuyoutPercentage(comboId, applicableExclusivities, categoryId, dayFee, lineIndex = null) {
    // Get base components for the row-specific calculation
    const durationSelect = document.querySelector(`select[name*="combinations[${comboId}][duration]"]`)
    const duration = durationSelect?.value || ''
    
    const territoryCheckboxes = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`)
    const territories = Array.from(territoryCheckboxes).map(cb => ({
      percentage: parseFloat(cb.getAttribute('data-percentage') || 0)
    }))
    
    const mediaCheckboxes = document.querySelectorAll(`.combination-media[data-combo="${comboId}"]:checked`)
    const mediaTypes = Array.from(mediaCheckboxes).map(cb => cb.value)
    
    const unlimitedStills = document.querySelector(`input[name*="combinations[${comboId}][unlimited_stills]"]:checked`)
    const unlimitedVersions = document.querySelector(`input[name*="combinations[${comboId}][unlimited_versions]"]:checked`)
    
    // NEW FORMULA:
    // Core Buyout Factor = duration × territory × media
    const durationMultiplier = this.getDurationMultiplier(duration)
    const territoryMultiplier = this.getTerritoryMultiplier(territories, duration)
    const mediaMultiplier = this.getMediaMultiplier(mediaTypes, territories, duration)
    const coreBuyoutFactor = durationMultiplier * territoryMultiplier * mediaMultiplier
    
    // Buyout % = (Core Buyout Factor × 100)
    //          + (unlimited options % × Core Buyout Factor)
    //          + (row-specific custom exclusivities % × Core Buyout Factor)
    
    let percentage = coreBuyoutFactor * 100
    
    // Add unlimited options (percentage of core factor)
    if (unlimitedStills) percentage += 15 * coreBuyoutFactor
    if (unlimitedVersions) percentage += 15 * coreBuyoutFactor
    
    // Add only the exclusivities that apply to this specific row (percentage of core factor)
    const rowExclusivityPercentage = applicableExclusivities.reduce((sum, ex) => sum + ex.percentage, 0)
    percentage += rowExclusivityPercentage * coreBuyoutFactor
    
    // Apply product factor for Kids category (KD = category 5) when Kids > 1
    let productFactor = 1.0
    if (categoryId === 5) { // Kids category
      const productType = this.getSelectedProductType()
      const kidsCount = this.getKidsCount()
      
      console.log(`🧒 KIDS DISCOUNT DEBUG - CategoryID: ${categoryId}, ProductType: ${productType}, KidsCount: ${kidsCount}`)
      
      if (kidsCount >= 1) {
        switch (productType) {
          case 'adult':
            productFactor = 0.5  // Adult: 50% of buyout amount
            console.log(`🧒 ADULT PRODUCT + Kids (${kidsCount}): Product factor = ${productFactor}`)
            break
          case 'family':
            productFactor = 0.75 // Family: 75% of buyout amount  
            console.log(`🧒 FAMILY PRODUCT + Kids (${kidsCount}): Product factor = ${productFactor}`)
            break
          case 'kids':
            productFactor = 1.0  // Kids: No discount (100% of buyout amount)
            console.log(`🧒 KIDS PRODUCT + Kids (${kidsCount}): Product factor = ${productFactor}`)
            break
        }
      } else {
        console.log(`🧒 No kids found (${kidsCount}), no product factor applied`)
      }
    }
    
    // Apply product factor to the percentage (Option A: show effective buyout %)
    let effectivePercentage = percentage * productFactor

    // Apply commercial multiplier based on commercial type and number of commercials
    const commercialMultiplier = this.getCommercialPercentage(comboId, categoryId, lineIndex) / 100
    effectivePercentage *= commercialMultiplier

    // Store product factor for use in total calculation (but now it should be 1.0 since we applied it to percentage)
    this.lastProductFactor = 1.0

    return effectivePercentage
  }

  calculateBaseBuyoutPercentage(comboId) {
    // This is the base buyout percentage WITHOUT custom exclusivities
    const durationSelect = document.querySelector(`select[name*="combinations[${comboId}][duration]"]`)
    const duration = durationSelect?.value || ''
    
    const territoryCheckboxes = document.querySelectorAll(`.combination-territory-checkbox[data-combo="${comboId}"]:checked`)
    const territories = Array.from(territoryCheckboxes).map(cb => ({
      percentage: parseFloat(cb.getAttribute('data-percentage') || 0)
    }))
    
    const mediaCheckboxes = document.querySelectorAll(`.combination-media[data-combo="${comboId}"]:checked`)
    const mediaTypes = Array.from(mediaCheckboxes).map(cb => cb.value)
    
    const unlimitedStills = document.querySelector(`input[name*="combinations[${comboId}][unlimited_stills]"]:checked`)
    const unlimitedVersions = document.querySelector(`input[name*="combinations[${comboId}][unlimited_versions]"]:checked`)
    
    // NEW FORMULA:
    // Core Buyout Factor = duration × territory × media
    const durationMultiplier = this.getDurationMultiplier(duration)
    const territoryMultiplier = this.getTerritoryMultiplier(territories, duration)
    const mediaMultiplier = this.getMediaMultiplier(mediaTypes, territories, duration)
    const coreBuyoutFactor = durationMultiplier * territoryMultiplier * mediaMultiplier
    
    // Buyout % = (Core Buyout Factor × 100)
    //          + (unlimited options % × Core Buyout Factor)
    let percentage = coreBuyoutFactor * 100
    
    // Add unlimited options (percentage of core factor)
    if (unlimitedStills) percentage += 15 * coreBuyoutFactor
    if (unlimitedVersions) percentage += 15 * coreBuyoutFactor

    // Apply commercial multiplier based on commercial type and number of commercials
    const commercialMultiplier = this.getCommercialPercentage(comboId) / 100
    percentage *= commercialMultiplier

    // Do NOT add custom exclusivities here - that's handled per row
    return percentage
  }

  getDurationMultiplier(duration) {
    const multipliers = {
      '3_months': 0.5,
      '6_months': 0.75,
      '12_months': 1.0,
      '18_months': 1.75,
      '24_months': 2.0,
      '36_months': 3.0
    }
    return multipliers[duration] || 1.0
  }

  getTerritoryMultiplier(territories, duration) {
    if (territories.length === 0) return 1.0
    
    const totalPercentage = territories.reduce((sum, t) => sum + t.percentage, 0)
    const durationMonths = this.parseDurationMonths(duration)
    
    // Check for override
    if (this.shouldApplyTerritoryOverride(durationMonths, totalPercentage)) {
      return 12.0 // Worldwide override
    }
    
    return totalPercentage / 100.0
  }

  getMediaMultiplier(mediaTypes, territories, duration) {
    if (mediaTypes.length === 0) return 1.0
    
    const totalPercentage = territories.reduce((sum, t) => sum + t.percentage, 0)
    const durationMonths = this.parseDurationMonths(duration)
    
    // Force All Media if territory override is active
    if (this.shouldApplyTerritoryOverride(durationMonths, totalPercentage)) {
      return 1.0
    }
    
    console.log(`🎬 MEDIA DEBUG - mediaTypes: [${mediaTypes.join(', ')}], length: ${mediaTypes.length}`)
    
    if (mediaTypes.includes('all_media')) {
      console.log(`🎬 All Media selected - returning 1.0 (100%)`)
      return 1.0
    } else if (mediaTypes.includes('all_moving')) {
      console.log(`🎬 All Moving Media selected - returning 0.75 (75%)`)
      return 0.75
    } else if (mediaTypes.length === 1) {
      console.log(`🎬 Single media selected - returning 0.5 (50%)`)
      return 0.5
    } else if (mediaTypes.length === 2) {
      console.log(`🎬 Two media types selected - returning 0.75 (75%)`)
      return 0.75
    } else if (mediaTypes.length >= 3) {
      console.log(`🎬 Three+ media types selected - returning 1.0 (100%)`)
      return 1.0
    }
    
    return 1.0
  }

  getExclusivityMultiplier(exclusivity) {
    const multipliers = {
      'none': 1.0,
      'level_1': 1.25,
      'level_2': 1.5,
      'level_3': 1.75,
      'level_4': 2.0,
      'pharma_1': 1.5,
      'pharma_2': 1.75,
      'pharma_3': 2.0,
      'pharma_4': 2.5
    }
    return multipliers[exclusivity] || 1.0
  }

  parseDurationMonths(duration) {
    const map = {
      '1_month': 1,
      '3_months': 3,
      '6_months': 6,
      '12_months': 12,
      '18_months': 18,
      '24_months': 24,
      '36_months': 36
    }
    return map[duration] || null
  }

  shouldApplyTerritoryOverride(durationMonths, totalPercentage) {
    if (!durationMonths || !totalPercentage) return false
    
    const thresholds = {
      12: 1200,
      24: 2400,
      36: 3600
    }
    
    const threshold = thresholds[durationMonths]
    return threshold && totalPercentage >= threshold
  }

  formatNumber(number) {
    if (isNaN(number)) return '0'
    return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  getCategoryIdFromDescription(description) {
    // Extract category ID from description like "LD - waiter" or fallback to category name
    if (description.startsWith('LD')) return 1
    if (description.startsWith('2L')) return 2
    if (description.startsWith('FE')) return 3
    if (description.startsWith('TN')) return 4
    if (description.startsWith('KD')) return 5
    
    // Fallback to full category names
    if (description.includes('Lead')) return 1
    if (description.includes('Second Lead')) return 2
    if (description.includes('Featured Extra')) return 3
    if (description.includes('Teenager')) return 4
    if (description.includes('Kid')) return 5
    
    return null
  }

  getExclusivitiesForCategory(comboId, categoryId) {
    if (!categoryId) return []

    const exclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []

    return exclusivities.filter(ex => {
      // Skip line-specific exclusivities (they are handled separately)
      if (ex.isLineSpecific) return false

      // If no categories specified, apply to all
      if (!ex.categories || ex.categories.length === 0) return true

      // Check if this category is in the exclusivity's target categories
      return ex.categories.includes(categoryId)
    })
  }

  getExclusivitiesForSpecificLine(comboId, categoryId, lineIndex) {
    if (!categoryId || lineIndex === undefined) return []

    // First check window.lineExclusivityData for the specific line
    const lineKey = `${categoryId}_${lineIndex}`
    const lineExclusivities = (window.lineExclusivityData && window.lineExclusivityData[lineKey]) || []

    // Also check window.exclusivityData for line-specific exclusivities (legacy support)
    const exclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
    const legacyLineExclusivities = exclusivities.filter(ex => {
      // Only include line-specific exclusivities that match this exact line
      return ex.isLineSpecific &&
             ex.categoryId === parseInt(categoryId) &&
             ex.lineIndex === parseInt(lineIndex)
    })

    // Combine both sources
    return [...lineExclusivities, ...legacyLineExclusivities]
  }

  getSelectedProductType() {
    const productTypeRadio = document.querySelector('input[name="quotation[product_type]"]:checked')
    return productTypeRadio ? productTypeRadio.value : null
  }

  getCommercialBreakdownForCombo(comboId, totalAmount) {
    // Commercial breakdown is now handled per-row, so return empty array
    // TODO: Could implement per-row commercial breakdown in the future if needed
    return []
  }

  setupComboCommercialListeners() {
    // Add event listeners to existing commercial inputs
    const self = this
    document.querySelectorAll('.combination-commercials').forEach(input => {
      // Remove any existing listeners to avoid duplicates
      input.removeEventListener('input', this.handleCommercialInput)
      input.removeEventListener('keydown', this.handleCommercialKeydown)

      // Add new listeners
      input.addEventListener('input', this.handleCommercialInput.bind(self))
      input.addEventListener('keydown', this.handleCommercialKeydown.bind(self))
    })
  }

  handleCommercialInput(e) {
    // Regenerate all combo tables to update commercial breakdown
    this.populateAllTables()
  }

  handleCommercialKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur() // Remove focus from input
    }
  }

  handleCommercialTypeChange(e) {
    // Regenerate all combo tables to update commercial breakdown
    this.populateAllTables()
  }


  getKidsCount() {
    // Get total count of Kids talent across all categories
    let totalKidsCount = 0

    // Look for Kids category (category 5) input rows
    const kidsSection = document.querySelector('#talent-category-5')
    console.log(`🔍 KIDS COUNT DEBUG - KidsSection found: ${!!kidsSection}, Hidden: ${kidsSection?.classList.contains('hidden')}`)

    if (kidsSection) {
      // Check main talent count input first - try multiple selectors
      const mainCountSelectors = [
        'input[name="talent[5][talent_count]"]',
        'input[data-talent-input="5"]',
        '.talent-count-input',
        'input[type="number"]'
      ]

      let mainCountField = null
      for (const selector of mainCountSelectors) {
        mainCountField = kidsSection.querySelector(selector)
        if (mainCountField) {
          console.log(`🔍 Found main count field using selector: ${selector}`)
          break
        }
      }

      if (mainCountField) {
        const mainCount = parseInt(mainCountField.value) || 0
        console.log(`🔍 Main kids count field value = "${mainCountField.value}", parsed = ${mainCount}`)
        totalKidsCount += mainCount
      } else {
        console.log(`🔍 No main count field found, tried selectors:`, mainCountSelectors)
        // Debug: show all inputs in the kids section
        const allInputs = kidsSection.querySelectorAll('input')
        console.log(`🔍 All inputs in kids section:`, Array.from(allInputs).map(input => ({
          name: input.name,
          type: input.type,
          value: input.value,
          id: input.id,
          className: input.className
        })))
      }

      // Check additional lines
      const inputRows = kidsSection.querySelectorAll('.additional-lines .talent-input-row')
      console.log(`🔍 Found ${inputRows.length} additional input rows in Kids section`)

      inputRows.forEach((row, index) => {
        const countField = row.querySelector('[name*="talent_count"]') ||
                          row.querySelector('[data-talent-input="5"]')
        if (countField) {
          const count = parseInt(countField.value) || 0
          console.log(`🔍 Additional Row ${index}: Count field value = ${countField.value}, parsed = ${count}`)
          totalKidsCount += count
        } else {
          console.log(`🔍 Additional Row ${index}: No count field found`)
        }
      })
    } else {
      console.log(`🔍 Kids section not found or hidden`)
    }

    console.log(`🔍 TOTAL KIDS COUNT: ${totalKidsCount}`)
    return totalKidsCount
  }

  generateAdminExclusivityOptions() {
    // Check if exclusivitySettings is available (loaded from server)
    if (typeof exclusivitySettings !== 'undefined' && exclusivitySettings.length > 0) {
      return exclusivitySettings.map(setting => `
        <div class="flex items-center justify-between p-2 border rounded">
          <span class="text-sm">${setting.name}</span>
          <div class="flex items-center gap-2">
            <input type="number" value="${setting.percentage}" min="0" step="25" class="w-16 px-2 py-1 text-xs border rounded">
            <span class="text-xs text-gray-500">%</span>
            <button type="button" class="add-admin-exclusivity px-2 py-1 bg-blue-500 text-white text-xs rounded">Add</button>
          </div>
        </div>
      `).join('')
    } else {
      // Fallback message if no settings found
      return '<div class="text-sm text-gray-500 p-2">No exclusivity types configured. Please add them in the admin panel.</div>'
    }
  }

  setupExclusivityPopup() {
    console.log('🔧 Setting up exclusivity popup event delegation')

    // Check if exclusivity buttons exist
    setTimeout(() => {
      const exclusivityButtons = document.querySelectorAll('.exclusivity-plus-btn')
      console.log(`🔍 Found ${exclusivityButtons.length} exclusivity plus buttons:`, exclusivityButtons)
    }, 1000)

    // Event delegation for the plus buttons since they are dynamically created
    document.addEventListener('click', (e) => {
      // Only log clicks on exclusivity-related elements to reduce noise
      if (e.target.classList.contains('exclusivity-plus-btn') ||
          e.target.closest('.exclusivity-plus-btn') ||
          e.target.textContent?.includes('Exclusivity') ||
          e.target.textContent?.includes('+')) {
        console.log('🖱️ Exclusivity-related click detected:', e.target)
      }

      if (e.target.classList.contains('exclusivity-plus-btn') || e.target.closest('.exclusivity-plus-btn')) {
        console.log('🎯 Exclusivity plus button clicked!')
        const btn = e.target.closest('.exclusivity-plus-btn')
        const comboId = btn.getAttribute('data-combo')
        const categoryId = btn.getAttribute('data-category')
        const lineIndex = btn.getAttribute('data-line-index')
        const talentDescription = btn.getAttribute('data-talent-description')

        console.log(`🔢 Exclusivity button data: combo=${comboId}, category=${categoryId}, line=${lineIndex}, desc="${talentDescription}"`)

        // Show choice dialog for exclusivity scope
        this.showExclusivityScopeDialog(comboId, categoryId, lineIndex, talentDescription)
      }

      // Handle remove exclusivity pill buttons
      if (e.target.classList.contains('remove-exclusivity-pill')) {
        const comboId = e.target.getAttribute('data-combo')
        const index = parseInt(e.target.getAttribute('data-index'))
        const categoryId = parseInt(e.target.getAttribute('data-category'))
        const lineIndex = e.target.getAttribute('data-line-index')

        // Determine if this is a line-specific exclusivity
        const isLineSpecific = lineIndex !== null && lineIndex !== undefined

        if (isLineSpecific) {
          this.removeLineSpecificExclusivity(categoryId, parseInt(lineIndex), index)
        } else {
          this.removeExclusivityPill(comboId, index, categoryId)
        }
      }
    })
  }

  showExclusivityScopeDialog(comboId, categoryId, lineIndex, talentDescription) {
    // Remove any existing exclusivity modals to prevent stacking
    const existingModals = document.querySelectorAll('.modal-glass')
    existingModals.forEach(modal => modal.remove())

    // Create scope selection dialog
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center modal-glass'

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Choose Exclusivity Scope</h3>
          <p class="text-sm text-gray-600 mb-4">How would you like to apply exclusivity?</p>

          <div class="space-y-3">
            <button type="button" class="scope-choice-btn w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300" data-choice="category">
              <div class="font-medium">Apply to Entire Categories</div>
              <div class="text-sm text-gray-500">Add exclusivity that applies to all talent in selected categories</div>
            </button>

            <button type="button" class="scope-choice-btn w-full text-left p-4 border rounded-lg hover:bg-green-50 hover:border-green-300" data-choice="line">
              <div class="font-medium">Apply to This Specific Line Only</div>
              <div class="text-sm text-gray-500">Add exclusivity only to "${talentDescription}" (line ${parseInt(lineIndex) + 1})</div>
            </button>
          </div>

          <div class="mt-6 flex justify-end">
            <button type="button" class="scope-cancel px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Handle scope choice
    modal.querySelectorAll('.scope-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-choice')
        modal.remove()

        if (choice === 'category') {
          console.log('🏷️ User chose category-based exclusivity')
          this.showExclusivityPopup(comboId)
        } else if (choice === 'line') {
          console.log('📋 User chose line-specific exclusivity')
          this.showLineExclusivityPopup(categoryId, lineIndex, talentDescription)
        }
      })
    })

    // Handle cancel
    modal.querySelector('.scope-cancel').addEventListener('click', () => {
      modal.remove()
    })

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })
  }

  showLineExclusivityPopup(categoryId, lineIndex, talentDescription) {
    // Remove any existing exclusivity modals to prevent stacking
    const existingModals = document.querySelectorAll('.modal-glass')
    existingModals.forEach(modal => modal.remove())

    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center modal-glass'

    const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid'}
    const categoryName = categoryNames[categoryId] || `Category ${categoryId}`
    const displayDescription = talentDescription || 'Unnamed'

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col border border-black">
        <!-- Fixed Header -->
        <div class="p-4 border-b flex-shrink-0 relative flex justify-between">
          <h3 class="text-lg font-semibold">Add Exclusivity</h3>
          <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 exclusivity-close">
            ✕
          </button>
        </div>

        <!-- Talent Line Info -->
        <div class="p-4 bg-blue-50 border-b">
          <div class="text-sm font-medium text-blue-800">Applying to specific talent line:</div>
          <div class="text-lg font-semibold text-blue-900">${categoryName} - ${displayDescription}</div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto" style="max-height: calc(90vh - 180px);">
          <div class="p-4">

          <!-- Step 1: Select Exclusivity Type -->
          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span class="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">1</span>
              Select Exclusivity Type
            </h4>
            <!-- Standard Options -->
            <div class="space-y-2 mb-4" id="admin-exclusivity-options-line">
              ${this.generateAdminExclusivityOptions()}
            </div>
            <!-- Custom Entry -->
            <div class="border-t pt-4">
              <h5 class="text-sm font-medium text-gray-600 mb-2">Or add custom exclusivity:</h5>
              <div class="flex items-center gap-2">
                <input type="text" placeholder="e.g., cookies, car" class="flex-1 px-3 py-2 text-sm border rounded" id="custom-exclusivity-name-line">
                <input type="number" value="50" min="0" step="10" class="w-16 px-2 py-1 text-sm border rounded" id="custom-exclusivity-percentage-line">
                <span class="text-xs text-gray-500">%</span>
                <button type="button" class="add-custom-exclusivity-line px-3 py-2 bg-green-500 text-white text-xs rounded">Add</button>
              </div>
            </div>
          </div>

          <!-- Selected Exclusivities (Editable) -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Selected Exclusivities</h4>
            <div class="exclusivity-selected-list-line space-y-2" data-category="${categoryId}" data-line="${lineIndex}">
              <!-- Selected exclusivities will appear here -->
            </div>
            <div class="text-sm text-gray-600 mt-2 hidden">
              Total: <span class="exclusivity-total-line font-semibold">0%</span>
            </div>
          </div>
          </div>
        </div>

        <!-- Fixed Footer -->
        <div class="p-4 border-t flex justify-end gap-2 flex-shrink-0">
          <button type="button" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 exclusivity-close">Cancel</button>
          <button type="button" class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 exclusivity-save-line">Save</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Populate existing line-specific exclusivities in the modal
    this.populateExistingLineExclusivities(modal, categoryId, lineIndex)

    // Add event listeners for the modal
    this.setupLineExclusivityModalEvents(modal, categoryId, lineIndex, talentDescription)
  }

  showExclusivityPopup(comboId) {
    // Remove any existing exclusivity modals to prevent stacking
    const existingModals = document.querySelectorAll('.modal-glass')
    existingModals.forEach(modal => modal.remove())

    // Get remembered category selections for this combo
    const rememberedCategories = this.getRememberedCategories(comboId)

    // Create modal overlay
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center modal-glass'
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col border border-black">
        <!-- Fixed Header -->
        <div class="p-4 border-b flex-shrink-0 relative flex justify-between">
          <h3 class="text-lg font-semibold">Add Exclusivity</h3>
          <button type="button" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 exclusivity-close">
            ✕
          </button>
        </div>
        
        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto" style="max-height: calc(90vh - 140px);">
          <div class="p-4">
          <!-- Apply to Talent Categories (since scope was already chosen) -->
          ${this.generateCategoriesHTML(comboId, rememberedCategories)}

          <!-- Select Exclusivity Type -->
          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span class="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">2</span>
              Select Exclusivity Type
            </h4>

            <!-- Standard Options -->
            <div class="space-y-2 mb-4" id="admin-exclusivity-options">
              ${this.generateAdminExclusivityOptions()}
            </div>

            <!-- Custom Entry -->
            <div class="border-t pt-4">
              <h5 class="text-sm font-medium text-gray-600 mb-2">Or add custom exclusivity:</h5>
              <div class="flex items-center gap-2">
                <input type="text" placeholder="e.g., cookies, car" class="flex-1 px-3 py-2 text-sm border rounded" id="custom-exclusivity-name">
                <input type="number" value="50" min="0" step="10" class="w-16 px-2 py-1 text-sm border rounded" id="custom-exclusivity-percentage">
                <span class="text-xs text-gray-500">%</span>
                <button type="button" class="add-custom-exclusivity px-3 py-2 bg-green-500 text-white text-xs rounded">Add</button>
              </div>
            </div>
          </div>

          <!-- Selected Exclusivities (Editable) -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Selected Exclusivities</h4>
            <div class="exclusivity-selected-list space-y-2" data-combo="${comboId}">
              <!-- Selected exclusivities will appear here -->
            </div>
            <div class="text-sm text-gray-600 mt-2 hidden">
              Total: <span class="exclusivity-total font-semibold">0%</span>
            </div>
          </div>
          </div>
        </div>
        
        <!-- Fixed Footer -->
        <div class="p-4 border-t flex justify-end gap-2 flex-shrink-0">
          <button type="button" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 exclusivity-close">Cancel</button>
          <button type="button" class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 exclusivity-save">Save</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Populate available talent lines for the dropdown
    this.populateTalentLinesDropdown(modal, comboId)

    // Populate existing exclusivities in the modal
    this.populateExistingExclusivities(modal, comboId)

    // Add event listeners for the modal
    this.setupExclusivityModalEvents(modal, comboId)
  }

  generateCategoriesHTML(comboId, rememberedCategories) {
    console.log('🎨 Generating dynamic categories HTML...')
    const categoriesWithTalent = this.getCategoriesWithTalent()

    if (categoriesWithTalent.length === 0) {
      return `
        <div class="mb-6 scope-categories-section">
          <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <span class="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">1</span>
            Apply to Talent Categories
          </h4>
          <div class="text-sm text-gray-500 p-4 bg-gray-50 rounded border">
            No talent categories have talent assigned yet. Please add talent to categories first.
          </div>
        </div>
      `
    }

    let categoriesHTML = categoriesWithTalent.map(category => {
      const isChecked = rememberedCategories.includes(category.id) ? 'checked' : ''
      return `
        <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="${category.id}" ${isChecked}>
          <span class="text-xs">${category.name} (${category.abbrev}) - ${category.talentCount} talent</span>
        </label>
      `
    }).join('')

    return `
      <div class="mb-6 scope-categories-section">
        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <span class="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">1</span>
          Apply to Talent Categories
        </h4>
        <div class="grid grid-cols-2 gap-2">
          ${categoriesHTML}
          <div class="flex items-center">
            <button type="button" class="text-xs text-blue-600 hover:text-blue-800 select-all-categories">Select All</button>
            <span class="mx-1 text-gray-400">|</span>
            <button type="button" class="text-xs text-blue-600 hover:text-blue-800 deselect-all-categories">None</button>
          </div>
        </div>
      </div>
    `
  }

  getCategoriesWithTalent() {
    console.log('🔍 Getting categories with talent count > 0...')
    const categoriesWithTalent = []
    const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid'}
    const categoryAbbrevs = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}

    // Check each category (1-5) for talent count > 0
    for (let categoryId = 1; categoryId <= 5; categoryId++) {
      const categorySection = document.querySelector(`#talent-category-${categoryId}`)
      if (categorySection) {
        // Get total talent count for this category
        let totalTalentCount = 0

        // Check main row
        const mainRow = categorySection.querySelector('.talent-input-row')
        if (mainRow) {
          const talentCountInput = mainRow.querySelector('.talent-count, [name*="talent_count"]')
          totalTalentCount += parseInt(talentCountInput?.value) || 0
        }

        // Check additional lines
        const additionalLines = categorySection.querySelectorAll('[data-line-index] .talent-count')
        additionalLines.forEach(input => {
          totalTalentCount += parseInt(input.value) || 0
        })

        console.log(`   Category ${categoryId} (${categoryNames[categoryId]}): total talent = ${totalTalentCount}`)

        if (totalTalentCount > 0) {
          categoriesWithTalent.push({
            id: categoryId,
            name: categoryNames[categoryId],
            abbrev: categoryAbbrevs[categoryId],
            talentCount: totalTalentCount
          })
          console.log(`   ✅ Added category ${categoryId}`)
        } else {
          console.log(`   ❌ Skipped category ${categoryId} - no talent`)
        }
      }
    }

    console.log(`✅ Found ${categoriesWithTalent.length} categories with talent`)
    return categoriesWithTalent
  }

  populateTalentLinesDropdown(modal, comboId) {
    const dropdown = modal.querySelector('.talent-line-select')
    if (!dropdown) {
      console.log('❌ Talent line dropdown not found')
      return
    }

    console.log('🔍 Populating talent lines dropdown...')

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Choose a talent line...</option>'

    // Get all talent lines from ALL categories (including hidden ones)
    const allTalentLines = []
    const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid'}
    const categoryAbbrevs = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}

    console.log('🔍 Looking for ALL talent categories (1-5)...')

    // Process categories in order (1, 2, 3, 4, 5) for organized display
    const categoryIds = [1, 2, 3, 4, 5]
    for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i]
      const categorySection = document.querySelector(`#talent-category-${categoryId}`)
      const categoryName = categoryNames[categoryId] || `Category ${categoryId}`
      const categoryAbbrev = categoryAbbrevs[categoryId] || `C${categoryId}`

      console.log(`📋 Processing category ${categoryId} (${categoryName})`)

      // Only process categories that exist (check for talent data presence instead of hidden class)
      if (categorySection) {
        // Get all talent input rows in this category
        const talentRows = categorySection.querySelectorAll('.talent-input-row')
        console.log(`   Found ${talentRows.length} talent rows`)

        // Process each talent row and check if it has data
        talentRows.forEach((row, lineIndex) => {
          const descriptionInput = row.querySelector('.talent-description, [name*="description"]')
          const talentCountInput = row.querySelector('.talent-count, [name*="talent_count"]')
          const rateInput = row.querySelector('.rate-adjustment, [name*="adjusted_rate"]')
          const daysInput = row.querySelector('.days-input, [name*="days_count"]')
          const rehearsalInput = row.querySelector('[name*="rehearsal_days"]')
          const downInput = row.querySelector('[name*="down_days"]')
          const travelInput = row.querySelector('[name*="travel_days"]')
          const overtimeInput = row.querySelector('[name*="overtime_hours"]')

          const talentDescription = descriptionInput ? descriptionInput.value.trim() : ''
          const talentCount = talentCountInput ? parseInt(talentCountInput.value) || 0 : 0
          const rate = rateInput ? parseInt(rateInput.value) || 0 : 0
          const days = daysInput ? parseInt(daysInput.value) || 0 : 0
          const rehearsalDays = rehearsalInput ? parseInt(rehearsalInput.value) || 0 : 0
          const downDays = downInput ? parseInt(downInput.value) || 0 : 0
          const travelDays = travelInput ? parseInt(travelInput.value) || 0 : 0
          const overtimeHours = overtimeInput ? parseFloat(overtimeInput.value) || 0 : 0

          // Only show lines where talent count > 0 (not empty lines)
          const hasData = talentCount > 0

          console.log(`   Row ${lineIndex}: desc="${talentDescription}", count=${talentCount}, rate=${rate}, days=${days}, hasData=${hasData}`)
          console.log(`   -> TalentCount check: ${talentCount} > 0 = ${talentCount > 0}`)
          console.log(`   -> DEBUG: talentCount type=${typeof talentCount}, value=${talentCount}`)

          if (hasData) {
            // Determine display name
            let displayName
            if (talentDescription) {
              displayName = talentDescription
            } else {
              displayName = `Line ${lineIndex + 1}`
            }

            console.log(`   ✅ Adding line: ${categoryAbbrev} - ${displayName}`)

            allTalentLines.push({
              value: `${categoryId}_${lineIndex}`,
              display: `${categoryAbbrev} - ${displayName}`,
              categoryId: categoryId,
              lineIndex: lineIndex,
              description: talentDescription
            })
          } else {
            console.log(`   ❌ Skipping line ${lineIndex} - no data`)
          }
        })
      } else {
        console.log(`   ❌ Skipping category ${categoryId} - section doesn't exist`)
      }
    }

    console.log(`✅ Total talent lines found: ${allTalentLines.length}`)

    // Populate dropdown
    allTalentLines.forEach(line => {
      const option = document.createElement('option')
      option.value = line.value
      option.textContent = line.display
      option.dataset.categoryId = line.categoryId
      option.dataset.lineIndex = line.lineIndex
      option.dataset.description = line.description
      dropdown.appendChild(option)
      console.log(`   Added option: ${line.display}`)
    })

    console.log('📋 Dropdown populated successfully')
  }

  setupExclusivityModalEvents(modal, comboId) {
    // Close modal events
    modal.querySelectorAll('.exclusivity-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove())
    })

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })

    // Note: Scope selection was removed since user already chose categories

    // Add admin exclusivity
    modal.querySelectorAll('.add-admin-exclusivity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('🖱️ Admin exclusivity button clicked')
        const container = e.target.closest('.flex.items-center.justify-between')
        const name = container.querySelector('span').textContent
        const percentage = parseInt(container.querySelector('input[type="number"]').value) || 0
        console.log(`📝 Admin exclusivity details: ${name}, ${percentage}%`)
        this.addExclusivityToModal(modal, comboId, name, percentage)
      })
    })

    // Add custom exclusivity
    modal.querySelector('.add-custom-exclusivity').addEventListener('click', () => {
      console.log('🖱️ Custom exclusivity button clicked')
      const nameInput = modal.querySelector('#custom-exclusivity-name')
      const percentageInput = modal.querySelector('#custom-exclusivity-percentage')
      
      const name = nameInput.value.trim()
      const percentage = parseInt(percentageInput.value) || 0
      
      console.log(`📝 Custom exclusivity details: ${name}, ${percentage}%`)
      
      if (name) {
        this.addExclusivityToModal(modal, comboId, name, percentage)
        nameInput.value = ''
        percentageInput.value = '50'
      } else {
        console.log('⚠️ No name provided for custom exclusivity')
      }
    })

    // Category selection buttons
    modal.querySelector('.select-all-categories').addEventListener('click', () => {
      modal.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.checked = true
      })
    })

    modal.querySelector('.deselect-all-categories').addEventListener('click', () => {
      modal.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.checked = false
      })
    })

    // Save exclusivities
    modal.querySelector('.exclusivity-save').addEventListener('click', () => {
      console.log('💾 Category exclusivity save button clicked')
      try {
        this.saveExclusivities(modal, comboId)
        console.log('✅ Category exclusivity saved successfully')
      } catch (error) {
        console.error('❌ Error saving exclusivities:', error)
      } finally {
        console.log('🚪 Closing category exclusivity modal')
        modal.remove()
      }
    })
  }

  addExclusivityToList(modal, comboId, name, percentage) {
    console.log(`🔄 Adding exclusivity: ${name} ${percentage}% to combo ${comboId}`)
    
    // Get selected categories
    const selectedCategories = Array.from(modal.querySelectorAll('.category-checkbox:checked'))
      .map(cb => parseInt(cb.value))
    
    console.log(`📋 Selected categories:`, selectedCategories)
    
    if (selectedCategories.length === 0) {
      alert('Please select at least one talent category to apply this exclusivity to.')
      return
    }

    // Remember these category selections for future use
    this.rememberCategories(comboId, selectedCategories)

    const list = modal.querySelector('.exclusivity-selected-list')
    const item = document.createElement('div')
    item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'
    
    // Show which categories this applies to
    const categoryNames = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}
    const categoryLabels = selectedCategories.map(id => categoryNames[id]).join(', ')
    
    // Create individual category pills with remove buttons
    const categoryPills = selectedCategories.map(id => {
      const categoryName = categoryNames[id]
      return `<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-1 mb-1">
        ${categoryName}
        <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-category-pill" data-category-id="${id}">×</button>
      </span>`
    }).join('')

    item.innerHTML = `
      <div class="flex-1">
        <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit" data-name="${name}" data-percentage="${percentage}">${name} (${percentage}%)</div>
        <div class="text-xs text-gray-500 mt-1">
          <div class="category-pills-container">
            ${categoryPills}
          </div>
        </div>
      </div>
      <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity ml-2">Remove</button>
    `

    // Store category data on the item
    item.dataset.categories = JSON.stringify(selectedCategories)
    item.dataset.name = name
    item.dataset.percentage = percentage

    // Add edit functionality - click on name/percentage to edit
    item.querySelector('.exclusivity-edit').addEventListener('click', () => {
      this.editExclusivity(modal, item, comboId)
    })

    // Add individual category pill remove functionality
    item.querySelectorAll('.remove-category-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const categoryId = parseInt(btn.dataset.categoryId)
        this.removeCategoryFromExclusivity(modal, item, categoryId)
      })
    })

    // Add remove functionality for entire exclusivity
    item.querySelector('.remove-exclusivity').addEventListener('click', () => {
      item.remove()
      this.updateExclusivityTotal(modal)
    })
    
    list.appendChild(item)
    this.updateExclusivityTotal(modal)
  }

  handleScopeChange(modal, scopeValue) {
    console.log(`🔄 Scope changed to: ${scopeValue}`)

    const categoriesSection = modal.querySelector('.scope-categories-section')
    const specificLineSection = modal.querySelector('.scope-specific-line-section')

    if (scopeValue === 'categories') {
      console.log('👥 Showing categories section')
      categoriesSection.style.display = 'block'
      specificLineSection.style.display = 'none'
    } else if (scopeValue === 'specific_line') {
      console.log('🎯 Showing specific line section')
      categoriesSection.style.display = 'none'
      specificLineSection.style.display = 'block'
      // Refresh the talent lines dropdown
      console.log('🔄 Refreshing talent lines dropdown...')
      this.populateTalentLinesDropdown(modal)
    }
  }

  addExclusivityToModal(modal, comboId, name, percentage) {
    // Check if scope radio buttons exist (they don't in the category-only modal)
    const scopeRadio = modal.querySelector('input[name="exclusivity_scope"]:checked')
    const selectedScope = scopeRadio ? scopeRadio.value : 'categories'

    if (selectedScope === 'categories') {
      // Use existing category-based logic
      this.addExclusivityToList(modal, comboId, name, percentage)
    } else if (selectedScope === 'specific_line') {
      // Handle specific talent line
      const dropdown = modal.querySelector('.talent-line-select')
      const selectedLine = dropdown.value

      // Check if dropdown has any options (excluding the default "Choose a talent line..." option)
      const availableOptions = dropdown.querySelectorAll('option[value]:not([value=""])')
      if (availableOptions.length === 0) {
        alert('No talent lines available. Please add talent descriptions or data to at least one talent line before applying specific line exclusivity.')
        return
      }

      if (!selectedLine) {
        alert('Please select a specific talent line first.')
        return
      }

      const [categoryId, lineIndex] = selectedLine.split('_')
      const selectedOption = modal.querySelector(`.talent-line-select option[value="${selectedLine}"]`)
      const talentDescription = selectedOption.dataset.description || 'Unnamed'

      this.addLineExclusivityToModal(modal, comboId, categoryId, lineIndex, name, percentage, talentDescription)
    }
  }

  addLineExclusivityToModal(modal, comboId, categoryId, lineIndex, name, percentage, talentDescription) {
    const list = modal.querySelector('.exclusivity-selected-list')
    const item = document.createElement('div')
    item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'

    const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid'}
    const categoryName = categoryNames[categoryId] || `Category ${categoryId}`
    const displayName = talentDescription || 'Unnamed'

    item.innerHTML = `
      <div class="flex-1">
        <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit" data-name="${name}" data-percentage="${percentage}">${name} (${percentage}%)</div>
        <div class="text-xs text-gray-500 mt-1">
          <div class="text-purple-600 font-medium">Specific Line: ${categoryName} - ${displayName}</div>
        </div>
      </div>
      <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity ml-2">Remove</button>
    `

    // Store data on the item
    item.dataset.categories = JSON.stringify([parseInt(categoryId)])
    item.dataset.name = name
    item.dataset.percentage = percentage
    item.dataset.isLineSpecific = 'true'
    item.dataset.categoryId = categoryId
    item.dataset.lineIndex = lineIndex
    item.dataset.talentDescription = talentDescription

    // Add edit functionality - click on name/percentage to edit
    item.querySelector('.exclusivity-edit').addEventListener('click', () => {
      this.editExclusivity(modal, item, comboId)
    })

    // Add remove functionality for entire exclusivity
    item.querySelector('.remove-exclusivity').addEventListener('click', () => {
      item.remove()
      this.updateExclusivityTotal(modal)
    })

    list.appendChild(item)
    this.updateExclusivityTotal(modal)

    // Store in main exclusivity data structure with line-specific flags
    if (!window.exclusivityData) window.exclusivityData = {}
    if (!window.exclusivityData[comboId]) window.exclusivityData[comboId] = []

    window.exclusivityData[comboId].push({
      name: name,
      percentage: percentage,
      isLineSpecific: true,
      categoryId: parseInt(categoryId),
      lineIndex: parseInt(lineIndex),
      talentDescription: talentDescription
    })

    console.log('✅ Added exclusivity to storage:', window.exclusivityData)
    console.log(`🏷️ Adding exclusivity: ${name} ${percentage}% for combo ${comboId}`)
  }

  storeLineExclusivity(categoryId, lineIndex, name, percentage, talentDescription) {
    // Initialize lineExclusivityData if it doesn't exist
    if (!window.lineExclusivityData) {
      window.lineExclusivityData = {}
    }

    const lineKey = `${categoryId}_${lineIndex}`
    if (!window.lineExclusivityData[lineKey]) {
      window.lineExclusivityData[lineKey] = []
    }

    // Add to line-specific exclusivities
    window.lineExclusivityData[lineKey].push({
      name: name,
      percentage: percentage,
      categoryId: categoryId,
      lineIndex: lineIndex,
      talentDescription: talentDescription
    })

    console.log(`Stored line exclusivity for ${lineKey}:`, window.lineExclusivityData[lineKey])
  }

  editExclusivity(modal, item, comboId) {
    const currentName = item.dataset.name
    const currentPercentage = item.dataset.percentage
    const currentCategories = JSON.parse(item.dataset.categories)

    // Pre-fill form with current values
    const nameInput = modal.querySelector('#custom-exclusivity-name')
    const percentageInput = modal.querySelector('#custom-exclusivity-percentage')

    nameInput.value = currentName
    percentageInput.value = currentPercentage

    // Check the current categories
    modal.querySelectorAll('.category-checkbox').forEach(checkbox => {
      checkbox.checked = currentCategories.includes(parseInt(checkbox.value))
    })

    // Remove the current item so it can be re-added with new values
    item.remove()
    this.updateExclusivityTotal(modal)

    // Focus on name input for editing
    nameInput.focus()
    nameInput.select()

    // Show a visual indicator that we're editing
    const addButton = modal.querySelector('.add-custom-exclusivity')
    const originalText = addButton.textContent
    addButton.textContent = 'Update'
    addButton.style.backgroundColor = '#f59e0b'

    // Reset the button after a few seconds if not used
    setTimeout(() => {
      if (addButton.textContent === 'Update') {
        addButton.textContent = originalText
        addButton.style.backgroundColor = ''
      }
    }, 10000)
  }

  removeCategoryFromExclusivity(modal, item, categoryIdToRemove) {
    const currentCategories = JSON.parse(item.dataset.categories)
    const updatedCategories = currentCategories.filter(id => id !== categoryIdToRemove)

    if (updatedCategories.length === 0) {
      // If no categories left, remove the entire exclusivity
      item.remove()
      this.updateExclusivityTotal(modal)
      return
    }

    // Update the stored categories
    item.dataset.categories = JSON.stringify(updatedCategories)

    // Regenerate the category pills
    const categoryNames = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}
    const categoryPills = updatedCategories.map(id => {
      const categoryName = categoryNames[id]
      return `<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-1 mb-1">
        ${categoryName}
        <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-category-pill" data-category-id="${id}">×</button>
      </span>`
    }).join('')

    // Update the pills container
    const pillsContainer = item.querySelector('.category-pills-container')
    pillsContainer.innerHTML = categoryPills

    // Re-add event listeners for the new pills
    item.querySelectorAll('.remove-category-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const categoryId = parseInt(btn.dataset.categoryId)
        this.removeCategoryFromExclusivity(modal, item, categoryId)
      })
    })
  }

  updateExclusivityTotal(modal) {
    const items = modal.querySelectorAll('.exclusivity-selected-list .flex')
    let total = 0
    
    items.forEach(item => {
      const fontMediumDiv = item.querySelector('.font-medium')
      if (fontMediumDiv) {
        const text = fontMediumDiv.textContent
        const match = text.match(/\((\d+)%\)/)
        if (match) {
          total += parseInt(match[1])
        }
      }
    })
    
    modal.querySelector('.exclusivity-total').textContent = `${total}%`
  }

  populateExistingExclusivities(modal, comboId) {
    const existingExclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
    const list = modal.querySelector('.exclusivity-selected-list')

    // Clear existing items first to avoid duplicates
    list.innerHTML = ''

    // Show category-based exclusivities
    existingExclusivities.filter(ex => ex.categories && ex.categories.length > 0).forEach(ex => {
      const categoryNames = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}

      // Create individual category pills with remove buttons
      const categoryPills = ex.categories.map(id => {
        const categoryName = categoryNames[id]
        return `<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-1 mb-1">
          ${categoryName}
          <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-category-pill" data-category-id="${id}">×</button>
        </span>`
      }).join('')

      const item = document.createElement('div')
      item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'
      item.innerHTML = `
        <div class="flex-1">
          <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit" data-name="${ex.name}" data-percentage="${ex.percentage}">${ex.name} (${ex.percentage}%)</div>
          <div class="text-xs text-gray-500 mt-1">
            <div class="category-pills-container">
              ${categoryPills}
            </div>
          </div>
        </div>
        <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity ml-2">Remove</button>
      `

      // Store category data on the item
      item.dataset.categories = JSON.stringify(ex.categories)
      item.dataset.name = ex.name
      item.dataset.percentage = ex.percentage

      // Add edit functionality - click on name/percentage to edit
      item.querySelector('.exclusivity-edit').addEventListener('click', () => {
        this.editExclusivity(modal, item, comboId)
      })

      // Add individual category pill remove functionality
      item.querySelectorAll('.remove-category-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const categoryId = parseInt(btn.dataset.categoryId)
          this.removeCategoryFromExclusivity(modal, item, categoryId)
        })
      })

      // Add remove functionality for entire exclusivity
      item.querySelector('.remove-exclusivity').addEventListener('click', () => {
        item.remove()
        this.updateExclusivityTotal(modal)
      })

      list.appendChild(item)
    })

    // Show line-specific exclusivities
    existingExclusivities.filter(ex => ex.isLineSpecific).forEach(ex => {
      const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid'}
      const categoryName = categoryNames[ex.categoryId] || `Category ${ex.categoryId}`
      const displayName = ex.talentDescription || 'Unnamed'

      const item = document.createElement('div')
      item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'
      item.innerHTML = `
        <div class="flex-1">
          <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit" data-name="${ex.name}" data-percentage="${ex.percentage}">${ex.name} (${ex.percentage}%)</div>
          <div class="text-xs text-gray-500 mt-1">
            <div class="text-purple-600 font-medium">Specific Line: ${categoryName} - ${displayName}</div>
          </div>
        </div>
        <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity ml-2">Remove</button>
      `

      // Store data on the item for line-specific exclusivities
      item.dataset.name = ex.name
      item.dataset.percentage = ex.percentage
      item.dataset.isLineSpecific = 'true'
      item.dataset.categoryId = ex.categoryId
      item.dataset.lineIndex = ex.lineIndex
      item.dataset.talentDescription = ex.talentDescription

      // Add edit functionality - click on name/percentage to edit
      item.querySelector('.exclusivity-edit').addEventListener('click', () => {
        this.editExclusivity(modal, item, comboId)
      })

      // Add remove functionality for entire exclusivity
      item.querySelector('.remove-exclusivity').addEventListener('click', () => {
        // Remove from global data structure
        const updatedExclusivities = existingExclusivities.filter(existing =>
          !(existing.isLineSpecific &&
            existing.name === ex.name &&
            existing.percentage === ex.percentage &&
            existing.categoryId === ex.categoryId &&
            existing.lineIndex === ex.lineIndex)
        )

        if (!window.exclusivityData) window.exclusivityData = {}
        window.exclusivityData[comboId] = updatedExclusivities

        item.remove()
        this.updateExclusivityTotal(modal)

        // Update form fields and tables
        this.updateExclusivityFormFields(comboId, updatedExclusivities)
        this.populateAllTables()
      })

      list.appendChild(item)
    })

    this.updateExclusivityTotal(modal)
  }

  setupLineExclusivityModalEvents(modal, categoryId, lineIndex, talentDescription) {
    // Close modal events
    modal.querySelectorAll('.exclusivity-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove())
    })

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })

    // Add admin exclusivity for line
    modal.querySelectorAll('.add-admin-exclusivity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.flex.items-center.justify-between')
        const name = container.querySelector('span').textContent
        const percentage = parseInt(container.querySelector('input[type="number"]').value) || 0
        this.addLineExclusivityToList(modal, categoryId, lineIndex, name, percentage)
      })
    })

    // Add custom exclusivity for line
    modal.querySelector('.add-custom-exclusivity-line').addEventListener('click', () => {
      const nameInput = modal.querySelector('#custom-exclusivity-name-line')
      const percentageInput = modal.querySelector('#custom-exclusivity-percentage-line')

      const name = nameInput.value.trim()
      const percentage = parseInt(percentageInput.value) || 0

      if (name) {
        this.addLineExclusivityToList(modal, categoryId, lineIndex, name, percentage)
        nameInput.value = ''
        percentageInput.value = '50'
      }
    })

    // Save line exclusivities
    modal.querySelector('.exclusivity-save-line').addEventListener('click', () => {
      console.log('💾 Line exclusivity save button clicked')
      try {
        this.saveLineExclusivities(modal, categoryId, lineIndex, talentDescription)
        console.log('✅ Line exclusivity saved successfully')
      } catch (error) {
        console.error('❌ Error saving line exclusivities:', error)
      } finally {
        console.log('🚪 Closing line exclusivity modal')
        modal.remove()
      }
    })
  }

  addLineExclusivityToList(modal, categoryId, lineIndex, name, percentage) {
    const list = modal.querySelector('.exclusivity-selected-list-line')
    const item = document.createElement('div')
    item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'

    item.innerHTML = `
      <div class="flex-1">
        <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit-line" data-name="${name}" data-percentage="${percentage}">${name} (${percentage}%)</div>
        <div class="text-xs text-gray-500 mt-1">Line-specific exclusivity</div>
      </div>
      <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity-line ml-2">Remove</button>
    `

    // Store data on the item
    item.dataset.name = name
    item.dataset.percentage = percentage

    // Add edit functionality
    item.querySelector('.exclusivity-edit-line').addEventListener('click', () => {
      this.editLineExclusivity(modal, item, categoryId, lineIndex)
    })

    // Add remove functionality
    item.querySelector('.remove-exclusivity-line').addEventListener('click', () => {
      item.remove()
      this.updateLineExclusivityTotal(modal)
    })

    list.appendChild(item)
    this.updateLineExclusivityTotal(modal)
  }

  editLineExclusivity(modal, item, categoryId, lineIndex) {
    const currentName = item.dataset.name
    const currentPercentage = item.dataset.percentage

    // Pre-fill form with current values
    const nameInput = modal.querySelector('#custom-exclusivity-name-line')
    const percentageInput = modal.querySelector('#custom-exclusivity-percentage-line')

    nameInput.value = currentName
    percentageInput.value = currentPercentage

    // Remove the current item so it can be re-added with new values
    item.remove()
    this.updateLineExclusivityTotal(modal)

    // Focus on name input for editing
    nameInput.focus()
    nameInput.select()

    // Show a visual indicator that we're editing
    const addButton = modal.querySelector('.add-custom-exclusivity-line')
    const originalText = addButton.textContent
    addButton.textContent = 'Update'
    addButton.style.backgroundColor = '#f59e0b'

    // Reset the button after a few seconds if not used
    setTimeout(() => {
      if (addButton.textContent === 'Update') {
        addButton.textContent = originalText
        addButton.style.backgroundColor = ''
      }
    }, 10000)
  }

  updateLineExclusivityTotal(modal) {
    const items = modal.querySelectorAll('.exclusivity-selected-list-line .flex')
    let total = 0

    items.forEach(item => {
      const text = item.querySelector('.font-medium').textContent
      const match = text.match(/\((\d+)%\)/)
      if (match) {
        total += parseInt(match[1])
      }
    })

    modal.querySelector('.exclusivity-total-line').textContent = `${total}%`
  }

  populateExistingLineExclusivities(modal, categoryId, lineIndex) {
    // Get existing line-specific exclusivities
    const lineKey = `${categoryId}_${lineIndex}`
    const existingExclusivities = (window.lineExclusivityData && window.lineExclusivityData[lineKey]) || []
    const list = modal.querySelector('.exclusivity-selected-list-line')

    // Clear existing items first to avoid duplicates
    list.innerHTML = ''

    existingExclusivities.forEach(ex => {
      const item = document.createElement('div')
      item.className = 'flex items-start justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm min-h-[60px]'
      item.innerHTML = `
        <div class="flex-1">
          <div class="font-medium cursor-pointer hover:text-blue-600 exclusivity-edit-line" data-name="${ex.name}" data-percentage="${ex.percentage}">${ex.name} (${ex.percentage}%)</div>
          <div class="text-xs text-gray-500 mt-1">Line-specific exclusivity</div>
        </div>
        <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity-line ml-2">Remove</button>
      `

      // Store data on the item
      item.dataset.name = ex.name
      item.dataset.percentage = ex.percentage

      // Add edit functionality
      item.querySelector('.exclusivity-edit-line').addEventListener('click', () => {
        this.editLineExclusivity(modal, item, categoryId, lineIndex)
      })

      // Add remove functionality
      item.querySelector('.remove-exclusivity-line').addEventListener('click', () => {
        item.remove()
        this.updateLineExclusivityTotal(modal)
      })

      list.appendChild(item)
    })

    this.updateLineExclusivityTotal(modal)
  }

  saveLineExclusivities(modal, categoryId, lineIndex, talentDescription) {
    const items = modal.querySelectorAll('.exclusivity-selected-list-line > div')
    const newExclusivities = []

    items.forEach(item => {
      const name = item.dataset.name
      const percentage = parseInt(item.dataset.percentage)
      newExclusivities.push({
        name: name,
        percentage: percentage,
        categoryId: categoryId,
        lineIndex: lineIndex,
        talentDescription: talentDescription
      })
    })

    // Initialize lineExclusivityData if it doesn't exist
    if (!window.lineExclusivityData) {
      window.lineExclusivityData = {}
    }

    // Store the line-specific exclusivities
    const lineKey = `${categoryId}_${lineIndex}`
    window.lineExclusivityData[lineKey] = newExclusivities

    console.log(`Saved line exclusivities for ${lineKey}:`, newExclusivities)
    console.log('🔄 Line exclusivity saved, refreshing tables...')

    // Update all combo tables to reflect changes
    // Use setTimeout to ensure the modal closes before updating tables
    setTimeout(() => {
      this.populateAllTables()
      console.log('✅ Tables refreshed after line exclusivity save')
    }, 100)
  }

  saveExclusivities(modal, comboId) {
    const items = modal.querySelectorAll('.exclusivity-selected-list > div')
    const newExclusivities = []

    items.forEach(item => {
      const nameDiv = item.querySelector('.font-medium')
      if (!nameDiv) return

      const text = nameDiv.textContent
      const nameMatch = text.match(/^(.+) \((\d+)%\)$/)

      if (nameMatch) {
        const name = nameMatch[1]
        const percentage = parseInt(nameMatch[2])

        // Check if this is a line-specific exclusivity
        if (item.dataset.isLineSpecific === 'true') {
          newExclusivities.push({
            name: name,
            percentage: percentage,
            isLineSpecific: true,
            categoryId: parseInt(item.dataset.categoryId),
            lineIndex: parseInt(item.dataset.lineIndex),
            talentDescription: item.dataset.talentDescription
          })
        } else {
          // Category-based exclusivity
          const categories = JSON.parse(item.dataset.categories || '[]')
          if (categories.length > 0) {
            newExclusivities.push({
              name: name,
              percentage: percentage,
              categories: categories
            })
          }
        }
      }
    })
    
    // Store the updated exclusivities (this replaces the list with what's in the modal)
    if (!window.exclusivityData) window.exclusivityData = {}
    window.exclusivityData[comboId] = newExclusivities
    
    // Update the exclusivity tags in the quote preview
    this.updateExclusivityTags(comboId, newExclusivities)
    
    // Create or update hidden form fields for database storage
    this.updateExclusivityFormFields(comboId, newExclusivities)
    
    // Recalculate the buyout percentage to include new exclusivity percentages
    this.populateAllTables()
  }

  updateExclusivityFormFields(comboId, exclusivities) {
    // Remove existing exclusivity form fields for this combo
    document.querySelectorAll(`input[name*="combinations[${comboId}][exclusivity"]`).forEach(input => {
      input.remove()
    })
    
    if (exclusivities.length > 0) {
      // Create form container if it doesn't exist
      let formContainer = document.getElementById('exclusivity-form-fields')
      if (!formContainer) {
        formContainer = document.createElement('div')
        formContainer.id = 'exclusivity-form-fields'
        formContainer.style.display = 'none'
        document.body.appendChild(formContainer)
      }
      
      // Create form fields for each exclusivity
      exclusivities.forEach((exclusivity, index) => {
        // Exclusivity type field
        const typeField = document.createElement('input')
        typeField.type = 'hidden'
        typeField.name = `combinations[${comboId}][exclusivities][${index}][type]`
        typeField.value = exclusivity.name
        formContainer.appendChild(typeField)
        
        // Exclusivity percentage field  
        const percentageField = document.createElement('input')
        percentageField.type = 'hidden'
        percentageField.name = `combinations[${comboId}][exclusivities][${index}][percentage]`
        percentageField.value = exclusivity.percentage
        formContainer.appendChild(percentageField)
        
        // Exclusivity categories field
        if (exclusivity.categories && exclusivity.categories.length > 0) {
          const categoriesField = document.createElement('input')
          categoriesField.type = 'hidden'
          categoriesField.name = `combinations[${comboId}][exclusivities][${index}][categories]`
          categoriesField.value = JSON.stringify(exclusivity.categories)
          formContainer.appendChild(categoriesField)
        }
        
        // Check if it's pharmaceutical for the boolean field
        if (exclusivity.name.toLowerCase().includes('pharmaceutical')) {
          const pharmaField = document.createElement('input')
          pharmaField.type = 'hidden'
          pharmaField.name = `combinations[${comboId}][pharmaceutical]`
          pharmaField.value = 'true'
          formContainer.appendChild(pharmaField)
        }
      })
      
      // Calculate total exclusivity level
      const totalPercentage = exclusivities.reduce((sum, ex) => sum + ex.percentage, 0)
      const levelField = document.createElement('input')
      levelField.type = 'hidden'
      levelField.name = `combinations[${comboId}][exclusivity_level]`
      levelField.value = totalPercentage
      formContainer.appendChild(levelField)
      
      // Set primary exclusivity type (first one or most significant)
      const primaryType = exclusivities.length > 0 ? exclusivities[0].name : ''
      const primaryField = document.createElement('input')
      primaryField.type = 'hidden'
      primaryField.name = `combinations[${comboId}][exclusivity_type]`
      primaryField.value = primaryType
      formContainer.appendChild(primaryField)
    }
  }

  updateExclusivityTags(comboId, exclusivities) {
    // Instead of showing tags in one place, we now refresh the entire table
    // so pills appear in individual rows where they apply
    console.log(`🏷️ Updating exclusivity tags for combo ${comboId}:`, exclusivities)
    this.populateComboTable(comboId)
    console.log(`🔄 Finished updating table for combo ${comboId}`)
  }

  removeExclusivityPill(comboId, index, categoryId) {
    // Get current exclusivities from storage
    const currentExclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
    
    // Find the exclusivity to modify
    if (index >= 0 && index < currentExclusivities.length) {
      const exclusivity = currentExclusivities[index]
      
      // If this exclusivity has categories, remove only the specific category
      if (exclusivity.categories && exclusivity.categories.length > 0) {
        const categoryIndex = exclusivity.categories.indexOf(categoryId)
        if (categoryIndex > -1) {
          exclusivity.categories.splice(categoryIndex, 1)
          
          // If no categories left, remove the entire exclusivity
          if (exclusivity.categories.length === 0) {
            currentExclusivities.splice(index, 1)
          }
        }
      } else {
        // If no specific categories (applies to all), remove the entire exclusivity
        currentExclusivities.splice(index, 1)
      }
      
      // Clean up exclusivities with no categories and update storage
      const cleanedExclusivities = currentExclusivities.filter(ex => 
        !ex.categories || ex.categories.length > 0
      )
      
      if (!window.exclusivityData) window.exclusivityData = {}
      window.exclusivityData[comboId] = cleanedExclusivities
      
      // Update the visual tags
      this.updateExclusivityTags(comboId, cleanedExclusivities)
      
      // Update form fields
      this.updateExclusivityFormFields(comboId, cleanedExclusivities)
      
      // Recalculate the buyout percentage which now includes exclusivity
      this.populateAllTables()
    }
  }

  removeLineSpecificExclusivity(categoryId, lineIndex, index) {
    const lineKey = `${categoryId}_${lineIndex}`

    // Get current line-specific exclusivities for this line
    if (!window.lineExclusivityData || !window.lineExclusivityData[lineKey]) {
      console.log(`No line exclusivities found for ${lineKey}`)
      return
    }

    const lineExclusivities = window.lineExclusivityData[lineKey]

    // Remove the exclusivity at the specified index
    if (index >= 0 && index < lineExclusivities.length) {
      const removedExclusivity = lineExclusivities.splice(index, 1)[0]
      console.log(`Removed line exclusivity: ${removedExclusivity.name} from ${lineKey}`)

      // If no exclusivities left for this line, clean up the entry
      if (lineExclusivities.length === 0) {
        delete window.lineExclusivityData[lineKey]
        console.log(`Cleaned up empty line exclusivity data for ${lineKey}`)
      }

      // Refresh the tables to show the updated exclusivity pills
      this.populateAllTables()
    } else {
      console.log(`Invalid index ${index} for line exclusivities`)
    }
  }

  // Helper functions for category selection memory
  getRememberedCategories(comboId) {
    if (!window.categoryMemory) window.categoryMemory = {}
    // Default to all categories checked if no memory exists
    return window.categoryMemory[comboId] || [1, 2, 3, 4, 5]
  }

  rememberCategories(comboId, selectedCategories) {
    if (!window.categoryMemory) window.categoryMemory = {}
    window.categoryMemory[comboId] = [...selectedCategories]
  }

  setupCurrencyAndGuaranteeListeners() {
    // Use event delegation for currency selectors and guarantee checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('currency-selector')) {
        const comboId = e.target.getAttribute('data-combo')
        this.handleCurrencyChange(comboId, e.target.value)
      }
      
      if (e.target.classList.contains('guarantee-checkbox')) {
        const comboId = e.target.getAttribute('data-combo')
        this.handleGuaranteeChange(comboId, e.target.checked)
      }
    })
  }

  async handleCurrencyChange(comboId, selectedCurrency) {
    console.log(`💱 Currency changed to ${selectedCurrency} for combo ${comboId}`)
    
    // Update all amounts with new currency
    this.updateAllAmounts(comboId)
  }

  handleGuaranteeChange(comboId, isGuaranteed) {
    console.log(`🛡️ Guarantee ${isGuaranteed ? 'enabled' : 'disabled'} for combo ${comboId}`)

    // Recalculate the entire table since guarantee affects buyout percentages
    // Pass the guarantee state to avoid timing issues
    this.populateComboTable(comboId, isGuaranteed)

    // Update guarantee savings display
    setTimeout(() => {
      const guaranteeAmountSpan = document.querySelector(`.guarantee-amount[data-combo="${comboId}"]`)
      if (guaranteeAmountSpan) {
        if (isGuaranteed) {
          // Get the total amount after table recalculation
          const totalZarSpan = document.querySelector(`.total-zar-amount[data-combo="${comboId}"]`)
          if (totalZarSpan) {
            const guaranteedAmount = parseFloat(totalZarSpan.textContent.replace(/[R,\s]/g, '')) || 0
            if (guaranteedAmount > 0) {
              // Calculate original amount (before 25% discount)
              const originalAmount = guaranteedAmount / 0.75
              const savings = originalAmount - guaranteedAmount
              guaranteeAmountSpan.innerHTML = `<span style="color: red;">R${this.formatNumber(savings)} saving</span>`
            }
          }
        } else {
          guaranteeAmountSpan.textContent = ''
        }
      }
    }, 100) // Small delay to ensure table is updated
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Using exchangerate-api.com (free tier allows 1500 requests/month)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
    const data = await response.json()
    
    if (data.rates && data.rates[toCurrency]) {
      return data.rates[toCurrency]
    } else {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`)
    }
  }

  async updateAllAmounts(comboId) {
    // Get currency elements only since guarantee affects table calculation directly
    const totalZarSpan = document.querySelector(`.total-zar-amount[data-combo="${comboId}"]`)
    const currencyAmountSpan = document.querySelector(`.currency-amount[data-combo="${comboId}"]`)
    const currencySelector = document.querySelector(`.currency-selector[data-combo="${comboId}"]`)
    
    if (!totalZarSpan) return
    
    const baseAmount = parseFloat(totalZarSpan.getAttribute('data-base-amount'))
    const selectedCurrency = currencySelector ? currencySelector.value : ''
    
    // Update currency amount (convert the final ZAR amount)
    if (currencyAmountSpan) {
      if (!selectedCurrency || selectedCurrency === '') {
        // Show blank when no currency selected
        currencyAmountSpan.textContent = ''
      } else {
        try {
          const exchangeRate = await this.getExchangeRate('ZAR', selectedCurrency)
          const convertedAmount = baseAmount * exchangeRate
          
          const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
          }
          
          const symbol = currencySymbols[selectedCurrency] || selectedCurrency
          currencyAmountSpan.textContent = `${symbol}${this.formatNumber(convertedAmount)}`
        } catch (error) {
          console.error('Failed to get exchange rate:', error)
          // Fallback to USD display with estimated rate
          const fallbackRate = 0.055 // Approximate ZAR to USD rate
          const convertedAmount = baseAmount * fallbackRate
          currencyAmountSpan.textContent = `$${this.formatNumber(convertedAmount)}`
          if (currencySelector) currencySelector.value = 'USD'
        }
      }
    }
  }

  setupFormSubmissionHandler() {
    // Find the main quotation form (not logout or other forms)
    const forms = this.element.querySelectorAll('form:not(.button_to)') ||
                  document.querySelectorAll('form[data-controller="quotation-form"]')

    forms.forEach(form => {
      form.addEventListener('submit', (event) => {
        console.log('🚀 Form submission intercepted! Injecting exclusivity data...')
        console.log('🔍 Current window.exclusivityData:', window.exclusivityData)

        // Prevent the form from submitting immediately
        event.preventDefault()

        // Inject the exclusivity data
        this.injectExclusivityDataIntoForm()

        // After a short delay, submit the form
        setTimeout(() => {
          console.log('🔄 Re-submitting form with injected data...')
          form.submit()
        }, 100)
      })
    })

    console.log(`✅ Set up form submission handlers for ${forms.length} forms`)

    // Also add a test function to window for manual testing
    window.testExclusivityInjection = () => {
      console.log('🧪 Testing exclusivity injection manually...')
      console.log('🔍 Current window.exclusivityData:', window.exclusivityData)
      this.injectExclusivityDataIntoForm()
    }

    // Add function to debug exclusivity buttons
    window.debugExclusivityButtons = () => {
      console.log('🔍 Debugging exclusivity buttons...')
      const buttons = document.querySelectorAll('.exclusivity-plus-btn')
      console.log(`Found ${buttons.length} exclusivity plus buttons:`, buttons)

      const quoteTables = document.querySelectorAll('.quote-preview-table')
      console.log(`Found ${quoteTables.length} quote tables:`, quoteTables)

      const exclusivityRows = document.querySelectorAll('[data-row-type="exclusivity"]')
      console.log(`Found ${exclusivityRows.length} exclusivity rows:`, exclusivityRows)
    }

    // Add function to manually test form submission
    window.testFormSubmission = () => {
      console.log('🧪 Testing form submission manually...')
      console.log('🔍 Current window.exclusivityData:', window.exclusivityData)
      this.injectExclusivityDataIntoForm()

      const form = document.querySelector('form')
      console.log('📝 Form after injection:', form)

      const exclusivityFields = document.querySelectorAll('input[name*="exclusivity"]')
      console.log(`Found ${exclusivityFields.length} exclusivity fields:`, exclusivityFields)

      exclusivityFields.forEach(field => {
        console.log(`   Field: ${field.name} = "${field.value}"`)
      })
    }
  }
}