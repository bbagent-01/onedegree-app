# Message Thread UI

## Source
- **Repo:** aumsoni2002/Airbnb-Clone (closest, but only review cards — no messaging)
- **File:** `components/reviews/ReviewCard.tsx` (41 LOC)
- **Note:** No reference repo implements messaging. This spec is based on Airbnb's messaging pattern + the review card as a starting point for message bubble design.

## Reference Implementation (ReviewCard)
- Card with user avatar (48x48, rounded-full), name, rating, comment text
- Semantic Card/CardHeader/CardContent structure
- Optional children slot (for delete button)
- This pattern translates well to message bubbles

## Target Implementation (Message System)

### Dimensions
- **Inbox sidebar:** 320px-400px width on desktop
- **Thread content:** Remaining width
- **Message bubble:** Max-w-[70%] of thread width, p-3 (12px)
- **Avatar:** 32px (w-8 h-8)
- **Thread header:** h-16 (64px) with border-b
- **Input area:** h-16 (64px) min, grows with content

### Layout
```
Desktop:
┌────────────┬────────────────────────────┐
│ Inbox      │ Thread with Host Name       │
│            │ ──────────────────────────── │
│ ┌────────┐ │                             │
│ │Thread 1│ │        [Host bubble]        │
│ └────────┘ │                    [My msg] │
│ ┌────────┐ │        [Host bubble]        │
│ │Thread 2│ │                             │
│ └────────┘ │ ──────────────────────────── │
│ ┌────────┐ │ [Type a message...] [Send]  │
│ │Thread 3│ │                             │
│ └────────┘ │                             │
└────────────┴────────────────────────────┘

Mobile:
Screen 1: Inbox list (full width)
Screen 2: Thread view (full width, back button)
```

### Typography
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Thread preview name | text-sm (14px) | font-semibold (600) | foreground |
| Thread preview snippet | text-xs (12px) | font-normal (400) | muted-foreground |
| Thread preview time | text-xs (12px) | font-normal (400) | muted-foreground |
| Message text | text-sm (14px) | font-normal (400) | foreground / white |
| Message timestamp | text-xs (12px) | font-normal (400) | muted-foreground |
| Thread header name | text-base (16px) | font-semibold (600) | foreground |
| Input text | text-sm (14px) | font-normal (400) | foreground |

### Border Radius & Shadows
- **Inbox sidebar:** border-r
- **Thread item:** No radius (full-bleed), hover bg-muted
- **Message bubble (sent):** rounded-2xl (16px), rounded-br-sm (4px)
- **Message bubble (received):** rounded-2xl (16px), rounded-bl-sm (4px)
- **Input area:** border-t, no radius
- **Send button:** rounded-full

### Responsive Behavior
- **Desktop:** Side-by-side inbox + thread (master-detail)
- **Mobile:** Stacked navigation (inbox list → thread view with back button)
- **Tablet:** Could show sidebar collapsed to avatars only

### Interactive States
| State | Behavior |
|-------|----------|
| Thread unread | Bold name, blue dot indicator |
| Thread selected | bg-muted highlight |
| Thread hover | bg-muted/50 |
| Message sending | Subtle opacity reduction, "Sending..." text |
| Message sent | Full opacity, timestamp shows |
| Message failed | Red indicator, "Retry" option |
| Input empty | Send button disabled/muted |
| Input typing | Send button enabled, blue/brand color |
| New message | Thread moves to top of inbox list |

### Data Shape
```typescript
// Inbox thread preview
{
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl: string;
    trustScore: number;
  };
  lastMessage: {
    text: string;
    sentAt: Date;
    isRead: boolean;
  };
  listing?: {
    id: string;
    title: string;
    imageUrl: string;
  };
  unreadCount: number;
}

// Message
{
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  sentAt: Date;
  readAt?: Date;
}
```

## Trustead Adaptation Notes
- **Build from scratch** — highest complexity component, no reference implementation
- **Priority:** Low (CC-B4) — use simple contact form for CC-B2/B3
- **Add:** Trust badge next to user name in thread header
- **Add:** Connection degree indicator
- **Add:** Listing context card at top of thread (when message is about a specific listing)
- **Add:** Booking request integration (messages linked to listing inquiries)
- **Add:** "Vouch" prompt after positive messaging exchange
- **Consider:** Real-time with Supabase Realtime subscriptions
- **Consider:** Message templates for common responses
- **Security:** Messages only between connected users or booking-related parties
