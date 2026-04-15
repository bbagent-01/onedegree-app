"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    q: "How do I create a listing?",
    a: "Switch to hosting mode from the top-right menu, then tap 'Create a new listing'. Our 7-step wizard walks you through photos, location, amenities, availability, and pricing.",
  },
  {
    q: "How do bookings work?",
    a: "Guests send a booking request with their dates and guest count. Hosts review the request and either accept, decline, or message the guest first. Once accepted, the stay is confirmed.",
  },
  {
    q: "How do I contact a host?",
    a: "From any listing page, tap 'Contact host' to start a thread. Your messages live in your Inbox until the host responds. You don't need an active booking to say hello.",
  },
  {
    q: "How do I leave a review?",
    a: "After a stay ends, you'll get a prompt on your Trips page and via email. Reviews are posted publicly on both the listing and the reviewer's profile.",
  },
  {
    q: "How do I edit my profile?",
    a: "Open the top-right menu, tap 'Profile', then 'Edit profile'. You can change your name, bio, location, work, and languages at any time.",
  },
  {
    q: "What payment methods are accepted?",
    a: "One Degree B&B facilitates introductions — we don't process payments. Guests and hosts arrange payment directly (Venmo, Zelle, cash, or whatever works for both parties).",
  },
  {
    q: "How do I cancel a booking?",
    a: "Open the booking from your Trips page and tap 'Cancel'. If the stay hasn't started yet, you can cancel without penalty. For disputes, message the host through the Inbox first.",
  },
  {
    q: "Is my personal information secure?",
    a: "We use industry-standard encryption and authentication (Clerk for auth, Supabase for data). Your email and phone are never shared with other users unless you explicitly message them.",
  },
  {
    q: "How do I report a problem?",
    a: "Use the contact form below to send us a message. For urgent safety issues, please reach out to local emergency services first.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Account and tap 'Deactivate account'. Your listings will be hidden and you'll be signed out. Contact us if you need a full data deletion.",
  },
  {
    q: "Why can't I see all amenities on a listing?",
    a: "Only amenities the host has explicitly listed appear. If something looks missing, tap 'Contact host' and ask — hosts can update their listing at any time.",
  },
  {
    q: "Can I have more than one listing as a host?",
    a: "Yes. You can create as many listings as you like from your Hosting dashboard. Each listing has its own photos, calendar, and settings.",
  },
];

interface Props {
  items: FaqItem[];
}

export function HelpFaq({ items }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-white">
      {items.map((item, i) => {
        const open = openIdx === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40"
            >
              <span className="text-sm font-semibold">{item.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
              />
            </button>
            {open && (
              <div className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
