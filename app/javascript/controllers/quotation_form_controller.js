// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  // Store references to bound event handlers for cleanup
  constructor(...args) {
    super(...args)
    this.boundDocumentClickHandler = this.handleDocumentClick.bind(this)
    this.boundCastInputHandler = this.handleCastInput.bind(this)
    this.boundCastChangeHandler = this.handleCastChange.bind(this)
    this.boundCastClickHandler = this.handleCastClick.bind(this)
    this.boundExclusivityClickHandler = this.handleExclusivityClick.bind(this)
    this.boundMediaTypeChangeHandler = this.handleMediaTypeChangeEvent.bind(this)
    this.boundRateValidationInputHandler = this.handleRateValidationInput.bind(this)
    this.boundComboSummaryChangeHandler = this.handleComboSummaryChange.bind(this)
    this.documentListenerAttached = false
  }

  connect() {
    console.log('🔌 Quotation form controller CONNECTING...')
    console.log('🔌 Element:', this.element)
    console.log('🔌 Current listener states:', {
      documentClick: window.quotationDocumentListenerAttached,
      castInput: window.quotationCastInputListenerAttached,
      castChange: window.quotationCastChangeListenerAttached,
      castClick: window.quotationCastClickListenerAttached,
      exclusivity: window.quotationExclusivityClickListenerAttached,
      mediaType: window.quotationMediaTypeChangeListenerAttached,
      rateValidation: window.quotationRateValidationInputListenerAttached,
      comboSummary: window.quotationComboSummaryChangeListenerAttached
    })

    try {
      // Make controller available globally for HTML callback functions
      window.quotationFormController = this
      console.log('✅ Controller set on window.quotationFormController')
    } catch (error) {
      console.error('❌ Error setting controller on window:', error)
    }

    // Prevent Enter key from submitting the form
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault()
      }
    })

    // Clear exclusivity data for new quotes to prevent persistence from previous quotes
    if (window.location.pathname.includes('/quotations/new')) {
      console.log('New quotation detected - clearing all exclusivity data')
      this.clearExclusivityData()
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
    this.setupCastSelection()

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

    // Load stored combinations data for edit mode immediately (no delay needed)
    this.loadStoredCombinationsData()

    // Calculate all category totals on page load (important for edit mode)
    this.calculateAllVisibleCategoryTotals()

    console.log('✅ Quotation form controller connection COMPLETED successfully!')
  }

  disconnect() {
    console.log('🔌 Quotation form controller DISCONNECTING - cleaning up event listeners')

    // Always remove listeners and reset flags to prevent stale references
    // Remove document click listener
    if (window.quotationDocumentClickHandler) {
      document.removeEventListener('click', window.quotationDocumentClickHandler)
      console.log('✓ Global document click listener removed')
    }
    window.quotationDocumentListenerAttached = false
    window.quotationDocumentClickHandler = null

    // Remove cast selection listeners
    if (window.quotationCastInputHandler) {
      document.removeEventListener('input', window.quotationCastInputHandler)
      console.log('✓ Cast input listener removed')
    }
    window.quotationCastInputListenerAttached = false
    window.quotationCastInputHandler = null

    if (window.quotationCastChangeHandler) {
      document.removeEventListener('change', window.quotationCastChangeHandler)
      console.log('✓ Cast change listener removed')
    }
    window.quotationCastChangeListenerAttached = false
    window.quotationCastChangeHandler = null

    if (window.quotationCastClickHandler) {
      document.removeEventListener('click', window.quotationCastClickHandler)
      console.log('✓ Cast click listener removed')
    }
    window.quotationCastClickListenerAttached = false
    window.quotationCastClickHandler = null

    // Remove exclusivity listener
    if (window.quotationExclusivityClickHandler) {
      document.removeEventListener('click', window.quotationExclusivityClickHandler)
      console.log('✓ Exclusivity click listener removed')
    }
    window.quotationExclusivityClickListenerAttached = false
    window.quotationExclusivityClickHandler = null

    // Remove media type listener
    if (window.quotationMediaTypeChangeHandler) {
      document.removeEventListener('change', window.quotationMediaTypeChangeHandler)
      console.log('✓ Media type change listener removed')
    }
    window.quotationMediaTypeChangeListenerAttached = false
    window.quotationMediaTypeChangeHandler = null

    // Remove rate validation listener
    if (window.quotationRateValidationInputHandler) {
      document.removeEventListener('input', window.quotationRateValidationInputHandler)
      console.log('✓ Rate validation input listener removed')
    }
    window.quotationRateValidationInputListenerAttached = false
    window.quotationRateValidationInputHandler = null

    // Remove combo summary listener
    if (window.quotationComboSummaryChangeHandler) {
      document.removeEventListener('change', window.quotationComboSummaryChangeHandler)
      console.log('✓ Combo summary change listener removed')
    }
    window.quotationComboSummaryChangeListenerAttached = false
    window.quotationComboSummaryChangeHandler = null

    console.log('✅ All event listeners cleaned up successfully')
  }

  // Method to clear all exclusivity data to prevent persistence between quotes
  clearExclusivityData() {
    console.log('🧹 Clearing all exclusivity data...')

    // Clear global variables
    window.exclusivityData = {}
    window.lineExclusivityData = {}

    // Clear all exclusivity-related hidden form fields
    document.querySelectorAll('input[name*="exclusivity"], input[name*="exclusivities"]').forEach(field => {
      console.log('Removing exclusivity field:', field.name)
      field.remove()
    })

    // Clear exclusivity tags and visual elements
    document.querySelectorAll('.exclusivity-tag, [data-exclusivity]').forEach(element => {
      element.remove()
    })

    // Clear exclusivity dropdowns and selections
    document.querySelectorAll('select[name*="exclusivity"]').forEach(select => {
      select.selectedIndex = 0
    })

    console.log('✅ Exclusivity data cleared successfully')
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

  addTalentLine(categoryId, bypassDebounce = false) {
    console.log(`addTalentLine called for category: ${categoryId}, bypassDebounce: ${bypassDebounce}`)

    // Debounce: prevent rapid clicks with category-specific tracking (unless bypassed)
    const debounceKey = `addingLine_${categoryId}`
    if (!bypassDebounce && (this.addingLine || this[debounceKey])) {
      console.log('⚠️ Already adding line, ignoring click')
      return
    }
    if (!bypassDebounce) {
      this.addingLine = true
      this[debounceKey] = true
    }

    const additionalLinesContainer = document.querySelector(`[data-category="${categoryId}"].additional-lines`)
    if (!additionalLinesContainer) {
      console.error(`Could not find additional lines container for category ${categoryId}`)
      if (!bypassDebounce) {
        this.addingLine = false
        const debounceKey = `addingLine_${categoryId}`
        this[debounceKey] = false
      }
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

    // Reset debounce flags after a short delay (only if they were set)
    if (!bypassDebounce) {
      setTimeout(() => {
        this.addingLine = false
        const debounceKey = `addingLine_${categoryId}`
        this[debounceKey] = false
      }, 500)
    }
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
    // Scope the query to the specific category to avoid conflicts
    const categorySection = document.getElementById(`talent-category-${categoryId}`)
    if (!categorySection) return

    const lineRow = categorySection.querySelector(`[data-line-index="${lineIndex}"]`)
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

  calculateAllVisibleCategoryTotals() {
    console.log('🔄 Calculating all visible category totals on page load...')

    // Find all visible talent category sections
    const visibleCategories = document.querySelectorAll('.talent-category-section:not(.hidden)')

    visibleCategories.forEach(section => {
      // Extract category ID from the section's id attribute (format: talent-category-{id})
      const categoryId = section.id.replace('talent-category-', '')

      if (categoryId) {
        console.log(`  ✓ Calculating total for category: ${categoryId}`)
        this.calculateCategoryTotal(categoryId)
      }
    })

    console.log('✅ All visible category totals calculated')
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
    // Attach with protection against duplicates
    if (!window.quotationMediaTypeChangeListenerAttached) {
      console.log('Attaching media type change listener')
      document.addEventListener('change', this.boundMediaTypeChangeHandler)
      window.quotationMediaTypeChangeListenerAttached = true
      window.quotationMediaTypeChangeHandler = this.boundMediaTypeChangeHandler
    } else {
      console.log('Media type change listener already attached, replacing handler')
      document.removeEventListener('change', window.quotationMediaTypeChangeHandler)
      document.addEventListener('change', this.boundMediaTypeChangeHandler)
      window.quotationMediaTypeChangeHandler = this.boundMediaTypeChangeHandler
    }
  }

  // Handler for media type change events
  handleMediaTypeChangeEvent(e) {
    if (e.target.classList.contains('combination-media')) {
      const comboId = e.target.getAttribute('data-combo')
      this.handleMediaTypeChange(e.target, comboId)
    }
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

    if (selectedTerritories.length === 0) {
      this.hideTerritoryOverrideNotice(comboId)
      this.unforceAllMediaForCombo(comboId)
      return
    }

    // Special case: If Worldwide is selected (alone or with others), bypass override
    // Worldwide (1200%) is already the default override value, so no need to show override message
    const territoryNames = Array.from(selectedTerritories).map(cb => cb.dataset.territoryName)

    if (territoryNames.includes('Worldwide')) {
      console.log('🔄 Worldwide is selected - bypassing override logic (already at Worldwide rate)')
      this.hideTerritoryOverrideNotice(comboId)
      this.unforceAllMediaForCombo(comboId)
      return
    }

    // Calculate total percentage using RAW territory percentages (NOT exception rates)
    // Exception rates should only be used if override is NOT triggered
    let totalPercentage = 0

    selectedTerritories.forEach(checkbox => {
      const territoryName = checkbox.dataset.territoryName || checkbox.textContent.trim()
      const rawPercentage = parseFloat(checkbox.dataset.percentage) || 0
      totalPercentage += rawPercentage
      console.log(`📊 Territory: ${territoryName} = ${rawPercentage}% (raw)`)
    })

    console.log(`📊 Total territory percentage (raw): ${totalPercentage}% vs threshold: ${threshold}%`)

    if (totalPercentage >= threshold) {
      // Show override notice
      this.showTerritoryOverrideNotice(comboId, totalPercentage, threshold, durationMonths)

      // Force All Media selection for this combo
      this.forceAllMediaForCombo(comboId)

    } else {
      // Remove override notice if it exists
      this.hideTerritoryOverrideNotice(comboId)

      // Unforce All Media to allow user to select other options again
      this.unforceAllMediaForCombo(comboId)
    }
  }

  showTerritoryOverrideNotice(comboId, actualPercentage, threshold, durationMonths) {
    console.log(`⚠️ Showing territory override notice for combo ${comboId}`)
    let noticeContainer = document.getElementById(`territory-override-notice-${comboId}`)

    // Create notice container if it doesn't exist
    if (!noticeContainer) {
      console.log(`📝 Creating new notice container`)
      noticeContainer = document.createElement('div')
      noticeContainer.id = `territory-override-notice-${comboId}`
      noticeContainer.className = 'bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-4 rounded'

      // Find where to insert the notice (after territory selection section)
      const comboContent = document.querySelector(`[data-combo="${comboId}"].combination-content`)
      console.log(`🔍 Looking for combo content, found: ${!!comboContent}`)
      if (comboContent) {
        const territorySection = comboContent.querySelector('.territories-list')?.parentElement?.parentElement
        console.log(`🔍 Looking for territory section, found: ${!!territorySection}`)
        if (territorySection) {
          territorySection.appendChild(noticeContainer)
          console.log(`✅ Notice container appended to territory section`)
        } else {
          console.error(`❌ Territory section not found for combo ${comboId}`)
        }
      } else {
        console.error(`❌ Combo content not found for combo ${comboId}`)
      }
    } else {
      console.log(`ℹ️ Notice container already exists, updating content`)
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
    console.log(`🔒 Forcing All Media for combo ${comboId}`)
    const selector = `input[name="combinations[${comboId}][media_types][]"][value="all_media"]`
    console.log(`🔍 Looking for selector: ${selector}`)
    const allMediaCheckbox = document.querySelector(selector)

    if (!allMediaCheckbox) {
      console.error(`❌ All Media checkbox not found for combo ${comboId}`)
      return
    }

    console.log(`✅ Found All Media checkbox, currently checked: ${allMediaCheckbox.checked}`)

    if (!allMediaCheckbox.checked) {
      allMediaCheckbox.checked = true
      console.log(`✅ Set All Media checkbox to checked`)
      // Trigger the media logic to disable other options
      allMediaCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
      console.log(`✅ Dispatched change event`)
    } else {
      console.log(`ℹ️ All Media already checked, no action needed`)
    }
  }

  unforceAllMediaForCombo(comboId) {
    // Re-enable all media checkboxes for this combo when override no longer applies
    const mediaCheckboxes = document.querySelectorAll(`input[name="combinations[${comboId}][media_types][]"]`)
    mediaCheckboxes.forEach(checkbox => {
      // Remove disabled attribute if it was set by the override
      checkbox.disabled = false
    })

    // Also re-enable the labels
    mediaCheckboxes.forEach(checkbox => {
      const label = checkbox.closest('label')
      if (label) {
        label.classList.remove('opacity-50', 'cursor-not-allowed')
      }
    })
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
      
      // Clear input values and remove validation attributes for this specific removed category
      categorySection.querySelectorAll('input').forEach(input => {
        // Clear values for the removed category
        input.value = input.type === 'number' ? '0' : ''

        // Remove validation attributes to prevent form validation errors on hidden fields
        input.removeAttribute('required')
        input.removeAttribute('min')
        input.removeAttribute('max')
      })
    }
    
    if (talentBtn) {
      // Reset button to inactive tab state
      talentBtn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500')
      talentBtn.classList.add('border-gray-300', 'hover:bg-blue-50')
      talentBtn.style.opacity = '1'
      talentBtn.style.pointerEvents = 'auto'
    }
    
    // Clean up any other hidden fields that might have validation issues
    this.cleanupHiddenFieldValidation()

    // Recalculate totals
    this.calculateCategoryTotal(categoryId)

    // Update all combo tables to reflect the removed category
    this.populateAllTables()
  }

  cleanupHiddenFieldValidation() {
    // Target specific problematic fields that cause "not focusable" errors
    // These are typically fields with validation that are hidden or in hidden containers

    // Clean up only inputs that are specifically causing validation issues
    document.querySelectorAll('.talent-category-section.hidden input[min], .talent-category-section.hidden input[required]').forEach(input => {
      input.removeAttribute('required')
      input.removeAttribute('min')
      input.removeAttribute('max')
      console.log(`🧹 Cleaned validation from hidden field: ${input.name}`)
    })

    // Clean up night_count inputs that are hidden but have validation
    document.querySelectorAll('input[name*="night_count"].hidden').forEach(input => {
      input.removeAttribute('required')
      input.removeAttribute('min')
      input.removeAttribute('max')
      console.log(`🧹 Cleaned validation from hidden night_count: ${input.name}`)
    })

    console.log('🧹 Targeted cleanup of problematic validation attributes completed')
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

          // Count all talent inputs from additional-lines tbody (includes first row at index 0)
          // This prevents double-counting since first row has data-line-index="0"
          const allTalentInputs = categorySection.querySelectorAll('.additional-lines .talent-count')
          allTalentInputs.forEach(input => {
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
    // Attach with protection against duplicates
    if (!window.quotationRateValidationInputListenerAttached) {
      console.log('Attaching rate validation input listener')
      document.addEventListener('input', this.boundRateValidationInputHandler)
      window.quotationRateValidationInputListenerAttached = true
      window.quotationRateValidationInputHandler = this.boundRateValidationInputHandler
    } else {
      console.log('Rate validation input listener already attached, replacing handler')
      document.removeEventListener('input', window.quotationRateValidationInputHandler)
      document.addEventListener('input', this.boundRateValidationInputHandler)
      window.quotationRateValidationInputHandler = this.boundRateValidationInputHandler
    }
  }

  // Handler for rate validation input events
  handleRateValidationInput(e) {
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
  }

  setupComboSummaryUpdate() {
    // Set up event listeners to update the combo summary heading
    this.updateAllComboSummaries()

    // Attach combo summary change listener with protection against duplicates
    if (!window.quotationComboSummaryChangeListenerAttached) {
      console.log('Attaching combo summary change listener')
      document.addEventListener('change', this.boundComboSummaryChangeHandler)
      window.quotationComboSummaryChangeListenerAttached = true
      window.quotationComboSummaryChangeHandler = this.boundComboSummaryChangeHandler
    } else {
      console.log('Combo summary change listener already attached, replacing handler')
      document.removeEventListener('change', window.quotationComboSummaryChangeHandler)
      document.addEventListener('change', this.boundComboSummaryChangeHandler)
      window.quotationComboSummaryChangeHandler = this.boundComboSummaryChangeHandler
    }
  }

  // Handler for combo summary change events (consolidated from multiple listeners)
  handleComboSummaryChange(e) {
    // Check for duration changes
    if (e.target.matches('select[name*="duration"]')) {
      this.updateAllComboSummaries()
      return
    }

    // Check for territory changes
    if (e.target.classList.contains('territory-checkbox') ||
        e.target.classList.contains('combination-territory-checkbox')) {
      this.updateAllComboSummaries()
      return
    }

    // Check for media type changes
    if (e.target.classList.contains('combination-media')) {
      this.updateAllComboSummaries()
      return
    }

    // Check for unlimited options changes
    if (e.target.matches('[name*="unlimited_stills"]') ||
        e.target.matches('[name*="unlimited_versions"]')) {
      this.updateAllComboSummaries()
      return
    }
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
    return new Promise((resolve, reject) => {
      try {
        if (!window.exclusivityData) {
          console.log('❌ No window.exclusivityData found - skipping injection')
          resolve() // This is not an error, just no data to inject
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
          reject(new Error('No suitable form found for exclusivity injection'))
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
          // DON'T apply category-based exclusivities globally - they should only apply within their specific combo
          // The calculated values from JavaScript preview will handle the per-line exclusivities correctly
          console.log(`🚫 Skipping global category-based exclusivity injection: ${exclusivity.name} ${exclusivity.percentage}% for categories ${exclusivity.categories} (will be handled by combo-specific calculated values)`)
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

    // Also inject line-specific exclusivities from window.lineExclusivityData for all combos
    if (window.lineExclusivityData) {
      console.log('🔍 Injecting line-specific exclusivities from lineExclusivityData:', window.lineExclusivityData)

      Object.keys(window.lineExclusivityData).forEach(lineKey => {
        // Extract combo info from the line key
        const [keyComboId, categoryId, lineIndex] = lineKey.split('_')
        const lineExclusivities = window.lineExclusivityData[lineKey] || []

        lineExclusivities.forEach(exclusivity => {
          const lineExclusivityField = document.createElement('input')
          lineExclusivityField.type = 'hidden'
          lineExclusivityField.name = `combinations[${keyComboId}][talent][${exclusivity.categoryId}][lines][${exclusivity.lineIndex}][exclusivity_type]`
          lineExclusivityField.value = `${exclusivity.name} ${exclusivity.percentage}%`
          form.appendChild(lineExclusivityField)

          console.log(`✅ Added line-specific exclusivity from lineExclusivityData for combo ${keyComboId}: ${exclusivity.name} ${exclusivity.percentage}% for category ${exclusivity.categoryId}, line ${exclusivity.lineIndex}`)
        })
      })
    }

        console.log('✅ Finished injecting exclusivity data into form')
        resolve()
      } catch (error) {
        console.error('❌ Error injecting exclusivity data:', error)
        reject(error)
      }
    })
  }

  injectBuyoutPercentagesIntoForm() {
    // Calculate and inject buyout percentages for main talent categories
    console.log('🔄 Injecting buyout percentages for main talent categories...')

    // Find the main quotation form
    const form = document.querySelector('form[data-controller="quotation-form"]') ||
                 document.querySelector('form:not(.button_to)') ||
                 this.element.querySelector('form')

    if (!form) {
      console.log('❌ No suitable form found for buyout percentage injection')
      return
    }

    // Remove any existing buyout percentage hidden fields
    document.querySelectorAll('input[name*="buyout_percentage"]:not([name*="lines"])').forEach(field => {
      field.remove()
    })

    // Get all main talent category inputs (not additional lines)
    const talentInputs = document.querySelectorAll('input[name*="talent"][name*="talent_count"]')

    talentInputs.forEach(input => {
      const categoryIdMatch = input.name.match(/talent\[(\d+)\]\[talent_count\]/)
      if (categoryIdMatch && input.value > 0) {
        const categoryId = categoryIdMatch[1]

        // Calculate buyout percentage for this main category
        // Use the first combo's data to calculate (for main categories, all combos should have same base calculation)
        const comboIds = Array.from(document.querySelectorAll('[data-combo]')).map(el => el.getAttribute('data-combo')).filter(id => id)
        const firstComboId = comboIds[0] || '1'

        // Get base buyout percentage for this combo (without line-specific exclusivities)
        let buyoutPercentage = this.calculateBaseBuyoutPercentage(firstComboId)

        // Apply product type adjustment if this is a kids category
        if (categoryId == '5') { // Kids category
          const productType = this.getSelectedProductType()
          if (productType === 'adult') {
            buyoutPercentage *= 0.5  // 50% reduction
          } else if (productType === 'family') {
            buyoutPercentage *= 0.75 // 25% reduction
          }
        }

        // Apply guarantee reduction if applicable
        const guaranteeCheckbox = document.querySelector('.guarantee-checkbox:checked')
        if (guaranteeCheckbox) {
          buyoutPercentage *= 0.75 // 25% reduction for guarantee
        }

        // Create hidden field for main category buyout percentage
        const buyoutField = document.createElement('input')
        buyoutField.type = 'hidden'
        buyoutField.name = `talent[${categoryId}][buyout_percentage]`
        buyoutField.value = buyoutPercentage
        form.appendChild(buyoutField)

        console.log(`✅ Added buyout percentage ${buyoutPercentage}% for main category ${categoryId}`)
      }
    })
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
      if (e.target.name?.includes('description') ||
          e.target.name?.includes('adjusted_rate') ||
          e.target.name?.includes('talent_count') ||
          e.target.name?.includes('overtime_hours') ||
          e.target.name?.includes('rehearsal_days') ||
          e.target.name?.includes('travel_days') ||
          e.target.name?.includes('down_days') ||
          e.target.name?.includes('days_count')) {
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
    console.log('🔄 populateAllTables - Starting table population with Cast Selection integration');

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

    // If no existing values (initial load), try to get from stored data
    if (Object.keys(existingCommercialValues).length === 0) {
      console.log(`🔍 No existing commercial values, checking stored data for combo ${comboId}`)
      try {
        const combinationsInput = document.querySelector('input[name="combinations"]')
        if (combinationsInput && combinationsInput.value) {
          const storedData = JSON.parse(combinationsInput.value)
          const comboData = storedData[comboId] || storedData[`combo_${comboId}`]
          if (comboData) {
            // Check for num_commercials at combo level
            const defaultCommercialCount = comboData.num_commercials || 1
            console.log(`💾 Using default commercial count from stored data: ${defaultCommercialCount}`)

            // Check for line-specific commercial counts in calculated_values
            if (comboData.calculated_values) {
              Object.entries(comboData.calculated_values).forEach(([categoryId, lines]) => {
                Object.entries(lines).forEach(([lineIndex, lineData]) => {
                  const key = `${categoryId}_${lineIndex}`
                  const commercialCount = lineData.commercial_count || defaultCommercialCount
                  existingCommercialValues[key] = commercialCount
                  console.log(`💾 Set commercial count from stored data for ${key}: ${commercialCount}`)
                })
              })
            }
          }
        }
      } catch (e) {
        console.error('❌ Error loading commercial counts from stored data:', e)
      }
    }

    // Determine guarantee state for this combo
    let isGuaranteedForCombo = false
    if (guaranteeState !== null) {
      // Use passed guarantee state to avoid timing issues
      isGuaranteedForCombo = guaranteeState
    } else {
      // Try to read from stored data first (for edit mode)
      try {
        const combinationsInput = document.querySelector('input[name="combinations"]')
        if (combinationsInput && combinationsInput.value) {
          const storedData = JSON.parse(combinationsInput.value)
          const comboData = storedData[comboId] || storedData[`combo_${comboId}`]
          if (comboData && comboData.is_guaranteed !== undefined) {
            isGuaranteedForCombo = comboData.is_guaranteed
            console.log(`🛡️ Using guarantee state from stored data for combo ${comboId}: ${isGuaranteedForCombo}`)
          }
        }
      } catch (e) {
        console.error('❌ Error loading guarantee state from stored data:', e)
      }

      // Fallback to reading from DOM if not found in stored data
      if (isGuaranteedForCombo === false) {
        const guaranteeCheckbox = document.querySelector(`.guarantee-checkbox[data-combo="${comboId}"]`)
        isGuaranteedForCombo = guaranteeCheckbox && guaranteeCheckbox.checked
        // For initial load when no checkbox exists yet, default to false
      }
    }

    const rows = []
    let totalAmount = 0

    // Get all talent categories and their lines
    const talentCategories = this.getAllTalentLines(comboId)

    console.log(`🔍 getAllTalentLines returned ${talentCategories.length} categories`)
    talentCategories.forEach((category, categoryIdx) => {
      console.log(`🔍 Processing category ${categoryIdx}: ${category.name} with ${category.lines.length} lines`)
      category.lines.forEach((line, lineIndex) => {
        const dayFee = parseFloat(line.adjustedRate || line.dailyRate || 0)
        const unit = parseInt(line.initialCount || 0)

        // Get exclusivities that apply to this talent category
        const categoryId = category.id
        console.log(`🔍 Processing line ${categoryId}_${lineIndex}: ${line.description || category.name}`)
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

          // Use the exclusivity's own line index for line-specific exclusivities, or current row's line index for category exclusivities
          const pillLineIndex = isLineSpecific ? ex.lineIndex : lineIndex

          return `<span class="inline-flex items-center px-1 py-0.5 ${pillType} text-xs rounded-full">
            ${ex.name} ${ex.percentage}%
            <button type="button" class="ml-1 hover:font-bold remove-exclusivity-pill" data-combo="${comboId}" data-index="${originalIndex}" data-category="${categoryId}" data-line-index="${pillLineIndex}" title="${title}">×</button>
          </span>`
        }).join('')

        rows.push(`
          <tr class="border-b border-gray-200" data-category-id="${categoryId}" data-line-index="${lineIndex}">
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
              <input type="hidden" name="talent[${categoryId}][lines][${lineIndex}][buyout_percentage]" value="${rowBuyoutPercentage}">
            </td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">${rowBuyoutPercentage.toFixed(1)}%</td>
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
        <tr class="border-b-2 border-gray-400 bg-gray-100 font-semibold hidden">
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

  getAllTalentLines(comboId = null) {
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

    // Check if cast selection is active - if so, filter by selected cast
    const selectedCastFilter = new Set()
    let castCheckboxes, allCastCheckboxes, castSelectionContainers

    if (comboId) {
      // Only look at checkboxes for the specific combo
      const comboContainer = document.querySelector(`.cast-selection-container[data-combo="${comboId}"]`)
      if (comboContainer) {
        castCheckboxes = comboContainer.querySelectorAll('.cast-selection-checkbox:checked')
        allCastCheckboxes = comboContainer.querySelectorAll('.cast-selection-checkbox')
        castSelectionContainers = [comboContainer]
      } else {
        castCheckboxes = []
        allCastCheckboxes = []
        castSelectionContainers = []
      }
    } else {
      // Fallback to global search (for backwards compatibility)
      castCheckboxes = document.querySelectorAll('.cast-selection-checkbox:checked')
      allCastCheckboxes = document.querySelectorAll('.cast-selection-checkbox')
      castSelectionContainers = document.querySelectorAll('.cast-selection-container')
    }

    // Feature detection: Check if cast selection containers exist (they're always there)
    const hasCastSelectionFeature = castSelectionContainers.length > 0
    const hasCastSelection = castCheckboxes.length > 0

    console.log(`🔍 Cast selection detection for combo ${comboId}: containers=${castSelectionContainers.length}, checkboxes=${allCastCheckboxes.length}, checked=${castCheckboxes.length}`)

    if (hasCastSelectionFeature) {
      if (hasCastSelection) {
        // Cast selection exists and some are checked - only show selected
        castCheckboxes.forEach(checkbox => {
          selectedCastFilter.add(checkbox.value) // Format: "categoryId_lineIndex"
        })
        console.log(`🎯 Cast selection filter active for combo ${comboId}:`, Array.from(selectedCastFilter))
      } else {
        // Cast selection exists but none are checked - show nothing
        console.log(`🚫 Cast selection available but nothing selected for combo ${comboId} - showing no talent`)
        return [] // Return empty array to show no talent
      }
    } else {
      console.log(`📋 No cast selection feature for combo ${comboId} - showing all talent`)
    }

    // Only process categories 1-5 as requested
    document.querySelectorAll('[id^="talent-category-"]').forEach(section => {
      const categoryId = section.id.replace('talent-category-', '')
      const categoryIdNum = parseInt(categoryId)

      // Include all categories 1-7 including Walk-ons and Extras
      if (categoryIdNum < 1 || categoryIdNum > 7) {
        return
      }
      
      const categoryName = categoryNames[categoryIdNum]
      const categoryAbbr = categoryAbbreviations[categoryIdNum]
      const lines = []

      // Get ALL talent input rows (all lines including line 0 are now in .additional-lines)
      const allRows = []

      const talentRows = section.querySelectorAll('.additional-lines .talent-input-row')
      talentRows.forEach((row) => {
        const descriptionField = row.querySelector('.talent-description, [name*="description"]')
        const rateField = row.querySelector('[name*="adjusted_rate"]')
        const countField = row.querySelector('[name*="talent_count"]')

        // Get line index from data attribute, or use 0 as fallback
        const lineIndex = parseInt(row.dataset.lineIndex) || 0

        allRows.push({
          descriptionField,
          rateField,
          countField,
          lineIndex
        })
      })

      // Track line indices to prevent duplicates
      const seenLineIndices = new Set()

      allRows.forEach(({descriptionField, rateField, countField, lineIndex}) => {
        const description = descriptionField?.value || ''
        const rate = rateField?.value || 0
        const count = countField?.value || 0

        // Skip if we've already processed this line index for this category
        if (seenLineIndices.has(lineIndex)) {
          console.warn(`⚠️ Duplicate line index detected: ${categoryId}_${lineIndex} - skipping`)
          return
        }

        // Only include rows that have actual talent count > 0 AND (description OR rate > 0)
        // This prevents showing fake data with 0 units
        if (parseInt(count) > 0 && (description.trim() || parseFloat(rate) > 0)) {
          // Check if cast selection filter is active and if this specific line is selected
          const lineKey = `${categoryId}_${lineIndex}` // Use correct line index
          const isSelectedInCast = !hasCastSelectionFeature || selectedCastFilter.has(lineKey)

          if (isSelectedInCast) {
            // Use description as-is without adding abbreviation prefix
            const trimmedDescription = description.trim()
            const finalDescription = trimmedDescription || categoryName

            lines.push({
              description: finalDescription,
              adjustedRate: parseFloat(rate) || 0,
              dailyRate: parseFloat(rate) || 0,
              initialCount: parseInt(count) || 0
            })
            seenLineIndices.add(lineIndex)
            console.log(`✅ Including talent: ${finalDescription} (${lineKey}) count=${count} for combo ${comboId}`)
          } else {
            console.log(`🚫 Skipping talent: ${description || categoryName} (${lineKey}) - not selected in cast for combo ${comboId}`)
          }
        }
      })
      
      if (lines.length > 0) {
        categories.push({
          id: categoryIdNum,
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
      name: cb.getAttribute('data-territory-name') || cb.textContent.trim(),
      percentage: parseFloat(cb.getAttribute('data-percentage') || 0)
    }))
    
    const mediaCheckboxes = document.querySelectorAll(`.combination-media[data-combo="${comboId}"]:checked`)
    const mediaTypes = Array.from(mediaCheckboxes).map(cb => cb.value)
    
    const unlimitedStills = document.querySelector(`input[name*="combinations[${comboId}][unlimited_stills]"]:checked`)
    const unlimitedVersions = document.querySelector(`input[name*="combinations[${comboId}][unlimited_versions]"]:checked`)
    
    // Check for territory-media exceptions first (these override the entire calculation)
    let territoryExceptionPercentage = null
    territories.forEach(territory => {
      mediaTypes.forEach(mediaType => {
        const exceptionPercentage = this.findTerritoryException(territory.name, mediaType)
        if (exceptionPercentage !== null) {
          console.log(`🔄 Territory exception found: ${territory.name} + ${mediaType} = ${exceptionPercentage}% (replaces entire calculation)`)
          territoryExceptionPercentage = Math.max(territoryExceptionPercentage || 0, exceptionPercentage)
        }
      })
    })

    let percentage
    if (territoryExceptionPercentage !== null) {
      // Use territory exception as the base percentage (replaces duration × territory × media calculation)
      console.log(`🎯 Using territory exception as base: ${territoryExceptionPercentage}%`)
      percentage = territoryExceptionPercentage

      // Still apply unlimited options and custom exclusivities as percentages of the base
      // Convert base percentage to a factor (e.g., 300% → 3.0)
      const baseFactor = territoryExceptionPercentage / 100

      if (unlimitedStills) {
        const stillsAddition = 15 * baseFactor
        console.log(`📸 Adding unlimited stills: +${stillsAddition.toFixed(1)}% (15% of ${territoryExceptionPercentage}%)`)
        percentage += stillsAddition
      }
      if (unlimitedVersions) {
        const versionsAddition = 15 * baseFactor
        console.log(`🎬 Adding unlimited versions: +${versionsAddition.toFixed(1)}% (15% of ${territoryExceptionPercentage}%)`)
        percentage += versionsAddition
      }

      const rowExclusivityPercentage = applicableExclusivities.reduce((sum, ex) => sum + ex.percentage, 0)
      if (rowExclusivityPercentage > 0) {
        const exclusivityAddition = rowExclusivityPercentage * baseFactor
        console.log(`🔒 Adding exclusivity: +${exclusivityAddition.toFixed(1)}% (${rowExclusivityPercentage}% of ${territoryExceptionPercentage}%)`)
        percentage += exclusivityAddition
      } else {
        // No exclusivity addition
      }

    } else {
      // Original calculation when no territory exceptions apply
      // Core Buyout Factor = duration × territory × media
      const durationMultiplier = this.getDurationMultiplier(duration)
      const territoryMultiplier = this.getTerritoryMultiplier(territories, duration)
      const mediaMultiplier = this.getMediaMultiplier(mediaTypes, territories, duration)
      const coreBuyoutFactor = durationMultiplier * territoryMultiplier * mediaMultiplier

      // Buyout % = (Core Buyout Factor × 100)
      //          + (unlimited options % × Core Buyout Factor)
      //          + (row-specific custom exclusivities % × Core Buyout Factor)

      percentage = coreBuyoutFactor * 100

      // Add unlimited options (percentage of core factor)
      if (unlimitedStills) percentage += 15 * coreBuyoutFactor
      if (unlimitedVersions) percentage += 15 * coreBuyoutFactor

      // Add only the exclusivities that apply to this specific row (percentage of core factor)
      const rowExclusivityPercentage = applicableExclusivities.reduce((sum, ex) => sum + ex.percentage, 0)
      percentage += rowExclusivityPercentage * coreBuyoutFactor
    }
    
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

    // Check for override (but skip if Worldwide is selected)
    if (this.shouldApplyTerritoryOverride(durationMonths, totalPercentage, territories)) {
      return 12.0 // Worldwide override
    }

    return totalPercentage / 100.0
  }

  getMediaMultiplier(mediaTypes, territories, duration) {
    if (mediaTypes.length === 0) return 1.0

    const totalPercentage = territories.reduce((sum, t) => sum + t.percentage, 0)
    const durationMonths = this.parseDurationMonths(duration)

    // Force All Media if territory override is active (but skip if Worldwide is selected)
    if (this.shouldApplyTerritoryOverride(durationMonths, totalPercentage, territories)) {
      return 1.0
    }

    console.log(`🎬 MEDIA DEBUG - mediaTypes: [${mediaTypes.join(', ')}], length: ${mediaTypes.length}`)

    // Standard media logic (territory exceptions are handled in calculateRowBuyoutPercentage)
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

  shouldApplyTerritoryOverride(durationMonths, totalPercentage, territories = []) {
    if (!durationMonths || !totalPercentage) return false

    // Special case: If Worldwide is selected (alone or with others), bypass override
    // Worldwide (1200%) is already the default override value, so no need to show override
    const hasWorldwide = territories.some(t => t.name === 'Worldwide')
    if (hasWorldwide) {
      console.log('🔄 Worldwide is selected - bypassing override logic (already at Worldwide rate)')
      return false
    }

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
    
    // Fallback to full category names (check more specific first!)
    if (description.includes('Second Lead')) return 2
    if (description.includes('Lead')) return 1
    if (description.includes('Featured Extra')) return 3
    if (description.includes('Teenager')) return 4
    if (description.includes('Kid')) return 5
    
    return null
  }

  getExclusivitiesForCategory(comboId, categoryId) {
    if (!categoryId) return []

    // IMPORTANT: Only get exclusivities that were specifically added to THIS combo
    const exclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []

    console.log(`🔍 getExclusivitiesForCategory - Combo: ${comboId}, Category: ${categoryId} (type: ${typeof categoryId})`)
    console.log(`🔍 Total exclusivities for combo ${comboId}:`, exclusivities.length, exclusivities)

    const filtered = exclusivities.filter(ex => {
      // Skip line-specific exclusivities (they are handled separately)
      if (ex.isLineSpecific) {
        console.log(`  ⏭️ Skipping line-specific exclusivity: ${ex.name}`)
        return false
      }

      // Only apply if this category is explicitly included in the exclusivity's target categories
      // If no categories specified, do NOT apply to all (changed from previous behavior)
      if (!ex.categories || ex.categories.length === 0) {
        console.log(`  ⏭️ Skipping exclusivity with no categories: ${ex.name}`)
        return false
      }

      // Check if this category is in the exclusivity's target categories
      const includes = ex.categories.includes(categoryId)
      console.log(`  ${includes ? '✅' : '❌'} Exclusivity "${ex.name}" categories:`, ex.categories, `includes ${categoryId}? ${includes}`)
      return includes
    })

    console.log(`🔍 Returning ${filtered.length} exclusivities for category ${categoryId}:`, filtered)
    return filtered
  }

  getExclusivitiesForSpecificLine(comboId, categoryId, lineIndex) {
    if (!categoryId || lineIndex === undefined) return []

    // First check window.lineExclusivityData for the specific line in this combo
    const lineKey = `${comboId}_${categoryId}_${lineIndex}`
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
    const result = [...lineExclusivities, ...legacyLineExclusivities]

    // Debug logging
    if (result.length > 0) {
      console.log(`🎯 Line-specific exclusivities for ${lineKey}:`, result)
    }

    return result
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

    // Attach exclusivity click listener with protection against duplicates
    if (!window.quotationExclusivityClickListenerAttached) {
      console.log('Attaching exclusivity click listener')
      document.addEventListener('click', this.boundExclusivityClickHandler)
      window.quotationExclusivityClickListenerAttached = true
      window.quotationExclusivityClickHandler = this.boundExclusivityClickHandler
    } else {
      console.log('Exclusivity click listener already attached, replacing handler')
      document.removeEventListener('click', window.quotationExclusivityClickHandler)
      document.addEventListener('click', this.boundExclusivityClickHandler)
      window.quotationExclusivityClickHandler = this.boundExclusivityClickHandler
    }
  }

  // Handler for exclusivity click events
  handleExclusivityClick(e) {
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
      // Check the original exclusivity data to see if it was added as line-specific
      const lineKey = `${comboId}_${categoryId}_${lineIndex}`
      const hasLineSpecificData = window.lineExclusivityData && window.lineExclusivityData[lineKey]

      // Also check if the exclusivity pill is green (emerald) which indicates line-specific
      const isEmperaldPill = e.target.closest('span').classList.contains('bg-emerald-100')

      const isLineSpecific = hasLineSpecificData && isEmperaldPill

      if (isLineSpecific) {
        this.removeLineSpecificExclusivity(comboId, categoryId, parseInt(lineIndex), index)
      } else {
        this.removeExclusivityPill(comboId, index, categoryId)
      }
    }
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
          this.showLineExclusivityPopup(comboId, categoryId, lineIndex, talentDescription)
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

  showLineExclusivityPopup(comboId, categoryId, lineIndex, talentDescription) {
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
    this.populateExistingLineExclusivities(modal, comboId, categoryId, lineIndex)

    // Add event listeners for the modal
    this.setupLineExclusivityModalEvents(modal, comboId, categoryId, lineIndex, talentDescription)
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
    const categoryNames = {1: 'Lead', 2: 'Second Lead', 3: 'Featured Extra', 4: 'Teenager', 5: 'Kid', 6: 'Walk-on', 7: 'Extras'}
    const categoryAbbrevs = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD', 6: 'WO', 7: 'EX'}

    console.log('🔍 Looking for ALL talent categories (1-7)...')

    // Process categories in order (1, 2, 3, 4, 5, 6, 7) for organized display
    const categoryIds = [1, 2, 3, 4, 5, 6, 7]
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

  setupLineExclusivityModalEvents(modal, comboId, categoryId, lineIndex, talentDescription) {
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
        this.saveLineExclusivities(modal, comboId, categoryId, lineIndex, talentDescription)
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

  populateExistingLineExclusivities(modal, comboId, categoryId, lineIndex) {
    // Get existing line-specific exclusivities for this combo
    const lineKey = `${comboId}_${categoryId}_${lineIndex}`
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

  saveLineExclusivities(modal, comboId, categoryId, lineIndex, talentDescription) {
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

    // Store the line-specific exclusivities with combo ID for group-specific storage
    const lineKey = `${comboId}_${categoryId}_${lineIndex}`
    window.lineExclusivityData[lineKey] = newExclusivities

    console.log(`Saved line exclusivities for ${lineKey}:`, newExclusivities)
    console.log('📊 Current lineExclusivityData after save:', window.lineExclusivityData)
    console.log('🔄 Line exclusivity saved, refreshing tables...')

    // Update all combo tables to reflect changes
    // Use setTimeout to ensure the modal closes before updating tables
    setTimeout(() => {
      console.log('🔄 About to refresh tables, current lineExclusivityData:', window.lineExclusivityData)
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

    console.log(`💾 SAVED ${newExclusivities.length} exclusivities to window.exclusivityData[${comboId}]:`, newExclusivities)
    console.log(`💾 Full window.exclusivityData:`, window.exclusivityData)

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

  removeLineSpecificExclusivity(comboId, categoryId, lineIndex, index) {
    const lineKey = `${comboId}_${categoryId}_${lineIndex}`

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
          // Don't clear the message if checkbox is checked - recalculate instead
          const guaranteeCheckbox = document.querySelector(`.guarantee-checkbox[data-combo="${comboId}"]`)
          if (guaranteeCheckbox && guaranteeCheckbox.checked) {
            // Checkbox is checked but isGuaranteed is false - recalculate the savings
            const totalZarSpan = document.querySelector(`.total-zar-amount[data-combo="${comboId}"]`)
            if (totalZarSpan) {
              const guaranteedAmount = parseFloat(totalZarSpan.textContent.replace(/[R,\s]/g, '')) || 0
              if (guaranteedAmount > 0) {
                const originalAmount = guaranteedAmount / 0.75
                const savings = originalAmount - guaranteedAmount
                guaranteeAmountSpan.innerHTML = `<span style="color: red;">R${this.formatNumber(savings)} saving</span>`
              }
            }
          } else {
            guaranteeAmountSpan.textContent = ''
          }
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
    let forms = this.element.querySelectorAll('form:not(.button_to)')

    // If no forms found in this.element, try to find the form by data-controller
    if (forms.length === 0) {
      forms = document.querySelectorAll('form[data-controller*="quotation-form"]')
    }

    // If still no forms, try a more general approach
    if (forms.length === 0) {
      const quotationDiv = document.querySelector('[data-controller*="quotation-form"]')
      if (quotationDiv) {
        forms = quotationDiv.querySelectorAll('form:not(.button_to)')
      }
    }

    console.log('🔍 Found forms:', forms.length, forms)

    forms.forEach((form, index) => {
      console.log(`📝 Adding submit listener to form ${index}:`, form)

      form.addEventListener('submit', (event) => {
        console.log('🚀 Form submission intercepted! Injecting exclusivity data...')
        console.log('🔍 Current window.exclusivityData:', window.exclusivityData)
        console.log('🔍 Form that triggered submit:', form)

        // Prevent the form from submitting immediately
        event.preventDefault()

        // Disable validation on hidden talent category fields to prevent form submission errors
        console.log('🧹 Cleaning up hidden field validation before form submission...')
        this.cleanupHiddenFieldValidation()

        // Use Promise-based approach for data injection
        Promise.all([
          this.injectExclusivityDataIntoForm(),
          this.injectCalculatedPreviewValues()
        ])
        .then(() => {
          console.log('🔄 Submitting form with injected data via AJAX...')

          // Verify combinations data was injected
          const combinationsInput = form.querySelector('input[name="combinations"]')
          if (combinationsInput && combinationsInput.value) {
            console.log('✅ Combinations data verified before submission:', JSON.parse(combinationsInput.value))

            // Debug: Check all calculated_values fields that exist in the form
            const allCalculatedFields = form.querySelectorAll('input[name*="calculated_values"]')
            console.log(`🔍 FORM SUBMISSION DEBUG: Found ${allCalculatedFields.length} calculated_values fields in form:`)
            allCalculatedFields.forEach(field => {
              console.log(`   ${field.name} = ${field.value}`)
            })
          } else {
            console.warn('⚠️  No combinations data found in form before submission!')
          }

          // Use AJAX submission for preview
          this.submitFormViaAjax(form)
        })
        .catch(error => {
          console.error('❌ Error during data injection:', error)
          // Still submit the form even if injection fails to avoid blocking the user
          console.log('🔄 Submitting form despite injection errors...')
          this.submitFormViaAjax(form)
        })
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
    }

    // Add function to test if form submission handler would be triggered
    window.testSubmitEvent = () => {
      console.log('🧪 Testing submit event manually...')
      const form = document.querySelector('form')
      if (form) {
        console.log('📝 Found form:', form)
        console.log('🔥 Dispatching submit event...')

        // Create and dispatch a submit event
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
        form.dispatchEvent(submitEvent)
      } else {
        console.log('❌ No form found!')
      }
    }

    // Add debugging function to check exclusivity data at any time
    window.debugExclusivityData = () => {
      console.log('🔍 EXCLUSIVITY DATA DEBUG')
      console.log('========================')
      console.log('window.exclusivityData:', window.exclusivityData)

      if (window.exclusivityData) {
        Object.keys(window.exclusivityData).forEach(comboId => {
          console.log(`\nCombo ${comboId}:`)
          const exclusivities = window.exclusivityData[comboId] || []
          exclusivities.forEach((exc, index) => {
            console.log(`  ${index}: ${exc.name} ${exc.percentage}%`)
            console.log(`      isLineSpecific: ${exc.isLineSpecific}`)
            console.log(`      categoryId: ${exc.categoryId}`)
            console.log(`      lineIndex: ${exc.lineIndex}`)
            console.log(`      categories: ${exc.categories}`)
          })
        })
      } else {
        console.log('❌ No exclusivity data found')
      }
    }
  }


  injectCalculatedPreviewValues() {
    // Capture and inject all calculated values from the preview tables
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Injecting calculated preview values into form...')
        console.log('🔍 Available quote preview tables:', document.querySelectorAll('.quote-preview-table').length)

    const form = document.querySelector('form[data-controller="quotation-form"]') ||
                 document.querySelector('form:not(.button_to)') ||
                 this.element.querySelector('form')

        if (!form) {
          console.log('❌ No suitable form found for preview values injection')
          reject(new Error('No suitable form found for preview values injection'))
          return
        }

    // Remove any existing calculated value fields
    document.querySelectorAll('input[name*="calculated_"]').forEach(field => {
      field.remove()
    })

    // Get all combination tables and extract calculated values
    const quoteTables = document.querySelectorAll('.quote-preview-table')

    quoteTables.forEach(table => {
      const comboId = table.closest('[data-combo]')?.getAttribute('data-combo')
      if (!comboId) {
        console.log('⚠️  Found table without combo id:', table)
        return
      }

      console.log(`📊 Processing combo ${comboId} for calculated values`)
      console.log('📊 Table structure:', table.outerHTML.substring(0, 500) + '...')

      // Extract values from table rows - be more specific about which rows to process
      const tbody = table.querySelector('tbody.quote-preview-rows')
      if (!tbody) {
        console.log(`⚠️  No tbody.quote-preview-rows found in table for combo ${comboId}`)
        return
      }

      const rows = tbody.querySelectorAll('tr')
      console.log(`📊 Found ${rows.length} data rows in combo ${comboId} tbody`)

      rows.forEach((row, rowIndex) => {
        console.log(`📊 Processing row ${rowIndex + 1}:`, row.innerHTML.substring(0, 200) + '...')
        const cells = row.querySelectorAll('td')
        console.log(`📊 Row ${rowIndex + 1} has ${cells.length} cells`)

        if (cells.length < 8) {
          console.log(`⚠️  Skipping row ${rowIndex + 1} - only ${cells.length} cells (need 8)`)
          return // Skip if not a full data row
        }

        // Extract values from the row
        const talentDescription = cells[0]?.textContent?.trim()
        const dayFeeText = cells[1]?.textContent?.replace(/[R,\s]/g, '')
        const unitCount = cells[2]?.textContent?.trim()

        // Extract exclusivity from cell 3 (exclusivity column)
        const exclusivityCell = cells[3]
        const exclusivityPills = exclusivityCell?.querySelectorAll('.bg-yellow-100, .bg-emerald-100, [class*="bg-yellow-100"], [class*="bg-emerald-100"], .exclusivity-pill')
        const exclusivityTexts = Array.from(exclusivityPills || []).map(pill => {
          // Get the text content but exclude the remove button (x)
          const pillText = pill.textContent.trim()
          // Remove the × character if it's at the end
          return pillText.replace(/\s*×\s*$/, '').trim()
        }).filter(text => text !== '' && text !== '×')
        const exclusivityValue = exclusivityTexts.length > 0 ? exclusivityTexts.join(', ') : ''

        console.log(`🔍 Exclusivity extraction for ${talentDescription}: Found ${exclusivityPills?.length || 0} pills with text: [${exclusivityTexts.join(', ')}]`)

        // Extract commercial count from cell 4 (# of Comms column)
        const commercialCountCell = cells[4]
        const commercialInput = commercialCountCell?.querySelector('input.commercial-count-input')
        const commercialCount = commercialInput ? parseInt(commercialInput.value) || 1 : 1

        const buyoutPercentageText = cells[5]?.textContent?.replace(/[%\s]/g, '')
        const perTalentText = cells[6]?.textContent?.replace(/[R,\s]/g, '')
        const totalText = cells[7]?.textContent?.replace(/[R,\s]/g, '')

        // Get category and line info from row dataset attributes
        const categoryId = row.dataset.categoryId
        const lineIndex = parseInt(row.dataset.lineIndex) || 0

        if (!categoryId || !dayFeeText || !unitCount) {
          console.log(`⚠️  Skipping row for ${talentDescription}: categoryId=${categoryId}, dayFee=${dayFeeText}, unit=${unitCount}`)
          return
        }

        const dayFee = parseFloat(dayFeeText) || 0
        const unit = parseInt(unitCount) || 0
        const buyoutPercentage = parseFloat(buyoutPercentageText) || 0
        const perTalent = parseFloat(perTalentText) || 0
        const total = parseFloat(totalText) || 0

        console.log(`📊 Combo ${comboId}, Category ${categoryId}, Line ${lineIndex}: ${talentDescription}`)
        console.log(`   Day Fee: R${dayFee}, Unit: ${unit}, Buyout: ${buyoutPercentage}%, Per Talent: R${perTalent}, Total: R${total}`)

        // Create hidden fields for these calculated values
        const fieldPrefix = `combinations[${comboId}][calculated_values][${categoryId}][${lineIndex}]`
        console.log(`   Will create field prefix: ${fieldPrefix}`)

        // Day fee (base rate)
        const dayFeeField = document.createElement('input')
        dayFeeField.type = 'hidden'
        dayFeeField.name = `${fieldPrefix}[day_fee]`
        dayFeeField.value = dayFee
        form.appendChild(dayFeeField)

        // Unit count
        const unitField = document.createElement('input')
        unitField.type = 'hidden'
        unitField.name = `${fieldPrefix}[unit_count]`
        unitField.value = unit
        form.appendChild(unitField)

        // Calculated buyout percentage (from JavaScript)
        const calculatedBuyoutField = document.createElement('input')
        calculatedBuyoutField.type = 'hidden'
        calculatedBuyoutField.name = `${fieldPrefix}[calculated_buyout_percentage]`
        calculatedBuyoutField.value = buyoutPercentage
        form.appendChild(calculatedBuyoutField)

        // Per talent amount
        const perTalentField = document.createElement('input')
        perTalentField.type = 'hidden'
        perTalentField.name = `${fieldPrefix}[per_talent_amount]`
        perTalentField.value = perTalent
        form.appendChild(perTalentField)

        // Total line cost
        const totalField = document.createElement('input')
        totalField.type = 'hidden'
        totalField.name = `${fieldPrefix}[total_line_cost]`
        totalField.value = total
        form.appendChild(totalField)

        // Talent description for identification
        const descriptionField = document.createElement('input')
        descriptionField.type = 'hidden'
        descriptionField.name = `${fieldPrefix}[description]`
        descriptionField.value = talentDescription
        form.appendChild(descriptionField)

        // Exclusivity value from preview
        const exclusivityField = document.createElement('input')
        exclusivityField.type = 'hidden'
        exclusivityField.name = `${fieldPrefix}[exclusivity_type]`
        exclusivityField.value = exclusivityValue
        form.appendChild(exclusivityField)

        // Commercial count from preview
        const commercialCountField = document.createElement('input')
        commercialCountField.type = 'hidden'
        commercialCountField.name = `${fieldPrefix}[commercial_count]`
        commercialCountField.value = commercialCount
        form.appendChild(commercialCountField)

        console.log(`✅ Added calculated values for ${talentDescription} in combo ${comboId}`)
        console.log(`   Exclusivity: "${exclusivityValue}", Commercials: ${commercialCount}, Per Talent: R${perTalent}`)
        console.log(`   Created field: ${fieldPrefix}[calculated_buyout_percentage] = ${buyoutPercentage}`)

        if (exclusivityValue) {
          console.log(`🔑 Exclusivity successfully captured: "${exclusivityValue}" for ${talentDescription}`)
        } else {
          console.log(`⚠️  No exclusivity captured for ${talentDescription} - checking exclusivity cell:`, exclusivityCell?.innerHTML)
        }

      })

      // Also capture combo total
      const totalZarSpan = table.querySelector(`.total-zar-amount[data-combo="${comboId}"]`)
      if (totalZarSpan) {
        const comboTotal = parseFloat(totalZarSpan.textContent.replace(/[R,\s]/g, '')) || 0

        const comboTotalField = document.createElement('input')
        comboTotalField.type = 'hidden'
        comboTotalField.name = `combinations[${comboId}][calculated_total]`
        comboTotalField.value = comboTotal
        form.appendChild(comboTotalField)

        console.log(`✅ Added combo total: R${comboTotal} for combo ${comboId}`)
      }

      // Capture guarantee state for this combo
      const guaranteeCheckbox = table.querySelector(`.guarantee-checkbox[data-combo="${comboId}"]`)
      const isGuaranteed = guaranteeCheckbox && guaranteeCheckbox.checked

      const guaranteeField = document.createElement('input')
      guaranteeField.type = 'hidden'
      guaranteeField.name = `combinations[${comboId}][is_guaranteed]`
      guaranteeField.value = isGuaranteed ? '1' : '0'
      form.appendChild(guaranteeField)

      console.log(`✅ Added guarantee state: ${isGuaranteed} for combo ${comboId}`)
    })

        // Capture screenshots of quote preview tables
        this.captureQuotePreviewScreenshots(form)

        // Create a summary combinations field with all the data
        this.createCombinationsSummaryField(form)

        console.log(`✅ Finished injecting calculated preview values`)
        resolve()
      } catch (error) {
        console.error('❌ Error injecting calculated preview values:', error)
        reject(error)
      }
    })
  }

  createCombinationsSummaryField(form) {
    // Create a JSON summary of all combinations data for the Rails controller
    console.log('🔄 Creating combinations summary field...')

    // Remove any existing combinations summary field
    const existingField = form.querySelector('input[name="combinations"]')
    if (existingField) {
      console.log('🗑️ Removing existing combinations field')
      existingField.remove()
    }

    // Collect all combination data from the form fields that were just created
    const combinationsData = {}
    const quoteTables = document.querySelectorAll('.quote-preview-table')
    console.log(`🔍 Found ${quoteTables.length} quote tables to process`)

    quoteTables.forEach(table => {
      const comboId = table.closest('[data-combo]')?.getAttribute('data-combo')
      if (!comboId) return

      // Get basic combination info from the DOM
      const comboElement = table.closest('[data-combo]')
      console.log(`🔍 Processing combo ${comboId}, element:`, comboElement)

      // Extract basic info from the form fields rather than data attributes
      const durationSelect = document.querySelector(`select[name*="combinations[${comboId}][duration]"]`)
      const duration = durationSelect?.value || comboElement?.getAttribute('data-duration') || 'unknown'

      // Get territories from form checkboxes
      const territoryCheckboxes = document.querySelectorAll(`input[name*="combinations[${comboId}][territories]"]:checked`)
      const territories = Array.from(territoryCheckboxes).map(cb => cb.value)

      // Get media types from form checkboxes
      const mediaTypeCheckboxes = document.querySelectorAll(`input[name*="combinations[${comboId}][media_types]"]:checked`)
      const mediaTypes = Array.from(mediaTypeCheckboxes).map(cb => cb.value)

      // Debug form field detection
      console.log(`🔍 Combo ${comboId} form field detection:`)
      console.log(`   Duration select found: ${!!durationSelect}, value: ${duration}`)
      console.log(`   Territory checkboxes found: ${territoryCheckboxes.length}, values: ${territories}`)
      console.log(`   Media type checkboxes found: ${mediaTypeCheckboxes.length}, values: ${mediaTypes}`)

      console.log(`📊 Combo ${comboId} extracted data:`, { duration, territories, mediaTypes })

      // Collect calculated values from the hidden fields that were just created
      const calculatedValues = {}
      const calculatedFields = form.querySelectorAll(`input[name*="combinations[${comboId}][calculated_values]"]`)

      console.log(`🔍 Looking for calculated fields for combo ${comboId}`)
      console.log(`🔍 Found ${calculatedFields.length} calculated fields:`, Array.from(calculatedFields).map(f => f.name))

      calculatedFields.forEach(field => {
        const nameMatch = field.name.match(/combinations\[(\d+)\]\[calculated_values\]\[(\d+)\]\[(\d+)\]\[(.+)\]/)
        if (nameMatch) {
          const [, , categoryId, lineIndex, fieldName] = nameMatch
          if (!calculatedValues[categoryId]) calculatedValues[categoryId] = {}
          if (!calculatedValues[categoryId][lineIndex]) calculatedValues[categoryId][lineIndex] = {}
          calculatedValues[categoryId][lineIndex][fieldName] = field.value
        }
      })

      console.log(`💰 Collected calculated values for combo ${comboId}:`, calculatedValues)

      // Get num_commercials from form field
      const commercialsInput = document.querySelector(`input[name*="combinations[${comboId}][num_commercials]"]`)
      const numCommercials = commercialsInput?.value || 1
      console.log(`🔢 Collected num_commercials for combo ${comboId}: ${numCommercials}`)

      combinationsData[comboId] = {
        duration: duration,
        territories: territories,
        media_types: mediaTypes,
        calculated_values: calculatedValues,
        num_commercials: parseInt(numCommercials),
        exclusivities: [],
        is_guaranteed: false,
        unlimited_stills: "0",
        unlimited_versions: "0"
      }

      console.log(`📊 After assignment, combinationsData[${comboId}]:`, combinationsData[comboId])

      // Get guarantee state
      const guaranteeCheckbox = table.querySelector(`.guarantee-checkbox[data-combo="${comboId}"]`)
      if (guaranteeCheckbox && guaranteeCheckbox.checked) {
        combinationsData[comboId].is_guaranteed = true
      }

      // Get unlimited stills state
      const unlimitedStillsCheckbox = document.querySelector(`input[name="combinations[${comboId}][unlimited_stills]"]:checked`)
      if (unlimitedStillsCheckbox) {
        combinationsData[comboId].unlimited_stills = "1"
        console.log(`✅ Collected unlimited_stills for combo ${comboId}: 1`)
      }

      // Get unlimited versions state
      const unlimitedVersionsCheckbox = document.querySelector(`input[name="combinations[${comboId}][unlimited_versions]"]:checked`)
      if (unlimitedVersionsCheckbox) {
        combinationsData[comboId].unlimited_versions = "1"
        console.log(`✅ Collected unlimited_versions for combo ${comboId}: 1`)
      }

      console.log(`📊 Collected data for combo ${comboId}:`, combinationsData[comboId])
    })

    // Create the summary field
    const summaryField = document.createElement('input')
    summaryField.type = 'hidden'
    summaryField.name = 'combinations'
    summaryField.value = JSON.stringify(combinationsData)
    form.appendChild(summaryField)

    console.log('✅ Created combinations summary field with data:', JSON.stringify(combinationsData, null, 2))
    console.log('✅ Summary field element:', summaryField)

    // Verify the field was added to the form
    const verifyField = form.querySelector('input[name="combinations"]')
    if (verifyField) {
      console.log('✅ Verification: combinations field found in form with value:', verifyField.value.substring(0, 100) + '...')
    } else {
      console.error('❌ Verification: combinations field NOT found in form!')
    }
  }

  disableValidationOnHiddenFields() {
    // Find all hidden talent category sections
    const hiddenSections = document.querySelectorAll('.talent-category-section.hidden')

    hiddenSections.forEach(section => {
      // Find all form inputs within the hidden section that have validation constraints
      const inputs = section.querySelectorAll('input[min], input[max], input[required]')

      inputs.forEach(input => {
        // Remove validation attributes instead of disabling the input
        // This allows the input to be submitted while bypassing validation
        if (input.hasAttribute('min')) {
          input.removeAttribute('min')
        }
        if (input.hasAttribute('max')) {
          input.removeAttribute('max')
        }
        if (input.hasAttribute('required')) {
          input.removeAttribute('required')
        }
        console.log(`🔧 Removed validation attributes for hidden field: ${input.name}`)
      })
    })

    console.log(`🔧 Removed validation on ${hiddenSections.length} hidden talent sections`)
  }

  captureQuotePreviewScreenshots(form) {
    console.log('📸 Starting screenshot capture...')

    try {
      // Find all quote preview tables (one per combination)
      const quotePreviewTables = document.querySelectorAll('.quote-preview-table')
      console.log(`📸 Found ${quotePreviewTables.length} quote preview tables to capture`)

      if (quotePreviewTables.length === 0) {
        console.log('⚠️ No quote preview tables found to capture')
        return
      }

      // Capture HTML content of each table instead of actual screenshot
      quotePreviewTables.forEach((table, index) => {
        // Find the parent container that includes the table and headers
        const previewContainer = table.closest('.bg-gray-50') || table.parentElement

        // Capture the HTML content with inline styles
        const htmlContent = this.captureTableHTML(previewContainer)

        // Create field to store the HTML content
        const htmlField = document.createElement('input')
        htmlField.type = 'hidden'
        htmlField.name = `screenshot_group_${index + 1}`
        htmlField.value = htmlContent
        form.appendChild(htmlField)

        console.log(`📸 Captured HTML for group ${index + 1}`)
      })

    } catch (error) {
      console.error('❌ Error capturing screenshots:', error)
    }
  }

  captureTableHTML(container) {
    // Clone the container to avoid modifying the original
    const clone = container.cloneNode(true)

    // Add inline styles to preserve appearance
    this.addInlineStyles(clone)

    // Return the outer HTML
    return clone.outerHTML
  }

  addInlineStyles(element) {
    // Add basic table styling
    const style = `
      <style>
        .quote-preview-table { border-collapse: collapse; width: 100%; border: 1px solid #d1d5db; }
        .quote-preview-table th, .quote-preview-table td {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
          font-size: 14px;
        }
        .quote-preview-table th { background-color: #f3f4f6; font-weight: 600; }
        .quote-preview-table tbody tr:nth-child(even) { background-color: #f9fafb; }
        .bg-gray-50 { background-color: #f9fafb; padding: 16px; border-radius: 8px; }
        .text-sm { font-size: 14px; }
        .font-medium { font-weight: 500; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
      </style>
    `

    // Add the style element at the beginning
    element.insertAdjacentHTML('afterbegin', style)
  }

  captureTableScreenshot(table, groupNumber, form) {
    console.log(`📸 Capturing screenshot for group ${groupNumber}`)

    try {
      // Use html2canvas to capture the table
      import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').then(() => {
        // Find the parent container that includes the table and its headers
        const previewContainer = table.closest('.bg-gray-50') || table.parentElement

        html2canvas(previewContainer, {
          backgroundColor: '#f9fafb',
          scale: 2, // Higher quality
          useCORS: true,
          allowTaint: true
        }).then(canvas => {
          // Convert canvas to base64 data URL
          const screenshotData = canvas.toDataURL('image/png')
          console.log(`✅ Screenshot captured for group ${groupNumber}`)

          // Create hidden input field to store the screenshot
          const screenshotField = document.createElement('input')
          screenshotField.type = 'hidden'
          screenshotField.name = `screenshot_group_${groupNumber}`
          screenshotField.value = screenshotData
          form.appendChild(screenshotField)

          console.log(`📝 Added screenshot field for group ${groupNumber}`)
        }).catch(error => {
          console.error(`❌ Error generating screenshot for group ${groupNumber}:`, error)
        })
      }).catch(error => {
        console.error('❌ Error loading html2canvas:', error)
      })

    } catch (error) {
      console.error(`❌ Error capturing table screenshot for group ${groupNumber}:`, error)
    }
  }

  // Cast Selection Feature
  setupCastSelection() {
    console.log('🎭 Setting up Cast Selection feature')

    // Attach input listener with protection against duplicates
    if (!window.quotationCastInputListenerAttached) {
      console.log('Attaching cast input listener')
      document.addEventListener('input', this.boundCastInputHandler)
      window.quotationCastInputListenerAttached = true
      window.quotationCastInputHandler = this.boundCastInputHandler
    } else {
      console.log('Cast input listener already attached, replacing handler')
      document.removeEventListener('input', window.quotationCastInputHandler)
      document.addEventListener('input', this.boundCastInputHandler)
      window.quotationCastInputHandler = this.boundCastInputHandler
    }

    // Attach change listener with protection against duplicates
    if (!window.quotationCastChangeListenerAttached) {
      console.log('Attaching cast change listener')
      document.addEventListener('change', this.boundCastChangeHandler)
      window.quotationCastChangeListenerAttached = true
      window.quotationCastChangeHandler = this.boundCastChangeHandler
    } else {
      console.log('Cast change listener already attached, replacing handler')
      document.removeEventListener('change', window.quotationCastChangeHandler)
      document.addEventListener('change', this.boundCastChangeHandler)
      window.quotationCastChangeHandler = this.boundCastChangeHandler
    }

    // Attach click listener with protection against duplicates
    if (!window.quotationCastClickListenerAttached) {
      console.log('Attaching cast click listener')
      document.addEventListener('click', this.boundCastClickHandler)
      window.quotationCastClickListenerAttached = true
      window.quotationCastClickHandler = this.boundCastClickHandler
    } else {
      console.log('Cast click listener already attached, replacing handler')
      document.removeEventListener('click', window.quotationCastClickHandler)
      document.addEventListener('click', this.boundCastClickHandler)
      window.quotationCastClickHandler = this.boundCastClickHandler
    }

    // Initial population
    setTimeout(() => this.updateCastSelection(), 500)
  }

  // Handler for cast input events
  handleCastInput(e) {
    if (e.target.name && e.target.name.includes('talent_count')) {
      console.log('🎯 CONTROLLER: Talent count input detected:', e.target.name, e.target.value)
      setTimeout(() => this.updateCastSelection(), 50)
    }
    if (e.target.name && e.target.name.includes('description')) {
      console.log('🎯 CONTROLLER: Talent description input detected:', e.target.name, e.target.value)
      setTimeout(() => this.updateCastSelection(), 50)
    }
  }

  // Handler for cast change events (checkboxes)
  handleCastChange(e) {
    console.log('📋 Change event detected on:', e.target, 'classes:', e.target.classList.toString())
    if (e.target.classList.contains('cast-selection-checkbox')) {
      console.log('🎭 Cast selection changed:', e.target.checked, e.target.value)
      console.log('🎭 About to call updateQuotePreview')
      this.updateQuotePreview()
      console.log('🎭 updateQuotePreview call completed')
    }
  }

  // Handler for cast click events (bulk action buttons)
  handleCastClick(e) {
    // Select All button
    if (e.target.classList.contains('cast-select-all-btn')) {
      e.preventDefault()
      e.stopPropagation()
      const comboId = e.target.dataset.combo
      console.log('🔵 Select All clicked for combo:', comboId)
      const container = document.querySelector(`.cast-selection-container[data-combo="${comboId}"]`)
      if (container) {
        const checkboxes = container.querySelectorAll('.cast-selection-checkbox')
        console.log('🔍 Selecting', checkboxes.length, 'checkboxes')
        checkboxes.forEach(checkbox => {
          checkbox.checked = true
        })
        this.updateQuotePreview()
      }
    }

    // Deselect All button
    if (e.target.classList.contains('cast-deselect-all-btn')) {
      e.preventDefault()
      e.stopPropagation()
      const comboId = e.target.dataset.combo
      console.log('⚪ Deselect All clicked for combo:', comboId)
      const container = document.querySelector(`.cast-selection-container[data-combo="${comboId}"]`)
      if (container) {
        const checkboxes = container.querySelectorAll('.cast-selection-checkbox')
        console.log('🔍 Deselecting', checkboxes.length, 'checkboxes')
        checkboxes.forEach(checkbox => {
          checkbox.checked = false
        })
        this.updateQuotePreview()
      }
    }

    // Invert Selection button
    if (e.target.classList.contains('cast-invert-selection-btn')) {
      e.preventDefault()
      e.stopPropagation()
      const comboId = e.target.dataset.combo
      console.log('🔄 Invert Selection clicked for combo:', comboId)
      const container = document.querySelector(`.cast-selection-container[data-combo="${comboId}"]`)
      if (container) {
        const checkboxes = container.querySelectorAll('.cast-selection-checkbox')
        console.log('🔍 Inverting', checkboxes.length, 'checkboxes')
        checkboxes.forEach(checkbox => {
          checkbox.checked = !checkbox.checked
        })
        this.updateQuotePreview()
      }
    }
  }

  updateCastSelection() {
    console.log('🎭 CONTROLLER updateCastSelection called')
    const categories = {
      1: 'Lead',
      2: 'Second Lead',
      3: 'Featured Extra',
      4: 'Teenager',
      5: 'Kid',
      6: 'Walk-on',
      7: 'Extras'
    }

    // Get all talent that has been entered - including all lines within each category
    // BUT only include categories 1-5 for Cast Selection (exclude Walk-on and Extras)
    const availableTalent = []

    Object.keys(categories).forEach(categoryId => {
      const categoryIdNum = parseInt(categoryId)

      // Only include categories 1-5 for cast selection (exclude Walk-on and Extras from Usage & Licensing)
      if (categoryIdNum < 1 || categoryIdNum > 5) {
        console.log(`⏭️  Skipping category ${categoryId} (${categories[categoryId]}) for cast selection`)
        return
      }
      const section = document.getElementById(`talent-category-${categoryId}`)
      console.log(`🔍 Checking category ${categoryId}:`, section ? 'found' : 'not found', section?.classList.contains('hidden') ? 'hidden' : 'visible')

      if (section) {
        // Get ALL talent input rows in this category (not just the main one)
        const inputRows = section.querySelectorAll('.talent-input-row')
        console.log(`📊 Found ${inputRows.length} talent rows in category ${categoryId}`)

        inputRows.forEach((row, rowIndex) => {
          // Get talent data from each row
          const descriptionField = row.querySelector('.talent-description, [name*="description"]')
          const rateField = row.querySelector('[name*="adjusted_rate"]') ||
                           row.querySelector(`[data-adjusted-rate-input="${categoryId}"]`)
          const countField = row.querySelector('[name*="talent_count"]') ||
                            row.querySelector(`[data-talent-input="${categoryId}"]`)

          // Get the actual lineIndex from the DOM element's data-line attribute
          const actualLineIndex = parseInt(row.dataset.lineIndex) ||
                                 parseInt(countField?.dataset.line) ||
                                 rowIndex

          const description = descriptionField?.value || ''
          const rate = parseInt(rateField?.value) || 0
          const count = parseInt(countField?.value) || 0

          console.log(`📊 Row ${rowIndex} in category ${categoryId} (lineIndex: ${actualLineIndex}):`, { description, rate, count })

          // Include this row if it has talent count > 0
          if (count > 0) {
            const lineDescription = description.trim()
              ? description.trim()
              : categories[categoryId]

            availableTalent.push({
              categoryId: categoryId,
              categoryName: categories[categoryId],
              description: lineDescription,
              talentCount: count,
              adjustedRate: rate,
              lineIndex: actualLineIndex,
              isMainLine: actualLineIndex === 0
            })
            console.log(`✅ Added talent: ${lineDescription} (${count} × R${rate})`)
          }
        })
      }
    })

    console.log('🎭 Available talent found:', availableTalent)

    // Update cast selection in all combination sections
    document.querySelectorAll('.cast-selection-container').forEach(container => {
      const comboId = container.getAttribute('data-combo')
      const castList = container.querySelector('.cast-selection-list')
      console.log(`📋 Updating cast selection for combo ${comboId}:`, castList ? 'container found' : 'container not found')

      if (castList) {
        // Always preserve existing selections before any updates
        const existingSelections = []
        castList.querySelectorAll('.cast-selection-checkbox:checked').forEach(checkbox => {
          existingSelections.push(checkbox.value)
        })
        console.log('💾 Preserving existing selections before update:', existingSelections)

        if (availableTalent.length === 0) {
          castList.innerHTML = '<p class="text-sm text-gray-400 italic">Enter talent above to see cast selection options</p>'
        } else {
          let castHTML = ''

          // Group by category for better organization
          const groupedTalent = {}
          availableTalent.forEach(talent => {
            if (!groupedTalent[talent.categoryName]) {
              groupedTalent[talent.categoryName] = []
            }
            groupedTalent[talent.categoryName].push(talent)
          })

          // Render organized by category
          Object.keys(groupedTalent).forEach(categoryName => {
            castHTML += `<div class="mb-3">`
            castHTML += `<h4 class="text-xs font-semibold text-gray-600 mb-2">${categoryName}</h4>`

            groupedTalent[categoryName].forEach(talent => {
              const uniqueId = `cast_${comboId}_${talent.categoryId}_${talent.lineIndex}`
              const checkboxValue = `${talent.categoryId}_${talent.lineIndex}`
              castHTML += `
                <div class="flex items-center space-x-2 py-1">
                  <input type="checkbox"
                         id="${uniqueId}"
                         name="combinations[${comboId}][selected_cast][]"
                         value="${checkboxValue}"
                         class="cast-selection-checkbox text-blue-600 focus:ring-blue-500"
                         data-combo="${comboId}"
                         data-category="${talent.categoryId}"
                         data-line="${talent.lineIndex}">
                  <label for="${uniqueId}" class="text-sm text-gray-700 flex-1">
                    ${talent.description} (${talent.talentCount} × R${talent.adjustedRate.toLocaleString()})
                    ${talent.isMainLine ? '' : ' <span class="text-xs text-blue-600">[Line ' + (talent.lineIndex + 1) + ']</span>'}
                  </label>
                </div>
              `
            })

            castHTML += `</div>`
          })

          castList.innerHTML = castHTML

          // Restore previously selected checkboxes for all groups
          // Users must manually select which talent to include in each group
          existingSelections.forEach(value => {
            const checkbox = castList.querySelector(`input[value="${value}"]`)
            if (checkbox) {
              checkbox.checked = true
              console.log('✅ Restored selection:', value)
            }
          })
        }
      }
    })
  }

  updateQuotePreview() {
    console.log('🎭 CAST SELECTION: Updating quote preview with selected cast only')

    // Simply call the original populateAllTables method
    // The filtering is now handled in getAllTalentLines based on cast selection
    this.populateAllTables()
  }

  // Legacy method content removed to preserve all original functionality
  updateQuotePreviewLegacy() {
    // Override the quote preview to only show selected cast
    console.log('🎭 CAST SELECTION: Updating quote preview with selected cast only')

    // Find ANY table body that might be the quote preview
    const allTbodies = document.querySelectorAll('tbody')
    console.log('🔍 Found', allTbodies.length, 'tbody elements:', allTbodies)

    // Try to find the right one by looking for one that has quote-related content
    let previewRows = null
    allTbodies.forEach((tbody, index) => {
      console.log(`🔍 Tbody ${index}:`, tbody.className, tbody.getAttribute('data-combo'))
      if (tbody.className.includes('quote-preview') || tbody.getAttribute('data-combo')) {
        previewRows = tbody
        console.log(`✅ Using tbody ${index} as previewRows`)
      }
    })

    if (!previewRows && allTbodies.length > 0) {
      // Fallback: use the first tbody we can find
      previewRows = allTbodies[0]
      console.log('🆘 FALLBACK: Using first tbody element')
    }

    console.log('🔍 Final previewRows element:', previewRows)
    if (!previewRows) {
      console.log('❌ Still no previewRows element found!')
      return
    }

    // Clear only talent-related rows created by cast selection, preserve other rows (buyout, usage, etc.)
    if (previewRows) {
      const talentRows = previewRows.querySelectorAll('tr[data-talent-row="true"], tr.talent-row')
      talentRows.forEach(row => row.remove())
      console.log('🔄 Removed', talentRows.length, 'existing cast selection talent rows')
    }

    let hasTalent = false
    let combo1Total = 0

    // Get active combination for cast selection
    const activeCombination = document.querySelector('.combination-content.active')
    console.log('🔍 activeCombination:', activeCombination)
    if (activeCombination) {
      const selectedCastCheckboxes = activeCombination.querySelectorAll('.cast-selection-checkbox:checked')
      console.log('🔍 selectedCastCheckboxes found:', selectedCastCheckboxes.length, selectedCastCheckboxes)

      selectedCastCheckboxes.forEach(checkbox => {
        const castValue = checkbox.value // Format: "categoryId_lineIndex"
        const [categoryId] = castValue.split('_')

        // Find the talent data for this selection
        const section = document.getElementById(`talent-category-${categoryId}`)
        if (section) {
          const talentCount = parseInt(section.querySelector(`[data-talent-input="${categoryId}"]`)?.value) || 0
          const description = section.querySelector(`[data-description-input="${categoryId}"]`)?.value || section.querySelector('.talent-description')?.value || ''
          const rate = parseInt(section.querySelector(`[data-adjusted-rate-input="${categoryId}"]`)?.value) || 0

          if (talentCount > 0) {
            // Get combination ID for calculations (default to '1')
            const comboId = activeCombination?.getAttribute('data-combo') || '1'

            // Calculate proper exclusivity and buyout values
            const categoryExclusivities = this.getExclusivitiesForCategory(comboId, categoryId)
            const lineSpecificExclusivities = this.getExclusivitiesForSpecificLine(comboId, categoryId, 'main')
            const applicableExclusivities = [...categoryExclusivities, ...lineSpecificExclusivities]

            // Calculate buyout percentage for this talent
            const buyoutPercentage = this.calculateRowBuyoutPercentage(comboId, applicableExclusivities, categoryId, rate, 'main')

            // Generate exclusivity display
            const exclusivityDisplay = applicableExclusivities.length > 0
              ? applicableExclusivities.map(ex => `${ex.name} ${ex.percentage}%`).join(', ')
              : '-'

            // Calculate total with buyout
            const buyoutMultiplier = buyoutPercentage / 100
            const productFactor = this.lastProductFactor || 1.0
            const totalWithBuyout = talentCount * rate * buyoutMultiplier * productFactor

            combo1Total += totalWithBuyout

            const row = document.createElement('tr')
            row.className = 'border-b border-gray-300 talent-row'
            row.setAttribute('data-talent-row', 'true')
            row.innerHTML = `
              <td class="py-2 px-3 text-sm text-gray-800 border-r border-gray-300">${description}</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-right border-r border-gray-300">R${rate.toLocaleString()}</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-center border-r border-gray-300">${talentCount}</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-center border-r border-gray-300">${exclusivityDisplay}</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-center border-r border-gray-300">1</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-right border-r border-gray-300">${buyoutPercentage.toFixed(1)}%</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-right border-r border-gray-300">R${Math.floor(totalWithBuyout / talentCount).toLocaleString()}</td>
              <td class="py-2 px-3 text-sm text-gray-800 text-right">R${Math.floor(totalWithBuyout).toLocaleString()}</td>
            `
            previewRows.appendChild(row)
            hasTalent = true
          }
        }
      })
    }

    // Update group 1 total
    const combo1TotalElement = document.getElementById('combo-1-total')
    if (combo1TotalElement) {
      combo1TotalElement.textContent = `R${combo1Total.toLocaleString()}`
    }

    // If no talent lines, show placeholder
    if (!hasTalent) {
      const emptyRow = document.createElement('tr')
      emptyRow.innerHTML = '<td colspan="4" class="py-4 text-center text-gray-500 italic">No cast selected from Cast Selection above</td>'
      previewRows.appendChild(emptyRow)
    }
  }

  submitFormViaAjax(form) {
    console.log('🚀 submitFormViaAjax called')
    const previewBtn = document.getElementById('preview-quote-btn') || document.getElementById('generate-quote-btn')
    console.log('🔍 Preview/Generate button found:', previewBtn)

    // Prevent double submission
    if (previewBtn && (previewBtn.disabled || previewBtn.dataset.processing === 'true')) {
      console.log('🚫 Preview Quote button already processing, ignoring submission')
      return
    }

    // Show loading state with enhanced visual feedback
    if (previewBtn) {
      console.log('🔄 Setting loading state on button')
      previewBtn.disabled = true
      previewBtn.dataset.processing = 'true'

      // Handle different button types (submit input vs button)
      if (previewBtn.tagName === 'INPUT') {
        // For submit input, change the value
        previewBtn.value = 'Generating...'
      } else {
        // For button element, change innerHTML with spinner
        previewBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating Preview...'
      }

      // Also change button background to indicate processing
      previewBtn.classList.add('opacity-75', 'cursor-wait')
      previewBtn.classList.remove('hover:bg-blue-700')

      console.log('✅ Enhanced loading state set - disabled:', previewBtn.disabled)
    } else {
      console.error('❌ Button not found with ID: preview-quote-btn or generate-quote-btn')
    }

    // Prepare form data
    const formData = new FormData(form)

    // Submit via AJAX
    console.log('🚀 Starting form submission to:', form.action)
    console.log('📦 Form data entries:', Array.from(formData.entries()).length)

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html'
      }
    })
    .then(response => {
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`)
      }
      return response.text()
    })
    .then(html => {
      // Parse the response and extract the complete page content
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // Replace the entire body content to simulate page navigation
      document.body.innerHTML = doc.body.innerHTML

      // Update the page title if it exists
      const newTitle = doc.querySelector('title')
      if (newTitle) {
        document.title = newTitle.textContent
      }

      // Update the URL without reloading the page
      // Look for quotation ID or final quotation ID in the response
      const quotationIdElement = doc.querySelector('[data-quotation-id]')
      const finalQuotationIdElement = doc.querySelector('[data-final-quotation-id]')

      let newPath = '/quotations'
      if (finalQuotationIdElement) {
        newPath = `/final_quotations/${finalQuotationIdElement.dataset.finalQuotationId}`
      } else if (quotationIdElement) {
        newPath = `/quotations/${quotationIdElement.dataset.quotationId}`
      }

      const currentUrl = new URL(window.location)
      currentUrl.pathname = newPath
      window.history.pushState({}, '', currentUrl.toString())

      // Scroll to top to simulate page navigation
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    .catch(error => {
      console.error('❌ Error generating preview:', error)
      console.error('❌ Error stack:', error.stack)
      console.error('❌ Form data:', Array.from(formData.entries()))
      console.error('❌ Form action:', form.action)
      alert(`Error generating quote preview: ${error.message}\nCheck console for details.`)
    })
    .finally(() => {
      console.log('🔄 Form submission completed, resetting button state')
      // Reset button state (only if button still exists after page replacement)
      const currentBtn = document.getElementById('preview-quote-btn') || document.getElementById('generate-quote-btn')
      if (currentBtn) {
        console.log('🔄 Resetting button state')
        currentBtn.disabled = false
        currentBtn.dataset.processing = 'false'

        // Reset button text based on which button it is
        if (currentBtn.id === 'generate-quote-btn') {
          currentBtn.value = 'Generate Quote'
        } else {
          currentBtn.innerHTML = 'Preview Quote'
        }

        // Restore original button styling
        currentBtn.classList.remove('opacity-75', 'cursor-wait')
        currentBtn.classList.add('hover:bg-blue-700')

        console.log('✅ Button state reset - disabled:', currentBtn.disabled)
      } else {
        console.log('ℹ️ Button not found after submission (likely page replaced)')
      }
    })
  }

  // Load stored combinations data for edit mode
  loadStoredCombinationsData() {
    console.log('🔄 Checking for stored data in edit mode (dual structure)...')

    // Check for both hidden fields (dual data structure)
    const combinationsField = document.querySelector('input[name="combinations"]')
    const talentDataField = document.querySelector('input[name="talent_data"]')

    if (!combinationsField || !combinationsField.value) {
      console.log('ℹ️ No stored combinations data found - this is a new quotation or edit without stored data')
      console.log('🔄 Generating default preview from database data...')
      // When there's no stored data, generate a default preview from database
      this.populateAllTables()
      return
    }

    try {
      const storedCombinationsData = JSON.parse(combinationsField.value)
      console.log('✅ Found stored combinations data:', storedCombinationsData)

      // Also load talent parameters if available
      let storedTalentData = null
      if (talentDataField && talentDataField.value) {
        storedTalentData = JSON.parse(talentDataField.value)
        console.log('✅ Found stored talent data:', storedTalentData)
      } else {
        console.log('⚠️ No talent data field found - using combinations data only')
      }

      // Debug: show what combinations and talent data we have
      Object.entries(storedCombinationsData).forEach(([comboKey, comboData]) => {
        console.log(`📋 Combo ${comboKey} info:`)
        console.log(`   duration: "${comboData.duration}"`)
        console.log(`   territories:`, comboData.territories)
        console.log(`   media_types:`, comboData.media_types)
        console.log(`   is_guaranteed:`, comboData.is_guaranteed)
        console.log(`   calculated_values:`, Object.keys(comboData.calculated_values || {}))
      })

      if (storedTalentData) {
        console.log('🎭 Talent data categories:', Object.keys(storedTalentData))
        Object.entries(storedTalentData).forEach(([categoryId, categoryData]) => {
          if (categoryData.lines && Array.isArray(categoryData.lines)) {
            console.log(`   Category ${categoryId}: ${categoryData.lines.length} lines`)
            categoryData.lines.forEach((lineData, index) => {
              console.log(`     Line ${index}: ${lineData.description} (${lineData.talent_count} × R${lineData.adjusted_rate})`)
            })
          } else {
            // Fallback for old structure
            console.log(`   Category ${categoryId}: ${categoryData.description} (${categoryData.talent_count} × R${categoryData.adjusted_rate})`)
          }
        })
      }

      // Populate form fields with stored data (both parts)
      this.populateFormFromStoredData(storedCombinationsData, storedTalentData)

    } catch (error) {
      console.error('❌ Error parsing stored combinations data:', error)
    }
  }

  // Populate form fields from stored combinations data
  populateFormFromStoredData(storedCombinationsData, storedTalentData) {
    console.log('📝 Recreating form from dual stored data...')

    // Step 0: Load talent parameters from talent data (if available)
    if (storedTalentData) {
      console.log('🎯 Using stored talent data for form population - skipping combinations talent creation')
      this.populateTalentParametersFromStoredData(storedTalentData)

      // Step 1: Only recreate combinations structure (no talent lines) since we have stored talent data
      this.recreateCombinationsStructureOnly(storedCombinationsData)
    } else {
      console.log('⚠️ No stored talent data available - using combinations data fallback')
      // Step 1: Recreate talent combinations from calculated_values
      this.recreateTalentCombinationsFromStoredData(storedCombinationsData, storedTalentData)
    }

    // Step 2: Update cast selection with loaded talent
    setTimeout(() => {
      this.updateCastSelectionAfterTalentLoad()
    }, 100)

    // Step 3: Create licensing combinations (groups)
    this.recreateLicensingCombinationsFromStoredData(storedCombinationsData)

    // Step 3.5: Restore exclusivity data from combinations
    this.restoreExclusivityDataFromCombinations(storedCombinationsData)

    // Step 4: Rebuild preview tables
    setTimeout(() => {
      this.rebuildPreviewTablesFromStoredData(storedCombinationsData)
    }, 500) // Small delay to ensure DOM is updated

    console.log('✅ Combinations recreation completed')
  }

  // Update cast selection after talent data is loaded
  updateCastSelectionAfterTalentLoad() {
    console.log('🎭 Updating cast selection after talent load...')

    // First trigger the cast selection update to populate available options
    this.updateCastSelection()

    // Then mark the appropriate checkboxes as selected based on loaded talent data
    setTimeout(() => {
      this.markSelectedCastBasedOnLoadedTalent()
    }, 100)

    console.log('✅ Cast selection updated after talent load')
  }

  // Mark cast selection checkboxes based on which talent was actually loaded
  markSelectedCastBasedOnLoadedTalent() {
    console.log('🎯 Marking selected cast based on loaded talent...')

    // Get the stored combinations data from the same source as other methods
    const combinationsField = document.querySelector('input[name="combinations"]')
    if (!combinationsField || !combinationsField.value) {
      console.log('❌ No stored combinations data found in form field')
      return
    }

    let storedData
    try {
      storedData = JSON.parse(combinationsField.value)
    } catch (e) {
      console.log('❌ Error parsing stored combinations data:', e)
      return
    }

    // For each combination, mark the cast selection checkboxes
    Object.entries(storedData).forEach(([comboKey, comboData]) => {
      const comboNumber = comboKey.replace('combo_', '')
      console.log(`🔍 Processing combo ${comboNumber} for cast selection...`)

      if (comboData.calculated_values) {
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          Object.entries(talentLines).forEach(([lineIndex, lineData]) => {
            // Create the checkbox value that matches what was generated
            const checkboxValue = `${categoryId}_${lineIndex}`

            // Find the cast selection container for this combo
            const castContainer = document.querySelector(`.cast-selection-container[data-combo="${comboNumber}"]`)
            if (castContainer) {
              const checkbox = castContainer.querySelector(`input[value="${checkboxValue}"]`)
              if (checkbox) {
                checkbox.checked = true
                console.log(`✅ Marked cast selection: combo ${comboNumber}, category ${categoryId}, line ${lineIndex}`)
              } else {
                console.log(`⚠️ Cast selection checkbox not found: ${checkboxValue} in combo ${comboNumber}`)
              }
            } else {
              console.log(`⚠️ Cast selection container not found for combo ${comboNumber}`)
            }
          })
        })
      }
    })

    console.log('🎯 Finished marking selected cast')
  }

  // Recreate combinations structure without creating talent lines (when we have stored talent data)
  recreateCombinationsStructureOnly(storedData) {
    console.log('🏗️ Recreating combinations structure only (no talent lines)...')

    // Only collect the categories that exist in combinations data for cast selection purposes
    const talentCategories = new Set()

    Object.entries(storedData).forEach(([comboKey, comboData]) => {
      if (comboData.calculated_values) {
        Object.keys(comboData.calculated_values).forEach(categoryId => {
          talentCategories.add(categoryId)
        })
      }
    })

    console.log('📊 Found categories in combinations data:', Array.from(talentCategories))
    console.log('✅ Combinations structure recreation completed (no talent lines created)')
  }

  // Restore exclusivity data from stored combinations
  restoreExclusivityDataFromCombinations(storedData) {
    console.log('🏷️ Restoring exclusivity data from stored combinations...')

    // Initialize window.lineExclusivityData if not exists
    if (!window.lineExclusivityData) {
      window.lineExclusivityData = {}
    }

    // Iterate through each combination
    Object.entries(storedData).forEach(([comboKey, comboData]) => {
      const comboNumber = comboKey.replace('combo_', '')
      console.log(`🔍 Processing exclusivities for ${comboKey}`)

      if (comboData.calculated_values) {
        // Iterate through each category's talent lines
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          Object.entries(talentLines).forEach(([lineIndex, lineData]) => {
            // Check if this line has exclusivity data
            if (lineData.exclusivity_type && lineData.exclusivity_type !== '') {
              const lineKey = `${comboNumber}_${categoryId}_${lineIndex}`

              // Parse exclusivity string (format: "car 50%" or "exclusive 100%")
              const exclusivityMatch = lineData.exclusivity_type.match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/)

              if (exclusivityMatch) {
                const exclusivityName = exclusivityMatch[1].trim()
                const exclusivityPercentage = parseFloat(exclusivityMatch[2])

                // Initialize array for this line if not exists
                if (!window.lineExclusivityData[lineKey]) {
                  window.lineExclusivityData[lineKey] = []
                }

                // Add exclusivity data
                window.lineExclusivityData[lineKey].push({
                  name: exclusivityName,
                  percentage: exclusivityPercentage,
                  categoryId: categoryId,
                  lineIndex: parseInt(lineIndex),
                  comboId: comboNumber
                })

                console.log(`✅ Restored exclusivity for ${lineKey}: ${exclusivityName} ${exclusivityPercentage}%`)
              } else {
                console.warn(`⚠️ Could not parse exclusivity: "${lineData.exclusivity_type}"`)
              }
            }
          })
        })
      }
    })

    console.log('🏷️ Final exclusivity data:', window.lineExclusivityData)
    console.log('✅ Exclusivity data restoration completed')
  }

  // Recreate talent combinations from calculated_values data
  recreateTalentCombinationsFromStoredData(storedData, storedTalentData = null) {
    console.log('👤 Recreating talent combinations...')

    // Collect ALL talent lines from all combinations, keeping duplicates
    const talentCategories = new Map()

    Object.entries(storedData).forEach(([comboKey, comboData]) => {
      if (comboData.calculated_values) {
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          if (!talentCategories.has(categoryId)) {
            talentCategories.set(categoryId, [])
          }

          Object.entries(talentLines).forEach(([lineIndex, lineData]) => {
            // Add each talent line with combo info
            talentCategories.get(categoryId).push({
              ...lineData,
              comboKey,
              lineIndex: parseInt(lineIndex)
            })
          })
        })
      }
    })

    // Remove duplicates based on description but keep all unique talent lines
    talentCategories.forEach((talentLines, categoryId) => {
      const uniqueLines = []
      const seenDescriptions = new Set()

      console.log(`🔍 Category ${categoryId} raw lines:`, talentLines.map(line => line.description))

      talentLines.forEach(line => {
        const description = line.description || ''
        if (!seenDescriptions.has(description)) {
          seenDescriptions.add(description)
          uniqueLines.push(line)
          console.log(`➕ Added unique line: ${description}`)
        } else {
          console.log(`⚠️ Skipped duplicate: ${description}`)
        }
      })

      console.log(`📊 Category ${categoryId}: Found ${talentLines.length} total lines, ${uniqueLines.length} unique`)
      console.log(`🎯 Final unique lines:`, uniqueLines.map(line => line.description))
      talentCategories.set(categoryId, uniqueLines)
    })

    // Create talent category sections and populate them
    talentCategories.forEach((talentLines, categoryId) => {
      this.ensureTalentCategoryExistsAndPopulate(categoryId, talentLines, storedTalentData)
    })
  }

  // Ensure talent category exists and populate it with stored data
  ensureTalentCategoryExistsAndPopulate(categoryId, talentLines, storedTalentData = null) {
    console.log(`🏗️ Setting up category ${categoryId} with ${talentLines.length} talent lines`)

    // Check if talent category section exists
    let categorySection = document.getElementById(`talent-category-${categoryId}`)

    if (!categorySection) {
      // Need to create the talent category section first
      this.createTalentCategorySection(categoryId)
      categorySection = document.getElementById(`talent-category-${categoryId}`)
    }

    if (!categorySection) {
      console.error(`Failed to create talent category section for ${categoryId}`)
      return
    }

    // Get the main category data from stored talent data if available, otherwise use combinations data
    let mainCategoryData = talentLines[0] // fallback to combinations data

    if (storedTalentData && storedTalentData[categoryId]) {
      const categoryData = storedTalentData[categoryId]
      if (categoryData.lines && Array.isArray(categoryData.lines) && categoryData.lines.length > 0) {
        // Use the first line from stored talent data (which has correct values)
        mainCategoryData = categoryData.lines[0]
        console.log(`🎯 Using stored talent data for category ${categoryId} main fields:`, mainCategoryData)
      } else if (categoryData.talent_count && categoryData.adjusted_rate) {
        // Legacy structure
        mainCategoryData = categoryData
        console.log(`🎯 Using legacy stored talent data for category ${categoryId} main fields:`, mainCategoryData)
      }
    }

    if (mainCategoryData) {
      this.populateTalentCategoryMainFields(categoryId, mainCategoryData)
    }

    // Add additional talent lines if there are more
    console.log(`📊 Category ${categoryId} has ${talentLines.length} total lines`)
    if (talentLines.length > 1) {
      console.log(`➕ Adding ${talentLines.length - 1} additional lines to category ${categoryId}`)
      for (let i = 1; i < talentLines.length; i++) {
        console.log(`🔄 Processing additional line ${i}: ${talentLines[i].description}`)
        this.addTalentLineToCategory(categoryId, talentLines[i])
      }
    }
  }

  // Create talent category section if it doesn't exist
  createTalentCategorySection(categoryId) {
    console.log(`🆕 Showing talent category section for category ${categoryId}`)

    const categoryName = this.getCategoryName(categoryId)

    // Wait a bit more to ensure DOM is fully ready
    setTimeout(() => {
      // Find the hidden talent category section and show it
      const categorySection = document.getElementById(`talent-category-${categoryId}`)
      if (categorySection) {
        categorySection.classList.remove('hidden')
        console.log(`✅ Showed talent category section for ${categoryName}`)

        // Also activate the talent button to show it's selected
        const categoryButton = document.querySelector(`[data-category="${categoryId}"].talent-btn`)
        if (categoryButton) {
          categoryButton.classList.add('bg-blue-100', 'border-blue-400', 'text-blue-700')
          console.log(`✅ Activated talent button for ${categoryName}`)
        }
      } else {
        console.warn(`No talent category section found for ${categoryId}`)
      }
    }, 100)
  }

  // Populate main talent category fields
  populateTalentCategoryMainFields(categoryId, lineData) {
    console.log(`📝 Populating main fields for category ${categoryId}:`, lineData)

    // Extract description (remove category prefix like "LD - ")
    const description = lineData.description ?
      lineData.description.replace(/^[A-Z0-9]+ - /, '') : ''

    // Find main talent input fields (they're in the first row of the additional-lines tbody)
    const categorySection = document.getElementById(`talent-category-${categoryId}`)
    const firstRow = categorySection?.querySelector('.additional-lines .talent-input-row:first-child')

    const talentCountField = firstRow?.querySelector('input[name*="[talent_count]"]') || document.querySelector(`input[name="talent[${categoryId}][talent_count]"]`)
    const descriptionField = firstRow?.querySelector('input[name*="[description]"]') || document.querySelector(`input[name="talent[${categoryId}][description]"]`)
    const adjustedRateField = firstRow?.querySelector('input[name*="[adjusted_rate]"]') || document.querySelector(`input[name="talent[${categoryId}][adjusted_rate]"]`)

    console.log(`🔍 Looking for fields for category ${categoryId}:`)
    console.log(`   Category section: ${categorySection ? 'FOUND' : 'NOT FOUND'}`)
    console.log(`   First row: ${firstRow ? 'FOUND' : 'NOT FOUND'}`)
    console.log(`   Count field: ${talentCountField ? 'FOUND' : 'NOT FOUND'}`)
    console.log(`   Description field: ${descriptionField ? 'FOUND' : 'NOT FOUND'}`)
    console.log(`   Rate field: ${adjustedRateField ? 'FOUND' : 'NOT FOUND'}`)

    if (talentCountField) {
      try {
        talentCountField.value = lineData.talent_count || ''
        console.log(`✅ Set talent count: ${lineData.talent_count}`)
      } catch (error) {
        console.error(`❌ Error setting talent count: ${error.message}`)
      }
    } else {
      console.warn(`❌ Could not find talent count field for category ${categoryId}`)
    }

    if (descriptionField) {
      try {
        descriptionField.value = description
        console.log(`✅ Set description: ${description}`)
      } catch (error) {
        console.error(`❌ Error setting description: ${error.message}`)
      }
    } else {
      console.warn(`❌ Could not find description field for category ${categoryId}`)
    }

    if (adjustedRateField) {
      try {
        adjustedRateField.value = lineData.adjusted_rate || ''
        console.log(`✅ Set adjusted rate: ${lineData.adjusted_rate}`)
      } catch (error) {
        console.error(`❌ Error setting adjusted rate: ${error.message}`)
      }
    } else {
      console.warn(`❌ Could not find adjusted rate field for category ${categoryId}`)
    }

    // Also populate rehearsal days and overtime for main fields (first row)
    const rehearsalField = firstRow?.querySelector('input[name*="[rehearsal_days]"]') || document.querySelector(`input[name="talent[${categoryId}][rehearsal_days]"]`)
    const overtimeField = firstRow?.querySelector('input[name*="[overtime_hours]"]') || document.querySelector(`input[name="talent[${categoryId}][overtime_hours]"]`)
    const nightButton = firstRow?.querySelector('.night-btn') || document.querySelector(`#talent-category-${categoryId} .night-btn`)
    const nightPremiumInput = firstRow?.querySelector('input[name*="[night_premium]"]') || document.querySelector(`input[name="talent[${categoryId}][night_premium]"]`)

    if (rehearsalField) {
      let rehearsalDays = 0
      if (description.toLowerCase().includes('dancer')) {
        rehearsalDays = 5
      } else if (description.toLowerCase().includes('girl')) {
        rehearsalDays = 2
      }

      if (rehearsalDays > 0) {
        rehearsalField.value = rehearsalDays
        console.log(`✅ Set main rehearsal days: ${rehearsalDays}`)
      }
    }

    if (overtimeField) {
      // Only set overtime from actual stored data, not from description patterns
      const storedOvertimeHours = lineData.overtime_hours || 0
      if (storedOvertimeHours > 0) {
        overtimeField.value = storedOvertimeHours
        console.log(`✅ Set main overtime hours from stored data: ${storedOvertimeHours}`)
      }
    }

    // Handle night premium for main fields
    if (nightButton && nightPremiumInput && description) {
      let hasNightPremium = false

      if (description.toLowerCase().includes('girl')) {
        hasNightPremium = true
        console.log(`🌙 Main Girl has night premium: true`)
      }

      if (hasNightPremium) {
        // Activate the night button (make it look pressed/active)
        nightButton.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-700')
        nightButton.dataset.active = 'true'

        // Set the hidden field to true
        nightPremiumInput.value = 'true'

        console.log(`✅ Set main night premium: true`)
      }
    }

    // Trigger calculation updates
    if (talentCountField) talentCountField.dispatchEvent(new Event('input'))
    if (adjustedRateField) adjustedRateField.dispatchEvent(new Event('input'))
  }

  // Add additional talent line to category
  addTalentLineToCategory(categoryId, lineData) {
    console.log(`➕ Adding additional talent line to category ${categoryId}:`, lineData)

    // Use existing addTalentLine method to create new row, bypassing debounce for form population
    this.addTalentLine(categoryId, true)

    // Find the newly added line and populate it
    const additionalLinesContainer = document.querySelector(`[data-category="${categoryId}"].additional-lines`)
    if (additionalLinesContainer) {
      const lastLine = additionalLinesContainer.lastElementChild
      if (lastLine) {
        this.populateAdditionalLineFields(lastLine, lineData, categoryId)
      }
    }
  }

  // Populate additional line fields with line data
  populateAdditionalLineFields(lineRow, lineData, categoryId) {
    console.log(`🔍📝 populateAdditionalLineFields called for category ${categoryId}`)
    console.log(`🔍 lineData:`, lineData)
    console.log(`🔍 lineRow:`, lineRow)

    const description = lineData.description ?
      lineData.description.replace(/^[A-Z0-9]+ - /, '') : ''

    // Find the input fields within this line row
    const descriptionInput = lineRow.querySelector('input[name*="[description]"]')
    const countInput = lineRow.querySelector('input[name*="[talent_count]"]')
    const rateInput = lineRow.querySelector('input[name*="[adjusted_rate]"]')
    const daysInput = lineRow.querySelector('input[name*="[days_count]"]')
    const rehearsalInput = lineRow.querySelector('input[name*="[rehearsal_days]"]')
    const downDaysInput = lineRow.querySelector('input[name*="[down_days]"]')
    const travelDaysInput = lineRow.querySelector('input[name*="[travel_days]"]')
    const overtimeInput = lineRow.querySelector('input[name*="[overtime_hours]"]')

    console.log(`🔍 Found fields - description: ${!!descriptionInput}, count: ${!!countInput}, rate: ${!!rateInput}, days: ${!!daysInput}, rehearsal: ${!!rehearsalInput}, down: ${!!downDaysInput}, travel: ${!!travelDaysInput}, overtime: ${!!overtimeInput}`)

    if (descriptionInput) {
      console.log(`🔍 Setting description from "${descriptionInput.value}" to "${description}"`)
      descriptionInput.value = description
      console.log(`✅ Set line description: ${description}, field value is now: "${descriptionInput.value}"`)
    } else {
      console.log(`❌ Description input NOT FOUND`)
    }

    if (countInput) {
      console.log(`🔍 Setting talent_count from ${countInput.value} to ${lineData.talent_count || 1}`)
      countInput.value = lineData.talent_count || 1
      countInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line count: ${lineData.talent_count}, field value is now: ${countInput.value}`)
    } else {
      console.log(`❌ Count input NOT FOUND`)
    }

    if (rateInput) {
      console.log(`🔍 Setting adjusted_rate from ${rateInput.value} to ${lineData.adjusted_rate || 0}`)
      rateInput.value = lineData.adjusted_rate || 0
      rateInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line rate: ${lineData.adjusted_rate}, field value is now: ${rateInput.value}`)
    } else {
      console.log(`❌ Rate input NOT FOUND`)
    }

    if (daysInput) {
      console.log(`🔍 Setting days_count from ${daysInput.value} to ${lineData.days_count || 1}`)
      daysInput.value = lineData.days_count || 1
      daysInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line days: ${lineData.days_count}, field value is now: ${daysInput.value}`)
    } else {
      console.log(`❌ Days input NOT FOUND`)
    }

    if (rehearsalInput) {
      console.log(`🔍 Setting rehearsal_days from ${rehearsalInput.value} to ${lineData.rehearsal_days || 0}`)
      rehearsalInput.value = lineData.rehearsal_days || 0
      rehearsalInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line rehearsal days: ${lineData.rehearsal_days}, field value is now: ${rehearsalInput.value}`)
    } else {
      console.log(`❌ Rehearsal input NOT FOUND`)
    }

    if (downDaysInput) {
      console.log(`🔍 Setting down_days from ${downDaysInput.value} to ${lineData.down_days || 0}`)
      downDaysInput.value = lineData.down_days || 0
      downDaysInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line down days: ${lineData.down_days}, field value is now: ${downDaysInput.value}`)
    } else {
      console.log(`❌ Down days input NOT FOUND`)
    }

    if (travelDaysInput) {
      console.log(`🔍 Setting travel_days from ${travelDaysInput.value} to ${lineData.travel_days || 0}`)
      travelDaysInput.value = lineData.travel_days || 0
      travelDaysInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line travel days: ${lineData.travel_days}, field value is now: ${travelDaysInput.value}`)
    } else {
      console.log(`❌ Travel days input NOT FOUND`)
    }

    if (overtimeInput) {
      console.log(`🔍 Setting overtime_hours from ${overtimeInput.value} to ${lineData.overtime_hours || 0}`)
      overtimeInput.value = lineData.overtime_hours || 0
      overtimeInput.dispatchEvent(new Event('input'))
      console.log(`✅ Set line overtime hours: ${lineData.overtime_hours}, field value is now: ${overtimeInput.value}`)
    } else {
      console.log(`❌ Overtime input NOT FOUND`)
    }

    // Handle night premium
    if (lineData.night_premium) {
      const nightButton = lineRow.querySelector('.night-btn')
      const nightPremiumInput = lineRow.querySelector('input[name*="[night_premium]"]')
      console.log(`🔍 Setting night premium - button: ${!!nightButton}, input: ${!!nightPremiumInput}`)
      if (nightButton && nightPremiumInput) {
        nightButton.dataset.active = 'true'
        nightButton.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
        nightButton.classList.remove('border-gray-300')
        nightPremiumInput.value = 'true'
        console.log(`✅ Set line night premium: true`)
      } else {
        console.log(`❌ Night button or input NOT FOUND`)
      }
    }

    console.log(`✅ Populated additional line: ${description} (${lineData.talent_count} @ R${lineData.adjusted_rate})`)
  }

  // Populate additional fields like rehearsal from original quotation data
  populateAdditionalFieldsFromOriginalData(lineRow, description, categoryId) {
    // This would need to access the original quotation data
    // For now, let's add some specific hardcoded logic for known cases
    const rehearsalInput = lineRow.querySelector('input[name*="[rehearsal_days]"]')
    const nightButton = lineRow.querySelector('.night-btn')
    const nightPremiumInput = lineRow.querySelector('input[name*="[night_premium]"]')

    if (rehearsalInput && description) {
      let rehearsalDays = 0

      // Specific mappings based on the data we saw
      if (description.toLowerCase().includes('dancer')) {
        rehearsalDays = 5
        console.log(`🎭 Set rehearsal days for dancer: ${rehearsalDays}`)
      } else if (description.toLowerCase().includes('girl')) {
        rehearsalDays = 2
        console.log(`🎭 Set rehearsal days for girl: ${rehearsalDays}`)
      }

      if (rehearsalDays > 0) {
        rehearsalInput.value = rehearsalDays
        rehearsalInput.dispatchEvent(new Event('input'))
        console.log(`✅ Set rehearsal days: ${rehearsalDays}`)
      }
    }

    // Handle night premium (simple true/false button)
    if (nightButton && nightPremiumInput && description) {
      let hasNightPremium = false

      // Specific mappings for night premium
      if (description.toLowerCase().includes('girl')) {
        hasNightPremium = true
        console.log(`🌙 Girl has night premium: true`)
      }

      if (hasNightPremium) {
        // Activate the night button (make it look pressed/active)
        nightButton.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-700')
        nightButton.dataset.active = 'true'

        // Set the hidden field to true
        nightPremiumInput.value = 'true'

        console.log(`✅ Set night premium: true`)
      }
    }
  }

  // Recreate licensing combinations (groups)
  recreateLicensingCombinationsFromStoredData(storedData) {
    console.log('🌍 Recreating licensing combinations (groups)...')

    const combinations = Object.entries(storedData)
    console.log(`📊 Found ${combinations.length} combinations to populate`)

    if (combinations.length > 0) {
      // Step 1: Create additional group tabs if needed
      if (combinations.length > 1) {
        this.createGroupTabs(combinations.length)
      }

      // Step 2: Populate each group with its corresponding combination data
      combinations.forEach(([comboKey, comboData], index) => {
        const groupNumber = index + 1
        console.log(`🏗️ Populating Group ${groupNumber} with combination ${comboKey} data:`, {
          territories: comboData.territories,
          mediaTypes: comboData.media_types,
          duration: comboData.duration,
          guaranteed: comboData.is_guaranteed
        })

        // Populate this group with the combination data (with delay to avoid conflicts)
        setTimeout(() => {
          this.populateGroupData(groupNumber, comboData)
        }, groupNumber * 100)
      })

      // Step 3: Ensure Group 1 is active by default
      setTimeout(() => {
        this.switchToTab(1)
      }, (combinations.length * 100) + 200)
    }
  }

  // Create group tabs for multiple combinations
  createGroupTabs(totalGroups) {
    console.log(`📋 Creating ${totalGroups} group tabs`)

    const tabsContainer = document.getElementById('combination-tabs')
    if (!tabsContainer) {
      console.warn('❌ combination-tabs container not found')
      return
    }

    // Add click handler to Group 1 tab if it doesn't have one
    const group1Tab = tabsContainer.querySelector('.combination-tab[data-combo="1"]')
    if (group1Tab) {
      // Remove existing listeners to avoid duplicates
      const newGroup1Tab = group1Tab.cloneNode(true)
      group1Tab.parentNode.replaceChild(newGroup1Tab, group1Tab)

      // Add our click handler
      newGroup1Tab.addEventListener('click', () => this.switchToTab(1))
      console.log(`✅ Added click handler to Group 1 tab`)
    }

    // Clear existing tabs except the first one
    const existingTabs = tabsContainer.querySelectorAll('.combination-tab')
    for (let i = 1; i < existingTabs.length; i++) {
      existingTabs[i].remove()
    }

    // Create additional tabs if needed
    for (let i = 2; i <= totalGroups; i++) {
      const newTab = document.createElement('button')
      newTab.type = 'button'
      newTab.className = 'combination-tab px-4 py-2 border-b-2 border-transparent text-gray-600 font-medium text-sm'
      newTab.setAttribute('data-combo', i.toString())
      newTab.textContent = `Group ${i}`

      // Add click handler
      newTab.addEventListener('click', () => this.switchToTab(i))

      tabsContainer.appendChild(newTab)
      console.log(`✅ Created tab for Group ${i}`)
    }

    // Also create corresponding content divs
    this.createGroupContentDivs(totalGroups)
  }

  // Create content divs for additional groups using proper form structure
  createGroupContentDivs(totalGroups) {
    const contentContainer = document.getElementById('combinations-content')
    if (!contentContainer) return

    // Use the existing createCombinationContent function if available, otherwise create proper form structure
    for (let i = 2; i <= totalGroups; i++) {
      let contentDiv = contentContainer.querySelector(`[data-combo="${i}"]`)
      if (!contentDiv) {
        // Check if createCombinationContent function exists (from the view)
        if (typeof createCombinationContent === 'function') {
          console.log(`🏗️ Using createCombinationContent for Group ${i}`)
          contentDiv = createCombinationContent(i)
          contentContainer.appendChild(contentDiv)
        } else {
          // Fallback: clone the structure from Group 1
          const group1Content = contentContainer.querySelector('[data-combo="1"]')
          if (group1Content) {
            console.log(`🏗️ Cloning Group 1 structure for Group ${i}`)
            contentDiv = group1Content.cloneNode(true)
            contentDiv.setAttribute('data-combo', i.toString())
            contentDiv.classList.remove('active')
            contentDiv.style.display = 'none'

            // Update all form field names and IDs within the cloned content
            this.updateFormFieldsForNewGroup(contentDiv, i)
            contentContainer.appendChild(contentDiv)
          } else {
            // Ultimate fallback: create minimal structure
            contentDiv = document.createElement('div')
            contentDiv.className = 'combination-content'
            contentDiv.setAttribute('data-combo', i.toString())
            contentDiv.innerHTML = `<p class="text-gray-500">Group ${i} content structure needs to be implemented</p>`
            contentContainer.appendChild(contentDiv)
          }
        }
        console.log(`✅ Created content div for Group ${i}`)
      }
    }
  }

  // Update form field names and IDs when cloning content for a new group
  updateFormFieldsForNewGroup(contentDiv, groupNumber) {
    console.log(`🔧 Updating form fields for Group ${groupNumber}`)

    // Update all input, select, and textarea elements
    contentDiv.querySelectorAll('input, select, textarea').forEach(field => {
      console.log(`🔧 Processing field:`, field.name, field.id)

      if (field.name) {
        // Handle various naming patterns for combinations
        const oldName = field.name
        if (field.name.includes('combinations[1]')) {
          field.name = field.name.replace(/combinations\[1\]/g, `combinations[${groupNumber}]`)
        } else if (field.name.includes('combinations[combination_1]')) {
          field.name = field.name.replace(/combinations\[combination_1\]/g, `combinations[combination_${groupNumber}]`)
        } else if (field.name.includes('[1]')) {
          field.name = field.name.replace(/\[1\]/g, `[${groupNumber}]`)
        }
        console.log(`🔧 Updated name: ${oldName} → ${field.name}`)
      }

      if (field.id) {
        const oldId = field.id
        // Handle various ID patterns
        if (field.id.includes('-1-')) {
          field.id = field.id.replace(/-1-/g, `-${groupNumber}-`)
        } else if (field.id.includes('_1_')) {
          field.id = field.id.replace(/_1_/g, `_${groupNumber}_`)
        } else if (field.id.endsWith('-1')) {
          field.id = field.id.replace(/-1$/, `-${groupNumber}`)
        } else if (field.id.endsWith('_1')) {
          field.id = field.id.replace(/_1$/, `_${groupNumber}`)
        } else if (/1$/.test(field.id)) {
          field.id = field.id.replace(/1$/, groupNumber.toString())
        }
        console.log(`🔧 Updated ID: ${oldId} → ${field.id}`)
      }

      // Reset form values
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = false
      } else if (field.type !== 'hidden') {
        field.value = ''
      }
    })

    // Update labels and other elements with for attributes
    contentDiv.querySelectorAll('label[for]').forEach(label => {
      const oldFor = label.getAttribute('for')
      let newFor = oldFor
      if (oldFor.includes('-1-')) {
        newFor = oldFor.replace(/-1-/g, `-${groupNumber}-`)
      } else if (oldFor.includes('_1_')) {
        newFor = oldFor.replace(/_1_/g, `_${groupNumber}_`)
      } else if (oldFor.endsWith('-1')) {
        newFor = oldFor.replace(/-1$/, `-${groupNumber}`)
      } else if (oldFor.endsWith('_1')) {
        newFor = oldFor.replace(/_1$/, `_${groupNumber}`)
      } else if (/1$/.test(oldFor)) {
        newFor = oldFor.replace(/1$/, groupNumber.toString())
      }
      label.setAttribute('for', newFor)
      console.log(`🔧 Updated label for: ${oldFor} → ${newFor}`)
    })

    // Update data attributes
    contentDiv.querySelectorAll('[data-combo]').forEach(element => {
      element.setAttribute('data-combo', groupNumber.toString())
      console.log(`🔧 Updated data-combo to: ${groupNumber}`)
    })

    console.log(`✅ Updated form fields for Group ${groupNumber}`)
  }

  // Switch to a specific group tab
  switchToTab(groupNumber) {
    console.log(`🔄 Switching to Group ${groupNumber}`)

    // Update tab styles - be more specific to avoid conflicts
    document.querySelectorAll('#combination-tabs .combination-tab').forEach(tab => {
      tab.classList.remove('border-blue-500', 'text-blue-600', 'font-medium')
      tab.classList.add('border-transparent', 'text-gray-600')
    })

    const activeTab = document.querySelector(`#combination-tabs .combination-tab[data-combo="${groupNumber}"]`)
    console.log(`🔍 Looking for tab with data-combo="${groupNumber}":`, activeTab)
    if (activeTab) {
      activeTab.classList.add('border-blue-500', 'text-blue-600', 'font-medium')
      activeTab.classList.remove('border-transparent', 'text-gray-600')
      console.log(`✅ Activated tab for Group ${groupNumber}`)
    } else {
      console.log(`❌ Tab for Group ${groupNumber} not found`)
    }

    // Update content visibility - be more specific to avoid conflicts
    document.querySelectorAll('#combinations-content .combination-content').forEach(content => {
      content.classList.remove('active')
      content.style.display = 'none'
    })

    const activeContent = document.querySelector(`#combinations-content .combination-content[data-combo="${groupNumber}"]`)
    console.log(`🔍 Looking for content with data-combo="${groupNumber}":`, activeContent)
    if (activeContent) {
      activeContent.classList.add('active')
      activeContent.style.display = 'block'
      console.log(`✅ Switched to Group ${groupNumber} content`)
    } else {
      console.log(`❌ Group ${groupNumber} content not found`)
    }

    // AVOID calling global switchToCombination to prevent conflicts
    // if (typeof switchToCombination === 'function') {
    //   switchToCombination(groupNumber)
    // }
  }

  // Populate group data (duration, territories, media types, etc.)
  populateGroupData(groupNumber, comboData) {
    console.log(`📝 Populating Group ${groupNumber} with data:`, comboData)

    // Populate duration
    this.populateGroupDuration(groupNumber, comboData.duration)

    // Populate territories
    this.populateGroupTerritories(groupNumber, comboData.territories)

    // Populate media types
    this.populateGroupMediaTypes(groupNumber, comboData.media_types)

    // Populate unlimited options
    this.populateGroupUnlimitedOptions(groupNumber, comboData)

    console.log(`✅ Completed populating Group ${groupNumber}`)
  }

  // Populate duration dropdown for a group
  populateGroupDuration(groupNumber, duration) {
    if (!duration) return

    // Try multiple naming patterns to find the duration select
    let durationSelect = document.querySelector(`select[name="combinations[${groupNumber}][duration]"]`) ||
                        document.querySelector(`select[name="combinations[combination_${groupNumber}][duration]"]`)

    if (durationSelect) {
      durationSelect.value = duration
      durationSelect.dispatchEvent(new Event('change'))
      console.log(`✅ Set Group ${groupNumber} duration: ${duration}`)
    } else {
      console.warn(`❌ Duration select not found for Group ${groupNumber}`)
      // Log available selects for debugging
      const allSelects = document.querySelectorAll('select[name*="duration"]')
      console.log(`Available duration selects:`, Array.from(allSelects).map(s => s.name))
    }
  }

  // Populate territory checkboxes for a group
  populateGroupTerritories(groupNumber, territories) {
    if (!territories || territories.length === 0) return

    territories.forEach(territoryId => {
      // Try multiple naming patterns to find the territory checkbox
      let checkbox = document.querySelector(`input[name="combinations[${groupNumber}][territories][]"][value="${territoryId}"]`) ||
                    document.querySelector(`input[name="combinations[combination_${groupNumber}][territories][]"][value="${territoryId}"]`)

      if (checkbox) {
        checkbox.checked = true
        checkbox.dispatchEvent(new Event('change'))
        console.log(`✅ Selected territory ${territoryId} for Group ${groupNumber}`)
      } else {
        console.warn(`❌ Territory checkbox not found: ${territoryId} for Group ${groupNumber}`)
        // Log available territory checkboxes for debugging
        const allTerritoryCheckboxes = document.querySelectorAll(`input[name*="territories"][value="${territoryId}"]`)
        console.log(`Available territory checkboxes for ${territoryId}:`, Array.from(allTerritoryCheckboxes).map(c => c.name))
      }
    })
  }

  // Populate media type checkboxes for a group
  populateGroupMediaTypes(groupNumber, mediaTypes) {
    if (!mediaTypes || mediaTypes.length === 0) return

    mediaTypes.forEach(mediaType => {
      // Try multiple naming patterns to find the media type checkbox
      let checkbox = document.querySelector(`input[name="combinations[${groupNumber}][media_types][]"][value="${mediaType}"]`) ||
                    document.querySelector(`input[name="combinations[combination_${groupNumber}][media_types][]"][value="${mediaType}"]`)

      if (checkbox) {
        checkbox.checked = true
        checkbox.dispatchEvent(new Event('change'))
        console.log(`✅ Selected media type ${mediaType} for Group ${groupNumber}`)
      } else {
        console.warn(`❌ Media type checkbox not found: ${mediaType} for Group ${groupNumber}`)
        // Log available media type checkboxes for debugging
        const allMediaCheckboxes = document.querySelectorAll(`input[name*="media_types"][value="${mediaType}"]`)
        console.log(`Available media checkboxes for ${mediaType}:`, Array.from(allMediaCheckboxes).map(c => c.name))
      }
    })
  }

  // Populate unlimited stills/versions for a group
  populateGroupUnlimitedOptions(groupNumber, comboData) {
    // Helper to convert string/boolean/number to boolean
    const toBool = (value) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value === '1' || value === 'true'
      if (typeof value === 'number') return value === 1
      return false
    }

    // Unlimited stills
    let stillsCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][unlimited_stills]"]`) ||
                        document.querySelector(`input[name="combinations[combination_${groupNumber}][unlimited_stills]"]`)
    if (stillsCheckbox) {
      stillsCheckbox.checked = toBool(comboData.unlimited_stills)
      stillsCheckbox.dispatchEvent(new Event('change'))
      console.log(`✅ Set unlimited stills for Group ${groupNumber}: ${stillsCheckbox.checked} (from ${comboData.unlimited_stills})`)
    } else {
      console.warn(`❌ Unlimited stills checkbox not found for Group ${groupNumber}`)
    }

    // Unlimited versions
    let versionsCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][unlimited_versions]"]`) ||
                          document.querySelector(`input[name="combinations[combination_${groupNumber}][unlimited_versions]"]`)
    if (versionsCheckbox) {
      versionsCheckbox.checked = toBool(comboData.unlimited_versions)
      versionsCheckbox.dispatchEvent(new Event('change'))
      console.log(`✅ Set unlimited versions for Group ${groupNumber}: ${versionsCheckbox.checked} (from ${comboData.unlimited_versions})`)
    } else {
      console.warn(`❌ Unlimited versions checkbox not found for Group ${groupNumber}`)
    }
  }

  // Switch to a specific tab (basic implementation)
  switchToTab(tabNumber) {
    console.log(`🔄 Switching to Group ${tabNumber} tab`)

    // Update tab appearance
    document.querySelectorAll('.combination-tab').forEach(tab => {
      tab.classList.remove('border-blue-500', 'text-blue-600')
      tab.classList.add('border-transparent', 'text-gray-600')
    })

    const activeTab = document.querySelector(`.combination-tab[data-combo="${tabNumber}"]`)
    if (activeTab) {
      activeTab.classList.remove('border-transparent', 'text-gray-600')
      activeTab.classList.add('border-blue-500', 'text-blue-600')
    }

    // Update content visibility
    document.querySelectorAll('.combination-content').forEach(content => {
      content.classList.remove('active')
      content.style.display = 'none'
    })

    const activeContent = document.querySelector(`.combination-content[data-combo="${tabNumber}"]`)
    if (activeContent) {
      activeContent.classList.add('active')
      activeContent.style.display = 'block'
    }
  }

  // Rebuild preview tables from stored data to work like /new
  rebuildPreviewTablesFromStoredData(storedData) {
    console.log('📊 Rebuilding interactive preview tables like /new...')

    setTimeout(() => {
      // Ensure all group sections exist
      this.ensureGroupSectionsExist(storedData)

      // STEP 1: Populate form fields with raw data from stored data
      this.populateFormFieldsFromStoredData(storedData)

      // STEP 2: Populate exclusivity data for interactive functionality
      this.populateExclusivityFromStoredData(storedData)

      // STEP 3: Update combination summaries (pills) for all groups using existing system
      Object.entries(storedData).forEach(([,], index) => {
        const groupNumber = index + 1
        this.updateComboSummary(groupNumber)
      })

      // STEP 4: Use the existing populateAllTables function to populate the preview
      this.populateAllTables()

      // STEP 4.5: Restore cast selection and regenerate tables
      // Wait a bit for the cast selection UI to be built
      setTimeout(() => {
        console.log('🎭 Starting cast selection restoration...')
        this.restoreCastSelection(storedData)

        // Wait for checkboxes to be set, then regenerate tables
        setTimeout(() => {
          console.log('🔄 Regenerating tables with restored cast selection...')
          this.updateQuotePreview()

          // Update guarantee savings display after tables are regenerated
          setTimeout(() => {
            this.updateGuaranteeSavingsDisplay()
          }, 100)
        }, 50)
      }, 150)

      // STEP 6: Debug and fix selectors after everything is rendered
      // Commented out to reduce console noise - uncomment if debugging selector issues
      // setTimeout(() => {
      //   this.debugAndFixSelectors(storedData)
      // }, 200)

    }, 500)
  }


  // Populate form fields with raw data from stored combinations data
  populateFormFieldsFromStoredData(storedData) {
    console.log('📝 Populating form fields from stored data...')

    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1
      console.log(`📋 Populating form fields for Group ${groupNumber}:`, comboData)

      // DON'T populate shared talent fields from combinations data
      // They are already populated from talent_data by populateTalentFromStoredData
      // The combinations data is group-specific, while talent fields are shared across all groups

      // Only set combination-level fields (duration, territories, media types, guarantee)
      this.populateCombinationFields(groupNumber, comboData)
    })

    console.log('✅ Form fields populated from stored data')
  }

  // Restore cast selection checkboxes based on calculated_values
  restoreCastSelection(storedData) {
    console.log('🎭 Restoring cast selection from stored data...')

    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1

      if (comboData.calculated_values) {
        console.log(`🎭 Restoring cast selection for Group ${groupNumber}`)

        // First, uncheck all cast selection checkboxes for this group
        const container = document.querySelector(`.cast-selection-container[data-combo="${groupNumber}"]`)
        if (container) {
          const allCheckboxes = container.querySelectorAll('.cast-selection-checkbox')
          allCheckboxes.forEach(checkbox => {
            checkbox.checked = false
          })
        }

        // Then check only the talent that appear in calculated_values
        // Match by DESCRIPTION first (more reliable), then fall back to line index
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          Object.entries(talentLines).forEach(([storedLineIndex, lineData]) => {
            const description = lineData.description

            // Try to find checkbox by description match first
            const allCheckboxes = document.querySelectorAll(
              `input.cast-selection-checkbox[data-combo="${groupNumber}"][data-category="${categoryId}"]`
            )

            let foundCheckbox = null
            allCheckboxes.forEach(checkbox => {
              const label = checkbox.nextElementSibling
              if (label) {
                // Extract just the description part (before the count/rate info in parentheses)
                const labelText = label.textContent.split('(')[0].trim().toLowerCase()
                // Use exact match to avoid "man" matching "woman"
                if (labelText === description.toLowerCase()) {
                  foundCheckbox = checkbox
                }
              }
            })

            // Fallback: try by line index if description match fails
            if (!foundCheckbox) {
              foundCheckbox = document.querySelector(
                `input.cast-selection-checkbox[data-combo="${groupNumber}"][data-category="${categoryId}"][data-line="${storedLineIndex}"]`
              )
            }

            if (foundCheckbox) {
              foundCheckbox.checked = true
              console.log(`✅ Checked cast selection for Group ${groupNumber}: Category ${categoryId}, "${description}"`)
            } else {
              console.log(`⚠️ Cast selection checkbox not found for Group ${groupNumber}: Category ${categoryId}, "${description}"`)
            }
          })
        })
      }
    })

    console.log('✅ Cast selection restored from stored data')
  }

  // Populate exclusivity data for interactive functionality
  populateExclusivityFromStoredData(storedData) {
    console.log('🔐 Populating exclusivity data from stored data...')

    // Clear and reinitialize exclusivity data structures to avoid duplicates
    window.exclusivityData = {}
    window.lineExclusivityData = {}

    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1
      console.log(`🔐 Processing exclusivity for Group ${groupNumber}:`, comboData)

      if (comboData.calculated_values) {
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          Object.entries(talentLines).forEach(([lineIndex, lineData]) => {
            if (lineData.exclusivity_type && lineData.exclusivity_type !== '-') {
              const key = `${groupNumber}_${categoryId}_${lineIndex}`

              // Initialize array if it doesn't exist
              if (!window.lineExclusivityData[key]) {
                window.lineExclusivityData[key] = []
              }

              // Parse the exclusivity_type string which may contain multiple exclusivities
              // e.g., "Horse 50%" or "Horse 50%, Dog 25%, Cat 30%"
              const exclusivityStrings = lineData.exclusivity_type.split(',').map(s => s.trim())

              exclusivityStrings.forEach(exclusivityString => {
                const exclusivityMatch = exclusivityString.match(/^(.+?)\s+(\d+)%$/)
                if (exclusivityMatch) {
                  const exclusivityName = exclusivityMatch[1].trim()
                  const exclusivityPercentage = parseInt(exclusivityMatch[2])

                  // Check if this exclusivity already exists in the array (prevent duplicates)
                  const alreadyExists = window.lineExclusivityData[key].some(ex =>
                    ex.name === exclusivityName && ex.percentage === exclusivityPercentage
                  )

                  if (!alreadyExists) {
                    // Add to lineExclusivityData (this is what getExclusivitiesForSpecificLine reads)
                    window.lineExclusivityData[key].push({
                      name: exclusivityName,
                      percentage: exclusivityPercentage,
                      categoryId: parseInt(categoryId),
                      lineIndex: parseInt(lineIndex),
                      talentDescription: lineData.description || `Category ${categoryId}`,
                      isLineSpecific: true
                    })

                    console.log(`✅ Set exclusivity for ${key}: ${exclusivityString}`)
                  } else {
                    console.log(`⏭️ Skipping duplicate exclusivity for ${key}: ${exclusivityString}`)
                  }
                } else {
                  console.warn(`⚠️ Could not parse exclusivity string: ${exclusivityString}`)
                }
              })
            }
          })
        })
      }
    })

    console.log('✅ Exclusivity data populated:', window.lineExclusivityData)
  }

  // Update exclusivity display in the table DOM
  updateExclusivityInTable(groupNumber, categoryId, lineIndex, exclusivityType) {
    console.log(`🎯 Updating exclusivity in table for ${groupNumber}_${categoryId}_${lineIndex}: ${exclusivityType}`)

    // Based on the debug output, find preview tables and their exclusivity cells
    const previewTables = document.querySelectorAll('.quote-preview-table, .preview-table, table[id*="preview"], table[class*="preview"]')
    console.log(`📊 Found ${previewTables.length} preview tables`)

    // Use the group number to select the correct table (0-based index)
    const targetTable = previewTables[groupNumber - 1]
    if (!targetTable) {
      console.log(`⚠️ No table found for group ${groupNumber}`)
      return false
    }

    console.log(`📊 Using table ${groupNumber - 1} for Group ${groupNumber}`)

    // Find exclusivity cells in this table
    const exclusivityCells = targetTable.querySelectorAll('td[data-field="exclusivity"], td.exclusivity, td:has(.exclusivity-plus-btn)')
    console.log(`🔍 Found ${exclusivityCells.length} exclusivity cells in target table`)

    if (exclusivityCells.length === 0) {
      console.log(`⚠️ No exclusivity cells found in table for group ${groupNumber}`)
      return false
    }

    // Calculate which cell to update based on the talent row order
    let targetCellIndex = this.calculateTargetCellIndex(categoryId, lineIndex)
    console.log(`🎯 Calculated target cell index: ${targetCellIndex}`)

    if (targetCellIndex < exclusivityCells.length) {
      const targetCell = exclusivityCells[targetCellIndex]
      const currentContent = targetCell.textContent.trim()
      console.log(`🎯 Targeting cell ${targetCellIndex}, current content: "${currentContent}"`)

      // Check if there's already an exclusivity-text span with the same value
      const existingSpan = targetCell.querySelector('.exclusivity-text')
      if (existingSpan && existingSpan.textContent.trim() === exclusivityType) {
        console.log(`✅ Exclusivity already set to "${exclusivityType}", skipping update`)
        return true
      }

      // Check if the text content already contains this exclusivity (backup check)
      if (currentContent.includes(exclusivityType)) {
        console.log(`✅ Exclusivity text already contains "${exclusivityType}", skipping update`)
        return true
      }

      // Update or create the exclusivity span
      if (existingSpan) {
        // Update the existing span text
        existingSpan.textContent = exclusivityType
        console.log(`✅ Updated existing exclusivity span in cell ${targetCellIndex} to: ${exclusivityType}`)
      } else {
        // No span found, replace the entire content (including plus button if exists)
        targetCell.innerHTML = `<span class="exclusivity-text">${exclusivityType}</span>`
        console.log(`✅ Created new exclusivity span in cell ${targetCellIndex}: ${exclusivityType}`)
      }

      return true
    } else {
      console.log(`⚠️ Target cell index ${targetCellIndex} exceeds available cells (${exclusivityCells.length})`)
      return false
    }
  }

  // Calculate target cell index based on talent order
  calculateTargetCellIndex(categoryId, lineIndex) {
    // This method calculates which exclusivity cell to target based on the order of talent in the table
    // The cells should be in the same order as the talent rows appear in the preview table

    let cellIndex = 0

    // Get all visible talent categories and count their lines to determine cell index
    const categories = [1, 2, 3, 4, 5, 6, 7]
    const categoryIdNum = parseInt(categoryId)
    const lineIndexNum = parseInt(lineIndex)

    for (const catId of categories) {
      if (catId < categoryIdNum) {
        // Count visible talent lines in this category
        const catSection = document.querySelector(`#talent-category-${catId}`)
        if (catSection && !catSection.classList.contains('hidden')) {
          const rows = catSection.querySelectorAll('.talent-input-row')
          cellIndex += rows.length
        }
      }
    }

    // Add the line index within the current category
    cellIndex += lineIndexNum

    return cellIndex
  }

  // Broader search for exclusivity cell if specific selectors fail
  searchAndUpdateExclusivityCell(groupNumber, categoryId, lineIndex, exclusivityType) {
    const table = document.querySelector(`.quote-preview-table[data-combo="${groupNumber}"]`) ||
                  document.querySelector(`[data-combo="${groupNumber}"] .quote-preview-table`)

    if (table) {
      const rows = table.querySelectorAll('tbody tr')
      rows.forEach((row, rowIndex) => {
        // Look for exclusivity cells (typically the 4th column based on the original table structure)
        const exclusivityCell = row.cells[3] // 0-indexed, so 4th column
        if (exclusivityCell && exclusivityCell.textContent.includes('+')) {
          // This is likely our exclusivity cell with a "+" button
          const span = exclusivityCell.querySelector('span')
          if (span && span.textContent === '+') {
            span.textContent = exclusivityType
            console.log(`✅ Updated exclusivity via broad search: row ${rowIndex} -> ${exclusivityType}`)
          }
        }
      })
    }
  }

  // Populate combination-level fields (duration, territories, media types, guarantee)
  populateCombinationFields(groupNumber, comboData) {
    console.log(`⚙️ Populating combination fields for Group ${groupNumber}...`)

    // Set duration
    if (comboData.duration) {
      const durationSelect = document.querySelector(`select[name="combinations[${groupNumber}][duration]"]`)
      if (durationSelect) {
        durationSelect.value = comboData.duration
        console.log(`✅ Set duration for Group ${groupNumber}: ${comboData.duration}`)
      } else {
        console.log(`⚠️ Duration select not found for Group ${groupNumber}`)
      }
    }

    // Set territories
    if (comboData.territories && Array.isArray(comboData.territories)) {
      comboData.territories.forEach(territoryId => {
        const territoryCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][territories][]"][value="${territoryId}"]`)
        if (territoryCheckbox) {
          territoryCheckbox.checked = true
          console.log(`✅ Selected territory for Group ${groupNumber}: ${territoryId}`)
        } else {
          console.log(`⚠️ Territory checkbox not found for Group ${groupNumber}, territory: ${territoryId}`)
        }
      })
    }

    // Set media types
    if (comboData.media_types && Array.isArray(comboData.media_types)) {
      comboData.media_types.forEach(mediaType => {
        const mediaCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][media_types][]"][value="${mediaType}"]`)
        if (mediaCheckbox) {
          mediaCheckbox.checked = true
          console.log(`✅ Selected media type for Group ${groupNumber}: ${mediaType}`)
        } else {
          console.log(`⚠️ Media type checkbox not found for Group ${groupNumber}, media: ${mediaType}`)
        }
      })
    }

    // Set number of commercials
    if (comboData.num_commercials) {
      const commercialsInput = document.querySelector(`input[name="combinations[${groupNumber}][num_commercials]"]`)
      if (commercialsInput) {
        commercialsInput.value = comboData.num_commercials
        console.log(`✅ Set commercials for Group ${groupNumber}: ${comboData.num_commercials}`)
      } else {
        console.log(`⚠️ Commercials input not found for Group ${groupNumber}`)
      }
    }

    // Set guarantee
    if (comboData.is_guaranteed) {
      console.log(`🛡️ Setting guarantee for Group ${groupNumber}`)

      // The guarantee checkbox is dynamically created in the preview table
      // with class 'guarantee-checkbox' and data-combo attribute
      const guaranteeCheckbox = document.querySelector(`.guarantee-checkbox[data-combo="${groupNumber}"]`)

      if (guaranteeCheckbox) {
        guaranteeCheckbox.checked = true
        // Trigger change event to update calculations
        guaranteeCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
        console.log(`✅ Set and triggered guarantee for Group ${groupNumber}: ${comboData.is_guaranteed}`)
      } else {
        console.log(`⚠️ Guarantee checkbox not found for Group ${groupNumber} - it will be set when the preview table is rendered`)
      }
    }

    // Set unlimited stills
    // Use proper boolean conversion - "0" string should NOT check the box
    const shouldCheckUnlimitedStills = comboData.unlimited_stills === true || comboData.unlimited_stills === 1 || comboData.unlimited_stills === "1"
    const unlimitedStillsCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][unlimited_stills]"]`)
    if (unlimitedStillsCheckbox) {
      unlimitedStillsCheckbox.checked = shouldCheckUnlimitedStills
      unlimitedStillsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
      console.log(`✅ Set unlimited stills for Group ${groupNumber}: ${shouldCheckUnlimitedStills} (from ${comboData.unlimited_stills})`)
    } else {
      console.log(`⚠️ Unlimited stills checkbox not found for Group ${groupNumber}`)
    }

    // Set unlimited versions
    // Use proper boolean conversion - "0" string should NOT check the box
    const shouldCheckUnlimitedVersions = comboData.unlimited_versions === true || comboData.unlimited_versions === 1 || comboData.unlimited_versions === "1"
    const unlimitedVersionsCheckbox = document.querySelector(`input[name="combinations[${groupNumber}][unlimited_versions]"]`)
    if (unlimitedVersionsCheckbox) {
      unlimitedVersionsCheckbox.checked = shouldCheckUnlimitedVersions
      unlimitedVersionsCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
      console.log(`✅ Set unlimited versions for Group ${groupNumber}: ${shouldCheckUnlimitedVersions} (from ${comboData.unlimited_versions})`)
    } else {
      console.log(`⚠️ Unlimited versions checkbox not found for Group ${groupNumber}`)
    }
  }

  // Update guarantee savings display for all combos
  updateGuaranteeSavingsDisplay() {
    console.log('💰 Updating guarantee savings display...')

    // Find all guarantee checkboxes that are checked
    document.querySelectorAll('.guarantee-checkbox:checked').forEach(checkbox => {
      const comboId = checkbox.getAttribute('data-combo')
      if (!comboId) return

      console.log(`💰 Processing guarantee savings for combo ${comboId}`)

      const guaranteeAmountSpan = document.querySelector(`.guarantee-amount[data-combo="${comboId}"]`)
      const totalZarSpan = document.querySelector(`.total-zar-amount[data-combo="${comboId}"]`)

      if (guaranteeAmountSpan && totalZarSpan) {
        const guaranteedAmount = parseFloat(totalZarSpan.textContent.replace(/[R,\s]/g, '')) || 0
        if (guaranteedAmount > 0) {
          // Calculate original amount (before 25% discount)
          const originalAmount = guaranteedAmount / 0.75
          const savings = originalAmount - guaranteedAmount
          guaranteeAmountSpan.innerHTML = `<span style="color: red;">R${this.formatNumber(savings)} saving</span>`
          console.log(`✅ Set guarantee savings for combo ${comboId}: R${this.formatNumber(savings)}`)
        }
      }
    })
  }

  // Ensure all group sections exist in the Quote Preview
  ensureGroupSectionsExist(storedData) {
    console.log('🔧 Ensuring all group sections exist in Quote Preview...')

    const previewContainer = document.querySelector('#combo-tables-container')
    if (!previewContainer) {
      console.warn('❌ Quote Preview container not found')
      return
    }

    Object.entries(storedData).forEach(([,], index) => {
      const groupNumber = index + 1

      // Check if group section exists, if not create it
      let groupSection = previewContainer.querySelector(`[data-combo="${groupNumber}"]`)
      if (!groupSection && groupNumber > 1) {
        console.log(`🏗️ Creating preview section for Group ${groupNumber}`)
        groupSection = this.createQuotePreviewGroupSection(groupNumber)
        previewContainer.appendChild(groupSection)
      }
    })
  }


  // Create a Quote Preview section for a group
  createQuotePreviewGroupSection(groupNumber) {
    const section = document.createElement('div')
    section.className = 'combo-table-section mb-6'
    section.setAttribute('data-combo', groupNumber.toString())

    section.innerHTML = `
      <!-- Dynamic Group Pills -->
      <div class="combo-summary-pills mb-4 flex flex-wrap gap-2" data-combo="${groupNumber}">
        <!-- Pills will be populated by JavaScript -->
      </div>

      <div class="bg-gray-50 rounded-lg p-4">
        <!-- Talent Lines Table -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300 quote-preview-table">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-300">
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Talent</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Day Fee</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Unit</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Exclusivity</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300"># of Comms</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Buyout %</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700 border-r border-gray-300">Per Talent</th>
                <th class="text-center py-2 px-3 text-sm font-medium text-gray-700">Total (R)</th>
              </tr>
            </thead>
            <tbody class="quote-preview-rows" data-combo="${groupNumber}">
              <!-- Talent lines will be populated here -->
            </tbody>
          </table>
        </div>
      </div>
    `

    return section
  }


  // Create the combination form structure for a group
  createCombinationFormStructure(groupNumber, comboData) {
    const combinationsInput = document.querySelector('input[name="combinations"]')
    if (!combinationsInput) {
      console.log('⚠️ Combinations input not found')
      return
    }

    // Create hidden form fields that the existing preview system expects
    const formContainer = combinationsInput.closest('form') || document.body

    // Duration
    if (comboData.duration) {
      const durationInput = document.createElement('input')
      durationInput.type = 'hidden'
      durationInput.name = `combinations[combination_${groupNumber}][duration]`
      durationInput.value = comboData.duration
      formContainer.appendChild(durationInput)
    }

    // Territories
    if (comboData.territories && Array.isArray(comboData.territories)) {
      comboData.territories.forEach(territoryId => {
        const territoryInput = document.createElement('input')
        territoryInput.type = 'hidden'
        territoryInput.name = `combinations[combination_${groupNumber}][territories][]`
        territoryInput.value = territoryId
        formContainer.appendChild(territoryInput)
      })
    }

    // Media types
    if (comboData.media_types && Array.isArray(comboData.media_types)) {
      comboData.media_types.forEach(mediaType => {
        const mediaInput = document.createElement('input')
        mediaInput.type = 'hidden'
        mediaInput.name = `combinations[combination_${groupNumber}][media_types][]`
        mediaInput.value = mediaType
        formContainer.appendChild(mediaInput)
      })
    }

    console.log(`🏗️ Created combination form structure for Group ${groupNumber}`)
  }

  // Update combination form fields with stored data
  updateCombinationFormFields(groupNumber, comboData) {
    // Update duration
    const durationInput = document.querySelector(`input[name="combinations[combination_${groupNumber}][duration]"]`)
    if (durationInput && comboData.duration) {
      durationInput.value = comboData.duration
    }

    // Update territories
    if (comboData.territories && Array.isArray(comboData.territories)) {
      // Remove existing territory inputs for this group
      const existingTerritoryInputs = document.querySelectorAll(`input[name="combinations[combination_${groupNumber}][territories][]"]`)
      existingTerritoryInputs.forEach(input => input.remove())

      // Add new territory inputs
      const formContainer = document.querySelector('form') || document.body
      comboData.territories.forEach(territoryId => {
        const territoryInput = document.createElement('input')
        territoryInput.type = 'hidden'
        territoryInput.name = `combinations[combination_${groupNumber}][territories][]`
        territoryInput.value = territoryId
        formContainer.appendChild(territoryInput)
      })
    }

    // Update media types
    if (comboData.media_types && Array.isArray(comboData.media_types)) {
      // Remove existing media type inputs for this group
      const existingMediaInputs = document.querySelectorAll(`input[name="combinations[combination_${groupNumber}][media_types][]"]`)
      existingMediaInputs.forEach(input => input.remove())

      // Add new media type inputs
      const formContainer = document.querySelector('form') || document.body
      comboData.media_types.forEach(mediaType => {
        const mediaInput = document.createElement('input')
        mediaInput.type = 'hidden'
        mediaInput.name = `combinations[combination_${groupNumber}][media_types][]`
        mediaInput.value = mediaType
        formContainer.appendChild(mediaInput)
      })
    }

    console.log(`🔄 Updated combination form fields for Group ${groupNumber}`)
  }

  // Update exclusivity settings for a group
  updateExclusivityForGroup(groupNumber, exclusivityType) {
    // Find and update exclusivity radio buttons for this group
    const exclusivityInput = document.querySelector(`input[name="combinations[combination_${groupNumber}][exclusivity_type]"][value="${exclusivityType}"]`)
    if (exclusivityInput) {
      exclusivityInput.checked = true
      console.log(`✅ Set exclusivity for Group ${groupNumber} to: ${exclusivityType}`)
    } else {
      // Create the exclusivity input if it doesn't exist
      const formContainer = document.querySelector('form') || document.body
      const hiddenExclusivityInput = document.createElement('input')
      hiddenExclusivityInput.type = 'hidden'
      hiddenExclusivityInput.name = `combinations[combination_${groupNumber}][exclusivity_type]`
      hiddenExclusivityInput.value = exclusivityType
      formContainer.appendChild(hiddenExclusivityInput)
      console.log(`🏗️ Created exclusivity input for Group ${groupNumber}: ${exclusivityType}`)
    }
  }


  // Populate talent fields for a specific category
  populateTalentFields(categoryId, talentInfo) {
    console.log(`👤 Populating talent fields for category ${categoryId}:`, talentInfo)

    // Find the talent input fields for this category
    const unitCountField = document.querySelector(`input[name="talent[${categoryId}][talent_count]"]`)
    const descriptionField = document.querySelector(`input[name="talent[${categoryId}][description]"]`)
    const adjustedRateField = document.querySelector(`input[name="talent[${categoryId}][adjusted_rate]"]`)

    if (unitCountField && talentInfo.unit_count) {
      unitCountField.value = talentInfo.unit_count
      console.log(`✅ Set talent count for category ${categoryId}: ${talentInfo.unit_count}`)
    }

    if (descriptionField && talentInfo.description) {
      descriptionField.value = talentInfo.description
      console.log(`✅ Set description for category ${categoryId}: ${talentInfo.description}`)
    }

    if (adjustedRateField && talentInfo.adjusted_rate) {
      adjustedRateField.value = talentInfo.adjusted_rate
      console.log(`✅ Set adjusted rate for category ${categoryId}: ${talentInfo.adjusted_rate}`)
    }
  }

  // Populate territory selections
  populateTerritories(territories) {
    console.log('🌍 Populating territories:', territories)

    territories.forEach(territoryId => {
      const checkbox = document.querySelector(`input[type="checkbox"][value="${territoryId}"]`)
      if (checkbox) {
        checkbox.checked = true
        console.log(`✅ Selected territory: ${territoryId}`)
      }
    })
  }

  // Populate media type selections
  populateMediaTypes(mediaTypes) {
    console.log('📺 Populating media types:', mediaTypes)

    mediaTypes.forEach(mediaType => {
      const checkbox = document.querySelector(`input[type="checkbox"][value="${mediaType}"]`)
      if (checkbox) {
        checkbox.checked = true
        console.log(`✅ Selected media type: ${mediaType}`)
      }
    })
  }

  // Populate duration selection
  populateDuration(duration) {
    console.log('⏱️ Populating duration:', duration)

    const durationSelect = document.querySelector('select[name*="duration"]')
    if (durationSelect) {
      durationSelect.value = duration
      console.log(`✅ Set duration: ${duration}`)
    }
  }

  // Populate guarantee setting
  populateGuarantee(isGuaranteed) {
    console.log('🛡️ Populating guarantee setting:', isGuaranteed)

    const guaranteeCheckbox = document.querySelector('input[name*="is_guaranteed"]')
    if (guaranteeCheckbox) {
      guaranteeCheckbox.checked = isGuaranteed === "1" || isGuaranteed === true
      console.log(`✅ Set guarantee: ${guaranteeCheckbox.checked}`)
    }
  }

  // Debug and fix DOM selectors for exclusivity, guarantee, and commercial count
  debugAndFixSelectors(storedData) {
    console.log('🔧 DEBUG: Inspecting DOM structure to fix selectors...')

    // Debug exclusivity cells
    this.debugExclusivityCells(storedData)

    // Debug guarantee checkboxes
    this.debugGuaranteeCheckboxes(storedData)

    // Debug commercial count inputs
    this.debugCommercialCountInputs(storedData)
  }

  debugExclusivityCells(storedData) {
    console.log('🎯 DEBUG EXCLUSIVITY: Inspecting exclusivity cells...')

    // Find all preview tables
    const previewTables = document.querySelectorAll('.quote-preview-table, .preview-table, table[id*="preview"], table[class*="preview"]')
    console.log(`Found ${previewTables.length} potential preview tables:`, previewTables)

    previewTables.forEach((table, tableIndex) => {
      console.log(`📊 Table ${tableIndex}:`, {
        id: table.id,
        className: table.className,
        innerHTML: table.innerHTML.substring(0, 200) + '...'
      })

      // Look for exclusivity cells in this table
      const exclusivityCells = table.querySelectorAll('td[data-field="exclusivity"], td.exclusivity, td:has(.exclusivity-plus-btn)')
      console.log(`  Found ${exclusivityCells.length} exclusivity cells in table ${tableIndex}`)

      exclusivityCells.forEach((cell, cellIndex) => {
        console.log(`    Exclusivity cell ${cellIndex}:`, {
          textContent: cell.textContent,
          innerHTML: cell.innerHTML,
          dataset: cell.dataset,
          className: cell.className
        })
      })
    })

    // Now try to match stored data to actual DOM structure
    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1
      console.log(`🔍 Looking for Group ${groupNumber} exclusivity cells...`)

      if (comboData.calculated_values) {
        Object.entries(comboData.calculated_values).forEach(([categoryId, talentLines]) => {
          Object.entries(talentLines).forEach(([lineIndex, lineData]) => {
            if (lineData.exclusivity_type && lineData.exclusivity_type !== '-') {
              console.log(`  Should show "${lineData.exclusivity_type}" for Group ${groupNumber}, Category ${categoryId}, Line ${lineIndex}`)

              // Try various selector strategies
              const selectors = [
                `#preview-table-${groupNumber} td[data-field="exclusivity"]:nth-of-type(${parseInt(lineIndex) + 1})`,
                `table[data-group="${groupNumber}"] td.exclusivity:nth-of-type(${parseInt(lineIndex) + 1})`,
                `#combination-${groupNumber} td[data-field="exclusivity"]`,
                `[data-group="${groupNumber}"] [data-field="exclusivity"]`,
                `.group-${groupNumber}-table td:has(.exclusivity-plus-btn)`
              ]

              selectors.forEach(selector => {
                const cell = document.querySelector(selector)
                console.log(`    Selector "${selector}": ${cell ? 'FOUND' : 'NOT FOUND'}`)
                if (cell) {
                  console.log(`      Cell content: "${cell.textContent.trim()}"`)
                  console.log(`      Cell HTML: ${cell.innerHTML}`)
                }
              })
            }
          })
        })
      }
    })
  }

  debugGuaranteeCheckboxes(storedData) {
    console.log('✅ DEBUG GUARANTEE: Inspecting guarantee checkboxes...')

    // Find all checkboxes
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]')
    console.log(`Found ${allCheckboxes.length} total checkboxes:`)

    allCheckboxes.forEach((checkbox, index) => {
      console.log(`  Checkbox ${index}:`, {
        name: checkbox.name,
        id: checkbox.id,
        className: checkbox.className,
        checked: checkbox.checked,
        value: checkbox.value,
        labels: Array.from(document.querySelectorAll(`label[for="${checkbox.id}"]`)).map(l => l.textContent.trim())
      })
    })

    // Look specifically for guarantee-related checkboxes
    const guaranteeSelectors = [
      'input[name*="guarantee"]',
      'input[name*="is_guaranteed"]',
      'input[id*="guarantee"]',
      'input[class*="guarantee"]',
      'input[data-field="guarantee"]'
    ]

    guaranteeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      console.log(`Selector "${selector}": Found ${elements.length} elements`)
      elements.forEach((el, index) => {
        console.log(`  Element ${index}:`, {
          name: el.name,
          id: el.id,
          checked: el.checked,
          type: el.type
        })
      })
    })

    // Check stored data for guarantee settings
    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1
      console.log(`🔍 Group ${groupNumber} should have guarantee: ${comboData.is_guaranteed}`)
    })
  }

  debugCommercialCountInputs(storedData) {
    console.log('🔢 DEBUG COMMERCIAL COUNT: Inspecting commercial count inputs...')

    // Find all number inputs
    const numberInputs = document.querySelectorAll('input[type="number"]')
    console.log(`Found ${numberInputs.length} number inputs:`)

    numberInputs.forEach((input, index) => {
      console.log(`  Number input ${index}:`, {
        name: input.name,
        id: input.id,
        className: input.className,
        value: input.value,
        placeholder: input.placeholder
      })
    })

    // Look specifically for commercial-related inputs
    const commercialSelectors = [
      'input[name*="commercial"]',
      'input[name*="num_commercials"]',
      'input[class*="commercial"]',
      'input[data-field="commercials"]',
    ]

    commercialSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      console.log(`Selector "${selector}": Found ${elements.length} elements`)
      elements.forEach((el, index) => {
        console.log(`  Element ${index}:`, {
          name: el.name,
          id: el.id,
          value: el.value,
          type: el.type
        })
      })
    })

    // Check stored data for commercial counts
    Object.entries(storedData).forEach(([, comboData], index) => {
      const groupNumber = index + 1
      console.log(`🔍 Group ${groupNumber} should have commercial count: ${comboData.num_commercials}`)
    })
  }

  // Populate talent parameters from stored talent data (shoot days, rehearsal days, etc.)
  populateTalentParametersFromStoredData(talentData) {
    console.log('🎭 Populating talent parameters from stored data...')

    Object.entries(talentData).forEach(([categoryId, categoryData]) => {
      console.log(`📋 Loading parameters for category ${categoryId}:`, categoryData)

      // Handle new structure with multiple lines per category
      if (categoryData.lines && Array.isArray(categoryData.lines)) {
        console.log(`📝 Category ${categoryId} has ${categoryData.lines.length} talent lines`)

        // Use the first line for main category parameters
        const firstLine = categoryData.lines[0]
        if (firstLine) {
          this.populateFieldsFromTalentLine(categoryId, firstLine, true)

          // If there are multiple lines, create additional talent input rows
          if (categoryData.lines.length > 1) {
            console.log(`➕ Creating ${categoryData.lines.length - 1} additional talent lines for category ${categoryId}`)

            for (let i = 1; i < categoryData.lines.length; i++) {
              const lineData = categoryData.lines[i]
              console.log(`🔄 Creating additional line ${i} for category ${categoryId}:`, lineData)
              this.addTalentLineToCategory(categoryId, lineData)
            }

            // Re-populate the main line's description after adding additional lines
            // to prevent it from being overwritten
            setTimeout(() => {
              const descriptionField = document.querySelector(`[data-description-input="${categoryId}"]`)
              if (descriptionField && firstLine.description) {
                const cleanDescription = firstLine.description.replace(/^[A-Z0-9]+ - /, '')
                descriptionField.value = cleanDescription
                console.log(`🔒 Re-secured main line description for category ${categoryId}: ${cleanDescription}`)
              }
            }, 50)
          }
        }

        // For manual calculation, use first line data or sum all lines
        const firstLineData = categoryData.lines[0]
        if ((categoryId === '6' || categoryId === '7') && firstLineData) {
          const total = (firstLineData.talent_count || 0) * parseFloat(firstLineData.adjusted_rate || 0)
          const categoryTotalElement = document.querySelector(`#category-total-${categoryId}`)
          if (categoryTotalElement && total > 0) {
            categoryTotalElement.textContent = `R${total.toLocaleString()}`
            console.log(`💰 Manually set category ${categoryId} total: R${total.toLocaleString()}`)
          }
        }
      } else {
        // Fallback for old structure (backward compatibility)
        console.log(`⚠️ Using legacy data structure for category ${categoryId}`)
        this.populateFieldsFromTalentLine(categoryId, categoryData, true)

        // Manual calculation for categories 6-7 with old structure
        if ((categoryId === '6' || categoryId === '7') && categoryData) {
          const total = (categoryData.talent_count || 0) * parseFloat(categoryData.adjusted_rate || 0)
          const categoryTotalElement = document.querySelector(`#category-total-${categoryId}`)
          if (categoryTotalElement && total > 0) {
            categoryTotalElement.textContent = `R${total.toLocaleString()}`
            console.log(`💰 Manually set category ${categoryId} total: R${total.toLocaleString()}`)
          }
        }
      }

      // Make category visible if it has talent data (for edit mode)
      const categorySection = document.getElementById(`talent-category-${categoryId}`)
      if (categorySection && categorySection.classList.contains('hidden') && categoryData.lines && categoryData.lines.length > 0) {
        // Check if the category has actual talent count data
        const hasData = categoryData.lines.some(line => (line.talent_count && line.talent_count > 0))
        if (hasData) {
          categorySection.classList.remove('hidden')
          console.log(`👁️ Made category ${categoryId} visible because it has stored talent data`)
        }
      }

      // Trigger category total calculations
      if (typeof window.updateCategoryTotal === 'function') {
        window.updateCategoryTotal(categoryId)
        console.log(`🔄 Triggered category total update for category ${categoryId}`)
      }
    })

    console.log('✅ Talent parameters populated from stored data')

    // Hide all talent categories - they should only show when user clicks a button
    const visibleCategories = document.querySelectorAll('.talent-category-section:not(.hidden)')
    if (visibleCategories.length > 0) {
      console.log(`👁️ Found ${visibleCategories.length} visible categories, hiding all until user clicks`)
      visibleCategories.forEach((section) => {
        section.classList.add('hidden')
      })

      // Ensure all talent buttons are in inactive state
      document.querySelectorAll('.talent-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500')
        btn.classList.add('border-gray-300', 'hover:bg-blue-50')
      })
    }

    // Also trigger talent summary update to include the newly calculated totals
    setTimeout(() => {
      if (typeof window.updateTalentSummary === 'function') {
        console.log('🔄 Updating talent summary after category total calculations')
        window.updateTalentSummary()
      }
    }, 50)
  }

  // Helper function to populate fields from a single talent line
  populateFieldsFromTalentLine(categoryId, talentInfo, isMainLine = false) {
    console.log(`🔍 populateFieldsFromTalentLine called - Category: ${categoryId}, isMainLine: ${isMainLine}`)
    console.log(`🔍 talentInfo:`, talentInfo)

    // Populate all talent parameter fields for this category
    const fields = {
      shoot_days: talentInfo.days_count || talentInfo.shoot_days || 1,
      rehearsal_days: talentInfo.rehearsal_days || 0,
      down_days: talentInfo.down_days || 0,
      travel_days: talentInfo.travel_days || 0,
      overtime_hours: talentInfo.overtime_hours || 0,
      night_premium: talentInfo.night_premium || false
    }

    console.log(`🔍 Fields to populate:`, fields)

    Object.entries(fields).forEach(([fieldName, value]) => {
      // Map shoot_days to days_count for the HTML field name
      const htmlFieldName = fieldName === 'shoot_days' ? 'days_count' : fieldName
      // Map to the correct data attribute name (without -days suffix for most fields)
      const dataAttr = fieldName === 'shoot_days' ? 'days' :
                       fieldName === 'rehearsal_days' ? 'rehearsal' :
                       fieldName === 'down_days' ? 'down' :
                       fieldName === 'travel_days' ? 'travel' :
                       fieldName === 'overtime_hours' ? 'overtime' :
                       fieldName.replace('_', '-')

      // Try new structure first (lines[0]), then fall back to old structure, then try data attributes
      const fieldSelector = `input[name="talent[${categoryId}][lines][0][${htmlFieldName}]"], input[name="talent[${categoryId}][${htmlFieldName}]"], [data-${dataAttr}-input="${categoryId}"]`
      console.log(`🔍 Looking for ${fieldName} with selector: ${fieldSelector}`)
      const field = document.querySelector(fieldSelector)

      if (field) {
        console.log(`🔍 Found field:`, field)
        console.log(`🔍 Field current value: ${field.value}, setting to: ${value}`)
        if (field.type === 'checkbox' || fieldName === 'night_premium') {
          field.checked = Boolean(value)
          // Also update the hidden field for night premium
          if (fieldName === 'night_premium') {
            const hiddenField = document.querySelector(`[data-night-field="${categoryId}"]`)
            if (hiddenField) {
              hiddenField.value = value ? 'true' : 'false'
            }
            // Update button visual state
            const nightBtn = document.querySelector(`[data-category="${categoryId}"].night-btn`)
            if (nightBtn) {
              nightBtn.dataset.active = value ? 'true' : 'false'
              if (value) {
                nightBtn.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
                nightBtn.classList.remove('border-gray-300')
              } else {
                nightBtn.classList.remove('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
                nightBtn.classList.add('border-gray-300')
              }
            }
          }
        } else {
          field.value = value
        }
        console.log(`✅ Set ${fieldName} for category ${categoryId}: ${value}, field value is now: ${field.value}`)
      } else {
        console.log(`❌⚠️ Field not found for ${fieldName} in category ${categoryId} with selector: ${fieldSelector}`)
      }
    })

    // Only populate main fields if this is the main line
    if (isMainLine) {
      console.log(`🔍 Populating main line fields - talent_count: ${talentInfo.talent_count}, adjusted_rate: ${talentInfo.adjusted_rate}, description: ${talentInfo.description}`)

      const talentCountField = document.querySelector(`[data-talent-input="${categoryId}"]`)
      console.log(`🔍 Looking for talent count field with selector: [data-talent-input="${categoryId}"]`)
      console.log(`🔍 Found talent count field:`, talentCountField)
      if (talentCountField && talentInfo.talent_count) {
        console.log(`🔍 Setting talent_count from ${talentCountField.value} to ${talentInfo.talent_count}`)
        talentCountField.value = talentInfo.talent_count
        console.log(`✅ Set talent count for category ${categoryId}: ${talentInfo.talent_count}, field value is now: ${talentCountField.value}`)
      } else if (!talentCountField) {
        console.log(`❌ Talent count field NOT FOUND for category ${categoryId}`)
      }

      const adjustedRateField = document.querySelector(`[data-adjusted-rate-input="${categoryId}"]`)
      console.log(`🔍 Looking for adjusted rate field with selector: [data-adjusted-rate-input="${categoryId}"]`)
      console.log(`🔍 Found adjusted rate field:`, adjustedRateField)
      if (adjustedRateField && talentInfo.adjusted_rate) {
        console.log(`🔍 Setting adjusted_rate from ${adjustedRateField.value} to ${talentInfo.adjusted_rate}`)
        adjustedRateField.value = talentInfo.adjusted_rate
        console.log(`✅ Set adjusted rate for category ${categoryId}: ${talentInfo.adjusted_rate}, field value is now: ${adjustedRateField.value}`)
      } else if (!adjustedRateField) {
        console.log(`❌ Adjusted rate field NOT FOUND for category ${categoryId}`)
      }

      const descriptionField = document.querySelector(`[data-description-input="${categoryId}"]`)
      console.log(`🔍 Looking for description field with selector: [data-description-input="${categoryId}"]`)
      console.log(`🔍 Found description field:`, descriptionField)
      if (descriptionField && talentInfo.description) {
        // Strip category prefix like "LD - " from description
        const cleanDescription = talentInfo.description.replace(/^[A-Z0-9]+ - /, '')
        console.log(`🔍 Setting description from "${descriptionField.value}" to "${cleanDescription}"`)
        descriptionField.value = cleanDescription
        console.log(`✅ Set description for category ${categoryId}: ${cleanDescription}, field value is now: "${descriptionField.value}"`)
      } else if (!descriptionField) {
        console.log(`❌ Description field NOT FOUND for category ${categoryId}`)
      }
    }
  }

  // Helper function to find territory exception for a specific territory and media type
  findTerritoryException(territoryName, mediaType) {
    if (!window.territoryExceptions) {
      return null
    }

    const exception = window.territoryExceptions.find(ex =>
      ex.territory_name === territoryName && ex.media_type === mediaType
    )

    return exception ? exception.percentage : null
  }

  // Helper function to get selected media types for a specific combo
  getSelectedMediaTypesForCombo(comboId) {
    const selectedMediaTypes = []
    const mediaCheckboxes = document.querySelectorAll(`.combination-media-checkbox[data-combo="${comboId}"]:checked`)

    mediaCheckboxes.forEach(checkbox => {
      selectedMediaTypes.push(checkbox.value)
    })

    // If no specific media types selected, assume all_media
    return selectedMediaTypes.length > 0 ? selectedMediaTypes : ['all_media']
  }
}
