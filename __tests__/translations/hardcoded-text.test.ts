import fs from 'node:fs'
import path from 'node:path'

describe('Hardcoded Text Detection', () => {
  // Directories to scan for hardcoded text
  const scanDirectories = ['app', 'components', 'lib']

  // File extensions to check
  const fileExtensions = ['.tsx', '.ts', '.jsx', '.js']

  // Files to exclude from scanning (placeholder/template pages, test components, tutorials, email templates)
  const excludedFiles = [
    'app/(dashboard)/dashboard/billing/page.tsx',
    'app/(dashboard)/dashboard/milestones/page.tsx',
    'app/(dashboard)/dashboard/performance/page.tsx',
    'app/(dashboard)/dashboard/playground/page.tsx',
    'app/(dashboard)/dashboard/upgrade/page.tsx',
    'app/offline/page.tsx',
    'components/toast-test.tsx',
    'components/tutorial/fetch-data-steps.tsx',
    'components/scanning/shared/ocr-frame-quality-indicator.tsx', // Debug/dev component
    'lib/email/resend.ts', // Email templates need separate i18n handling
    // Base UI components with sr-only accessibility labels
    'components/ui/bottom-sheet.tsx',
    'components/ui/dialog.tsx',
    'components/ui/sheet.tsx',
    'components/ui/sidebar.tsx',
  ]

  // Simple patterns to find hardcoded text in basic HTML elements
  const hardcodedPatterns = [
    // Text content in p, h1-h6, span, div, button, label elements
    /<(p|h[1-6]|span|div|button|label)\b[^>]*>[^<]*[a-zA-Z]{3,}[^<]*<\/(p|h[1-6]|span|div|button|label)>/g,
    // Self-closing elements with text content
    /<(p|h[1-6]|span|div|button|label)\b[^>]*>[^<]*[a-zA-Z]{3,}[^<]*\/>/g,
  ]

  // Minimal exclusion patterns - only exclude obvious non-UI text
  const excludePatterns = [
    // Comments
    /\/\*[\s\S]*?\*\//,
    /^\s*\/\//,
    // Translation function calls
    /t\(['"`][^'"`]*['"`]\)/,
    // Next-intl usage
    /useTranslations\(/,
    /getTranslations\(/,
    // Empty or whitespace-only content
    /^\s*$/,
    // Single characters or very short text
    /^[a-zA-Z]{1,2}$/,
    // Numbers only
    /^\d+$/,
  ]

  // Get all files to scan
  const getAllFiles = (dir: string): string[] => {
    const files: string[] = []

    if (!fs.existsSync(dir)) {
      return files
    }

    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip node_modules, .next, and other build directories
        if (!['node_modules', '.next', 'dist', 'build', 'coverage'].includes(item)) {
          files.push(...getAllFiles(fullPath))
        }
      } else if (fileExtensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }

    return files
  }

  // Check if a string looks like hardcoded UI text
  const isLikelyHardcodedText = (text: string, line: string): boolean => {
    // Extract text content from HTML elements
    const match = text.match(/<[^>]+>([^<]+)<\/[^>]+>/)
    const cleanText = match ? match[1].trim() : text.trim()

    // Skip if too short
    if (cleanText.length < 3) return false

    // Skip if it's just whitespace
    if (!cleanText) return false

    // Skip if it contains JavaScript expressions (between {})
    if (cleanText.includes('{') && cleanText.includes('}')) {
      return false
    }

    // Skip if it contains translation function calls
    if (excludePatterns.some(pattern => pattern.test(line))) {
      return false
    }

    // Skip if it's just numbers
    if (/^\d+$/.test(cleanText)) return false

    // Skip if it's a single character
    if (cleanText.length === 1) return false

    // Skip if it's just whitespace
    if (/^\s+$/.test(cleanText)) return false

    return true
  }

  // Scan a file for hardcoded text
  const scanFile = (filePath: string): Array<{ line: number; text: string; context: string }> => {
    const issues: Array<{ line: number; text: string; context: string }> = []

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      lines.forEach((line, index) => {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
          return
        }

        // Check each pattern
        hardcodedPatterns.forEach(pattern => {
          const matches = line.match(pattern)
          if (matches) {
            matches.forEach(match => {
              if (isLikelyHardcodedText(match, line)) {
                issues.push({
                  line: index + 1,
                  text: match,
                  context: line.trim(),
                })
              }
            })
          }
        })
      })
    } catch (error) {
      console.warn(`Error reading file ${filePath}:`, error)
    }

    return issues
  }

  it('should not have hardcoded text that should be translated', () => {
    const allIssues: Array<{ file: string; line: number; text: string; context: string }> = []

    // Get all files to scan
    const allFiles: string[] = []
    scanDirectories.forEach(dir => {
      allFiles.push(...getAllFiles(dir))
    })

    console.log(`🔍 Scanning ${allFiles.length} files for hardcoded text...`)

    // Scan each file
    allFiles.forEach(filePath => {
      const relativePath = filePath.replace(`${process.cwd()}/`, '')

      // Skip excluded files
      if (excludedFiles.some(excluded => relativePath === excluded)) {
        return
      }

      const issues = scanFile(filePath)
      issues.forEach(issue => {
        allIssues.push({
          file: relativePath,
          line: issue.line,
          text: issue.text,
          context: issue.context,
        })
      })
    })

    // Group issues by file for better presentation
    const issuesByFile = allIssues.reduce(
      (acc, issue) => {
        if (!acc[issue.file]) {
          acc[issue.file] = []
        }
        acc[issue.file].push(issue)
        return acc
      },
      {} as Record<string, Array<{ line: number; text: string; context: string }>>,
    )

    // Display issues in an organized way
    if (Object.keys(issuesByFile).length > 0) {
      console.log('\n🚨 Hardcoded Text Found:')
      console.log('========================')

      Object.entries(issuesByFile).forEach(([file, issues]) => {
        console.log(`\n📁 ${file} (${issues.length} issues):`)
        issues.forEach(issue => {
          console.log(`  Line ${issue.line}: ${issue.text}`)
          console.log(`    Context: ${issue.context}`)
        })
      })

      console.log('\n💡 Consider using next-intl for these texts:')
      console.log('   import { useTranslations } from "next-intl"')
      console.log('   const t = useTranslations("yourNamespace")')
      console.log('   // Then use: t("yourKey")')
    } else {
      console.log(
        '\n✅ No hardcoded text found! All text appears to be properly internationalized.',
      )
    }

    // Fail the test if there are hardcoded texts
    expect(allIssues).toHaveLength(0)
  })
})
