import fs from 'node:fs'
import path from 'node:path'
import { SUPPORTED_LOCALES } from '@/types/i18n'

// Type for translation objects
interface TranslationObject {
  [key: string]: string | TranslationObject
}

// Helper function to get all keys from a nested object in order
function getAllKeysInOrder(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = []

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

// Helper function to get all translation files
function getTranslationFiles() {
  const messagesDir = path.join(process.cwd(), 'messages')
  const languages = [...SUPPORTED_LOCALES]
  const files: string[] = []

  for (const lang of languages) {
    const langDir = path.join(messagesDir, lang)
    if (fs.existsSync(langDir)) {
      const fileNames = fs.readdirSync(langDir).filter(file => file.endsWith('.json'))
      files.push(...fileNames.map(file => path.join(lang, file)))
    }
  }

  return files
}

// Helper function to load a translation file
function loadTranslationFile(filePath: string) {
  const fullPath = path.join(process.cwd(), 'messages', filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  return JSON.parse(content)
}

describe('Translation Consistency', () => {
  const translationFiles = getTranslationFiles()

  // Group files by base name (e.g., 'dashboard.json' from 'en/dashboard.json')
  const fileGroups = translationFiles.reduce(
    (groups, filePath) => {
      const fileName = path.basename(filePath)
      if (!groups[fileName]) {
        groups[fileName] = []
      }
      groups[fileName].push(filePath)
      return groups
    },
    {} as Record<string, string[]>,
  )

  // Test each group of files
  Object.entries(fileGroups).forEach(([fileName, filePaths]) => {
    describe(`File: ${fileName}`, () => {
      // Only test if we have multiple language versions
      if (filePaths.length < 2) {
        it('should have multiple language versions', () => {
          console.warn(`Skipping ${fileName} - only found in ${filePaths.length} language(s)`)
        })
        return
      }

      // Load all language versions
      const languageData = filePaths.map(filePath => ({
        language: filePath.split('/')[0],
        filePath,
        data: loadTranslationFile(filePath),
      }))

      // Test key order consistency
      it('should have consistent key order across all languages', () => {
        const keyOrders = languageData.map(({ language, data }) => ({
          language,
          keys: getAllKeysInOrder(data),
        }))

        // Use English as reference, fallback to first language
        const referenceLang = keyOrders.find(l => l.language === 'en') || keyOrders[0]
        const referenceKeys = referenceLang.keys
        const referenceLanguage = referenceLang.language

        const issues: string[] = []

        keyOrders.forEach(({ language, keys }) => {
          if (language === referenceLanguage) return

          // Check if all keys match
          const missingKeys = referenceKeys.filter(key => !keys.includes(key))
          const extraKeys = keys.filter(key => !referenceKeys.includes(key))
          const orderMismatches: string[] = []

          // Check order for common keys
          const commonKeys = referenceKeys.filter(key => keys.includes(key))
          commonKeys.forEach((key, index) => {
            const otherIndex = keys.indexOf(key)
            if (otherIndex !== index) {
              orderMismatches.push(`${key} (pos ${index} → ${otherIndex})`)
            }
          })

          // Build issue summary
          if (missingKeys.length > 0) {
            issues.push(`❌ ${language}: Missing ${missingKeys.length} keys`)
          }
          if (extraKeys.length > 0) {
            issues.push(`❌ ${language}: Extra ${extraKeys.length} keys`)
          }
          if (orderMismatches.length > 0) {
            issues.push(`❌ ${language}: ${orderMismatches.length} order mismatches`)
          }
        })

        if (issues.length > 0) {
          console.log(`\n📋 Translation order issues in ${fileName}:`)
          issues.forEach(issue => console.log(`   ${issue}`))
          console.log(`\n💡 Run: npm run fix-translation-order to fix automatically\n`)

          // Only fail the test if there are critical issues (missing/extra keys)
          const criticalIssues = issues.filter(
            issue => issue.includes('Missing') || issue.includes('Extra'),
          )

          if (criticalIssues.length > 0) {
            throw new Error(
              `Critical translation issues in ${fileName}: ${criticalIssues.join(', ')}`,
            )
          }
        }
      })

      // Test that all languages have the same structure
      it('should have identical structure across all languages', () => {
        const structures = languageData.map(({ language, data }) => ({
          language,
          structure: getObjectStructure(data),
        }))

        const referenceStructure = structures[0].structure
        const referenceLanguage = structures[0].language

        structures.forEach(({ language, structure }) => {
          if (language === referenceLanguage) return

          const structureDiff = compareStructures(referenceStructure, structure)
          if (structureDiff.length > 0) {
            throw new Error(
              `Structure mismatch in ${fileName} between ${referenceLanguage} and ${language}:\n${structureDiff.join('\n')}`,
            )
          }
        })
      })
    })
  })
})

// Helper function to get object structure (keys only, no values)
function getObjectStructure(obj: TranslationObject, prefix = ''): string[] {
  const structure: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      structure.push(...getObjectStructure(value, fullKey))
    } else {
      structure.push(fullKey)
    }
  }

  return structure.sort()
}

// Helper function to compare two structures
function compareStructures(structure1: string[], structure2: string[]): string[] {
  const diff: string[] = []

  const set1 = new Set(structure1)
  const set2 = new Set(structure2)

  // Find missing keys
  structure1.forEach(key => {
    if (!set2.has(key)) {
      diff.push(`Missing key: ${key}`)
    }
  })

  // Find extra keys
  structure2.forEach(key => {
    if (!set1.has(key)) {
      diff.push(`Extra key: ${key}`)
    }
  })

  return diff
}
