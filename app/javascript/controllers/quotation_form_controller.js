// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  connect() {
    this.setupTalentButtons()
    this.setupMediaTypeLogic()
    this.watchDurationWarning()
    this.setupManualAdjustments()
    
    // Make functions available globally
    window.removeTalentCategory = (categoryId) => this.removeTalentCategory(categoryId)
    window.removeCombination = (categoryId, index) => this.removeCombination(categoryId, index)
    
    // Store base rates for each category
    this.baseRates = {}
    this.loadBaseRates()
  }

  loadBaseRates() {
    // Load base rates from the DOM for each category
    document.querySelectorAll('[id^="talent-category-"]').forEach(section => {
      const categoryId = section.id.replace('talent-category-', '')
      const defaultRateText = section.querySelector('.text-gray-600').textContent
      const match = defaultRateText.match(/R([\d,]+)/)
      if (match) {
        this.baseRates[categoryId] = parseInt(match[1].replace(/,/g, ''))
      }
    })
  }

  setupTalentButtons() {
    document.querySelectorAll('.talent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryId = e.target.closest('.talent-btn').dataset.category
        const categorySection = document.getElementById(`talent-category-${categoryId}`)
        
        if (categorySection) {
          // Show the talent category section
          categorySection.classList.remove('hidden')
          
          // Add first combination automatically
          this.addCombination(categoryId)
          
          // Update button appearance
          e.target.closest('.talent-btn').classList.add('border-blue-500', 'bg-blue-50')
          e.target.closest('.talent-btn').style.opacity = '0.7'
        }
      })
    })
    
    // Setup add combination buttons
    document.querySelectorAll('.add-combination-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryId = e.target.dataset.category
        this.addCombination(categoryId)
      })
    })
  }

  addCombination(categoryId) {
    const combinationsList = document.querySelector(`[data-category="${categoryId}"] .combinations-list`)
    const index = combinationsList.children.length
    const baseRate = this.baseRates[categoryId] || 5000
    
    const combinationHtml = `
      <div class="combination-row mb-4 p-4 bg-white rounded-lg border" data-combination-index="${index}">
        <div class="flex justify-between items-start mb-4">
          <h6 class="font-medium text-gray-800">Combination ${index + 1}</h6>
          <button type="button" class="text-red-500 hover:text-red-700 text-sm" onclick="removeCombination(${categoryId}, ${index})">Remove</button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Base Rate with +/- Controls -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">Base Rate (±R100)</label>
            <div class="flex items-center space-x-2">
              <button type="button" class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm rate-decrease" data-category="${categoryId}" data-index="${index}">-</button>
              <input type="number" name="talent[${categoryId}][combinations][${index}][rate]" value="${baseRate}" step="100" min="0" 
                     class="w-full text-center border rounded px-2 py-1 text-sm rate-input" data-category="${categoryId}" data-index="${index}">
              <button type="button" class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm rate-increase" data-category="${categoryId}" data-index="${index}">+</button>
            </div>
          </div>
          
          <!-- Number of Talent -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">No. of Talent</label>
            <input type="number" name="talent[${categoryId}][combinations][${index}][count]" min="1" max="1000" value="1"
                   class="w-full border rounded px-3 py-1 text-sm talent-count" data-category="${categoryId}" data-index="${index}">
          </div>
          
          <!-- Shoot Days -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">Shoot Days</label>
            <input type="number" name="talent[${categoryId}][combinations][${index}][days]" min="1" value="1"
                   class="w-full border rounded px-3 py-1 text-sm shoot-days" data-category="${categoryId}" data-index="${index}">
          </div>
          
          <!-- Combination Total -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">Combination Total</label>
            <div class="text-lg font-semibold text-blue-600 py-1 combination-total" data-category="${categoryId}" data-index="${index}">
              R${this.formatNumber(baseRate)}
            </div>
          </div>
        </div>
      </div>
    `
    
    combinationsList.insertAdjacentHTML('beforeend', combinationHtml)
    this.setupCombinationEventListeners(categoryId, index)
    this.calculateCategoryTotal(categoryId)
  }

  setupCombinationEventListeners(categoryId, index) {
    const combination = document.querySelector(`[data-combination-index="${index}"]`)
    
    // Rate increase/decrease buttons
    combination.querySelector('.rate-decrease').addEventListener('click', (e) => {
      const input = combination.querySelector('.rate-input')
      const currentValue = parseInt(input.value) || 0
      input.value = Math.max(0, currentValue - 100)
      this.calculateCombinationTotal(categoryId, index)
    })
    
    combination.querySelector('.rate-increase').addEventListener('click', (e) => {
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

  calculateCombinationTotal(categoryId, index) {
    const combination = document.querySelector(`[data-combination-index="${index}"]`)
    const rate = parseInt(combination.querySelector('.rate-input').value) || 0
    const count = parseInt(combination.querySelector('.talent-count').value) || 0
    const days = parseInt(combination.querySelector('.shoot-days').value) || 0
    
    const total = rate * count * days
    combination.querySelector('.combination-total').textContent = `R${this.formatNumber(total)}`
    
    this.calculateCategoryTotal(categoryId)
  }

  calculateCategoryTotal(categoryId) {
    const section = document.getElementById(`talent-category-${categoryId}`)
    let categoryTotal = 0
    
    // Sum all combinations
    section.querySelectorAll('.combination-total').forEach(totalEl => {
      const value = totalEl.textContent.replace(/[R,]/g, '')
      categoryTotal += parseInt(value) || 0
    })
    
    // Add standby costs
    const standbyInputs = section.querySelectorAll('[data-standby-input]')
    let standbyDays = 0
    standbyInputs.forEach(input => {
      standbyDays += parseInt(input.value) || 0
    })
    
    // Calculate average rate for standby calculation
    const combinations = section.querySelectorAll('.combination-row')
    let totalTalent = 0
    let weightedRate = 0
    
    combinations.forEach(combo => {
      const rate = parseInt(combo.querySelector('.rate-input').value) || 0
      const count = parseInt(combo.querySelector('.talent-count').value) || 0
      totalTalent += count
      weightedRate += (rate * count)
    })
    
    const avgRate = totalTalent > 0 ? weightedRate / totalTalent : 0
    const standbyCost = totalTalent * avgRate * standbyDays * 0.5
    
    // Add overtime costs
    const overtimeInput = section.querySelector('[data-overtime-input]')
    const overtimeHours = parseFloat(overtimeInput?.value) || 0
    const overtimeCost = totalTalent * (avgRate * 0.1) * overtimeHours
    
    // Update displays
    section.querySelector(`#standby-cost-${categoryId}`).textContent = `R${this.formatNumber(standbyCost)}`
    section.querySelector(`#overtime-cost-${categoryId}`).textContent = `R${this.formatNumber(overtimeCost)}`
    section.querySelector(`#category-total-${categoryId}`).textContent = `R${this.formatNumber(categoryTotal + standbyCost + overtimeCost)}`
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
    
    mediaCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.calculateMediaMultiplier()
      })
    })
    
    // Initialize multiplier on page load
    this.calculateMediaMultiplier()
  }

  calculateMediaMultiplier() {
    const selected = document.querySelectorAll('input[name="media_types[]"]:checked')
    let multiplier = 1.0
    
    if (selected.length === 1) {
      multiplier = 0.5 // One media = 50%
    } else if (selected.length === 2) {
      multiplier = 0.75 // Two media = 75%
    } else if (selected.length >= 3) {
      multiplier = 1.0 // Three or more = 100%
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
      // Re-enable the talent button
      talentBtn.classList.remove('border-blue-500', 'bg-blue-50')
      talentBtn.style.opacity = '1'
      talentBtn.style.pointerEvents = 'auto'
    }
  }

  // Utility method to format numbers with commas
  formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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