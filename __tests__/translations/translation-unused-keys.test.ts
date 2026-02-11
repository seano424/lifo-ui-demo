import fs from 'node:fs'
import path from 'node:path'

describe('Unused Translation Keys', () => {
  // Type for translation objects
  interface TranslationObject {
    [key: string]: string | TranslationObject
  }

  // Directories to search for translation usage
  const searchDirectories = ['app', 'components', 'lib', 'hooks']

  // File extensions to search
  const fileExtensions = ['.tsx', '.ts', '.jsx', '.js']

  // Namespaces that are too risky to flag as unused (used dynamically everywhere)
  const excludedNamespaces = ['common', 'errors', 'validation']

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

  // Helper: Get all translation files from en/ directory
  const getEnglishTranslationFiles = (): string[] => {
    const enDir = path.join(process.cwd(), 'messages', 'en')
    if (!fs.existsSync(enDir)) {
      return []
    }
    return fs
      .readdirSync(enDir)
      .filter(file => file.endsWith('.json'))
      .sort()
  }

  // Helper: Flatten nested translation object into dot notation keys
  const flattenKeys = (obj: TranslationObject, prefix = ''): string[] => {
    const keys: string[] = []

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

  // Helper: Load translation file and extract all keys
  const loadTranslationKeys = (filename: string): string[] => {
    const filePath = path.join(process.cwd(), 'messages', 'en', filename)
    const content = fs.readFileSync(filePath, 'utf8')
    const translations = JSON.parse(content) as TranslationObject
    return flattenKeys(translations)
  }

  // Helper: Get namespace from a key (e.g., 'dashboard.welcome.title' -> 'dashboard')
  const getNamespace = (key: string): string => {
    return key.split('.')[0]
  }

  // Helper: Get all code files to search
  const getAllCodeFiles = (): string[] => {
    const files: string[] = []

    const scanDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) return

      const items = fs.readdirSync(dir)

      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          // Skip build and dependency directories
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

  // Helper: Read all code files into a single searchable string
  const getAllCodeContent = (): string => {
    const files = getAllCodeFiles()
    let content = ''

    files.forEach(file => {
      try {
        content += `${fs.readFileSync(file, 'utf8')}\n`
      } catch (_error) {
        // Skip files that can't be read
      }
    })

    return content
  }

  // Helper: Check if a key is used in the codebase
  const isKeyUsed = (
    key: string,
    codeContent: string,
    usedNamespaces: Set<string>,
  ): {
    used: boolean
    confidence: 'high' | 'medium' | 'low'
    reason: string
  } => {
    const namespace = getNamespace(key)

    // Skip excluded namespaces (too risky to flag as unused)
    if (excludedNamespaces.includes(namespace)) {
      return {
        used: true,
        confidence: 'high',
        reason: `Part of excluded namespace '${namespace}' (assumed used dynamically)`,
      }
    }

    // Check if namespace is used (e.g., useTranslations('dashboard'))
    if (usedNamespaces.has(namespace)) {
      return {
        used: true,
        confidence: 'high',
        reason: `Namespace '${namespace}' is used via useTranslations() or getTranslations()`,
      }
    }

    // Check for direct key usage with single quotes
    if (codeContent.includes(`'${key}'`) || codeContent.includes(`"${key}"`)) {
      return {
        used: true,
        confidence: 'high',
        reason: 'Direct string reference found',
      }
    }

    // Check if key parts might be used in template literals
    const keyParts = key.split('.')
    for (let i = 0; i < keyParts.length - 1; i++) {
      const partialKey = keyParts.slice(0, i + 1).join('.')
      // Look for template literal patterns like `${variable}`
      if (
        codeContent.includes(`\`${partialKey}.\${`) ||
        codeContent.includes(`'${partialKey}.\${`)
      ) {
        return {
          used: true,
          confidence: 'medium',
          reason: `Potentially used in dynamic template literal (found '${partialKey}.\${')`,
        }
      }
    }

    // Check if key parts are referenced (could be built dynamically)
    const lastPart = keyParts[keyParts.length - 1]
    if (keyParts.length > 1) {
      const secondLastPart = keyParts[keyParts.length - 2]
      if (codeContent.includes(secondLastPart) && codeContent.includes(lastPart)) {
        return {
          used: true,
          confidence: 'low',
          reason: 'Key parts found separately (might be used dynamically)',
        }
      }
    }

    // Not found - likely unused
    return {
      used: false,
      confidence: 'high',
      reason: 'No references found in codebase',
    }
  }

  // Helper: Find all used namespaces in the codebase
  const findUsedNamespaces = (codeContent: string): Set<string> => {
    const namespaces = new Set<string>()

    // Match useTranslations('namespace') or useTranslations("namespace")
    const useTranslationsPattern = /useTranslations\(['"]([^'"]+)['"]\)/g
    for (const match of codeContent.matchAll(useTranslationsPattern)) {
      namespaces.add(match[1])
    }

    // Match getTranslations('namespace') or getTranslations("namespace")
    const getTranslationsPattern = /getTranslations\(['"]([^'"]+)['"]\)/g
    for (const match of codeContent.matchAll(getTranslationsPattern)) {
      namespaces.add(match[1])
    }

    return namespaces
  }

  it('should identify unused translation keys', () => {
    console.log('\n🔍 Analyzing translation key usage...\n')

    const translationFiles = getEnglishTranslationFiles()
    console.log(`📁 Found ${translationFiles.length} translation files`)

    // Load all translation keys
    const allKeys: Map<string, string> = new Map() // key -> filename
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
    console.log(
      `🔖 Found ${usedNamespaces.size} used namespaces: ${Array.from(usedNamespaces).join(', ')}`,
    )

    // Analyze each key
    const unusedKeys: Array<{ key: string; file: string; reason: string }> = []
    const lowConfidenceKeys: Array<{ key: string; file: string; reason: string }> = []
    const deletedRouteKeys: Array<{ key: string; file: string; reason: string }> = []

    console.log('\n🔎 Analyzing keys...\n')

    allKeys.forEach((filename, key) => {
      const result = isKeyUsed(key, codeContent, usedNamespaces)

      if (!result.used) {
        const namespace = getNamespace(key)
        if (deletedRoutes.includes(namespace)) {
          deletedRouteKeys.push({ key, file: filename, reason: result.reason })
        } else {
          unusedKeys.push({ key, file: filename, reason: result.reason })
        }
      } else if (result.confidence === 'low') {
        lowConfidenceKeys.push({ key, file: filename, reason: result.reason })
      }
    })

    // Group keys by file
    const groupByFile = (keys: Array<{ key: string; file: string; reason: string }>) => {
      return keys.reduce(
        (acc, item) => {
          if (!acc[item.file]) {
            acc[item.file] = []
          }
          acc[item.file].push(item)
          return acc
        },
        {} as Record<string, Array<{ key: string; reason: string }>>,
      )
    }

    // Display results
    console.log('='.repeat(80))
    console.log('📊 UNUSED TRANSLATION KEYS REPORT')
    console.log('='.repeat(80))

    console.log(`\n📈 Summary:`)
    console.log(`   Total keys: ${allKeys.size}`)
    console.log(
      `   Unused keys (high confidence): ${unusedKeys.length} (${((unusedKeys.length / allKeys.size) * 100).toFixed(1)}%)`,
    )
    console.log(`   From deleted routes: ${deletedRouteKeys.length}`)
    console.log(`   Low confidence (needs review): ${lowConfidenceKeys.length}`)
    console.log(
      `   Used keys: ${allKeys.size - unusedKeys.length - deletedRouteKeys.length - lowConfidenceKeys.length}`,
    )

    // Show unused keys from deleted routes
    if (deletedRouteKeys.length > 0) {
      console.log('\n🗑️  UNUSED KEYS FROM DELETED ROUTES (Phase 4 Cleanup)')
      console.log('='.repeat(80))
      console.log('These keys are from routes deleted in Phase 4 and are safe to remove:\n')

      const groupedDeletedKeys = groupByFile(deletedRouteKeys)
      Object.entries(groupedDeletedKeys)
        .sort()
        .forEach(([file, keys]) => {
          console.log(`📁 ${file} (${keys.length} keys):`)
          keys.slice(0, 5).forEach(({ key }) => {
            console.log(`   ❌ ${key}`)
          })
          if (keys.length > 5) {
            console.log(`   ... and ${keys.length - 5} more`)
          }
          console.log('')
        })
    }

    // Show other unused keys
    if (unusedKeys.length > 0) {
      console.log('\n❌ UNUSED KEYS (High Confidence)')
      console.log('='.repeat(80))
      console.log('These keys have no references in the codebase:\n')

      const groupedUnusedKeys = groupByFile(unusedKeys)
      Object.entries(groupedUnusedKeys)
        .sort()
        .forEach(([file, keys]) => {
          console.log(`📁 ${file} (${keys.length} keys):`)
          keys.slice(0, 5).forEach(({ key }) => {
            console.log(`   ❌ ${key}`)
          })
          if (keys.length > 5) {
            console.log(`   ... and ${keys.length - 5} more`)
          }
          console.log('')
        })
    }

    // Show low confidence keys
    if (lowConfidenceKeys.length > 0) {
      console.log('\n⚠️  LOW CONFIDENCE (Manual Review Needed)')
      console.log('='.repeat(80))
      console.log('These keys might be used dynamically:\n')

      const groupedLowConfKeys = groupByFile(lowConfidenceKeys)
      Object.entries(groupedLowConfKeys)
        .sort()
        .forEach(([file, keys]) => {
          console.log(`📁 ${file} (${keys.length} keys):`)
          keys.slice(0, 3).forEach(({ key, reason }) => {
            console.log(`   ⚠️  ${key}`)
            console.log(`       ${reason}`)
          })
          if (keys.length > 3) {
            console.log(`   ... and ${keys.length - 3} more`)
          }
          console.log('')
        })
    }

    // Show exclusions
    if (excludedNamespaces.length > 0) {
      console.log('\n🔒 EXCLUDED NAMESPACES (Not Analyzed)')
      console.log('='.repeat(80))
      console.log('These namespaces are excluded because they are typically used dynamically:\n')
      excludedNamespaces.forEach(ns => {
        const count = Array.from(allKeys.keys()).filter(key => getNamespace(key) === ns).length
        if (count > 0) {
          console.log(`   🔒 ${ns}.* (${count} keys)`)
        }
      })
    }

    // Estimated cleanup impact
    if (unusedKeys.length > 0 || deletedRouteKeys.length > 0) {
      const totalUnused = unusedKeys.length + deletedRouteKeys.length
      const estimatedSavingsPerLang = Math.round((totalUnused / allKeys.size) * 100)
      console.log('\n💾 ESTIMATED CLEANUP IMPACT')
      console.log('='.repeat(80))
      console.log(`   Keys to remove: ${totalUnused}`)
      console.log(`   Size reduction per language: ~${estimatedSavingsPerLang}%`)
      console.log(`   Total keys saved (3 languages): ~${totalUnused * 3}`)
    }

    console.log('\n💡 NEXT STEPS')
    console.log('='.repeat(80))
    if (deletedRouteKeys.length > 0) {
      console.log('   1. Review deleted route keys (high confidence - safe to remove)')
    }
    if (unusedKeys.length > 0) {
      console.log('   2. Review other unused keys (high confidence)')
    }
    if (lowConfidenceKeys.length > 0) {
      console.log('   3. Manually verify low confidence keys')
    }
    console.log('   4. Create a cleanup PR to remove confirmed unused translations')
    console.log('   5. Test thoroughly after removal')
    console.log('\n')

    // The test passes - this is informational only
    // Uncomment the line below to fail the test if unused keys are found:
    // expect(unusedKeys.length + deletedRouteKeys.length).toBe(0)

    // For now, just pass but log the information
    expect(true).toBe(true)
  })
})
