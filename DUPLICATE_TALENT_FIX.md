# Duplicate Talent Lines - Complete Fix

## Problem Summary
Quotations were showing duplicate talent lines with different genders (e.g., "Cold Sore Date Night - Man" AND "Cold Sore Date Night - Young Woman" in the same category). This caused confusion in PDFs and final quotations.

## Root Cause
The `process_talent_categories` method in `app/controllers/quotations_controller.rb` was creating duplicate `day_on_sets` records with the same description when form data contained duplicates. No duplicate prevention was in place.

## Solution Implemented

### 1. Code Fix (Already Applied)
Added duplicate prevention to `process_talent_categories`:
- Tracks descriptions using a `Set` per category
- Skips creating duplicates with the same description
- Logs warnings when duplicates are detected
- Logs success when lines are created

**Files Modified:**
- `app/controllers/quotations_controller.rb` (lines 562, 639-659, 696-718)

### 2. Cleanup Script
Created `fix_duplicate_talents.rb` to find and fix existing duplicates in all quotations.

## Deployment Steps

### Step 1: Deploy Code Fix
```bash
# Commit and push the changes
git add app/controllers/quotations_controller.rb
git commit -m "Fix: Prevent duplicate talent lines in quotations

- Add duplicate detection in process_talent_categories
- Track seen descriptions per category using Set
- Skip creating duplicate day_on_sets with same description
- Add logging for duplicate detection and line creation
- Prevents issue where same talent appears multiple times with different genders"

git push origin final
```

### Step 2: Clean Up Production Data on Render

Run this in Render shell:
```bash
rails runner fix_duplicate_talents.rb
```

Or run this directly in Rails console on Render:
```ruby
# Manual cleanup for specific quotation (e.g., quotation 49)
q = Quotation.find(49)
cat1 = q.talent_categories.find_by(category_type: 1)

puts '🔍 Current Category 1 lines:'
cat1.day_on_sets.each_with_index do |dos, idx|
  puts "  [#{idx}] #{dos.description}"
end

puts '\n🗑️  Removing duplicate lines...'
# Find duplicates
descriptions = cat1.day_on_sets.map(&:description)
duplicates = descriptions.select { |d| descriptions.count(d) > 1 }.uniq

duplicates.each do |dup_desc|
  matching = cat1.day_on_sets.where(description: dup_desc).order(:id)
  # Keep last (newest), delete others
  matching[0...-1].each do |line|
    puts "  Deleting: #{line.description} (ID: #{line.id})"
    line.destroy
  end
end

puts '\n✅ Remaining lines:'
cat1.reload.day_on_sets.each { |dos| puts "  #{dos.description}" }

# Regenerate final quotation
puts '\n🔄 Regenerating final quotation...'
q.final_quotations.destroy_all
FinalQuotationGenerator.new(q).generate
puts '✅ Done!'
```

## Testing

After deployment, test by:
1. Edit an existing quotation with multiple talent lines
2. Update the quotation
3. Check that no duplicate lines are created
4. Check logs for "Skipped duplicate talent line" warnings
5. Verify PDF shows correct unique talent lines

## Prevention

The code fix prevents future duplicates by:
1. Tracking all descriptions added to each category
2. Normalizing descriptions (trim whitespace)
3. Skipping creation if description already exists
4. Logging warnings for transparency

## Monitoring

Check Rails logs for:
- `✅ Created day_on_set for '...' in category X` - Normal operation
- `⚠️  Skipped duplicate talent line '...' in category X` - Duplicate detected and prevented
