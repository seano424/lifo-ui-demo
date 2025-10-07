# Linting Rules - LIFO App

## Biome Configuration

This project uses Biome for linting and formatting.

### Core Formatting Rules

- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Semicolons**: `"asNeeded"` - No semicolons unless absolutely necessary
- **Trailing commas**: `"all"` - Add trailing commas everywhere possible
- **Indentation**: 2 spaces, max 100 characters per line
- **Arrow functions**: `"asNeeded"` - No parentheses for single params

### Style Rules (Errors)

- **`useConst`**: Prefer `const` over `let`
- **`useTemplate`**: Use template literals instead of concatenation

### Examples

#### ✅ Correct

```typescript
const name = 'value'
const message = `Hello ${name}`

<div className="flex items-center">
  <span>Content</span>
</div>

const data = {
  id: 1,
  name: 'test',
}

const double = x => x * 2
const add = (a, b) => a + b
```

#### ❌ Incorrect

```typescript
const name = "value"
<div className='flex items-center'>
const data = { id: 1, name: 'test' };
let items = ['a', 'b', 'c']
const greeting = 'Hello ' + user.name
const double = (x) => x * 2
```

### Commands

```bash
npm run check      # Check linting
npm run check:fix  # Auto-fix
npm run format     # Format only
```

## Quick Reference for AI

- ✅ `const name = 'value'` (no `;`, single quotes)
- ✅ `import { Component } from 'react'` (single quotes)
- ✅ `className="flex items-center"` (double quotes for JSX)
- ✅ Trailing commas in objects and arrays
- ✅ 2-space indentation, max 100 chars per line
- ✅ `const` over `let`, template literals over concatenation
- ✅ Arrow functions: `x => x * 2` (no parens for single param)
