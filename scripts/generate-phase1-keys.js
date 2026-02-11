#!/usr/bin/env node

/**
 * Generate Phase 1 cleanup keys (deleted routes only)
 * This script extracts keys from deleted routes to create a safe removal list
 */

const fs = require('node:fs')
const path = require('node:path')

// Known deleted routes from Phase 4 cleanup
const deletedRoutes = [
  'todos',
  'support',
  'billing',
  'deliveries',
  'milestones',
  'notifications',
  'performance',
  'playground',
  'upgrade',
  'users',
  'account',
  'scan-out',
]

// Directories to search for translation usage
const searchDirectories = ['app', 'components', 'lib', 'hooks']
const fileExtensions = ['.tsx', '.ts', '.jsx', '.js']

/**
 * Flatten nested translation object into dot notation keys
 */
function flattenKeys(obj, prefix = '') {
  const keys = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Get namespace from a key
 */
function getNamespace(key) {
  return key.split('.')[0]
}

/**
 * Load translation keys from a file
 */
function loadTranslationKeys(filename) {
  const filePath = path.join(process.cwd(), 'messages', 'en', filename)
  const content = fs.readFileSync(filePath, 'utf8')
  const translations = JSON.parse(content)
  return flattenKeys(translations)
}

/**
 * Get all English translation files
 */
function getEnglishTranslationFiles() {
  const enDir = path.join(process.cwd(), 'messages', 'en')
  if (!fs.existsSync(enDir)) {
    return []
  }
  return fs
    .readdirSync(enDir)
    .filter(file => file.endsWith('.json'))
    .sort()
}

/**
 * Get all code files to search
 */
function getAllCodeFiles() {
  const files = []

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return

    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        if (!['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__'].includes(item)) {
          scanDirectory(fullPath)
        }
      } else if (fileExtensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }

  searchDirectories.forEach(dir => scanDirectory(dir))
  return files
}

/**
 * Read all code content
 */
function getAllCodeContent() {
  const files = getAllCodeFiles()
  let content = ''

  files.forEach(file => {
    try {
      content += fs.readFileSync(file, 'utf8') + '\n'
    } catch (error) {
      // Skip files that can't be read
    }
  })

  return content
}

/**
 * Find all used namespaces
 */
function findUsedNamespaces(codeContent) {
  const namespaces = new Set()

  // Match useTranslations('namespace')
  const useTranslationsPattern = /useTranslations\(['"]([^'"]+)['"]\)/g
  let match
  while ((match = useTranslationsPattern.exec(codeContent)) !== null) {
    namespaces.add(match[1])
  }

  // Match getTranslations('namespace')
  const getTranslationsPattern = /getTranslations\(['"]([^'"]+)['"]\)/g
  while ((match = getTranslationsPattern.exec(codeContent)) !== null) {
    namespaces.add(match[1])
  }

  return namespaces
}

/**
 * Check if a key is used
 */
function isKeyUsed(key, codeContent, usedNamespaces) {
  const namespace = getNamespace(key)

  // Check if namespace is used
  if (usedNamespaces.has(namespace)) {
    return true
  }

  // Check for direct key usage
  if (codeContent.includes(`'${key}'`) || codeContent.includes(`"${key}"`)) {
    return true
  }

  return false
}

/**
 * Main function
 */
function main() {
  console.log('\n📋 Generating Phase 1 Cleanup Keys (Deleted Routes)\n')
  console.log('='.repeat(80))

  const translationFiles = getEnglishTranslationFiles()
  console.log(`📁 Found ${translationFiles.length} translation files`)

  // Load all translation keys
  const allKeys = new Map() // key -> filename
  translationFiles.forEach(filename => {
    const keys = loadTranslationKeys(filename)
    keys.forEach(key => {
      allKeys.set(key, filename)
    })
  })
  console.log(`📝 Total translation keys: ${allKeys.size}`)

  // Load all code content
  console.log('📖 Reading codebase...')
  const codeContent = getAllCodeContent()
  const usedNamespaces = findUsedNamespaces(codeContent)

  // Find keys from deleted routes
  const deletedRouteKeys = new Map() // filename -> [keys]

  console.log('\n🔎 Analyzing keys from deleted routes...\n')

  allKeys.forEach((filename, key) => {
    const namespace = getNamespace(key)

    // Check if this key is from a deleted route
    if (deletedRoutes.includes(namespace)) {
      // Double-check it's not used (safety check)
      if (!isKeyUsed(key, codeContent, usedNamespaces)) {
        if (!deletedRouteKeys.has(filename)) {
          deletedRouteKeys.set(filename, [])
        }
        deletedRouteKeys.get(filename).push(key)
      }
    }
  })

  // Convert to object for JSON output
  const keysToRemove = {}
  deletedRouteKeys.forEach((keys, filename) => {
    keysToRemove[filename] = keys.sort()
  })

  // Display results
  console.log('📊 Phase 1 Keys Found:\n')
  let totalKeys = 0

  Object.entries(keysToRemove)
    .sort()
    .forEach(([file, keys]) => {
      console.log(`📁 ${file}: ${keys.length} keys`)
      totalKeys += keys.length
      keys.slice(0, 3).forEach(key => {
        console.log(`   - ${key}`)
      })
      if (keys.length > 3) {
        console.log(`   ... and ${keys.length - 3} more`)
      }
      console.log('')
    })

  console.log('='.repeat(80))
  console.log(`\n✅ Found ${totalKeys} keys from deleted routes to remove`)

  // Write to file
  const outputFile = path.join(process.cwd(), 'scripts', 'phase1-keys.json')
  fs.writeFileSync(outputFile, JSON.stringify(keysToRemove, null, 2) + '\n')

  console.log(`\n💾 Saved to: ${outputFile}`)
  console.log(`\n💡 Next step:`)
  console.log(`   node scripts/remove-translation-keys.js scripts/phase1-keys.json\n`)
}

main()
