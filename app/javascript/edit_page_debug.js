// Edit Page Debugging Tools
// Specialized debugging for edit page data population issues

window.EditPageDebug = {
  // Check if we're on an edit page
  isEditPage: () => {
    return window.location.pathname.includes('/edit') ||
           document.querySelector('h1')?.textContent?.includes('Edit Quotation')
  },

  // Debug existing quotation data
  debugExistingData: () => {
    console.group('🔍 Edit Page Data Debug')

    // Check if existingQuotationData is available
    if (typeof existingQuotationData !== 'undefined') {
      console.log('✅ existingQuotationData found:', existingQuotationData)

      // Check talent categories
      if (existingQuotationData.talent_categories) {
        console.log('👥 Talent Categories:', existingQuotationData.talent_categories)
        console.log('👥 Count:', existingQuotationData.talent_categories.length)
      } else {
        console.warn('❌ No talent_categories in existing data')
      }

      // Check quotation detail
      if (existingQuotationData.quotation_detail) {
        console.log('📋 Quotation Detail:', existingQuotationData.quotation_detail)
      } else {
        console.warn('❌ No quotation_detail in existing data')
      }

      // Check territories
      if (existingQuotationData.territories) {
        console.log('🌍 Territories:', existingQuotationData.territories)
      } else {
        console.warn('❌ No territories in existing data')
      }

    } else {
      console.error('❌ existingQuotationData not found!')
    }

    // Check form fields population
    EditPageDebug.checkFormPopulation()

    console.groupEnd()
  },

  // Check if form fields are properly populated
  checkFormPopulation: () => {
    console.group('📝 Form Population Check')

    // Check basic quotation fields
    const campaignName = document.querySelector('input[name="quotation[campaign_name]"]')
    console.log('Campaign Name:', {
      element: campaignName,
      value: campaignName?.value,
      populated: !!campaignName?.value
    })

    const productType = document.querySelector('input[name="quotation[product_type]"]:checked')
    console.log('Product Type:', {
      element: productType,
      value: productType?.value,
      populated: !!productType
    })

    const commercialType = document.querySelector('input[name="quotation[commercial_type]"]:checked')
    console.log('Commercial Type:', {
      element: commercialType,
      value: commercialType?.value,
      populated: !!commercialType
    })

    // Check talent category sections
    const talentSections = document.querySelectorAll('[id^="talent-category-"]')
    console.log('Talent Category Sections:', talentSections.length)

    talentSections.forEach((section, index) => {
      const categoryId = section.id.replace('talent-category-', '')
      const isVisible = !section.classList.contains('hidden')
      const inputs = section.querySelectorAll('input')
      const populatedInputs = Array.from(inputs).filter(input => input.value)

      console.log(`Category ${categoryId}:`, {
        visible: isVisible,
        totalInputs: inputs.length,
        populatedInputs: populatedInputs.length,
        section: section
      })
    })

    // Check territory selections
    const territoryInputs = document.querySelectorAll('input[name*="territories"]')
    const selectedTerritories = Array.from(territoryInputs).filter(input => input.checked)
    console.log('Territories:', {
      total: territoryInputs.length,
      selected: selectedTerritories.length,
      selectedValues: selectedTerritories.map(t => t.value)
    })

    // Check media type selections
    const mediaInputs = document.querySelectorAll('input[name*="media_type"]')
    const selectedMedia = Array.from(mediaInputs).filter(input => input.checked)
    console.log('Media Types:', {
      total: mediaInputs.length,
      selected: selectedMedia.length,
      selectedValues: selectedMedia.map(m => m.value)
    })

    console.groupEnd()
  },

  // Debug talent category population specifically
  debugTalentPopulation: () => {
    console.group('👥 Talent Category Population Debug')

    if (typeof existingQuotationData !== 'undefined' && existingQuotationData.talent_categories) {
      existingQuotationData.talent_categories.forEach((category, index) => {
        console.log(`Category ${index + 1}:`, category)

        const categoryId = category.category_type
        const section = document.getElementById(`talent-category-${categoryId}`)
        const button = document.querySelector(`.talent-btn[data-category="${categoryId}"]`)

        console.log(`Category ${categoryId} Elements:`, {
          section: section,
          sectionVisible: section && !section.classList.contains('hidden'),
          button: button,
          buttonActive: button && button.classList.contains('border-blue-500')
        })

        // Check specific input fields for this category
        const inputs = {
          count: document.querySelector(`input[name="talent[${categoryId}][talent_count]"]`),
          rate: document.querySelector(`input[name="talent[${categoryId}][adjusted_rate]"]`),
          days: document.querySelector(`input[name="talent[${categoryId}][days_count]"]`),
          description: document.querySelector(`input[name="talent[${categoryId}][description]"]`)
        }

        Object.entries(inputs).forEach(([key, input]) => {
          if (input) {
            console.log(`  ${key}:`, {
              value: input.value,
              expectedValue: category[key === 'count' ? 'initial_count' : key === 'rate' ? 'adjusted_rate' : key],
              populated: !!input.value
            })
          } else {
            console.warn(`  ${key}: INPUT NOT FOUND`)
          }
        })
      })
    }

    console.groupEnd()
  },

  // Check for JavaScript errors during population
  checkPopulationErrors: () => {
    console.group('🚨 Population Error Check')

    // Override console.error temporarily to catch errors
    const originalError = console.error
    const errors = []

    console.error = function(...args) {
      errors.push(args)
      originalError.apply(console, args)
    }

    // Try to trigger population manually
    try {
      if (typeof populateExistingData === 'function') {
        console.log('🔄 Manually triggering populateExistingData...')
        populateExistingData()
        console.log('✅ populateExistingData completed')
      } else {
        console.warn('❌ populateExistingData function not found')
      }
    } catch (error) {
      console.error('❌ Error during manual population:', error)
      errors.push(['Manual population error:', error])
    }

    // Restore original console.error
    console.error = originalError

    if (errors.length > 0) {
      console.log('🚨 Errors found during population:', errors)
    } else {
      console.log('✅ No errors detected during population')
    }

    console.groupEnd()
  },

  // Test form data extraction
  extractCurrentFormData: () => {
    const formData = new FormData(document.querySelector('form'))
    const data = Object.fromEntries(formData.entries())

    console.group('📊 Current Form Data')
    console.log('Raw form data:', data)

    // Group by category
    const organized = {
      quotation: {},
      talent: {},
      territories: [],
      mediaTypes: [],
      other: {}
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key.includes('quotation[')) {
        organized.quotation[key] = value
      } else if (key.includes('talent[')) {
        organized.talent[key] = value
      } else if (key.includes('territories')) {
        organized.territories.push({ key, value })
      } else if (key.includes('media_type')) {
        organized.mediaTypes.push({ key, value })
      } else {
        organized.other[key] = value
      }
    })

    console.log('Organized data:', organized)
    console.groupEnd()

    return organized
  },

  // Comprehensive edit page diagnosis
  diagnose: () => {
    console.clear()
    console.log('🔧 EDIT PAGE COMPREHENSIVE DIAGNOSIS')
    console.log('=====================================')

    EditPageDebug.debugExistingData()
    EditPageDebug.debugTalentPopulation()
    EditPageDebug.checkPopulationErrors()
    EditPageDebug.extractCurrentFormData()

    console.log('📋 DIAGNOSIS SUMMARY:')
    console.log('- Check the logs above for specific issues')
    console.log('- Look for ❌ markers indicating problems')
    console.log('- Use editDebug.fix() to attempt automatic fixes')
  },

  // Attempt to fix common issues
  fix: () => {
    console.log('🔧 Attempting to fix edit page issues...')

    // Try to populate data if function exists
    if (typeof populateExistingData === 'function') {
      try {
        populateExistingData()
        console.log('✅ Re-ran populateExistingData')
      } catch (error) {
        console.error('❌ Error re-running populateExistingData:', error)
      }
    }

    // Show hidden talent categories if they should be visible
    if (typeof existingQuotationData !== 'undefined' && existingQuotationData.talent_categories) {
      existingQuotationData.talent_categories.forEach(category => {
        const categoryId = category.category_type
        const section = document.getElementById(`talent-category-${categoryId}`)
        const button = document.querySelector(`.talent-btn[data-category="${categoryId}"]`)

        if (section && section.classList.contains('hidden')) {
          section.classList.remove('hidden')
          console.log(`✅ Showed talent category ${categoryId}`)
        }

        if (button && !button.classList.contains('border-blue-500')) {
          button.classList.add('border-blue-500', 'bg-blue-50')
          console.log(`✅ Activated talent button ${categoryId}`)
        }
      })
    }

    console.log('🔧 Fix attempt completed')
  }
}

// Add global shortcuts for edit page debugging
if (EditPageDebug.isEditPage()) {
  window.editDebug = EditPageDebug
  window.diagnoseEdit = EditPageDebug.diagnose
  window.fixEdit = EditPageDebug.fix

  // Auto-run diagnosis on page load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('🔍 Edit Page Detected - Debug tools available:')
      console.log('  editDebug.diagnose() - Full diagnosis')
      console.log('  editDebug.fix() - Attempt fixes')
      console.log('  diagnoseEdit() - Quick diagnosis')
      console.log('  fixEdit() - Quick fix attempt')

      // Run diagnosis automatically
      EditPageDebug.diagnose()
    }, 3000)
  })
}