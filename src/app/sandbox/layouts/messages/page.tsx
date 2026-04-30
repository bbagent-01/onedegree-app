// D3 LAYOUT SANDBOX — MESSAGES (replica of /inbox)
// ----------------------------------------------------------------
// Inbox split-view: thread list left, conversation right. Includes
// intro requests, host messages, regular threads. Sample data inline.
// ----------------------------------------------------------------

import {
  Search,
  Send,
  Paperclip,
  Phone,
  Video,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";

export const runtime = "edge";

type Thread = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  ago: string;
  unread?: boolean;
  isIntro?: boolean;
  isHost?: boolean;
};

const THREADS: Thread[] = [
  {
    id: "1",
    name: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/80/80",
    lastMessage: "Sounds great — see you on the 14th!",
    ago: "2h",
    isHost: true,
  },
  {
    id: "2",
    name: "Diego M.",
    avatar: "https://picsum.photos/seed/diego-m/80/80",
    lastMessage: "Yes, courtyard is yours those weeks. Sending the agreement.",
    ago: "Yesterday",
    unread: true,
    isHost: true,
  },
  {
    id: "3",
    name: "Priya K. — intro request",
    avatar: "https://picsum.photos/seed/priya-k/80/80",
    lastMessage:
      "Hey! I'm a 2° connection through Erin. Mind if I send a proposal?",
    ago: "2d",
    isIntro: true,
    unread: true,
  },
  {
    id: "4",
    name: "Erin Q.",
    avatar: "https://picsum.photos/seed/erin-q/80/80",
    lastMessage: "Did you ever hear back from Theo?",
    ago: "3d",
  },
  {
    id: "5",
    name: "Jonas T.",
    avatar: "https://picsum.photos/seed/jonas-t/80/80",
    lastMessage: "Thank you again for the stay. Vouching for you now.",
    ago: "5d",
  },
];

const ACTIVE_THREAD = THREADS[0];

const MESSAGES = [
  {
    id: "m1",
    from: "them",
    body: "Hi! Got your proposal for May 14–16. Looks good — quick question, are you bringing pets?",
    time: "10:42 AM",
  },
  {
    id: "m2",
    from: "me",
    body: "Hey Maya! No pets, just me and my partner. We tend to be quiet evenings.",
    time: "10:51 AM",
  },
  {
    id: "m3",
    from: "them",
    body: "Perfect. Confirming the booking now. Door code goes out the morning of the 14th.",
    time: "11:08 AM",
  },
  {
    id: "m4",
    from: "me",
    body: "Wonderful. Thanks Maya — looking forward to it.",
    time: "11:12 AM",
  },
  {
    id: "m5",
    from: "them",
    body: "Sounds great — see you on the 14th!",
    time: "11:13 AM",
  },
];

const FILTER_TABS = ["All", "Intros", "Hosting", "Traveling"] as const;

export default function MessagesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
        Messages
      </h1>

      <div className="mt-4 grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-border bg-card/30 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Thread list */}
        <aside className="border-b border-border/60 lg:border-b-0 lg:border-r">
          {/* Search */}
          <div className="border-b border-border/60 p-3">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background/40 px-3">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Search messages
              </span>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto">
              {FILTER_TABS.map((t, i) => (
                <button
                  key={t}
                  className={
                    i === 0
                      ? "shrink-0 rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold text-background"
                      : "shrink-0 rounded-full border border-border bg-card/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-card/60"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ul className="max-h-[600px] overflow-y-auto">
            {THREADS.map((t, i) => (
              <li
                key={t.id}
                className={
                  i === 0
                    ? "flex items-start gap-3 border-b border-border/60 bg-card/50 p-3"
                    : "flex items-start gap-3 border-b border-border/60 p-3 hover:bg-card/40"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={
                        t.unread
                          ? "truncate text-sm font-semibold text-foreground"
                          : "truncate text-sm text-foreground"
                      }
                    >
                      {t.name}
                    </p>
                    <span className="shrink-0 text-[11px] text-subtle">
                      {t.ago}
                    </span>
                  </div>
                  <p
                    className={
                      t.unread
                        ? "mt-0.5 truncate text-xs font-medium text-foreground"
                        : "mt-0.5 truncate text-xs text-muted-foreground"
                    }
                  >
                    {t.lastMessage}
                  </p>
                  {(t.isIntro || t.isHost) && (
                    <span
                      className={
                        t.isIntro
                          ? "mt-1 inline-block rounded-full bg-warning/15 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider text-warning"
                          : "mt-1 inline-block rounded-full bg-brand/15 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider text-brand"
                      }
                    >
                      {t.isIntro ? "Intro request" : "Host"}
                    </span>
                  )}
                </div>
                {t.unread && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Conversation */}
        <section className="flex h-[640px] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ACTIVE_THREAD.avatar}
                alt={ACTIVE_THREAD.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {ACTIVE_THREAD.name}
                </p>
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-brand" />
                  1° via Erin Q. · Hosting Sunlit brownstone
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-border bg-card/40 p-2 text-foreground hover:bg-card/60">
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button className="rounded-lg border border-border bg-card/40 p-2 text-foreground hover:bg-card/60">
                <Video className="h-3.5 w-3.5" />
              </button>
              <button className="rounded-lg border border-border bg-card/40 p-2 text-foreground hover:bg-card/60">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {MESSAGES.map((m) => (
              <div
                key={m.id}
                className={
                  m.from === "me"
                    ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm bg-card/60 px-4 py-2.5 text-sm text-foreground"
                }
              >
                <p>{m.body}</p>
                <p
                  className={
                    m.from === "me"
                      ? "mt-1 text-right text-[10px] opacity-70"
                      : "mt-1 text-[10px] text-subtle"
                  }
                >
                  {m.time}
                </p>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2">
              <button className="text-muted-foreground hover:text-foreground">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder="Write a message…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Send className="h-3 w-3" />
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
