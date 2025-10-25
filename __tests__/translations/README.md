# Translation Testing & Maintenance

This directory contains tools to ensure translation consistency and quality across all language files.

## 🧪 Tests Available

### Script Organization

All translation tests are organized under the `test:translations:*` namespace:

- `test:translations:all` - Run all translation tests
- `test:translations:consistency` - Test key structure and ordering
- `test:translations:missing` - Find missing translation keys
- `test:translations:hardcoded` - Detect hardcoded text

### Quick Start

Run all translation tests at once:

```bash
npm run test:translations:all
```

### Individual Tests

#### 1. Translation Consistency Test

**File:** `translation-consistency.test.ts`

**Purpose:** Ensures all translation files have:

- ✅ Identical key structure across languages
- ✅ Consistent key ordering (uses English as reference)
- ✅ No missing or extra keys

**Run:**

```bash
npm run test:translations:consistency
```

#### 2. Missing Translation Keys Test

**File:** `translation-missing-keys.test.ts`

**Purpose:** Finds hardcoded text that should be translated

**Run:**

```bash
npm run test:translations:missing
```

#### 3. Hardcoded Text Test

**File:** `hardcoded-text.test.ts`

**Purpose:** Detects hardcoded English text in components

**Run:**

```bash
npm run test:translations:hardcoded
```

## 🔧 Maintenance Tools

### Fix Translation Order

**Script:** `scripts/fix-translation-order.js`

**Purpose:** Automatically reorders translation keys to match English reference

**Run:**

```bash
npm run fix-translation-order
```

**What it does:**

- Uses English (`en`) as the reference language
- Reorders French (`fr`) and Dutch (`nl`) files to match English key order
- Preserves all translation values
- Only reorders, never adds or removes keys

## 📁 File Structure

```
messages/
├── en/                    # English (reference language)
│   ├── auth.json
│   ├── common.json
│   ├── dashboard.json
│   ├── dashboard-admin.json
│   ├── dashboard-data.json
│   └── ...
├── fr/                    # French
│   └── (same structure)
└── nl/                    # Dutch
    └── (same structure)
```

## 🎯 Best Practices

### 1. Always Use English as Reference

- English files should be updated first
- Other languages should follow English key order
- New keys should be added in the same position across all languages

### 2. Key Naming Convention

- Use dot notation for nested keys: `dashboard.welcome.title`
- Use camelCase for multi-word keys: `quickActions`
- Be descriptive: `filters.action.sold` not `filters.a.s`

### 3. Translation Workflow

1. Add new keys to English files first
2. Run `npm run test:translations:consistency` to check consistency
3. Add translations to other languages
4. Run `npm run fix-translation-order` if needed
5. Verify all tests pass with `npm run test:translations:all`

### 4. Quality Checks

- Run all translation tests before committing
- Ensure no hardcoded text in components
- Verify all keys are translated in all languages

## 🚨 Common Issues & Solutions

### Issue: "Order mismatches" in test

**Solution:** Run `npm run fix-translation-order`

### Issue: "Missing keys" error

**Solution:** Add the missing keys to the appropriate language files

### Issue: "Extra keys" error

**Solution:** Remove unused keys or add them to English reference

### Issue: Hardcoded text detected

**Solution:** Replace hardcoded text with translation keys using `useTranslations()`

## 📊 Test Results

When tests pass, you'll see:

```
✅ All translation files have consistent structure
✅ All translation files have consistent key order
✅ No missing translation keys detected
✅ No hardcoded text found
```

When tests fail, you'll see detailed information about what needs to be fixed.

## 🔄 CI/CD Integration

Add these commands to your CI pipeline:

```yaml
# Run all translation tests
- name: Test All Translations
  run: npm run test:translations:all

# Or run individual tests
- name: Test Translation Consistency
  run: npm run test:translations:consistency

- name: Test Missing Translations
  run: npm run test:translations:missing

- name: Test Hardcoded Text
  run: npm run test:translations:hardcoded
```

This ensures translation quality is maintained across all deployments.
