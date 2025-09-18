# 🌍 Translation System Documentation

This folder contains all internationalization (i18n) files for the LIFO.AI application. The translations are organized by language and feature area for better maintainability.

## 📁 Folder Structure

```
messages/
├── README.md              # This documentation file
├── en/                    # English translations
│   ├── auth.json         # Authentication forms & errors
│   ├── common.json       # Shared UI elements, buttons, validation
│   ├── dashboard.json    # Dashboard, KPIs, alerts, insights
│   ├── inventory.json    # Products, batches, inventory management
│   ├── marketing.json    # Landing pages, pricing, features
│   └── settings.json     # User settings, preferences, configuration
├── fr/                    # French translations (same structure as en/)
│   ├── auth.json
│   ├── common.json
│   ├── dashboard.json
│   ├── inventory.json
│   ├── marketing.json
│   └── settings.json
└── nl/                    # Dutch translations (same structure as en/)
    ├── auth.json
    ├── common.json
    ├── dashboard.json
    ├── inventory.json
    ├── marketing.json
    └── settings.json
```

## 🎯 Translation Categories

### `auth.json`

Contains authentication-related translations:

- Login/signup forms
- Password reset flows
- Error messages for authentication
- Form validation messages

**Example keys:**

```json
{
  "auth": {
    "forgotPassword": {
      "title": "Reset Password",
      "email": "Email",
      "sendResetEmail": "Send Reset Email"
    },
    "signUpForm": {
      "title": "Create Account",
      "password": "Password",
      "signUpButton": "Create Account"
    },
    "errors": {
      "passwordTooShort": "Password must be at least 6 characters",
      "passwordsNoMatch": "Passwords do not match"
    }
  }
}
```

### `common.json`

Contains shared UI elements used across the application:

- Navigation menus
- Common buttons (Save, Cancel, Edit, Delete)
- Form labels and validation messages
- Breadcrumbs
- Error states and loading messages

**Example keys:**

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit"
  },
  "breadcrumbs": {
    "dashboard": "Dashboard",
    "inventory": "Inventory",
    "settings": "Settings"
  },
  "errors": {
    "common": {
      "genericError": "An error occurred",
      "networkError": "Network error. Please check your connection."
    }
  }
}
```

### `dashboard.json`

Contains dashboard-specific translations:

- KPI cards and metrics
- Quick actions
- Store insights and analytics
- Alert systems and urgency levels
- Batch status and inventory overview

**Example keys:**

```json
{
  "dashboard": {
    "quickActions": {
      "title": "Quick Actions",
      "addProducts": {
        "title": "Add Products",
        "action": "Add new products"
      }
    },
    "kpis": {
      "inventory": {
        "label": "Total Inventory Value"
      }
    }
  }
}
```

### `inventory.json`

Contains inventory management translations:

- Product management
- Batch operations
- Stock levels and alerts
- Scanning and OCR features
- Removal and disposal workflows

### `marketing.json`

Contains public-facing content:

- Landing page content
- Feature descriptions
- Pricing information
- Contact forms
- Public documentation

### `settings.json`

Contains settings and configuration translations:

- **User account information and preferences** (profile, phone, language)
- Store settings and configuration
- Team management
- Notification preferences
- System configuration

## 🔧 How the System Works

### Automatic Loading

The translation system automatically loads and merges all JSON files for each language:

1. **Server-side rendering** (`i18n.ts`) loads translations for the initial page render
2. **Client-side hydration** (`intl-provider.tsx`) handles dynamic language switching
3. **Shared utility** (`lib/load-messages.ts`) merges all translation files into a single object

### Usage in Components

```typescript
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('dashboard.quickActions')

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('addProducts.description')}</p>
    </div>
  )
}
```

## 🌐 Adding a New Language

To add support for a new language (e.g., German - `de`):

### 1. Create Language Folder

```bash
mkdir messages/de
```

### 2. Copy Translation Files

```bash
cp messages/en/*.json messages/de/
```

### 3. Translate Content

Edit each JSON file in `messages/de/` and translate the values (keep the keys the same).

### 4. Update Configuration Files

**Update `lib/load-messages.ts`:**
No changes needed - the system dynamically loads any language folder.

**Update `i18n.ts`:**

```typescript
// Add 'de' to supported languages
if (["en", "fr", "nl", "de"].includes(locale)) {
  return locale;
}
```

**Update `lib/stores/language-store.ts`:**

```typescript
// Add to supported languages
const LIFO_SUPPORTED_LANGUAGES = ["fr", "en", "nl", "de"] as const;

// Update type
export type Language = "fr" | "en" | "nl" | "de";
```

**Update language switcher components** to include the new language option.

## ✏️ Adding New Translation Keys

### 1. Choose the Right Category

- **Authentication flows** → `auth.json`
- **Shared UI elements** → `common.json`
- **Dashboard features** → `dashboard.json`
- **Product/inventory** → `inventory.json`
- **Public content** → `marketing.json`
- **Settings/config** → `settings.json`

### 2. Add to All Languages

When adding a new key, make sure to add it to **all language files** to maintain consistency.

**Example - Adding a new dashboard feature:**

`messages/en/dashboard.json`:

```json
{
  "dashboard": {
    "newFeature": {
      "title": "New Feature",
      "description": "This is a new feature"
    }
  }
}
```

`messages/fr/dashboard.json`:

```json
{
  "dashboard": {
    "newFeature": {
      "title": "Nouvelle Fonctionnalité",
      "description": "Ceci est une nouvelle fonctionnalité"
    }
  }
}
```

`messages/nl/dashboard.json`:

```json
{
  "dashboard": {
    "newFeature": {
      "title": "Nieuwe Functie",
      "description": "Dit is een nieuwe functie"
    }
  }
}
```

### 3. Use in Components

```typescript
const t = useTranslations('dashboard.newFeature')
return <h1>{t('title')}</h1>
```

## 🔄 Language Switching System

### Current Language Detection Priority

1. **Authenticated users**: User's saved preference in Supabase user metadata
2. **Non-authenticated users**: Browser localStorage preference
3. **Fallback**: Browser's Accept-Language header
4. **Default**: French (`fr`)

### How to Change Language Programmatically

```typescript
import { useLanguageStore } from '@/lib/stores/language-store'

function LanguageSwitcher() {
  const { setLanguage, currentLanguage, isLoading } = useLanguageStore()

  const handleLanguageChange = async (newLanguage: 'en' | 'fr' | 'nl') => {
    await setLanguage(newLanguage)
    // Language will be saved to user metadata (if authenticated)
    // and localStorage for persistence
  }

  return (
    <select value={currentLanguage} onChange={(e) => handleLanguageChange(e.target.value)}>
      <option value="fr">Français</option>
      <option value="en">English</option>
      <option value="nl">Nederlands</option>
    </select>
  )
}
```

### Language Persistence

- **Authenticated users**: Preference saved in Supabase `user_metadata.language_preference`
- **Non-authenticated users**: Preference saved in browser localStorage
- **Server-side**: Attempts to read from cookies to match client preference

## 🛠️ Development Tips

### Testing Translations

1. **Build test**: `npm run build` - Ensures all translation files are valid
2. **Missing keys**: Check browser console for `MISSING_MESSAGE` warnings
3. **Language switching**: Test all language combinations work correctly

### Best Practices

- **Keep keys descriptive**: Use nested objects to organize related translations
- **Consistent naming**: Follow the same naming patterns across languages
- **Pluralization**: Use next-intl's built-in pluralization features when needed
- **Context**: Include context in key names (e.g., `buttons.save` vs `actions.save`)

### Common Issues

- **Missing translations**: Always add keys to all language files
- **JSON syntax**: Validate JSON syntax - one invalid file breaks the entire language
- **Key conflicts**: Avoid duplicate keys when merging different JSON files
- **Caching**: Clear browser cache when testing translation changes

## 📊 Translation Status

| Language        | Status      | Completeness |
| --------------- | ----------- | ------------ |
| 🇫🇷 French (fr)  | ✅ Complete | 100%         |
| 🇬🇧 English (en) | ✅ Complete | 100%         |
| 🇳🇱 Dutch (nl)   | ✅ Complete | 100%         |

---

**Need help?** Check the [next-intl documentation](https://next-intl-docs.vercel.app/) or ask the development team!
