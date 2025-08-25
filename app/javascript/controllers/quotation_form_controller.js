// app/javascript/controllers/quotation_form_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["territorySearch", "territoryList", "durationWarning", "mediaMultiplier"]

  connect() {
    this.setupTalentButtons()
    this.setupMediaTypeLogic()
    this.watchDurationWarning()
    this.setupManualAdjustments()
    
    // Make removeTalentCategory available globally
    window.removeTalentCategory = (categoryId) => this.removeTalentCategory(categoryId)
  }

  setupTalentButtons() {
    document.querySelectorAll('.talent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryId = e.target.closest('.talent-btn').dataset.category
        const categorySection = document.getElementById(`talent-category-${categoryId}`)
        
        if (categorySection) {
          // Show the talent category section
          categorySection.classList.remove('hidden')
          
          // Hide the button (optional - or you could keep it visible)
          e.target.closest('.talent-btn').style.opacity = '0.5'
          e.target.closest('.talent-btn').style.pointerEvents = 'none'
        }
      })
    })
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
      
      // Clear all input values in this section
      categorySection.querySelectorAll('input').forEach(input => {
        input.value = ''
      })
    }
    
    if (talentBtn) {
      // Re-enable the talent button
      talentBtn.style.opacity = '1'
      talentBtn.style.pointerEvents = 'auto'
    }
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