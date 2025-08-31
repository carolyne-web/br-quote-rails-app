// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  connect() {
    console.log('Quotation form controller connected')
    
    // Initialize arrays first
    this.baseRates = {}
    this.previousMediaSelections = []
    this.previousTerritorySelections = []
    
    this.setupTalentButtons()
    this.setupMediaTypeLogic()
    this.watchDurationWarning()
    this.setupManualAdjustments()
    this.setupMainRowEventListeners()
    this.setupProductTypeListeners()
    this.setupDurationLogic()
    
    // Make functions available globally
    window.removeTalentCategory = (categoryId) => this.removeTalentCategory(categoryId)
    window.removeCombination = (categoryId, index) => this.removeCombination(categoryId, index)
    
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
        
        // Night button listener - simple toggle (no input field)
        const nightBtn = row.querySelector('.night-btn')
        if (nightBtn) {
          nightBtn.addEventListener('click', () => {
            const isActive = nightBtn.dataset.active === 'true'
            nightBtn.dataset.active = isActive ? 'false' : 'true'
            
            if (nightBtn.dataset.active === 'true') {
              nightBtn.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
              nightBtn.classList.remove('border-gray-300')
            } else {
              nightBtn.classList.remove('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
              nightBtn.classList.add('border-gray-300')
            }
            
            const hiddenField = row.querySelector('[name*="night_premium"]')
            if (hiddenField) {
              hiddenField.value = nightBtn.dataset.active
            }
            
            this.calculateCategoryTotal(categoryId)
          })
        }
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

  setupTalentButtons() {
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
      if (e.target.closest('.add-combination-btn')) {
        const btn = e.target.closest('.add-combination-btn')
        const categoryId = btn.dataset.category
        this.addCombination(categoryId)
      }
      
      // Setup + Line button functionality
      if (e.target.closest('.add-line-btn')) {
        const btn = e.target.closest('.add-line-btn')
        const categoryId = btn.dataset.category
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
      
      // Handle night button toggle for additional lines
      if (e.target.closest('.night-btn') && e.target.closest('.night-btn').dataset.line !== undefined) {
        const btn = e.target.closest('.night-btn')
        const categoryId = btn.dataset.category
        const lineIndex = btn.dataset.line
        const isActive = btn.dataset.active === 'true'
        
        if (isActive) {
          btn.dataset.active = 'false'
          btn.classList.remove('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
          btn.classList.add('border-gray-300', 'hover:bg-yellow-50')
        } else {
          btn.dataset.active = 'true'
          btn.classList.add('bg-yellow-100', 'border-yellow-400', 'text-yellow-800')
          btn.classList.remove('border-gray-300', 'hover:bg-yellow-50')
        }
        
        const hiddenField = btn.parentElement.querySelector('.night-premium')
        if (hiddenField) {
          hiddenField.value = btn.dataset.active
        }
        
        this.calculateCategoryTotal(categoryId)
      }
    })
  }

  addTalentLine(categoryId) {
    const additionalLinesContainer = document.querySelector(`[data-category="${categoryId}"].additional-lines`)
    if (!additionalLinesContainer) {
      console.error(`Could not find additional lines container for category ${categoryId}`)
      return
    }
    
    const lineIndex = additionalLinesContainer.children.length
    const lineHtml = `
      <div class="talent-input-row grid grid-cols-9 gap-2 mb-2" data-line-index="${lineIndex}">
        <!-- Talent Count -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][talent_count]" min="0" max="99" value="0"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center talent-count"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Rate Adjustment -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][adjusted_rate]" value="${this.baseRates[categoryId] || 5000}"
                 step="500"
                 class="w-20 px-1 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-center rate-adjustment"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Shoot Days -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][shoot_days]" min="1" value="1"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center shoot-days"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Rehearsal Days -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][rehearsal_days]" min="0" value="0"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center rehearsal-days"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Down Days -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][down_days]" min="0" value="0"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center down-days"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Travel Days -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][travel_days]" min="0" value="0"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center travel-days"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Overtime Hours -->
        <div>
          <input type="number" name="talent[${categoryId}][lines][${lineIndex}][overtime_hours]" min="0" step="0.5" value="0"
                 class="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center overtime-hours"
                 data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Night Button -->
        <div class="flex flex-col items-center">
          <button type="button" class="night-btn w-full px-2 py-2 text-xs border-2 border-gray-300 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors font-medium"
                  data-active="false" data-category="${categoryId}" data-line="${lineIndex}">
            + Night Fee
          </button>
          <input type="hidden" name="talent[${categoryId}][lines][${lineIndex}][night_premium]" value="false"
                 class="night-premium" data-category="${categoryId}" data-line="${lineIndex}">
        </div>
        
        <!-- Remove Line Button -->
        <div>
          <button type="button" class="remove-line-btn w-full text-xs text-red-600 font-medium"
                  data-category="${categoryId}" data-line="${lineIndex}">
            -
          </button>
        </div>
      </div>
    `
    
    additionalLinesContainer.insertAdjacentHTML('beforeend', lineHtml)
    this.setupLineEventListeners(categoryId, lineIndex)
    this.calculateCategoryTotal(categoryId)
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
    console.log('Calculating total for category:', categoryId)
    const section = document.getElementById(`talent-category-${categoryId}`)
    if (!section) {
      console.log('Section not found for category:', categoryId)
      return
    }
    
    const baseRate = this.baseRates[categoryId] || 5000
    console.log('Base rate for category', categoryId, ':', baseRate)
    let categoryTotal = 0
    
    // Calculate first row (main row)
    const firstRow = section.querySelector('.talent-input-row')
    if (firstRow) {
      const lineTotal = this.calculateLineTotal(firstRow, baseRate)
      console.log('First row total:', lineTotal)
      categoryTotal += lineTotal
    }
    
    // Calculate additional lines
    const additionalLines = section.querySelectorAll('.additional-lines .talent-input-row')
    additionalLines.forEach((line, index) => {
      const lineTotal = this.calculateLineTotal(line, baseRate)
      console.log(`Additional line ${index} total:`, lineTotal)
      categoryTotal += lineTotal
    })
    
    console.log('Category total:', categoryTotal)
    
    // Update display
    const totalDisplay = section.querySelector(`#category-total-${categoryId}`)
    if (totalDisplay) {
      totalDisplay.textContent = `R${this.formatNumber(categoryTotal)}`
      console.log('Updated display with:', `R${this.formatNumber(categoryTotal)}`)
    } else {
      console.log('Total display element not found')
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
    const adjustedRate = Math.round(parseFloat(lineRow.querySelector('[name*="adjusted_rate"], .rate-adjustment')?.value)) || baseRate
    const shootDays = parseInt(lineRow.querySelector('[name*="days_count"], [name*="shoot_days"], .shoot-days')?.value) || 0
    const rehearsalDays = parseInt(lineRow.querySelector('[name*="rehearsal_days"], .rehearsal-days')?.value) || 0
    const downDays = parseInt(lineRow.querySelector('[name*="down_days"], .down-days')?.value) || 0
    const travelDays = parseInt(lineRow.querySelector('[name*="travel_days"], .travel-days')?.value) || 0
    const overtimeHours = parseFloat(lineRow.querySelector('[name*="overtime_hours"], .overtime-hours')?.value) || 0
    
    // Check if night is active (simple toggle, no input count needed)
    const nightBtn = lineRow.querySelector('.night-btn')
    const isNightActive = nightBtn && nightBtn.dataset.active === 'true'
    
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
      console.log(`Night calculation: 1 × ${adjustedRate} × ${talentCount} × 1.5 = ${nightCost}`)
    }
    
    console.log(`Line total: Talent=${talentCount}, Rate=${adjustedRate}, Shoot=${shootDays}, Rehearsal=${rehearsalDays}, Down=${downDays}, Travel=${travelDays}, Overtime=${overtimeHours}, Night=${isNightActive ? 'on' : 'off'}, Total=${lineTotal}`)
    
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
    const mediaCheckboxes = document.querySelectorAll('input[name="media_types[]"]')
    const allMediaCheckbox = document.querySelector('input[value="all_media"]')
    const allMovingCheckbox = document.querySelector('input[value="all_moving"]')
    const allPrintCheckbox = document.querySelector('input[value="print"]')
    const tvCheckbox = document.querySelector('input[value="tv"]')
    const internetCheckbox = document.querySelector('input[value="internet"]')
    const cinemaCheckbox = document.querySelector('input[value="cinema"]')

    mediaCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        // If "All Media" is selected, disable all others and auto-check them
        if (checkbox.value === 'all_media' && checkbox.checked) {
          document.querySelectorAll('input[name="media_types[]"]:not([value="all_media"])').forEach(otherCheckbox => {
            otherCheckbox.checked = true
            otherCheckbox.disabled = true
            otherCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
          })
        }
        // If "All Media" is unchecked, enable all others and uncheck everything
        else if (checkbox.value === 'all_media' && !checkbox.checked) {
          document.querySelectorAll('input[name="media_types[]"]:not([value="all_media"])').forEach(otherCheckbox => {
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
          
          // Disable All Moving Media, individual moving options, and All Media
          if (allMovingCheckbox) {
            allMovingCheckbox.disabled = true
            allMovingCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
          }
          if (tvCheckbox) {
            tvCheckbox.disabled = true
            tvCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
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
        
        this.calculateMediaMultiplier()
      })
    })
    
    // Initialize multiplier on page load and set initial state
    this.calculateMediaMultiplier()
    
    // Check initial state on page load - only "All Media" is exclusive
    if (allMediaCheckbox && allMediaCheckbox.checked) {
      document.querySelectorAll('input[name="media_types[]"]:not([value="all_media"])').forEach(otherCheckbox => {
        otherCheckbox.disabled = true
        otherCheckbox.closest('label').classList.add('opacity-50', 'cursor-not-allowed')
      })
    }
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

  watchDurationWarning() {
    const durationSelect = document.querySelector('select[name*="duration"]')
    
    if (durationSelect) {
      durationSelect.addEventListener('change', (e) => {
        const months = this.parseDurationMonths(e.target.value)
        
        if (months <= 12) {
          alert('Warning: Duration ≤ 12 months will use Worldwide All Media rates')
        }
      })
      
      // Also check on page load
      this.checkDurationWarning()
    }
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
      radio.addEventListener('change', () => {
        // Update category totals when product type changes (affects kids reduction)
        this.updateCategoryTotalsDisplay()
      })
    })
  }

  setupDurationLogic() {
    const durationSelect = document.querySelector('select[name*="duration"]')
    if (durationSelect) {
      durationSelect.addEventListener('change', () => {
        this.handleDurationChange()
      })
      
      // Check initial state on page load
      this.handleDurationChange()
    }
    
    // Add event listeners to territory checkboxes to update tags
    document.querySelectorAll('.territory-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateTerritoryTags()
      })
    })
  }

  handleDurationChange() {
    const durationSelect = document.querySelector('select[name*="duration"]')
    if (!durationSelect) return
    
    const duration = durationSelect.value
    const isShortDuration = ['3_months', '6_months', '12_months'].includes(duration)
    
    const allMediaCheckbox = document.querySelector('input[value="all_media"]')
    
    if (isShortDuration) {
      // Store current selections before forcing changes
      this.storePreviousSelections()
      
      // Force All Media selection
      if (allMediaCheckbox && !allMediaCheckbox.checked) {
        allMediaCheckbox.checked = true
        // Trigger the media logic to disable other options
        allMediaCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
      }
      
      // Force Worldwide territory selection in Combo 1 (1200%)
      const worldwideCheckbox = this.getWorldwideTerritoryForCombo(1)
      if (worldwideCheckbox && !worldwideCheckbox.checked) {
        // Uncheck all other territories in Combo 1 first
        document.querySelectorAll('.combination-territory-checkbox[data-combo="1"]:checked').forEach(checkbox => {
          checkbox.checked = false
        })
        worldwideCheckbox.checked = true
        // Update territory tags for combo 1
        this.updateTerritoryTagsForCombo(1)
      }
      
      // Disable All Media and Worldwide checkboxes to prevent unchecking
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = true
        allMediaCheckbox.closest('label').classList.add('opacity-75')
      }
      if (worldwideCheckbox) {
        worldwideCheckbox.disabled = true
        worldwideCheckbox.closest('label').classList.add('opacity-75')
      }
    } else {
      // Re-enable All Media checkbox
      if (allMediaCheckbox) {
        allMediaCheckbox.disabled = false
        allMediaCheckbox.closest('label').classList.remove('opacity-75')
      }
      
      // Re-enable Worldwide checkbox in Combo 1
      const worldwideCheckbox = this.getWorldwideTerritoryForCombo(1)
      if (worldwideCheckbox) {
        worldwideCheckbox.disabled = false
        worldwideCheckbox.closest('label').classList.remove('opacity-75')
      }
      
      // Dynamically unselect All Media when switching to >12 months
      if (allMediaCheckbox && allMediaCheckbox.checked) {
        allMediaCheckbox.checked = false
        // Trigger the media logic to re-enable other options
        allMediaCheckbox.dispatchEvent(new Event('change', { bubbles: true }))
      }
      
      // Don't restore previous selections - let user choose fresh
    }
    
    // Update quote preview
    if (typeof updateQuotePreview === 'function') {
      updateQuotePreview()
    }
  }

  storePreviousSelections() {
    // Initialize arrays if they don't exist
    if (!this.previousMediaSelections) {
      this.previousMediaSelections = []
    }
    if (!this.previousTerritorySelections) {
      this.previousTerritorySelections = []
    }
    
    // Only store if we haven't already stored (to preserve original user choices)
    if (this.previousMediaSelections.length === 0) {
      const checkedMedia = document.querySelectorAll('input[name="media_types[]"]:checked')
      this.previousMediaSelections = Array.from(checkedMedia).map(checkbox => checkbox.value)
    }
    
    if (this.previousTerritorySelections.length === 0) {
      const checkedTerritories = document.querySelectorAll('.territory-checkbox:checked')
      this.previousTerritorySelections = Array.from(checkedTerritories).map(checkbox => checkbox.value)
    }
  }

  restorePreviousSelections() {
    // Initialize arrays if they don't exist
    if (!this.previousMediaSelections) {
      this.previousMediaSelections = []
    }
    if (!this.previousTerritorySelections) {
      this.previousTerritorySelections = []
    }
    
    // Restore media selections
    document.querySelectorAll('input[name="media_types[]"]').forEach(checkbox => {
      checkbox.checked = this.previousMediaSelections.includes(checkbox.value)
      checkbox.disabled = false
      checkbox.closest('label').classList.remove('opacity-50', 'cursor-not-allowed')
    })
    
    // Restore territory selections
    document.querySelectorAll('.territory-checkbox').forEach(checkbox => {
      checkbox.checked = this.previousTerritorySelections.includes(checkbox.value)
    })
    
    // Clear stored selections for next time
    this.previousMediaSelections = []
    this.previousTerritorySelections = []
    
    // Recalculate media multiplier based on restored selections
    this.calculateMediaMultiplier()
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
    
    if (!categoryTotalsList || !talentBaseTotal || !talentGrandTotal) return
    
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
                <span class="text-gray-700">${talentCount} ${categoryName} @ R${this.formatNumber(adjustedRate)}</span>
               
                <span class="font-semibold text-gray-800">R${this.formatNumber(totalValue)}</span>
              </div>

               ${categoryName.toLowerCase() !== 'extras' ? `
                <div class="flex justify-between items-center text-xs text-gray-500">
                  <span>Base (excl. days)</span>
                  <span>R${this.formatNumber(baseCategoryTotal)}</span>
                </div>
              ` : ''}
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
    if (baseTotalAmount > 0) {
      categoryTotalsHtml += `
        <div class="border-t pt-2 mt-2">
          <div class="flex justify-between items-center text-sm font-medium text-blue-600">
            <span>Base Total (without days & excl. extras)</span>
            <span>R${this.formatNumber(baseTotalAmountExcludingExtras)}</span>
          </div>
        </div>
      `
    }
    
    // Store the value excluding extras for reuse
    this.baseTotalExcludingExtras = baseTotalAmountExcludingExtras
    
    categoryTotalsList.innerHTML = categoryTotalsHtml

    talentBaseTotal.textContent = `R${this.formatNumber(baseTotalAmount)}`
    talentGrandTotal.textContent = `R${this.formatNumber(totalAmount)}`
  }

  searchTerritories(event) {
    const searchTerm = event.target.value.toLowerCase()
    const territories = this.territoryListTarget.querySelectorAll('.territory-item')
    
    territories.forEach(territory => {
      const name = territory.dataset.name.toLowerCase()
      const code = territory.dataset.code?.toLowerCase() || ''
      
      if (searchTerm.length >= 3) {
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

  checkDurationWarning() {
    const durationSelect = document.querySelector('#quotation_detail_duration')
    if (durationSelect) {
      const duration = durationSelect.value
      const months = this.parseDurationMonths(duration)
      
      if (months && months <= 12) {
        this.showDurationWarning()
      } else {
        this.hideDurationWarning()
      }
    }
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

  showDurationWarning() {
    if (this.hasDurationWarningTarget) {
      this.durationWarningTarget.classList.remove('hidden')
    }
  }

  hideDurationWarning() {
    if (this.hasDurationWarningTarget) {
      this.durationWarningTarget.classList.add('hidden')
    }
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
}