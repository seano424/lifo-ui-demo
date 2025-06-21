# LIFO.AI

Food surplus management system helping retailers reduce edible inventory loss through AI-driven tools.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Tesseract OCR (for lifo-ai-core image processing)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/lifo-ai/lifo-app.git
   cd lifo-app
   npm install
   ```

2. **Install Tesseract OCR**
   
   For the lifo-ai-core image processing functionality, install Tesseract:
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install tesseract-ocr
   ```
   
   **macOS:**
   ```bash
   brew install tesseract
   ```
   
   **Windows:**
   Download from [GitHub releases](https://github.com/UB-Mannheim/tesseract/wiki) or use chocolatey:
   ```bash
   choco install tesseract
   ```

3. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials (check Confluence for values):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Supabase CLI setup**
   ```bash
   # Login to Supabase (one-time setup)
   npm run supabase:login
   
   # Generate TypeScript types
   npm run update-types
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 🗄️ Database & Types

### Updating TypeScript Types

Whenever database schema changes, run:
```bash
npm run update-types
```

This generates fresh TypeScript types in `types/supabase.ts` for full type safety.

### Supabase CLI Commands

```bash
# Login (one-time setup per developer)
npm run supabase:login

# Generate types
npm run update-types

# Check project status
npm run supabase status

# View help
npm run supabase --help
```

## 📝 Development Workflow

1. **Make database changes** in Supabase Dashboard → SQL Editor
2. **Update types**: `npm run update-types`
3. **Update your code** with new TypeScript types
4. **Commit both** schema changes and updated types

## 🔐 Authentication

Using Supabase Auth with:
- Email/password signup
- Row Level Security (RLS) for data isolation
- JWT-based sessions
- Auto-profile creation on signup

## 📚 Useful Scripts

```bash
npm run dev              # Start Next.js development server
npm run build            # Build for production
npm run update-types     # Generate fresh Supabase types
npm run supabase:login   # Authenticate with Supabase CLI
```

## 🤝 Team Onboarding

New team members should:
1. Clone repo and run `npm install`
2. Get `.env.local` values from team lead
3. Run `npm run supabase:login` to authenticate
4. Run `npm run update-types` to generate types
5. Start coding with `npm run dev`

## 📖 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Project Architecture](./docs/architecture.md) _(to be created )_