# Translation Tests

This folder contains tests specifically for validating the internationalization (i18n) system.

## Test Files

### `translation-missing-keys.test.ts`

Tests for missing translation keys across all supported languages.

**What it checks:**

- ✅ All languages have the same translation keys
- ❌ Missing keys in any language
- ⚠️ Extra keys in any language (warnings)

**Usage:**

```bash
# Run translation tests
npm run test:translations

# Run all tests including translations
npm test
```

## Supported Languages

- 🇬🇧 English (en) - Base language
- 🇫🇷 French (fr) - Complete translations
- 🇳🇱 Dutch (nl) - Complete translations

## Translation Files Covered

- `auth.json` - Authentication forms and errors
- `common.json` - Shared UI elements and actions
- `dashboard.json` - Dashboard, KPIs, and analytics
- `inventory.json` - Product and inventory management
- `marketing.json` - Landing pages and public content
- `onboarding.json` - User onboarding flow
- `settings.json` - User settings and preferences
- `todos.json` - Todo management
- `ocr.json` - OCR scanning features
- `donation.json` - Donation workflows
- `terms.json` - Terms of service
- `privacy.json` - Privacy policy

## Adding New Translation Tests

When adding new translation tests:

1. Place them in this `__tests__/translations/` folder
2. Follow the naming convention: `*.test.ts`
3. Update this README to document the new test
4. Consider adding a new npm script if needed

## Integration

These tests are designed to run in CI/CD pipelines to catch translation issues before deployment.
