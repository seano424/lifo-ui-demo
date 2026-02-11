#!/usr/bin/env node

/**
 * Fix translation order to match English reference
 * Reorders French and Dutch translation files to match English key order
 */

const fs = require('node:fs')
const path = require('node:path')

const MESSAGES_DIR = path.join(process.cwd(), 'messages')
const REFERENCE_LANG = 'en'
const TARGET_LANGS = ['fr', 'nl']

/**
 * Recursively reorder an object's keys to match the reference order
 */
function reorderKeys(obj, referenceObj) {
  const reordered = {}

  // First, add all keys in reference order
  for (const key of Object.keys(referenceObj)) {
    if (Object.hasOwn(obj, key)) {
      if (
        typeof referenceObj[key] === 'object' &&
        referenceObj[key] !== null &&
        !Array.isArray(referenceObj[key]) &&
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        // Recursively reorder nested objects
        reordered[key] = reorderKeys(obj[key], referenceObj[key])
      } else {
        // Copy the value as-is
        reordered[key] = obj[key]
      }
    }
  }

  // Then, add any extra keys that exist in obj but not in referenceObj
  // (These should ideally not exist, but we'll preserve them at the end)
  for (const key of Object.keys(obj)) {
    if (!Object.hasOwn(referenceObj, key)) {
      reordered[key] = obj[key]
      console.log(`   ⚠️  Extra key found (not in ${REFERENCE_LANG}): ${key}`)
    }
  }

  return reordered
}

/**
 * Process a single translation file
 */
function processFile(filename) {
  console.log(`\n📁 Processing: ${filename}`)

  // Read reference file (English)
  const referencePath = path.join(MESSAGES_DIR, REFERENCE_LANG, filename)
  if (!fs.existsSync(referencePath)) {
    console.log(`   ⚠️  Skipping - ${REFERENCE_LANG} file not found`)
    return
  }

  const referenceContent = fs.readFileSync(referencePath, 'utf8')
  const referenceObj = JSON.parse(referenceContent)

  // Process each target language
  for (const lang of TARGET_LANGS) {
    const targetPath = path.join(MESSAGES_DIR, lang, filename)

    if (!fs.existsSync(targetPath)) {
      console.log(`   ⚠️  ${lang}: File not found`)
      continue
    }

    // Read target file
    const targetContent = fs.readFileSync(targetPath, 'utf8')
    const targetObj = JSON.parse(targetContent)

    // Reorder keys to match reference
    const reordered = reorderKeys(targetObj, referenceObj)

    // Write back to file
    fs.writeFileSync(targetPath, `${JSON.stringify(reordered, null, 2)}\n`, 'utf8')

    console.log(`   ✅ ${lang}: Reordered to match ${REFERENCE_LANG}`)
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n🔄 Translation Order Fixer\n')
  console.log('='.repeat(80))
  console.log(`Reference language: ${REFERENCE_LANG}`)
  console.log(`Target languages: ${TARGET_LANGS.join(', ')}\n`)

  // Get all English translation files
  const enDir = path.join(MESSAGES_DIR, REFERENCE_LANG)
  if (!fs.existsSync(enDir)) {
    console.error(`❌ Error: ${REFERENCE_LANG} directory not found`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(enDir)
    .filter(file => file.endsWith('.json'))
    .sort()

  console.log(`Found ${files.length} translation files\n`)

  // Process each file
  files.forEach(processFile)

  console.log(`\n${'='.repeat(80)}`)
  console.log('✨ Translation order fixed!\n')
  console.log('💡 Next step: npm run test:translations:consistency\n')
}

main()
