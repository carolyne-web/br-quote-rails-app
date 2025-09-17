// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  connect() {
    console.log('Quotation form controller connected')
    
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
    document.addEventListener('click', (e) => {
      console.log('Document click event triggered, target:', e.target.className)
      if (e.target.closest('.add-combination-btn')) {
        const btn = e.target.closest('.add-combination-btn')
        const categoryId = btn.dataset.category
        this.addCombination(categoryId)
      }
      
      // Handle remove category buttons
      if (e.target.closest('[data-remove-category]')) {
        const btn = e.target.closest('[data-remove-category]')
        const categoryId = btn.dataset.category
        console.log('Remove category button clicked for category:', categoryId)
        this.removeTalentCategory(categoryId)
      }
      
      // Setup + Line button functionality
      if (e.target.closest('.add-line-btn')) {
        console.log('Add line button clicked!')
        const btn = e.target.closest('.add-line-btn')
        const categoryId = btn.dataset.category
        console.log(`Button categoryId: ${categoryId}`)
        this.addTalentLine(categoryId)
      }
      
      // Setup Remove Line button functionality
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
      }
      
      // Night buttons now handled by direct event listeners in initializeNightButtonStates()
      // No delegation needed to avoid conflicts
    })
  }

  addTalentLine(categoryId) {
    console.log(`addTalentLine called for category: ${categoryId}`)
    const additionalLinesContainer = document.querySelector(`[data-category="${categoryId}"].additional-lines`)
    if (!additionalLinesContainer) {
      console.error(`Could not find additional lines container for category ${categoryId}`)
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
    
    // Overtime at 10% rate per hour
    lineTotal += talentCount * adjustedRate * 0.1 * overtimeHours
    
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
    productTypeRadios.forEach(radio => {
      const handleProductTypeChange = () => {
        console.log(`🔄 Product Type selected: ${radio.value} - recalculating Kids totals...`)
        
        // Update category totals when product type changes (affects kids reduction)
        this.updateCategoryTotalsDisplay()
        
        // Trigger Kids talent recalculation specifically
        this.recalculateKidsTalentTotals()
        
        // Recalculate all combination totals to apply new product factors
        this.recalculateAllCombinations()
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
    const territories = this.territoryListTarget.querySelectorAll('.territory-item')
    
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
      radio.addEventListener('change', () => {
        this.calculateCommercialPercentages()
      })
    })
    
    // Add event listener to number of commercials input
    const commercialsCountInput = document.querySelector('input[name="quotation[number_of_commercials]"]')
    if (commercialsCountInput) {
      commercialsCountInput.addEventListener('input', () => {
        this.calculateCommercialPercentages()
      })
    }
    
    // Calculate initial percentages if values are already set
    this.calculateCommercialPercentages()
  }

  calculateCommercialPercentages() {
    const commercialTypeInput = document.querySelector('input[name="quotation[commercial_type]"]:checked')
    const commercialsCountInput = document.querySelector('input[name="quotation[number_of_commercials]"]')
    const commercialPercentagesDiv = document.getElementById('commercial-percentages')
    const commercialBreakdownDiv = document.getElementById('commercial-breakdown')
    const totalPercentageSpan = document.getElementById('total-commercial-percentage')
    
    if (!commercialTypeInput || !commercialsCountInput || !commercialPercentagesDiv) {
      return
    }
    
    const commercialType = commercialTypeInput.value
    const numberOfCommercials = parseInt(commercialsCountInput.value) || 1
    
    if (numberOfCommercials <= 0) {
      commercialPercentagesDiv.classList.add('hidden')
      return
    }
    
    // Calculate percentages based on rules
    const percentages = []
    let totalPercentage = 0
    
    for (let i = 1; i <= numberOfCommercials; i++) {
      let percentage = 0
      
      if (commercialType === 'non_brand') {
        // Non-Brand Commercial rules
        if (i === 1) {
          percentage = 100
        } else if (i === 2) {
          percentage = 50
        } else {
          percentage = 25
        }
      } else if (commercialType === 'brand') {
        // Brand Commercial rules
        if (i === 1) {
          percentage = 100
        } else if (i === 2) {
          percentage = 75
        } else {
          percentage = 50
        }
      }
      
      percentages.push({
        position: i,
        percentage: percentage
      })
      totalPercentage += percentage
    }
    
    // Store the total percentage for later use
    this.commercialPercentage = totalPercentage
    
    // Show the percentages section
    commercialPercentagesDiv.classList.remove('hidden')
    
    // Update the breakdown display
    if (commercialBreakdownDiv) {
      commercialBreakdownDiv.innerHTML = percentages.map(item => 
        `<div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">${this.getOrdinal(item.position)} commercial:</span>
          <span class="font-medium text-gray-800">${item.percentage}%</span>
        </div>`
      ).join('')
    }
    
    // Update total percentage display
    if (totalPercentageSpan) {
      totalPercentageSpan.textContent = `${totalPercentage}%`
    }
    
    console.log(`Commercial calculation: Type=${commercialType}, Count=${numberOfCommercials}, Total=${totalPercentage}%`)
  }

  getOrdinal(number) {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const mod100 = number % 100
    return number + (suffixes[(mod100 - 20) % 10] || suffixes[mod100] || suffixes[0])
  }

  getCommercialPercentage() {
    // Return the current commercial percentage for use in other calculations
    return this.commercialPercentage || 100
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
    document.querySelectorAll('.quote-preview-rows').forEach(tbody => {
      const comboId = tbody.getAttribute('data-combo')
      if (comboId) {
        this.populateComboTable(parseInt(comboId))
      }
    })
  }

  populateComboTable(comboId) {
    const tbody = document.querySelector(`.quote-preview-rows[data-combo="${comboId}"]`)
    if (!tbody) return

    const rows = []
    let totalAmount = 0

    // Get all talent categories and their lines
    const talentCategories = this.getAllTalentLines()
    
    talentCategories.forEach(category => {
      category.lines.forEach(line => {
        const dayFee = parseFloat(line.adjustedRate || line.dailyRate || 0)
        const unit = parseInt(line.initialCount || 0)
        
        // Get exclusivities that apply to this talent category
        const categoryId = this.getCategoryIdFromDescription(line.description || category.name)
        const applicableExclusivities = this.getExclusivitiesForCategory(comboId, categoryId)
        
        // Calculate row-specific buyout percentage with Product Type logic
        const rowBuyoutPercentage = this.calculateRowBuyoutPercentage(comboId, applicableExclusivities, categoryId, dayFee)
        
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
        const rowExclusivityPills = applicableExclusivities.map(ex => {
          const originalIndex = allExclusivities.findIndex(original => 
            original.name === ex.name && original.percentage === ex.percentage
          )
          return `<span class="inline-flex items-center px-1 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            ${ex.name} ${ex.percentage}%
            <button type="button" class="ml-1 text-yellow-600 hover:text-yellow-800 font-bold remove-exclusivity-pill" data-combo="${comboId}" data-index="${originalIndex}" title="Remove">×</button>
          </span>`
        }).join('')

        rows.push(`
          <tr class="border-b border-gray-200">
            <td class="py-2 px-3 text-sm text-gray-900 border-r border-gray-300">${line.description || category.name}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">R${this.formatNumber(dayFee)}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-center border-r border-gray-300">${unit}</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-center border-r border-gray-300">
              <div class="flex items-center justify-center gap-2">
                <button type="button" class="exclusivity-plus-btn w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0" data-combo="${comboId}" title="Add Exclusivity">
                  +
                </button>
                <div class="flex flex-wrap gap-1">
                  ${rowExclusivityPills}
                </div>
              </div>
            </td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right border-r border-gray-300">${rowBuyoutPercentage.toFixed(1)}%</td>
            <td class="py-2 px-3 text-sm text-gray-900 text-right">R${this.formatNumber(totalRands)}</td>
          </tr>
        `)
      })
    })

    tbody.innerHTML = rows.join('')
    
    // Update combo total
    const totalElement = document.querySelector(`.combo-total[data-combo="${comboId}"]`)
    if (totalElement) {
      totalElement.textContent = `R${this.formatNumber(totalAmount)}`
    }
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
    
    return percentage
  }

  calculateRowBuyoutPercentage(comboId, applicableExclusivities, categoryId, dayFee) {
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
    const effectivePercentage = percentage * productFactor
    
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
      // If no categories specified, apply to all
      if (!ex.categories || ex.categories.length === 0) return true
      
      // Check if this category is in the exclusivity's target categories
      return ex.categories.includes(categoryId)
    })
  }

  getSelectedProductType() {
    const productTypeRadio = document.querySelector('input[name="quotation[product_type]"]:checked')
    return productTypeRadio ? productTypeRadio.value : null
  }

  getKidsCount() {
    // Get total count of Kids talent across all categories
    let totalKidsCount = 0
    
    // Look for Kids category (category 5) input rows
    const kidsSection = document.querySelector('#talent-category-5')
    console.log(`🔍 KIDS COUNT DEBUG - KidsSection found: ${!!kidsSection}, Hidden: ${kidsSection?.classList.contains('hidden')}`)
    
    if (kidsSection && !kidsSection.classList.contains('hidden')) {
      const inputRows = kidsSection.querySelectorAll('.additional-lines .talent-input-row')
      console.log(`🔍 Found ${inputRows.length} input rows in Kids section`)
      
      inputRows.forEach((row, index) => {
        const countField = row.querySelector('[name*="talent_count"]') || 
                          row.querySelector('[data-talent-input="5"]')
        if (countField) {
          const count = parseInt(countField.value) || 0
          console.log(`🔍 Row ${index}: Count field value = ${countField.value}, parsed = ${count}`)
          totalKidsCount += count
        } else {
          console.log(`🔍 Row ${index}: No count field found`)
        }
      })
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
    // Event delegation for the plus buttons since they are dynamically created
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('exclusivity-plus-btn') || e.target.closest('.exclusivity-plus-btn')) {
        const btn = e.target.closest('.exclusivity-plus-btn')
        const comboId = btn.getAttribute('data-combo')
        this.showExclusivityPopup(comboId)
      }
      
      // Handle remove exclusivity pill buttons
      if (e.target.classList.contains('remove-exclusivity-pill')) {
        const comboId = e.target.getAttribute('data-combo')
        const index = parseInt(e.target.getAttribute('data-index'))
        this.removeExclusivityPill(comboId, index)
      }
    })
  }

  showExclusivityPopup(comboId) {
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
          <!-- Standard Options Section -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Standard Exclusivity Types</h4>
            <div class="space-y-2" id="admin-exclusivity-options">
              ${this.generateAdminExclusivityOptions()}
            </div>
          </div>

          <!-- Custom Entry Section -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Custom Entry</h4>
            <div class="flex items-center gap-2">
              <input type="text" placeholder="e.g., cookies, car" class="flex-1 px-3 py-2 text-sm border rounded" id="custom-exclusivity-name">
              <input type="number" value="50" min="0" step="10" class="w-16 px-2 py-1 text-sm border rounded" id="custom-exclusivity-percentage">
              <span class="text-xs text-gray-500">%</span>
              <button type="button" class="add-custom-exclusivity px-3 py-2 bg-green-500 text-white text-xs rounded">Add</button>
            </div>
          </div>

          <!-- Talent Category Selection -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Apply to Talent Categories</h4>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="1" checked>
                <span class="text-xs">Lead (LD)</span>
              </label>
              <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="2" checked>
                <span class="text-xs">Second Lead (2L)</span>
              </label>
              <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="3" checked>
                <span class="text-xs">Featured Extra (FE)</span>
              </label>
              <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="4" checked>
                <span class="text-xs">Teenager (TN)</span>
              </label>
              <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="mr-2 rounded text-blue-600 focus:ring-blue-500 category-checkbox" value="5" checked>
                <span class="text-xs">Kid (KD)</span>
              </label>
              <div class="flex items-center">
                <button type="button" class="text-xs text-blue-600 hover:text-blue-800 select-all-categories">Select All</button>
                <span class="mx-1 text-gray-400">|</span>
                <button type="button" class="text-xs text-blue-600 hover:text-blue-800 deselect-all-categories">None</button>
              </div>
            </div>
          </div>

          <!-- Selected Exclusivities -->
          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Selected Exclusivities</h4>
            <div class="exclusivity-selected-list space-y-1" data-combo="${comboId}">
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

    // Add event listeners for the modal
    this.setupExclusivityModalEvents(modal, comboId)
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

    // Add admin exclusivity
    modal.querySelectorAll('.add-admin-exclusivity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.flex.items-center.justify-between')
        const name = container.querySelector('span').textContent
        const percentage = parseInt(container.querySelector('input[type="number"]').value) || 0
        this.addExclusivityToList(modal, comboId, name, percentage)
      })
    })

    // Add custom exclusivity
    modal.querySelector('.add-custom-exclusivity').addEventListener('click', () => {
      const nameInput = modal.querySelector('#custom-exclusivity-name')
      const percentageInput = modal.querySelector('#custom-exclusivity-percentage')
      
      const name = nameInput.value.trim()
      const percentage = parseInt(percentageInput.value) || 0
      
      if (name) {
        this.addExclusivityToList(modal, comboId, name, percentage)
        nameInput.value = ''
        percentageInput.value = '50'
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
      this.saveExclusivities(modal, comboId)
      modal.remove()
    })
  }

  addExclusivityToList(modal, comboId, name, percentage) {
    // Get selected categories
    const selectedCategories = Array.from(modal.querySelectorAll('.category-checkbox:checked'))
      .map(cb => parseInt(cb.value))
    
    if (selectedCategories.length === 0) {
      alert('Please select at least one talent category to apply this exclusivity to.')
      return
    }

    const list = modal.querySelector('.exclusivity-selected-list')
    const item = document.createElement('div')
    item.className = 'flex items-center justify-between p-2 bg-gray-50 rounded text-sm'
    
    // Show which categories this applies to
    const categoryNames = {1: 'LD', 2: '2L', 3: 'FE', 4: 'TN', 5: 'KD'}
    const categoryLabels = selectedCategories.map(id => categoryNames[id]).join(', ')
    
    item.innerHTML = `
      <div>
        <div class="font-medium">${name} (${percentage}%)</div>
        <div class="text-xs text-gray-500">Applies to: ${categoryLabels}</div>
      </div>
      <button type="button" class="text-red-500 hover:text-red-700 text-xs remove-exclusivity">Remove</button>
    `
    
    // Store category data on the item
    item.dataset.categories = JSON.stringify(selectedCategories)
    
    // Add remove functionality
    item.querySelector('.remove-exclusivity').addEventListener('click', () => {
      item.remove()
      this.updateExclusivityTotal(modal)
    })
    
    list.appendChild(item)
    this.updateExclusivityTotal(modal)
  }

  updateExclusivityTotal(modal) {
    const items = modal.querySelectorAll('.exclusivity-selected-list .flex')
    let total = 0
    
    items.forEach(item => {
      const text = item.querySelector('span').textContent
      const match = text.match(/\((\d+)%\)/)
      if (match) {
        total += parseInt(match[1])
      }
    })
    
    modal.querySelector('.exclusivity-total').textContent = `${total}%`
  }

  saveExclusivities(modal, comboId) {
    const items = modal.querySelectorAll('.exclusivity-selected-list > div')
    const exclusivities = []
    
    items.forEach(item => {
      const nameDiv = item.querySelector('.font-medium')
      if (!nameDiv) return
      
      const text = nameDiv.textContent
      const nameMatch = text.match(/^(.+) \((\d+)%\)$/)
      const categories = JSON.parse(item.dataset.categories || '[]')
      
      if (nameMatch && categories.length > 0) {
        exclusivities.push({
          name: nameMatch[1],
          percentage: parseInt(nameMatch[2]),
          categories: categories
        })
      }
    })
    
    // Update the exclusivity tags in the quote preview
    this.updateExclusivityTags(comboId, exclusivities)
    
    // Create or update hidden form fields for database storage
    this.updateExclusivityFormFields(comboId, exclusivities)
    
    // Store for later use
    if (!window.exclusivityData) window.exclusivityData = {}
    window.exclusivityData[comboId] = exclusivities
    
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
    this.populateComboTable(comboId)
  }

  removeExclusivityPill(comboId, index) {
    // Get current exclusivities from storage
    const currentExclusivities = (window.exclusivityData && window.exclusivityData[comboId]) || []
    
    // Remove the item at the specified index
    if (index >= 0 && index < currentExclusivities.length) {
      currentExclusivities.splice(index, 1)
      
      // Update storage
      if (!window.exclusivityData) window.exclusivityData = {}
      window.exclusivityData[comboId] = currentExclusivities
      
      // Update the visual tags
      this.updateExclusivityTags(comboId, currentExclusivities)
      
      // Update form fields
      this.updateExclusivityFormFields(comboId, currentExclusivities)
      
      // Recalculate the buyout percentage which now includes exclusivity
      this.populateAllTables()
    }
  }
}