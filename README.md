<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Middleware
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Ready for deployment to any platform that supports Next.js

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deployment

This starter kit is designed to work with any deployment platform that supports Next.js applications. Below are some popular deployment options:

### Deploy to Vercel (Recommended)

Vercel provides seamless integration with Supabase and offers the easiest deployment experience:

1. **One-click deployment**: Use the button below to deploy directly to Vercel
2. **Automatic setup**: Vercel will guide you through creating a Supabase account and project
3. **Environment variables**: All relevant environment variables will be automatically assigned to your Vercel project

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, which you can then clone locally for development.

### Deploy to Other Platforms

This starter kit works with any platform that supports Next.js applications. Some popular alternatives include:

- **Netlify**: Supports Next.js with automatic builds and deployments
- **Railway**: Simple deployment with built-in environment variable management
- **Render**: Easy deployment with automatic HTTPS and custom domains
- **DigitalOcean App Platform**: Scalable deployment with managed infrastructure
- **AWS Amplify**: Full-stack deployment with AWS integration

For any deployment platform, you'll need to:

1. Set up your Supabase project and get your environment variables
2. Configure the following environment variables in your deployment platform:
   ```
   NEXT_PUBLIC_SUPABASE_URL=[YOUR SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR SUPABASE PROJECT API ANON KEY]
   ```
3. Deploy your application using the platform's deployment process

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)


# LIFO.AI

Food surplus management system helping retailers reduce edible inventory loss through AI-driven tools.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/lifo-ai/lifo-app.git
   cd lifo-app
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Supabase CLI setup**
   ```bash
   # Login to Supabase (one-time setup)
   npm run supabase:login
   
   # Generate TypeScript types
   npm run update-types
   ```

4. **Start development**
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
- [Project Architecture](./docs/architecture.md) _(if you create this)_