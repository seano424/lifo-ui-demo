#!/usr/bin/env node

/**
 * Script to remove unused translation keys from all language files
 *
 * Usage: node scripts/remove-translation-keys.js <keys-file.json>
 *
 * The keys file should be a JSON file with this structure:
 * {
 *   "filename.json": ["key.to.remove", "another.key"]
 * }
 */

const fs = require('node:fs')
const path = require('node:path')

const LANGUAGES = ['en', 'fr', 'nl']
const MESSAGES_DIR = path.join(process.cwd(), 'messages')

/**
 * Parse a dot-notation key into an array of parts
 * e.g., "dashboard.welcome.title" -> ["dashboard", "welcome", "title"]
 */
function parseKey(key) {
  return key.split('.')
}

/**
 * Remove a key from a nested object using dot notation
 * Returns true if the key was found and removed, false otherwise
 */
function removeKey(obj, keyPath) {
  const parts = parseKey(keyPath)

  // Navigate to the parent of the key to remove
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      return false // Key doesn't exist
    }
    current = current[parts[i]]
  }

  // Remove the final key
  const lastPart = parts[parts.length - 1]
  if (current[lastPart] !== undefined) {
    delete current[lastPart]
    return true
  }

  return false
}

/**
 * Clean up empty parent objects after key removal
 */
function cleanupEmptyObjects(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanupEmptyObjects(obj[key])

      // Remove if empty
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key]
      }
    }
  }
}

/**
 * Remove keys from a translation file
 */
function removeKeysFromFile(language, filename, keysToRemove) {
  const filePath = path.join(MESSAGES_DIR, language, filename)

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${filePath}`)
    return { removed: 0, notFound: keysToRemove.length }
  }

  // Read and parse the file
  const content = fs.readFileSync(filePath, 'utf8')
  const translations = JSON.parse(content)

  // Track results
  let removed = 0
  let notFound = 0

  // Remove each key
  for (const key of keysToRemove) {
    if (removeKey(translations, key)) {
      removed++
    } else {
      notFound++
    }
  }

  // Clean up empty objects
  cleanupEmptyObjects(translations)

  // Write back to file with pretty formatting
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf8')

  return { removed, notFound }
}

/**
 * Main function
 */
function main() {
  console.log('\n🧹 Translation Key Removal Tool\n')
  console.log('='.repeat(80))

  // Check for keys file argument
  if (process.argv.length < 3) {
    console.error('❌ Error: Please provide a keys file')
    console.error('Usage: node scripts/remove-translation-keys.js <keys-file.json>')
    process.exit(1)
  }

  const keysFile = process.argv[2]

  if (!fs.existsSync(keysFile)) {
    console.error(`❌ Error: Keys file not found: ${keysFile}`)
    process.exit(1)
  }

  // Load keys to remove
  console.log(`📖 Loading keys from: ${keysFile}\n`)
  const keysToRemove = JSON.parse(fs.readFileSync(keysFile, 'utf8'))

  // Count total keys
  const totalKeys = Object.values(keysToRemove).reduce((sum, keys) => sum + keys.length, 0)
  const totalFiles = Object.keys(keysToRemove).length

  console.log(`📊 Summary:`)
  console.log(`   Files to process: ${totalFiles}`)
  console.log(`   Keys to remove: ${totalKeys}`)
  console.log(`   Languages: ${LANGUAGES.join(', ')}\n`)

  // Process each file
  let totalRemoved = 0
  let totalNotFound = 0

  for (const [filename, keys] of Object.entries(keysToRemove)) {
    console.log(`\n📁 Processing: ${filename}`)
    console.log(`   Keys to remove: ${keys.length}`)

    for (const lang of LANGUAGES) {
      const result = removeKeysFromFile(lang, filename, keys)
      totalRemoved += result.removed
      totalNotFound += result.notFound

      console.log(
        `   ${lang}: ✅ ${result.removed} removed${result.notFound > 0 ? `, ⚠️  ${result.notFound} not found` : ''}`,
      )
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✨ Cleanup Complete!\n')
  console.log(`📊 Results:`)
  console.log(`   Total keys removed: ${totalRemoved}`)
  if (totalNotFound > 0) {
    console.log(`   Keys not found: ${totalNotFound}`)
  }
  console.log(`\n💡 Next steps:`)
  console.log(`   1. Run: npm run test:translations:consistency`)
  console.log(`   2. Review changes: git diff messages/`)
  console.log(`   3. Test the application`)
  console.log(`   4. Commit if everything looks good\n`)
}

main()
