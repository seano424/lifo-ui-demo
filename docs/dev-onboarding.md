# Welcome to LIFO.AI! 👋

Hey there! We're excited to have you join the team. This guide will help you get up and running, but don't feel like you need to absorb everything at once. Take your time, ask questions, and we'll figure things out together.

## First Things First

**Slack**: Feel free to ask questions in `#dev` or DM anyone on the team
**No stupid questions**: Seriously, we've all been there

---

## What We're Building

LIFO.AI helps grocery stores track their inventory by expiration date.
This lets them make smarter decisions about discounts and donations, reducing food waste.

**Why it matters**: Most stores just guess when to discount products. We give them actual data.
**Our users**: Dutch grocery store managers who want to waste less food
**Current stage**: MVP - we're proving the concept works

---

## Getting Your Environment Set Up

### Quick Start (Goal: 30 minutes)

```bash
# 1. Clone and install
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app
npm install

# 2. Environment setup
cp .env.example .env.local
# Ask someone for the actual API keys to put in .env.local

# 3. Start it up
npm run dev
# Visit http://localhost:3000
```

**If something breaks**: Don't spend more than 15 minutes troubleshooting alone - just ask for help!

### What You'll Need

- **Node.js** (v18+) - `node --version` to check
- **Git** - for version control
- **VS Code** (recommended) - with Prettier and ESLint extensions

### Environment Variables

We do have a confluence doc for env variables right now.
If you don't have access to that or you don't see all the variables necessary, just reach out to dev on slack for help
Ask for these values to put in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ask for this]
SUPABASE_SERVICE_ROLE_KEY=[ask for this - keep it secret!]
```

---

## Our Tech Stack (The Essentials)

**Frontend**: Next.js + TypeScript + Tailwind CSS  
**Database**: Supabase (PostgreSQL with a nice interface)  
**UI Components**: shadcn/ui (copy-paste components)  
**State Management**: React Query (for fetching data)

**Don't worry if you're new to any of these** - the patterns are pretty straightforward once you see a few examples.

### Project Structure

```
app/           # Pages and layouts (Next.js App Router)
components/    # Reusable UI components
lib/           # Database queries and utilities
hooks/         # Custom React hooks
```

---

## How We Work

### Git Workflow

```bash
# Create a branch for your work
git checkout -b feature/what-youre-working-on

# Make your changes, commit them
git add .
git commit -m "feat: describe what you did"

# Push and create a PR
git push origin feature/what-youre-working-on
```

**Pull Requests**: We review each other's code before merging. It's collaborative, not judgmental!

### Useful Commands

```bash
npm run dev              # Start development server
npm run lint             # Check code quality
npm run format           # Auto-format code
npm run update-types     # Sync database types (run this occasionally)
npm run supabase:login   # Authenticate with Supabase CLI (one-time)
```

---

## Your First Week

### Day 1-2: Get Oriented

- Get the app running locally
- Explore the codebase - click around, see what's there
- Ask questions about anything confusing
- Maybe make a small change (change some text, adjust a color)

### Day 3-5: First Contribution

- Pick up a small task (we'll help you find one)
- Create your first PR
- Go through the code review process

**No pressure** - we'd rather you take time to understand things than rush through.

---

## Tools You'll Use

**GitHub**: Our code lives at `github.com/lifo-ai/lifo-app`  
**Slack**: Team communication (`#dev` for technical stuff)  
**Supabase**: Database dashboard at `supabase.com/dashboard/project/jrgmetdsohowtxickqij`  
**Figma**: Design files (if you're working on UI stuff)

---

## When You're Stuck

### Good Ways to Ask for Help

- "I'm trying to [do X] but getting [specific error]. I've tried [what you tried]. Any ideas?"
- "Can someone explain how [specific thing] works?"
- "Is there a pattern for [specific scenario]?"

### When to Ask

- **Immediately** if you can't get the app running
- **After 30 minutes** if you're stuck on something
- **Anytime** you're unsure about business logic or requirements

**We genuinely want you to succeed** - asking questions helps us all learn and improve our docs.

---

## Database Basics

We use Supabase (PostgreSQL) with a few key tables:

- **products**: The grocery items (apples, milk, etc.)
- **inventory_batches**: Specific batches with expiration dates
- **users**: Store managers and employees

The key insight: Instead of "we have 10 apples," we track "we have 3 apples expiring tomorrow, 4 expiring next week, etc."

---

## UI Development

We use **shadcn/ui** components with **Tailwind CSS** for styling.

```bash
# Add a new component
npx shadcn@latest add button

# Use it in your code
import { Button } from '@/components/ui/button'
```

**Philosophy**: Use what works for you. shadcn/ui is there for convenience, but if you prefer something else or want to build custom components, that's totally fine.

---

## Common Issues & Solutions

**App won't start**: Check your `.env.local` file has the right values  
**TypeScript errors**: Try `npm run update-types`  
**Weird caching issues**: Delete `node_modules` and run `npm install` again  
**Supabase access issues**: Make sure you're added to the project

---

## Resources

**Next.js**: https://nextjs.org/docs  
**Tailwind CSS**: https://tailwindcss.com/docs  
**Supabase**: https://supabase.com/docs  
**shadcn/ui**: https://ui.shadcn.com/

**Our docs**: [Link to technical architecture] (comprehensive but not required reading!)

---

## That's It!

You don't need to memorize everything here. Bookmark this page, refer back to it as needed, and remember that everyone on the team is here to help.

We're building something that can genuinely reduce food waste and help small businesses - it's meaningful work, and we're glad you're part of it.

**Ready to get started?** Ask your mentor what would be a good first task, and let's build something great together! 🚀

---

_Questions about anything? Just ask in Slack or DM your mentor._
