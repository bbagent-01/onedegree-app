# DEMO_SEED_BEFORE.md — pre-B7 snapshot

Captured: 2026-05-01 against live Trustead Supabase project.

## Counts

| Metric | Value |
|---|---|
| `users` total | **51** |
| `users` real (`is_test_user=false`) | **11** |
| `users` demo (`is_test_user=true`) | **40** |
| Listings hosted by demo users | **60** |

## Storage buckets (existing)

- `listing-photos` (public)
- `photo-requests` (private)
- `profile-photos` — **does not exist**, will be created in B7

## The 40 `is_test_user=true` users break into 4 distinct groups

| Group | Pattern | Count | Notes |
|---|---|---|---|
| **Loren's own account** | `lorenpolster@gmail.com`, real Clerk ID `user_3D00…` | 1 | ⚠️ **DO NOT DELETE** — this is the live admin account |
| **Brightbase Agent** | `bbagent@brightbase.co`, real Clerk ID `user_3CD7…` | 1 | ⚠️ **DO NOT DELETE** — admin/agent account |
| **`spawned_imp_*`** | impersonation-spawn UUIDs | 7 | Created by the `/api/admin/impersonate/spawn` flow — ad-hoc test users Loren created interactively. Not "demo seed", but also not real signups. Recommend **preserve** (they're harmless and may still be in use). |
| **Seed scripts** | `clerk_id` starts with `seed_` or `seed_hostgraph_` | **31** | The actual demo population produced by `scripts/seed.ts` + `scripts/seed-host-graph.ts`. **This is what B7 should replace.** |

### Seed-script users (the deletion target — 31 rows)

Full list (`name` · `clerk_id`):
- Maya Chen · `seed_maya`
- James Rivera · `seed_james`
- Priya Nair · `seed_priya`
- Sam Okafor · `seed_sam`
- Dana Kowalski · `seed_dana`
- Alex Torres · `seed_alex`
- Chloe Martens · `seed_chloe`
- Ben Shapira · `seed_ben`
- Elena Ruiz · `seed_hostgraph_elena`
- Marco Fiore · `seed_hostgraph_marco`
- Nadia Abadi · `seed_hostgraph_nadia`
- Theo Bergman · `seed_hostgraph_theo`
- Yuki Tanaka · `seed_hostgraph_yuki`
- Felix Brandt · `seed_hostgraph_felix`
- Ivy Okonkwo · `seed_hostgraph_ivy`
- Cassidy Miles · `seed_hostgraph_cassidy`
- Amira Nasser · `seed_hostgraph_amira`
- Luka Ivanov · `seed_hostgraph_luka`
- Jules Fontaine · `seed_hostgraph_jules`
- Rosa Delgado · `seed_hostgraph_rosa`
- Kai Stephens · `seed_hostgraph_kai`
- Priya Reddy · `seed_hostgraph_priya_h`
- Omar Chowdhury · `seed_hostgraph_omar_h`
- Sophie Laurent · `seed_hostgraph_sophie`
- Hana Yoon · `seed_hostgraph_hana`
- Diego Ferrer · `seed_hostgraph_diego`
- Zara Malik · `seed_hostgraph_zara`
- Björn Eriksson · `seed_hostgraph_bjorn`
- Mei Chang · `seed_hostgraph_mei`
- Pavel Novák · `seed_hostgraph_pavel`
- Ines Duarte · `seed_hostgraph_ines`

## Listings owned by demo users (60 total)

- 14 owned by Loren's account (`d75cfbe8-…`) — preserved by the safer deletion scope
- 46 owned by seed-script users — will cascade-delete via `ON DELETE CASCADE` on `listings.host_id`

## Real users untouched

`SELECT count(*) FROM users WHERE is_test_user = false` baseline = **11**. Migration must leave this number unchanged.
