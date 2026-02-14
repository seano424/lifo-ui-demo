# Creating Supabase Clients

This guide explains how to create and use Supabase clients in different contexts within the LIFO app.

## Overview

The LIFO app uses different Supabase client creation patterns depending on the context:

- **Server Components & Route Handlers**: `lib/supabase/server.ts`
- **Client Components**: `lib/supabase/client.ts`
- **Middleware**: `lib/supabase/proxy.ts`

## Environment Variables

All clients use these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: The `PUBLISHABLE_KEY` (formerly `ANON_KEY`) is safe to expose to the browser. The `SERVICE_ROLE_KEY` should never be exposed to the client.

## Server-Side Client (`lib/supabase/server.ts`)

Use this for Server Components, Server Actions, and Route Handlers.

```typescript
import { createClient } from '@/lib/supabase/server'

// In a Server Component or Route Handler
export async function MyServerComponent() {
  const supabase = await createClient()
  const { data } = await supabase.from('my_table').select('*')
  // ...
}
```

**Key Features**:
- Uses `cookies()` from `next/headers` for cookie access
- Automatically handles session refresh
- Type-safe with `Database` type parameter
- Includes try/catch for Server Component context

**Implementation**:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase-extended'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Safely ignore errors in Server Component context
          }
        },
      },
    }
  )
}
```

## Client-Side Client (`lib/supabase/client.ts`)

Use this for Client Components and browser-based interactions.

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export function MyClientComponent() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.from('my_table').select('*')
      // ...
    }
    loadData()
  }, [supabase])
}
```

**Key Features**:
- Uses `createBrowserClient` from `@supabase/ssr`
- Automatically manages cookies in the browser
- Type-safe with `Database` type parameter
- Singleton pattern recommended with `useMemo`

**Implementation**:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase-extended'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

## Middleware Client (`lib/supabase/proxy.ts`)

Used in `proxy.ts` (middleware) for session validation and OAuth callback handling.

```typescript
import { updateSession } from '@/lib/supabase/proxy'

export default async function middleware(request: NextRequest) {
  return await updateSession(request)
}
```

**Key Features**:
- Validates session on every request
- Handles OAuth callbacks with proper cookie synchronization
- Redirects unauthenticated users to `/auth/login`
- Uses dual-write cookie pattern for reliability

**Why Middleware Handles OAuth**:
Route handlers have a race condition where `exchangeCodeForSession()` resolves before cookies are written. Middleware can explicitly wait for the cookie Promise to resolve before returning the response, ensuring cookies are always attached.

## Authentication Patterns

### Email/Password Sign-up

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    emailRedirectTo: `${window.location.origin}/dashboard`,
    data: {
      language_preference: 'en',
    },
  },
})
```

### Google OAuth

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}
```

### Sign Out

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
await supabase.auth.signOut()
window.location.href = '/'
```

## Security Considerations

### Row Level Security (RLS)

All tables should have RLS enabled. The Supabase client automatically enforces RLS policies based on the authenticated user.

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their own data"
ON user_data
FOR SELECT
USING (auth.uid() = user_id);
```

### Redirect Validation

Always validate redirect paths to prevent open redirect vulnerabilities:

```typescript
// Bad - vulnerable to //evil.com
if (!redirectPath.startsWith('/')) {
  redirectPath = '/dashboard'
}

// Good - prevents protocol-relative URLs
if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
  redirectPath = '/dashboard'
}
```

### Origin Validation

Validate origins before using them in OAuth redirects:

```typescript
const origin = (() => {
  if (!rawOrigin) return 'http://localhost:3000'

  try {
    const url = new URL(rawOrigin)
    // Validate hostname is allowed
    if (url.hostname !== 'localhost' && !url.hostname.endsWith('.your-domain.com')) {
      return 'http://localhost:3000'
    }
    return url.origin
  } catch {
    return 'http://localhost:3000'
  }
})()
```

## Type Safety

All Supabase clients use the `Database` type from `@/types/supabase-extended`:

```typescript
import type { Database } from '@/types/supabase-extended'

const supabase = createServerClient<Database>(...)
```

This provides:
- Autocomplete for table names
- Type-safe column access
- Compile-time error checking
- IntelliSense support

Generate types after schema changes:

```bash
npm run update-types
```

## Common Patterns

### Check Authentication Status

```typescript
// Server Component
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/auth/login')
}
```

### Listen to Auth Changes (Client)

```typescript
'use client'

useEffect(() => {
  const supabase = createClient()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/'
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

## Troubleshooting

### Cookies Not Set After OAuth

**Problem**: User redirected to login after successful OAuth.
**Solution**: Ensure middleware handles the OAuth callback (see `proxy.ts`). The route handler has a race condition with cookie setting.

### Type Errors

**Problem**: TypeScript errors on database queries.
**Solution**: Run `npm run update-types` to regenerate types from the current schema.

### Session Expires Immediately

**Problem**: User logged out on every page navigation.
**Solution**: Ensure middleware's `updateSession()` is called on every request and RLS policies don't block session refresh.

## Migration Notes

### From `ANON_KEY` to `PUBLISHABLE_KEY`

Supabase renamed the environment variable for clarity:

```env
# Old (deprecated)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# New (recommended)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
```

The keys are interchangeable - only the name changed.

### From `lib/supabase/middleware.ts` to `lib/supabase/proxy.ts`

File was renamed for clarity. Update imports:

```typescript
// Old
import { updateSession } from '@/lib/supabase/middleware'

// New
import { updateSession } from '@/lib/supabase/proxy'
```

## Further Reading

- [Supabase SSR Quickstart](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
