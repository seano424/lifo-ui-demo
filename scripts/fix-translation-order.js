#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

// Helper function to get all keys from a nested object in order
function getAllKeysInOrder(obj, prefix = '') {
  const keys = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively get keys from nested objects
      keys.push(...getAllKeysInOrder(value, fullKey))
    } else {
      // This is a leaf node (actual translation value)
      keys.push(fullKey)
    }
  }

  return keys
}

// Helper function to reorder object based on key order
function reorderObject(obj, keyOrder) {
  const result = {}

  // First, add keys in the specified order
  keyOrder.forEach(key => {
    const value = getNestedValue(obj, key)
    if (value !== undefined) {
      setNestedValue(result, key, value)
    }
  })

  // Then add any remaining keys that weren't in the order
  const existingKeys = getAllKeysInOrder(result)
  const remainingKeys = getAllKeysInOrder(obj).filter(key => !existingKeys.includes(key))

  remainingKeys.forEach(key => {
    const value = getNestedValue(obj, key)
    if (value !== undefined) {
      setNestedValue(result, key, value)
    }
  })

  return result
}

// Helper function to get nested value
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

// Helper function to set nested value
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((current, key) => {
    if (!current[key]) {
      current[key] = {}
    }
    return current[key]
  }, obj)
  target[lastKey] = value
}

// Helper function to get all translation files
function getTranslationFiles() {
  const messagesDir = path.join(process.cwd(), 'messages')
  const languages = ['en', 'fr', 'nl']
  const files = []

  for (const lang of languages) {
    const langDir = path.join(messagesDir, lang)
    if (fs.existsSync(langDir)) {
      const fileNames = fs.readdirSync(langDir).filter(file => file.endsWith('.json'))
      files.push(
        ...fileNames.map(file => ({
          language: lang,
          fileName: file,
          path: path.join(lang, file),
        })),
      )
    }
  }

  return files
}

// Main function to fix translation order
function fixTranslationOrder() {
  console.log('🔧 Fixing translation key order...\n')

  const translationFiles = getTranslationFiles()

  // Group files by base name
  const fileGroups = translationFiles.reduce((groups, file) => {
    if (!groups[file.fileName]) {
      groups[file.fileName] = []
    }
    groups[file.fileName].push(file)
    return groups
  }, {})

  let totalFixed = 0

  Object.entries(fileGroups).forEach(([fileName, files]) => {
    if (files.length < 2) {
      console.log(`⏭️  Skipping ${fileName} - only found in ${files.length} language(s)`)
      return
    }

    console.log(`📁 Processing ${fileName}...`)

    // Load all language versions
    const languageData = files.map(({ language, path: filePath }) => {
      const fullPath = path.join(process.cwd(), 'messages', filePath)
      const content = fs.readFileSync(fullPath, 'utf-8')
      return {
        language,
        filePath,
        data: JSON.parse(content),
      }
    })

    // Use English as reference (or first available language)
    const referenceLang = languageData.find(l => l.language === 'en') || languageData[0]
    const referenceKeys = getAllKeysInOrder(referenceLang.data)

    console.log(
      `   📋 Reference order from ${referenceLang.language} (${referenceKeys.length} keys)`,
    )

    // Fix other languages
    languageData.forEach(({ language, filePath, data }) => {
      if (language === referenceLang.language) return

      const currentKeys = getAllKeysInOrder(data)
      const isOrdered = currentKeys.every((key, index) => key === referenceKeys[index])

      if (!isOrdered) {
        console.log(`   🔄 Reordering ${language}...`)

        const reorderedData = reorderObject(data, referenceKeys)
        const fullPath = path.join(process.cwd(), 'messages', filePath)

        // Write with proper formatting
        fs.writeFileSync(fullPath, `${JSON.stringify(reorderedData, null, 2)}\n`)
        totalFixed++

        console.log(`   ✅ Fixed ${language}`)
      } else {
        console.log(`   ✅ ${language} already in correct order`)
      }
    })

    console.log('')
  })

  console.log(`🎉 Translation order fix complete! Fixed ${totalFixed} files.`)
}

// Run the fix
if (require.main === module) {
  fixTranslationOrder()
}

module.exports = { fixTranslationOrder }
