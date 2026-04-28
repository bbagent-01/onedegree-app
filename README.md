# Trustead

Stay with people you trust. Private home stays through trusted personal networks.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
CLERK_WEBHOOK_SECRET=your-webhook-secret
SIGNUP_MODE=invite-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Signup Mode

The `SIGNUP_MODE` env var controls whether new users can sign up directly:

- **`invite-only`** (default): Users can only sign up via an invite link from an existing member. Visiting `/sign-up` directly shows an "invite only" message.
- **`open`**: Anyone can sign up directly. Invite links still work and apply pre-vouches.

## Seed Data

Populate the database with test users, vouches, listings, and stays:

```bash
# Basic seed (no Loren connection)
npx tsx scripts/seed.ts

# Connect to your Clerk account
npx tsx scripts/seed.ts --loren-email you@example.com

# Wipe and re-seed
npx tsx scripts/seed.ts --clean --loren-email you@example.com
```

The seed creates 8 fictional users with `@seed.1db` emails, 9 vouches, 5 listings, and 3 completed stays with reviews. See `scripts/seed.ts` for details.

## Component Library

- **shadcn/ui** installed (base-nova style). Components live in `src/components/ui/`.
- All new UI should use shadcn primitives. Do not hand-roll buttons, inputs, cards, modals, or badges.
- Custom Badge variants added for trust score colors: `warning` (orange), `success` (green), `purple`.
- Design tokens defined in `src/app/globals.css` — do not override.
- Light mode only. No dark mode configuration.
- Installed components: Button, Card, Dialog, Input, Label, Select, Textarea, Tabs, Badge, Avatar, Separator, Dropdown Menu, Tooltip, Sheet, Scroll Area.

## Stack

- **Next.js 15** (App Router)
- **Clerk v7** (authentication)
- **Supabase** (database + storage)
- **Tailwind CSS 3.4** + **shadcn/ui**
- **Cloudflare Pages** (hosting)

## Deployment

Push to `main` — GitHub Actions deploys to Cloudflare Pages automatically.
