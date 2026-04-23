// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import type { Section as SectionId } from "./Sidebar";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Handshake,
  ImageIcon,
  Receipt,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { TrustTag } from "@/components/trust/trust-tag";
import { ConnectorAvatars } from "@/components/trust/connector-avatars";
import { ConnectorDots } from "@/components/trust/connector-dots";
import { ShieldIcon } from "@/components/trust/shield-icon";
import { ListingCard } from "@/components/listing-card";
import { LiveListingCard } from "@/components/browse/live-listing-card";
import { ProposalCard } from "@/components/proposals/proposal-card";
import { TripTimeline } from "@/components/booking/TripTimeline";
import type { TimelineStage } from "@/lib/booking-stage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  connectorsFourLong,
  connectorsThreeWithBridge,
  connectorsTwoKnown,
  sampleListing,
  sampleListingGated,
  sampleProposals,
  sampleBrowseListingFull,
  sampleBrowseListingPreview,
  sampleBrowseListingGated,
  sampleTrustFull,
  sampleTrustPreview,
  sampleTrustGated,
  DEV_VIEWER_ID,
  fakeAvatar,
} from "@/lib/dev-theme/fixtures";

interface Props {
  section: SectionId;
}

export function ComponentShowcase({ section }: Props) {
  switch (section) {
    case "components-trust":
      return <TrustSection />;
    case "components-listing":
      return <ListingSection />;
    case "components-forms":
      return <FormsSection />;
    case "components-nav":
      return <NavSection />;
    case "components-inbox":
      return <InboxSection />;
    case "components-threads":
      return <ThreadCardsSection />;
    case "components-timeline":
      return <TimelineSection />;
    case "components-trips":
      return <TripsSection />;
    case "components-proposals":
      return <ProposalsSection />;
    case "components-listing-full":
      return <ListingFullSection />;
    case "components-profile":
      return <ProfileBadgeSection />;
    case "pages-browse":
      return <PageBrowseSection />;
    case "pages-listing":
      return <PageListingSection />;
    case "pages-profile":
      return <PageProfileSection />;
    case "pages-inbox":
      return <PageInboxSection />;
    case "pages-proposals":
      return <PageProposalsSection />;
    default:
      return null;
  }
}

// ── Generic primitives ────────────────────────────────────────────────

function Group({
  name,
  file,
  routes,
  children,
}: {
  name: string;
  file: string;
  routes?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <div>
          <h3 className="text-base font-semibold">{name}</h3>
          <code className="font-mono text-[11px] text-muted-foreground">
            {file}
          </code>
        </div>
        {routes && (
          <span className="text-[11px] text-muted-foreground">
            used by {routes.length} route{routes.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {children}
      {routes && routes.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t pt-2">
          {routes.map((r) => (
            <code
              key={r}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {r}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-surface/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex min-h-[48px] flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {blurb && (
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

// ── Trust ────────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <Section
      title="Trust components"
      blurb="Trust signals — degree pills, connector avatars, shields. Live imports from src/components/trust."
    >
      <Group
        name="TrustTag"
        file="src/components/trust/trust-tag.tsx"
        routes={[
          "/listings/[id]",
          "/browse",
          "/inbox",
          "/dashboard/network",
        ]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <State label="micro · 1°">
            <TrustTag size="micro" degree={1} hostRating={4.92} hostReviewCount={47} />
          </State>
          <State label="medium · 1°">
            <TrustTag size="medium" degree={1} hostRating={4.92} hostReviewCount={47} />
          </State>
          <State label="micro · 2° (score + dots)">
            <TrustTag
              size="micro"
              degree={2}
              score={68}
              connectorPaths={connectorsTwoKnown}
              hostRating={4.8}
              hostReviewCount={31}
            />
          </State>
          <State label="medium · 2°">
            <TrustTag
              size="medium"
              degree={2}
              score={68}
              connectorPaths={connectorsTwoKnown}
              hostRating={4.8}
              hostReviewCount={31}
            />
          </State>
          <State label="micro · 3° (mustard, dampened)">
            <TrustTag
              size="micro"
              degree={3}
              score={42}
              connectorPaths={connectorsThreeWithBridge}
              hostRating={4.5}
              hostReviewCount={12}
            />
          </State>
          <State label="medium · 3° + subtext">
            <TrustTag
              size="medium"
              degree={3}
              score={42}
              connectorPaths={connectorsThreeWithBridge}
              hostRating={4.5}
              hostReviewCount={12}
              showSubtext
            />
          </State>
          <State label="micro · 4° (zinc)">
            <TrustTag
              size="micro"
              degree={4}
              score={28}
              connectorPaths={connectorsFourLong}
            />
          </State>
          <State label="medium · 4° + subtext">
            <TrustTag
              size="medium"
              degree={4}
              score={28}
              connectorPaths={connectorsFourLong}
              showSubtext
            />
          </State>
          <State label="micro · 0° (no connection)">
            <TrustTag size="micro" degree={null} hostRating={4.7} hostReviewCount={9} />
          </State>
          <State label="medium · 0° + subtext">
            <TrustTag size="medium" degree={null} showSubtext />
          </State>
          <State label="loading skeleton">
            <Skeleton className="h-5 w-24 rounded-full" />
          </State>
        </div>
      </Group>

      <Group
        name="ConnectorAvatars"
        file="src/components/trust/connector-avatars.tsx"
        routes={["/listings/[id]"]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <State label="1 known connector">
            <ConnectorAvatars
              connectors={connectorsTwoKnown.slice(0, 1)}
              size="h-7 w-7"
            />
          </State>
          <State label="2 known connectors">
            <ConnectorAvatars connectors={connectorsTwoKnown} size="h-7 w-7" />
          </State>
          <State label="bridge + anonymous hop">
            <ConnectorAvatars
              connectors={connectorsThreeWithBridge}
              size="h-7 w-7"
            />
          </State>
          <State label="overflow (7 total · 4 visible + 3 pill)">
            <ConnectorAvatars
              connectors={[
                ...connectorsTwoKnown,
                ...connectorsTwoKnown.map((c, i) => ({ ...c, id: `o-${i}` })),
                ...connectorsTwoKnown.map((c, i) => ({ ...c, id: `o2-${i}` })),
                { ...connectorsTwoKnown[0], id: "o3-0" },
              ]}
              size="h-7 w-7"
            />
          </State>
        </div>
      </Group>

      <Group
        name="ConnectorDots"
        file="src/components/trust/connector-dots.tsx"
        routes={["/listings/[id]"]}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <State key={n} label={`${n} dot${n === 1 ? "" : "s"}`}>
              <ConnectorDots
                strengths={Array.from({ length: n }).map(() => 60)}
                size="h-3 w-3"
              />
            </State>
          ))}
          <State label="mustard tone (3°)">
            <ConnectorDots
              strengths={[60, 50]}
              size="h-3 w-3"
              tone="mustard"
            />
          </State>
        </div>
      </Group>

      <Group
        name="ShieldIcon"
        file="src/components/trust/shield-icon.tsx"
        routes={["/listings/[id]", "/browse"]}
      >
        <div className="grid grid-cols-3 gap-3">
          <State label="emerald (2°)">
            <ShieldIcon score={70} size="h-5 w-5" />
          </State>
          <State label="mustard (3°)">
            <ShieldIcon tone="mustard" size="h-5 w-5" />
          </State>
          <State label="muted (4°)">
            <ShieldIcon muted size="h-5 w-5" />
          </State>
        </div>
      </Group>
    </Section>
  );
}

// ── Listing ──────────────────────────────────────────────────────────

function ListingSection() {
  return (
    <Section
      title="Listing card · simple (legacy)"
      blurb="The simpler ListingCard (trust badge overlaid on the photo, bottom-right). Used on /wishlists and a few legacy surfaces. For the browse-grid variant that matches alpha-c today — trust tag below the host's first name, access-aware branching — see 'Listing card (live, gated variants)'."
    >
      <Group
        name="ListingCard"
        file="src/components/listing-card.tsx"
        routes={["/browse", "/wishlists/[id]"]}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Full access · trusted
            </p>
            <ListingCard {...sampleListing} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gated preview · 0° network
            </p>
            <ListingCard {...sampleListingGated} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Favorited
            </p>
            <ListingCard {...sampleListing} isFavorited />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Loading skeleton
            </p>
            <div className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </Group>
    </Section>
  );
}

// ── Forms & inputs ───────────────────────────────────────────────────

function FormsSection() {
  return (
    <Section
      title="Forms & inputs"
      blurb="Per the form-field rule (h-14, rounded-xl, border-2, !bg-white, px-4, shadow-sm, font-medium) — the styling shown matches the listing-creation form."
    >
      <Group name="Text input" file="src/components/ui/input.tsx">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <State label="default">
            <div className="w-full">
              <Label className="mb-1 block">Trip name</Label>
              <Input
                placeholder="e.g. Family beach week"
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
          <State label="filled">
            <div className="w-full">
              <Label className="mb-1 block">Email</Label>
              <Input
                value="loren@example.com"
                onChange={() => {}}
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
          <State label="error">
            <div className="w-full">
              <Label className="mb-1 block">Phone (E.164)</Label>
              <Input
                aria-invalid
                value="555"
                onChange={() => {}}
                className="h-14 rounded-xl border-2 border-danger !bg-white px-4 shadow-sm font-medium"
              />
              <p className="mt-1 text-xs text-danger">
                Phone must include country code, e.g. +14155551234
              </p>
            </div>
          </State>
          <State label="disabled">
            <div className="w-full">
              <Label className="mb-1 block">Username</Label>
              <Input
                disabled
                value="loren"
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
        </div>
      </Group>

      <Group name="Textarea" file="src/components/ui/textarea.tsx">
        <div className="w-full">
          <Label className="mb-1 block">Message to host</Label>
          <Textarea
            rows={4}
            placeholder="Hi! We're a family of four hoping to visit June 8–14…"
            className="rounded-xl border-2 !bg-white px-4 py-3 shadow-sm font-medium"
          />
        </div>
      </Group>

      <Group name="Buttons" file="src/components/ui/button.tsx">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <State label="default"><Button>Save</Button></State>
          <State label="outline"><Button variant="outline">Cancel</Button></State>
          <State label="secondary"><Button variant="secondary">Skip</Button></State>
          <State label="ghost"><Button variant="ghost">Maybe later</Button></State>
          <State label="destructive"><Button variant="destructive">Delete</Button></State>
          <State label="link"><Button variant="link">Learn more</Button></State>
          <State label="size sm"><Button size="sm">Small</Button></State>
          <State label="size lg"><Button size="lg">Large</Button></State>
          <State label="loading"><Button disabled>Loading…</Button></State>
        </div>
      </Group>

      <Group name="Badges" file="src/components/ui/badge.tsx">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Group>

      <Group
        name="Phone (E.164) input"
        file="src/components/ui/input.tsx"
        routes={["/onboarding", "/settings"]}
      >
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <State label="country + number">
            <div className="w-full">
              <Label className="mb-1 block">Phone</Label>
              <div className="flex gap-2">
                <Select defaultValue="US">
                  <SelectTrigger className="h-14 w-28 rounded-xl border-2 !bg-white font-medium shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 +1 US</SelectItem>
                    <SelectItem value="GB">🇬🇧 +44 GB</SelectItem>
                    <SelectItem value="FR">🇫🇷 +33 FR</SelectItem>
                    <SelectItem value="BR">🇧🇷 +55 BR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="415 555 1234"
                  className="h-14 flex-1 rounded-xl border-2 !bg-white px-4 font-medium shadow-sm"
                />
              </div>
            </div>
          </State>
          <State label="formatted (valid)">
            <div className="w-full">
              <Label className="mb-1 block">Phone</Label>
              <Input
                value="+1 (415) 555-1234"
                onChange={() => {}}
                className="h-14 rounded-xl border-2 !bg-white px-4 font-medium shadow-sm"
              />
              <p className="mt-1 text-xs text-emerald-700">Looks good.</p>
            </div>
          </State>
        </div>
      </Group>

      <Group
        name="OTP input (6-digit)"
        file="—"
        routes={["/sign-in/verify", "/onboarding"]}
      >
        <State label="partially entered">
          <div className="flex items-center gap-2">
            {["4", "2", "7", "", "", ""].map((d, i) => (
              <input
                key={i}
                value={d}
                readOnly
                className="h-14 w-11 rounded-xl border-2 !bg-white text-center text-xl font-semibold shadow-sm focus:outline-none"
              />
            ))}
          </div>
        </State>
        <State label="error">
          <div className="flex items-center gap-2">
            {["4", "2", "7", "1", "0", "9"].map((d, i) => (
              <input
                key={i}
                value={d}
                readOnly
                className="h-14 w-11 rounded-xl border-2 border-danger !bg-white text-center text-xl font-semibold text-danger shadow-sm focus:outline-none"
              />
            ))}
          </div>
        </State>
      </Group>

      <Group name="Date range" file="src/components/listing/availability-calendar.tsx">
        <State label="picker preview">
          <div className="w-full rounded-xl border-2 bg-white p-4 shadow-sm">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Check-in
                </div>
                <div className="mt-0.5 text-sm font-medium">Thu, Jun 12</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Check-out
                </div>
                <div className="mt-0.5 text-sm font-medium">Sun, Jun 15</div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
                const inRange = n >= 12 && n <= 15;
                const isStart = n === 12;
                const isEnd = n === 15;
                return (
                  <div
                    key={n}
                    className={`flex h-8 items-center justify-center rounded-md ${
                      inRange
                        ? isStart || isEnd
                          ? "bg-brand text-white"
                          : "bg-brand/15 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {n}
                  </div>
                );
              })}
            </div>
          </div>
        </State>
      </Group>

      <Group name="Price range slider" file="src/components/browse/price-range-slider.tsx">
        <State label="$50 – $240">
          <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0</span>
              <span className="font-medium text-foreground">$50 – $240</span>
              <span>$500+</span>
            </div>
            <div className="relative mt-2 h-1.5 rounded-full bg-muted">
              <div
                className="absolute top-0 h-1.5 rounded-full bg-brand"
                style={{ left: "10%", right: "52%" }}
              />
              <div
                className="absolute -top-1.5 h-4 w-4 rounded-full border-2 border-brand bg-white shadow"
                style={{ left: "10%", marginLeft: "-8px" }}
              />
              <div
                className="absolute -top-1.5 h-4 w-4 rounded-full border-2 border-brand bg-white shadow"
                style={{ left: "48%", marginLeft: "-8px" }}
              />
            </div>
          </div>
        </State>
      </Group>

      <Group name="Checkbox" file="—">
        <div className="grid grid-cols-2 gap-3">
          <State label="unchecked">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-2 accent-brand" />
              I agree to the terms
            </label>
          </State>
          <State label="checked">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-2 accent-brand"
              />
              I agree to the terms
            </label>
          </State>
          <State label="disabled">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" disabled className="h-4 w-4 rounded border-2" />
              Requires Inner Circle
            </label>
          </State>
          <State label="error">
            <label className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-2 border-danger accent-danger"
                />
                Accept cancellation policy
              </span>
              <span className="text-xs text-danger">Required to continue.</span>
            </label>
          </State>
        </div>
      </Group>

      <Group name="Radio group" file="—">
        <State label="vouch type">
          <fieldset className="w-full space-y-2">
            {[
              ["standard", "Standard", "15 base points"],
              ["inner_circle", "Inner circle", "25 base points"],
              ["platform_met", "Platform-met", "0.4× multiplier (post-stay)"],
            ].map(([val, label, blurb], i) => (
              <label
                key={val}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 shadow-sm transition ${
                  i === 0 ? "border-brand bg-brand/5" : "bg-white hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="vouch-type"
                  defaultChecked={i === 0}
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{blurb}</div>
                </div>
              </label>
            ))}
          </fieldset>
        </State>
      </Group>

      <Group name="Toggle / switch" file="—">
        <div className="grid grid-cols-2 gap-3">
          <State label="off">
            <ToggleSwitch on={false} label="Email notifications" />
          </State>
          <State label="on">
            <ToggleSwitch on label="SMS notifications" />
          </State>
        </div>
      </Group>

      <Group name="Select / dropdown" file="src/components/ui/select.tsx">
        <State label="default">
          <div className="w-full">
            <Label className="mb-1 block">Years known</Label>
            <Select>
              <SelectTrigger className="h-14 rounded-xl border-2 !bg-white px-4 font-medium shadow-sm">
                <SelectValue placeholder="How long have you known them?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lt1">Less than 1 year</SelectItem>
                <SelectItem value="1to3">1–3 years</SelectItem>
                <SelectItem value="3to5">3–5 years</SelectItem>
                <SelectItem value="5to10">5–10 years</SelectItem>
                <SelectItem value="10plus">10+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </State>
      </Group>

      <Group name="File upload" file="src/components/hosting/photo-uploader.tsx">
        <State label="drop zone">
          <div className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
            <div className="mb-2 rounded-full bg-brand/10 p-3 text-brand">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold">Drag photos here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              …or click to browse. JPG, PNG, HEIC up to 12MB.
            </p>
            <Button size="sm" className="mt-3">
              Choose files
            </Button>
          </div>
        </State>
        <State label="uploaded thumbs">
          <div className="grid w-full grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg border"
              >
                <div
                  className="h-full w-full bg-cover"
                  style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-${
                      ["1505691938895-1758d7feb511", "1493809842364-78817add7ffb", "1502672023488-70e25813eb80", "1560448204-e02f11c3d0e2"][i]
                    }?w=200&q=60)`,
                  }}
                />
                <button className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white">
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </State>
      </Group>
    </Section>
  );
}

function ToggleSwitch({ on, label }: { on: boolean; label: string }) {
  return (
    <label className="flex w-full items-center justify-between gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-brand" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

// ── Nav / header / footer ────────────────────────────────────────────

function NavSection() {
  return (
    <Section
      title="Nav, header, footer"
      blurb="Live components are server-coupled (Clerk, route data). The previews below show the structural styling without the data dependencies."
    >
      <Group
        name="Header (signed-in skeleton)"
        file="src/components/layout/desktop-nav.tsx"
        routes={["(global)"]}
      >
        <div className="w-full rounded-xl border bg-white p-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold text-brand">1° BNB</div>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground">Browse</span>
              <span className="cursor-pointer hover:text-foreground">Inbox</span>
              <span className="cursor-pointer hover:text-foreground">Trips</span>
              <span className="cursor-pointer hover:text-foreground">Hosting</span>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <Button variant="outline" size="sm">Vouch</Button>
              <div className="h-8 w-8 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </Group>

      <Group
        name="Mobile bottom nav"
        file="src/components/layout/mobile-nav.tsx"
        routes={["(global)"]}
      >
        <div className="mx-auto w-[375px] rounded-xl border bg-white p-3">
          <div className="flex items-center justify-around text-xs text-muted-foreground">
            {["Browse", "Inbox", "Trips", "Profile"].map((l, i) => (
              <span key={l} className={i === 0 ? "text-brand font-medium" : ""}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </Group>

      <Group
        name="Impersonation bar (admin)"
        file="src/components/admin/ImpersonationBar.tsx"
        routes={["(global, gated)"]}
      >
        <div className="rounded-md bg-purple-600 px-4 py-1 text-xs font-medium text-white shadow-md">
          Impersonating <strong>Sarah M.</strong> (signed in as Loren) ·{" "}
          <span className="underline">← Return to real user</span>
        </div>
      </Group>
    </Section>
  );
}

// ── Inbox & messaging ────────────────────────────────────────────────

function InboxSection() {
  return (
    <Section
      title="Inbox & messaging"
      blurb="Thread row, intro request variant, empty inbox."
    >
      <Group
        name="Thread row"
        file="src/components/inbox/inbox-list.tsx"
        routes={["/inbox", "/inbox/[threadId]"]}
      >
        <div className="space-y-2">
          <ThreadRow title="Sarah Mendel" preview="Sounds good — let me check…" unread />
          <ThreadRow title="Mike Tran" preview="Thanks for the intro!" />
          <ThreadRow
            title="Intro request · Cabin in Tahoe"
            preview="Loren wants an introduction to host…"
            badge="Intro"
          />
        </div>
      </Group>

      <Group name="Empty inbox" file="src/components/inbox/inbox-list.tsx">
        <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
          <p className="font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse a listing and message a host to start your first thread.
          </p>
          <Button className="mt-4">Browse stays</Button>
        </div>
      </Group>
    </Section>
  );
}

function ThreadRow({
  title,
  preview,
  unread,
  badge,
}: {
  title: string;
  preview: string;
  unread?: boolean;
  badge?: string;
}) {
  const initials = title
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // Deterministic avatar seed from title so the showcase thread rows
  // don't look like empty skeletons.
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-card">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={fakeAvatar(title)} alt={title} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{title}</p>
          {badge && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
              {badge}
            </span>
          )}
        </div>
        <p
          className={`truncate text-sm ${
            unread ? "font-semibold text-foreground" : "text-muted-foreground"
          }`}
        >
          {preview}
        </p>
      </div>
      {unread && <span className="h-2 w-2 rounded-full bg-brand" />}
    </div>
  );
}

// ── Trips & reviews ──────────────────────────────────────────────────

function TripsSection() {
  return (
    <Section
      title="Trips & reviews"
      blurb="Reservation card variants, payment-arrangement card, review form sketch."
    >
      <Group
        name="Reservation card"
        file="src/components/trips/trips-list.tsx"
        routes={["/trips"]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {([
            ["Pending", "amber", "Confirm with host on Venmo"],
            ["Accepted", "emerald", "Trip Jun 12–18 · Confirmed"],
            ["Declined", "zinc", "Host wasn't available — try other dates"],
            ["Completed", "brand", "Leave a review for Sarah"],
          ] as const).map(([label, tone, sub]) => (
            <div key={label} className="rounded-xl border bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Stinson Beach cabin</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    tone === "amber"
                      ? "bg-amber-100 text-amber-800"
                      : tone === "emerald"
                      ? "bg-emerald-100 text-emerald-800"
                      : tone === "zinc"
                      ? "bg-zinc-200 text-zinc-700"
                      : "bg-brand-50 text-brand"
                  }`}
                >
                  {label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </Group>

      <Group
        name="Review form (host-to-guest)"
        file="src/components/trips/review-modal.tsx"
        routes={["/trips/[bookingId]"]}
      >
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <p className="font-semibold">Rate Sarah as a guest</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`text-2xl ${n <= 4 ? "text-amber-400" : "text-zinc-300"}`}
              >
                ★
              </span>
            ))}
          </div>
          <Textarea
            placeholder="What was Sarah like as a guest?"
            rows={3}
            className="rounded-xl border-2 !bg-white px-4 py-3 shadow-sm font-medium"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost">Skip</Button>
            <Button>Submit review</Button>
          </div>
        </div>
      </Group>
    </Section>
  );
}

// ── Thread structured cards ──────────────────────────────────────────
// Styled mocks — the real cards (TermsOfferedCard, PaymentDueCard,
// IntroRequestCard, etc.) make server calls on mount, so inlining them
// here requires fake API routes. These previews replicate the visual
// structure so Loren can iterate on tone + layout in the sandbox and
// push changes to the canonical components afterward.

function ThreadCardsSection() {
  return (
    <Section
      title="Thread structured cards"
      blurb="System-posted cards that appear inline inside a /inbox/[threadId]. Mocks match canonical styling — apply sandbox overrides and both previews + live threads respond in lockstep."
    >
      <Group
        name="TermsOfferedCard (post-S2, guest view · pending)"
        file="src/components/booking/ThreadTermsCards.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <TermsOfferedCardMock role="guest" accepted={false} />
      </Group>
      <Group
        name="TermsOfferedCard (guest view · accepted + collapsed)"
        file="src/components/booking/ThreadTermsCards.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <TermsOfferedCardMock role="guest" accepted />
      </Group>
      <Group
        name="TermsOfferedCard (host view · pending)"
        file="src/components/booking/ThreadTermsCards.tsx"
      >
        <TermsOfferedCardMock role="host" accepted={false} />
      </Group>

      <Group
        name="TermsAcceptedCard"
        file="src/components/booking/ThreadTermsCards.tsx"
      >
        <TermsAcceptedCardMock />
      </Group>

      <Group
        name="PaymentDueCard"
        file="src/components/booking/ThreadTermsCards.tsx"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentEventCardMock variant="due" />
          <PaymentEventCardMock variant="claimed" />
        </div>
        <PaymentEventCardMock variant="confirmed" />
      </Group>

      <Group
        name="IntroRequestCard (post-S2a)"
        file="src/components/trust/IntroRequestCard.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <IntroRequestCardMock status="pending" />
        <IntroRequestCardMock status="accepted" />
        <IntroRequestCardMock status="declined" />
      </Group>

      <Group
        name="IssueReportCard (S4-C5)"
        file="src/components/stay/IssueReportCard.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <IssueReportCardMock />
      </Group>

      <Group
        name="PhotoRequestCard (S4-C5)"
        file="src/components/stay/PhotoRequestCard.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <PhotoRequestCardMock />
      </Group>
    </Section>
  );
}

function CardShell({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "amber" | "emerald" | "rose";
}) {
  const border =
    tone === "amber"
      ? "border-amber-300"
      : tone === "emerald"
        ? "border-emerald-300"
        : tone === "rose"
          ? "border-rose-300"
          : "border-border";
  return (
    <div
      className={`mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 ${border} bg-white shadow-sm`}
    >
      {children}
    </div>
  );
}

function TermsOfferedCardMock({
  role,
  accepted,
}: {
  role: "guest" | "host";
  accepted: boolean;
}) {
  return (
    <CardShell>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {role === "guest"
              ? "Sarah approved your stay"
              : "You approved Loren's stay"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Here are the full terms for this reservation.
          </div>
        </div>
        {accepted && (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {!accepted && (
        <>
          <SectionHeader label="Trip details" />
          <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <FieldTile icon={CalendarDays} label="Check-in" value="Thu, Jun 12" />
            <FieldTile icon={CalendarDays} label="Checkout" value="Sun, Jun 15" />
            <FieldTile icon={Users} label="Guests" value="2 guests" />
          </div>
          <SectionHeader label="Total" />
          <div className="space-y-1 px-4 py-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>3 nights × $165</span>
              <span>$495</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Cleaning fee</span>
              <span>$50</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>$545</span>
            </div>
          </div>
          <SectionHeader label="Cancellation policy" />
          <div className="p-4 text-xs text-muted-foreground">
            <p>
              Flexible · free cancellation up to 7 days before check-in. After
              that, full charge applies.
            </p>
          </div>
        </>
      )}

      {role === "guest" &&
        (accepted ? (
          <div className="flex items-center gap-3 border-t border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Check className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-900">
                Reservation confirmed
              </div>
              <div className="text-xs text-emerald-800/80">
                You accepted these terms on Apr 20, 2026.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 border-t border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Accepting confirms you&apos;ve read and agree to these terms.
            </p>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
              <Check className="h-4 w-4" />
              Accept terms &amp; confirm reservation
            </button>
          </div>
        ))}
      {role === "host" && !accepted && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Waiting for Loren to confirm these terms.
        </div>
      )}
    </CardShell>
  );
}

function TermsAcceptedCardMock() {
  return (
    <CardShell tone="emerald">
      <div className="flex items-center gap-3 bg-emerald-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-emerald-900">
            Reservation confirmed
          </div>
          <div className="text-xs text-emerald-800/80">
            Loren accepted these terms on Apr 20, 2026 · Jun 12–15 · 2 guests
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function PaymentEventCardMock({
  variant,
}: {
  variant: "due" | "claimed" | "confirmed";
}) {
  const copy = {
    due: {
      icon: <DollarSign className="h-4 w-4" />,
      iconBg: "bg-amber-100 text-amber-800",
      title: "Payment 1 of 2 due",
      sub: "Pay Sarah $200 by Jun 5 · Venmo @sarahm",
      action: (
        <button className="inline-flex items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">
          I paid
        </button>
      ),
      bg: "bg-amber-50 border-amber-200",
    },
    claimed: {
      icon: <Handshake className="h-4 w-4" />,
      iconBg: "bg-sky-100 text-sky-800",
      title: "Loren marked payment 1 of 2 paid",
      sub: "Waiting for Sarah to confirm receipt.",
      action: (
        <button className="inline-flex items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">
          Confirm received
        </button>
      ),
      bg: "bg-sky-50 border-sky-200",
    },
    confirmed: {
      icon: <Receipt className="h-4 w-4" />,
      iconBg: "bg-emerald-100 text-emerald-800",
      title: "Payment 1 of 2 received",
      sub: "Sarah confirmed $200 received · Jun 5, 2026",
      action: (
        <button className="text-xs font-medium text-muted-foreground underline">
          Unmark
        </button>
      ),
      bg: "bg-emerald-50 border-emerald-200",
    },
  }[variant];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border-2 p-4 ${copy.bg}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${copy.iconBg}`}
      >
        {copy.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{copy.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{copy.sub}</div>
      </div>
      {copy.action}
    </div>
  );
}

function IntroRequestCardMock({
  status,
}: {
  status: "pending" | "accepted" | "declined";
}) {
  const badge =
    status === "accepted"
      ? {
          label: "Accepted",
          className: "bg-emerald-100 text-emerald-800",
        }
      : status === "declined"
        ? { label: "Declined", className: "bg-zinc-200 text-zinc-700" }
        : { label: "Pending", className: "bg-amber-100 text-amber-800" };
  return (
    <CardShell>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Handshake className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Intro request</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            From <strong>Loren Polster</strong> · 2° via Sarah &amp; Mike · Jun 12–15
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm">
          &ldquo;Hey Priya — would love an intro to the owner of the Stinson
          cabin. Planning a family weekend for 2 adults.&rdquo;
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {["Sarah Mendel", "Mike Tran"].map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-1 text-xs"
            >
              <span className="h-5 w-5 rounded-full bg-muted" />
              {n}
            </span>
          ))}
        </div>
      </div>
      {status === "pending" && (
        <div className="flex gap-2 border-t border-border bg-muted/30 p-3">
          <button className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white">
            Accept intro
          </button>
          <button className="flex-1 rounded-lg border bg-white py-2 text-sm font-semibold">
            Decline
          </button>
        </div>
      )}
      {status === "accepted" && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          You introduced Loren on Apr 18, 2026.
        </div>
      )}
      {status === "declined" && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <XCircle className="h-4 w-4" />
          You declined this intro on Apr 18, 2026.
        </div>
      )}
    </CardShell>
  );
}

function IssueReportCardMock() {
  return (
    <CardShell tone="rose">
      <div className="flex items-start gap-3 bg-rose-50 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-rose-900">
            Issue reported
          </div>
          <div className="mt-0.5 text-xs text-rose-800/80">
            Loren flagged this stay · Apr 22, 2026 · 1DB admin will reach out.
          </div>
        </div>
      </div>
      <div className="border-t border-rose-200 p-4 text-sm">
        <p>
          &ldquo;Linens weren&apos;t as described — kitchen was unclean on
          arrival. I&apos;ve documented with photos.&rdquo;
        </p>
      </div>
    </CardShell>
  );
}

function PhotoRequestCardMock() {
  return (
    <CardShell>
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Sarah requested photos</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            &ldquo;Mind sharing a shot of the living room?&rdquo;
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-muted/30 p-3">
        <Button size="sm" className="w-full">
          Upload photos
        </Button>
      </div>
    </CardShell>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 bg-muted/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
  );
}

function FieldTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

// ── Trip timeline ────────────────────────────────────────────────────

function TimelineSection() {
  const fullStages: TimelineStage[] = [
    {
      key: "requested",
      label: "Request sent",
      status: "done",
      at: "2026-04-12T10:00:00Z",
      detail: "Loren → Sarah · 3 nights, 2 guests",
    },
    {
      key: "terms_sent",
      label: "Host approved",
      status: "done",
      at: "2026-04-13T14:22:00Z",
      detail: "Sarah sent final terms",
    },
    {
      key: "terms_accepted",
      label: "Terms accepted",
      status: "done",
      at: "2026-04-13T17:40:00Z",
      detail: "Reservation confirmed · $545",
    },
    {
      key: "payment",
      label: "Payment 1 of 2",
      status: "current",
      at: null,
      detail: "Due Jun 5 · $200",
    },
    {
      key: "payment",
      label: "Payment 2 of 2",
      status: "upcoming",
      at: null,
      detail: "Due Jun 11 · $345",
    },
    {
      key: "checked_in",
      label: "Checked in",
      status: "upcoming",
      at: null,
      detail: null,
    },
    {
      key: "checked_out",
      label: "Checked out",
      status: "upcoming",
      at: "2026-06-15",
      detail: null,
    },
    {
      key: "reviewed",
      label: "Reviewed",
      status: "upcoming",
      at: null,
      detail: null,
    },
  ];

  return (
    <Section
      title="Trip timeline"
      blurb="Live TripTimeline component with mock stages. Collapsed view hides the tail until tapped — expanded view shows every stage resolveStages produced."
    >
      <Group
        name="TripTimeline · expanded (full)"
        file="src/components/booking/TripTimeline.tsx"
        routes={["/trips/[bookingId]"]}
      >
        <div className="mx-auto max-w-xl">
          <TripTimeline stages={fullStages} />
        </div>
      </Group>
      <Group
        name="TripTimeline · compact (inbox sidebar)"
        file="src/components/booking/TripTimeline.tsx"
        routes={["/inbox/[threadId]"]}
      >
        <div className="mx-auto max-w-sm">
          <TripTimeline stages={fullStages} compact />
        </div>
      </Group>
      <Group
        name="TripTimeline · declined (terminal)"
        file="src/components/booking/TripTimeline.tsx"
      >
        <div className="mx-auto max-w-xl">
          <TripTimeline
            stages={[
              {
                key: "requested",
                label: "Request sent",
                status: "done",
                at: "2026-04-12T10:00:00Z",
                detail: null,
              },
              {
                key: "declined",
                label: "Declined",
                status: "done",
                at: "2026-04-13T09:00:00Z",
                detail: "Sarah declined — dates not available",
              },
            ]}
          />
        </div>
      </Group>
    </Section>
  );
}

// ── Proposals ────────────────────────────────────────────────────────

function ProposalsSection() {
  return (
    <Section
      title="Proposals"
      blurb="Trip Wishes (guests asking) and Host Offers (hosts pitching). Rendered live from ProposalCard with fixtures covering the kind × trust × hook matrix."
    >
      <Group
        name="ProposalCard · Trip Wish (1° direct vouch)"
        file="src/components/proposals/proposal-card.tsx"
        routes={["/proposals", "/profile/[id]"]}
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[0]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="ProposalCard · Host Offer (2°, discount hook, with listing)"
        file="src/components/proposals/proposal-card.tsx"
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[1]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="ProposalCard · Host Offer (3°, trade hook, with listing)"
        file="src/components/proposals/proposal-card.tsx"
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[2]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="ProposalCard · Trip Wish (4°, no hook)"
        file="src/components/proposals/proposal-card.tsx"
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[3]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="ProposalCard · Host Offer (1° direct, discount, last-minute)"
        file="src/components/proposals/proposal-card.tsx"
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[4]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="ProposalCard · Own proposal (viewer is author)"
        file="src/components/proposals/proposal-card.tsx"
      >
        <div className="mx-auto max-w-xl">
          <ProposalCard proposal={sampleProposals[5]} viewerId={DEV_VIEWER_ID} />
        </div>
      </Group>
      <Group
        name="Proposals grid · 2-col layout (as on /proposals)"
        file="src/app/(app)/proposals/page.tsx"
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sampleProposals.slice(0, 4).map((p) => (
            <li key={p.row.id}>
              <ProposalCard proposal={p} viewerId={DEV_VIEWER_ID} />
            </li>
          ))}
        </ul>
      </Group>
    </Section>
  );
}

// ── Listing (live, gated variants) ───────────────────────────────────

function ListingFullSection() {
  return (
    <Section
      title="Listing card · live variants"
      blurb="LiveListingCard is the browse-grid card with access-aware branching: full → clickable detail; preview → opens GatedListingDialog; gated no-preview → locked card. Save (heart) calls /api/wishlists on click — expect an error toast here since we're outside the signed-in flow."
    >
      <Group
        name="LiveListingCard · full access (1° trusted)"
        file="src/components/browse/live-listing-card.tsx"
        routes={["/browse", "/wishlists/[id]"]}
      >
        <div className="mx-auto max-w-sm">
          <LiveListingCard
            listing={sampleBrowseListingFull}
            trust={sampleTrustFull}
            isSignedIn
          />
        </div>
      </Group>
      <Group
        name="LiveListingCard · preview only (3° via 2 connectors)"
        file="src/components/browse/live-listing-card.tsx"
      >
        <div className="mx-auto max-w-sm">
          <LiveListingCard
            listing={sampleBrowseListingPreview}
            trust={sampleTrustPreview}
            isSignedIn
          />
        </div>
      </Group>
      <Group
        name="LiveListingCard · gated, no preview (0° network)"
        file="src/components/browse/live-listing-card.tsx"
      >
        <div className="mx-auto max-w-sm">
          <LiveListingCard
            listing={sampleBrowseListingGated}
            trust={sampleTrustGated}
            isSignedIn
          />
        </div>
      </Group>
      <Group
        name="Browse grid · 4-column (desktop)"
        file="src/components/browse/browse-grid.tsx"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LiveListingCard
            listing={sampleBrowseListingFull}
            trust={sampleTrustFull}
            isSignedIn
          />
          <LiveListingCard
            listing={sampleBrowseListingPreview}
            trust={sampleTrustPreview}
            isSignedIn
          />
          <LiveListingCard
            listing={{ ...sampleBrowseListingFull, id: "browse-4", title: "Desert cabin · Joshua Tree" }}
            trust={{ ...sampleTrustFull, degree: 2, trust_score: 62 }}
            isSignedIn
          />
          <LiveListingCard
            listing={sampleBrowseListingGated}
            trust={sampleTrustGated}
            isSignedIn
          />
        </div>
      </Group>
    </Section>
  );
}

// ── Profile badge (3 sizes + interactions) ───────────────────────────

function ProfileBadgeSection() {
  return (
    <Section
      title="Profile badges"
      blurb="The three badge sizes that represent a person across the app: micro (inline / avatars), medium (cards / rows), and full (hero / profile header)."
    >
      <Group
        name="Profile badge · micro (inline mention)"
        file="src/components/ui/avatar.tsx + trust/trust-tag.tsx"
        routes={["inbox rows, proposal headers, message senders"]}
      >
        <div className="grid grid-cols-2 gap-3">
          <State label="1° direct">
            <ProfileBadgeMicro
              name="Sarah Mendel"
              avatarSeed="sarah"
              degree={1}
            />
          </State>
          <State label="2° via connectors">
            <ProfileBadgeMicro
              name="Priya Shah"
              avatarSeed="priya"
              degree={2}
              score={68}
            />
          </State>
          <State label="3° distant">
            <ProfileBadgeMicro
              name="Alex Kim"
              avatarSeed="alex"
              degree={3}
              score={42}
            />
          </State>
          <State label="0° not connected">
            <ProfileBadgeMicro
              name="Chris Vega"
              avatarSeed="chris"
              degree={null}
            />
          </State>
        </div>
      </Group>

      <Group
        name="Profile badge · medium (card row)"
        file="profile mini-card style used across listing cards, proposals, thread rows"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <State label="1° direct vouch">
            <ProfileBadgeMedium
              name="Sarah Mendel"
              avatarSeed="sarah"
              degree={1}
              subtext="Vouched · 5 years known"
              hostRating={4.92}
              reviews={47}
            />
          </State>
          <State label="2° through Sarah + Mike">
            <ProfileBadgeMedium
              name="Priya Shah"
              avatarSeed="priya"
              degree={2}
              subtext="2 connectors"
              score={68}
            />
          </State>
          <State label="3° distant">
            <ProfileBadgeMedium
              name="Alex Kim"
              avatarSeed="alex"
              degree={3}
              subtext="3° via Sarah"
              score={42}
            />
          </State>
          <State label="0° not connected">
            <ProfileBadgeMedium
              name="Chris Vega"
              avatarSeed="chris"
              degree={null}
              subtext="Not connected"
            />
          </State>
        </div>
      </Group>

      <Group
        name="Profile badge · full (profile hero, 1° B&B)"
        file="src/app/(app)/profile/[id]/page.tsx header"
        routes={["/profile/[id]"]}
      >
        <div className="space-y-6">
          <ProfileBadgeFull
            name="Sarah Mendel"
            avatarSeed="sarah"
            degree={1}
            hostRating={4.92}
            reviews={47}
            memberSince={2023}
            location="San Francisco, CA"
            bio="Architect. Love dog-friendly places and off-grid cabins."
            ctaDirect="Update vouch"
          />
          <ProfileBadgeFull
            name="Priya Shah"
            avatarSeed="priya"
            degree={2}
            score={68}
            hostRating={4.6}
            reviews={18}
            memberSince={2024}
            location="Oakland, CA"
            bio="Frequent traveler. Hosts intermittently in the summer."
            ctaDirect="Vouch for Priya"
            showConnectors
          />
          <ProfileBadgeFull
            name="Alex Kim"
            avatarSeed="alex"
            degree={3}
            score={42}
            hostRating={4.3}
            reviews={6}
            memberSince={2025}
            location="Brooklyn, NY"
            bio="Photographer. Hosts a loft once a month."
            ctaDirect="Request intro"
          />
          <ProfileBadgeFull
            name="Chris Vega"
            avatarSeed="chris"
            degree={null}
            memberSince={2026}
            location="—"
            bio="Preview — full profile gated until 2° connection."
            ctaDirect={null}
          />
        </div>
      </Group>
    </Section>
  );
}

function ProfileBadgeMicro({
  name,
  avatarSeed,
  degree,
  score,
}: {
  name: string;
  avatarSeed: string;
  degree: 1 | 2 | 3 | 4 | null;
  score?: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-white px-2 py-1 shadow-sm">
      <Avatar className="h-5 w-5">
        <AvatarImage src={fakeAvatar(avatarSeed)} alt={name} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium">{name}</span>
      <TrustTag size="micro" degree={degree} score={score} />
    </div>
  );
}

function ProfileBadgeMedium({
  name,
  avatarSeed,
  degree,
  score,
  hostRating,
  reviews,
  subtext,
}: {
  name: string;
  avatarSeed: string;
  degree: 1 | 2 | 3 | 4 | null;
  score?: number;
  hostRating?: number;
  reviews?: number;
  subtext?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm">
      <Avatar className="h-12 w-12">
        <AvatarImage src={fakeAvatar(avatarSeed)} alt={name} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{name}</span>
          <TrustTag
            size="micro"
            degree={degree}
            score={score}
            hostRating={hostRating}
            hostReviewCount={reviews}
          />
        </div>
        {subtext && (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtext}</div>
        )}
      </div>
    </div>
  );
}

function ProfileBadgeFull({
  name,
  avatarSeed,
  degree,
  score,
  hostRating,
  reviews,
  memberSince,
  location,
  bio,
  ctaDirect,
  showConnectors,
}: {
  name: string;
  avatarSeed: string;
  degree: 1 | 2 | 3 | 4 | null;
  score?: number;
  hostRating?: number;
  reviews?: number;
  memberSince?: number;
  location?: string;
  bio?: string;
  ctaDirect: string | null;
  showConnectors?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
      <Avatar className="h-24 w-24">
        <AvatarImage src={fakeAvatar(avatarSeed)} alt={name} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-2xl font-semibold">{name}</h3>
          <TrustTag
            size="medium"
            degree={degree}
            score={score}
            hostRating={hostRating}
            hostReviewCount={reviews}
            showSubtext
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {memberSince && <span>Member since {memberSince}</span>}
          {location && <span>· {location}</span>}
          {hostRating && <span>· {hostRating.toFixed(2)}★ host rating ({reviews} reviews)</span>}
        </div>
        {bio && <p className="text-sm text-foreground/90">{bio}</p>}
        {showConnectors && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ConnectorAvatars
              connectors={[
                { id: "c1", name: "Sarah", avatar_url: fakeAvatar("sarah"), viewer_knows: true },
                { id: "c2", name: "Mike", avatar_url: fakeAvatar("mike"), viewer_knows: true },
              ]}
              size="h-6 w-6"
            />
            <span>2 connectors · Sarah Mendel, Mike Tran</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {ctaDirect && <Button className="w-full md:w-auto">{ctaDirect}</Button>}
        <Button variant="outline" className="w-full md:w-auto">
          Message
        </Button>
      </div>
    </div>
  );
}

// ── Pages · full-route compositions ──────────────────────────────────
//
// These previews render miniature versions of real app pages so Loren
// can see how individual components compose at route scale. Each page
// has a desktop (1440 artboard, scaled to fit) and a mobile (375
// artboard) frame. Interactive navigation is suppressed — these are
// visual previews. Clicking into a card inside a page preview is
// allowed to work where the component supports it (e.g. a carousel
// chevron), just not links.

function PagePreview({
  label,
  width,
  children,
}: {
  label: string;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {width}px
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border-2 border-border bg-surface/60 shadow-sm">
        <div
          className="origin-top-left"
          style={{
            width,
            // Scale 1440 down to fit common container widths; leave
            // mobile 1:1 so the real responsive rules fire.
            transform: width > 900 ? "scale(0.6)" : "none",
            transformOrigin: "top left",
            height: width > 900 ? 900 * 0.6 : undefined,
          }}
        >
          <div
            style={{
              width,
              height: width > 900 ? 900 : undefined,
              overflow: "auto",
            }}
            className="bg-white"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageBrowseSection() {
  return (
    <Section
      title="Page · /browse"
      blurb="Global nav (with portaled search + filters) over a 4-column grid of LiveListingCard on desktop; sticky search pill + 1-col stack on mobile."
    >
      <Group name="/browse · desktop (1440)" file="src/app/(app)/browse/page.tsx">
        <PagePreview label="desktop" width={1440}>
          <PageShell>
            <div className="px-20 py-6">
              <div className="grid grid-cols-4 gap-4">
                <LiveListingCard
                  listing={sampleBrowseListingFull}
                  trust={sampleTrustFull}
                  isSignedIn
                />
                <LiveListingCard
                  listing={sampleBrowseListingPreview}
                  trust={sampleTrustPreview}
                  isSignedIn
                />
                <LiveListingCard
                  listing={{
                    ...sampleBrowseListingFull,
                    id: "b3",
                    title: "Desert cabin · Joshua Tree",
                  }}
                  trust={{ ...sampleTrustFull, degree: 2, trust_score: 62 }}
                  isSignedIn
                />
                <LiveListingCard
                  listing={sampleBrowseListingGated}
                  trust={sampleTrustGated}
                  isSignedIn
                />
                {[4, 5, 6, 7].map((n) => (
                  <LiveListingCard
                    key={n}
                    listing={{
                      ...sampleBrowseListingFull,
                      id: `b${n}`,
                      title:
                        n === 4
                          ? "Cozy downtown loft"
                          : n === 5
                            ? "Lakefront A-frame"
                            : n === 6
                              ? "Treehouse studio"
                              : "Vineyard guest cottage",
                      price_min: 120 + n * 20,
                      price_max: 180 + n * 20,
                    }}
                    trust={{
                      ...sampleTrustFull,
                      degree: n % 2 === 0 ? 1 : 2,
                      trust_score: 90 - n * 4,
                    }}
                    isSignedIn
                  />
                ))}
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group name="/browse · mobile (375)" file="src/app/(app)/browse/page.tsx">
        <PagePreview label="mobile" width={375}>
          <PageShell mobile>
            <div className="sticky top-[56px] z-10 bg-white/95 px-4 py-2 backdrop-blur">
              <div className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 shadow-sm">
                <span className="text-xs text-muted-foreground">Where to?</span>
              </div>
            </div>
            <div className="space-y-4 px-4 py-4">
              <LiveListingCard
                listing={sampleBrowseListingFull}
                trust={sampleTrustFull}
                isSignedIn
              />
              <LiveListingCard
                listing={sampleBrowseListingPreview}
                trust={sampleTrustPreview}
                isSignedIn
              />
              <LiveListingCard
                listing={sampleBrowseListingGated}
                trust={sampleTrustGated}
                isSignedIn
              />
            </div>
          </PageShell>
        </PagePreview>
      </Group>
    </Section>
  );
}

function PageListingSection() {
  return (
    <Section
      title="Page · /listings/[id]"
      blurb="Photo gallery + 2-col layout (left content, sticky right booking sidebar) at desktop. On mobile, the booking card moves to a fixed bottom bar and sections stack. Two preview states: full access and gated preview."
    >
      <Group
        name="/listings/[id] · FULL access · desktop (1440)"
        file="src/app/(app)/listings/[id]/page.tsx"
      >
        <PagePreview label="full, desktop" width={1440}>
          <PageShell>
            <ListingDetailMock access="full" />
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/listings/[id] · GATED preview · desktop (1440)"
        file="src/components/listing/gated-listing-view.tsx"
      >
        <PagePreview label="gated, desktop" width={1440}>
          <PageShell>
            <ListingDetailMock access="gated" />
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/listings/[id] · FULL access · mobile (375)"
        file="src/app/(app)/listings/[id]/page.tsx"
      >
        <PagePreview label="full, mobile" width={375}>
          <PageShell mobile>
            <ListingDetailMock access="full" mobile />
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/listings/[id] · GATED preview · mobile (375)"
        file="src/components/listing/gated-listing-view.tsx"
      >
        <PagePreview label="gated, mobile" width={375}>
          <PageShell mobile>
            <ListingDetailMock access="gated" mobile />
          </PageShell>
        </PagePreview>
      </Group>
    </Section>
  );
}

function ListingDetailMock({
  access,
  mobile,
}: {
  access: "full" | "gated";
  mobile?: boolean;
}) {
  const photos = [
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=70",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=70",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=70",
  ];
  const isGated = access === "gated";
  return (
    <div className={mobile ? "pb-24" : "px-20 py-6"}>
      {!mobile && (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">
            {isGated
              ? "Private listing in Stinson Beach, CA"
              : "Sun-drenched studio with garden access"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGated ? "Preview — request access for full details." : "4.92 · 47 reviews · Mission District, San Francisco"}
          </p>
        </div>
      )}
      <div
        className={
          mobile
            ? "aspect-[4/3] w-full overflow-hidden"
            : "grid aspect-[2/1] w-full grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-2xl"
        }
      >
        <div
          className={mobile ? "h-full w-full bg-cover bg-center" : "col-span-2 row-span-2 bg-cover bg-center"}
          style={{ backgroundImage: `url(${photos[0]})`, filter: isGated ? "blur(8px)" : "none" }}
        />
        {!mobile && (
          <>
            <div
              className="bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[1]})`, filter: isGated ? "blur(8px)" : "none" }}
            />
            <div
              className="bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[2]})`, filter: isGated ? "blur(8px)" : "none" }}
            />
            <div
              className="bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[0]})`, filter: isGated ? "blur(8px)" : "none" }}
            />
            <div
              className="bg-cover bg-center"
              style={{ backgroundImage: `url(${photos[1]})`, filter: isGated ? "blur(8px)" : "none" }}
            />
          </>
        )}
      </div>
      {mobile && (
        <div className="px-4 pt-4">
          <h1 className="text-lg font-semibold">
            {isGated
              ? "Private listing in Stinson Beach, CA"
              : "Sun-drenched studio · Mission"}
          </h1>
          <p className="text-xs text-muted-foreground">
            4.92 · 47 reviews · Mission District, SF
          </p>
        </div>
      )}

      <div
        className={
          mobile
            ? "space-y-5 px-4 pt-4"
            : "mt-8 grid grid-cols-3 gap-10"
        }
      >
        <div className={mobile ? "" : "col-span-2 space-y-6"}>
          <div className="flex items-center gap-3 rounded-2xl border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={fakeAvatar("sarah")} alt="host" />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {isGated ? "Host identity hidden" : "Hosted by Sarah Mendel"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isGated ? "Preview mode" : "Superhost · 4.92★ (47 reviews)"}
              </div>
            </div>
            {!isGated && (
              <TrustTag size="micro" degree={1} hostRating={4.92} hostReviewCount={47} />
            )}
          </div>

          {isGated ? (
            <div className="rounded-2xl border-2 border-dashed p-6 text-sm">
              <p className="font-semibold">About this space (preview)</p>
              <p className="mt-1 text-muted-foreground">
                Hidden hillside cabin with ocean views. Full details unlocked
                once you&apos;re introduced to the host or reach 2° trust.
              </p>
              <div className="mt-4 flex gap-2">
                <Button>Request intro</Button>
                <Button variant="outline">Ask a connector</Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold">About this space</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bright studio with a private patio, walkable to Mission
                  restaurants and Dolores Park. Dedicated workspace + quiet
                  residential block.
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Amenities</h2>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {["Wi-Fi", "Kitchen", "Washer", "Dedicated workspace"].map(
                    (a) => (
                      <div key={a} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        {a}
                      </div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={mobile ? "" : "col-span-1"}>
          <div
            className={
              mobile
                ? "fixed inset-x-0 bottom-0 z-20 border-t bg-white p-3 shadow-lg"
                : "sticky top-6 rounded-2xl border bg-white p-5 shadow-sm"
            }
          >
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-semibold">$165</span>
                <span className="text-sm text-muted-foreground"> / night</span>
              </div>
              {!isGated && (
                <span className="text-xs text-muted-foreground">
                  ★ 4.92 · 47
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-2">
                <div className="text-[10px] uppercase text-muted-foreground">
                  Check-in
                </div>
                <div>Add date</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-[10px] uppercase text-muted-foreground">
                  Check-out
                </div>
                <div>Add date</div>
              </div>
            </div>
            <Button className="mt-3 w-full">
              {isGated ? "Request intro" : "Contact host"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              1° B&amp;B doesn&apos;t process payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageProfileSection() {
  return (
    <Section
      title="Page · /profile/[id]"
      blurb="Profile header (hero badge) + bio + reviews + their proposals + their listings. Max-width 1040px container."
    >
      <Group
        name="/profile/[id] · 1° direct (full view) · desktop"
        file="src/app/(app)/profile/[id]/page.tsx"
      >
        <PagePreview label="desktop" width={1440}>
          <PageShell>
            <div className="mx-auto max-w-[1040px] px-6 py-10 space-y-8">
              <ProfileBadgeFull
                name="Sarah Mendel"
                avatarSeed="sarah"
                degree={1}
                hostRating={4.92}
                reviews={47}
                memberSince={2023}
                location="San Francisco, CA"
                bio="Architect. Love dog-friendly places and off-grid cabins."
                ctaDirect="Update vouch"
              />
              <div>
                <h2 className="mb-4 text-lg font-semibold">Reviews (47)</h2>
                <div className="grid grid-cols-2 gap-4">
                  {["Loren Polster", "Mike Tran"].map((n) => (
                    <div key={n} className="rounded-2xl border bg-white p-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={fakeAvatar(n)} alt={n} />
                          <AvatarFallback>{n[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-semibold">{n}</div>
                          <div className="text-xs text-muted-foreground">
                            Feb 2026 · 5★
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Wonderful host — very welcoming + prompt to respond.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-4 text-lg font-semibold">Their proposals</h2>
                <ul className="grid grid-cols-2 gap-4">
                  {sampleProposals.slice(0, 2).map((p) => (
                    <li key={p.row.id}>
                      <ProposalCard proposal={p} viewerId={DEV_VIEWER_ID} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/profile/[id] · 0° preview · desktop"
        file="src/app/(app)/profile/[id]/page.tsx"
      >
        <PagePreview label="preview, desktop" width={1440}>
          <PageShell>
            <div className="mx-auto max-w-[1040px] px-6 py-10 space-y-8">
              <ProfileBadgeFull
                name="Chris Vega"
                avatarSeed="chris"
                degree={null}
                memberSince={2026}
                location="—"
                bio="Preview — full profile gated until 2° connection. Join via an introduction or mutual vouch."
                ctaDirect={null}
              />
              <div className="rounded-2xl border-2 border-dashed p-6 text-sm">
                <p className="font-semibold">Reviews hidden</p>
                <p className="mt-1 text-muted-foreground">
                  Reach 2° trust to unlock Chris&apos;s review history and
                  connections.
                </p>
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/profile/[id] · 1° direct · mobile"
        file="src/app/(app)/profile/[id]/page.tsx"
      >
        <PagePreview label="mobile" width={375}>
          <PageShell mobile>
            <div className="space-y-6 px-4 py-6">
              <ProfileBadgeFull
                name="Sarah Mendel"
                avatarSeed="sarah"
                degree={1}
                hostRating={4.92}
                reviews={47}
                memberSince={2023}
                location="San Francisco, CA"
                bio="Architect. Love dog-friendly places."
                ctaDirect="Update vouch"
              />
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group
        name="/profile/[id] · 0° preview · mobile"
        file="src/app/(app)/profile/[id]/page.tsx"
      >
        <PagePreview label="preview, mobile" width={375}>
          <PageShell mobile>
            <div className="space-y-6 px-4 py-6">
              <ProfileBadgeFull
                name="Chris Vega"
                avatarSeed="chris"
                degree={null}
                memberSince={2026}
                location="—"
                bio="Preview — full profile gated until 2° connection."
                ctaDirect={null}
              />
              <div className="rounded-2xl border-2 border-dashed p-4 text-sm">
                <p className="font-semibold">Reviews hidden</p>
                <p className="mt-1 text-muted-foreground">
                  Reach 2° trust to unlock.
                </p>
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
    </Section>
  );
}

function PageInboxSection() {
  return (
    <Section
      title="Page · /inbox"
      blurb="Split-pane layout on desktop (list left, thread right). Mobile shows the list first; tapping a row navigates to /inbox/[threadId]."
    >
      <Group name="/inbox · desktop (1440)" file="src/app/(app)/inbox/page.tsx">
        <PagePreview label="desktop" width={1440}>
          <PageShell>
            <div className="mx-auto max-w-[1600px] px-6 py-6">
              <h1 className="mb-4 text-2xl font-semibold">Messages</h1>
              <div className="grid grid-cols-[350px_1fr] gap-6">
                <div className="space-y-2 rounded-2xl border bg-white p-3">
                  {[
                    ["Sarah Mendel", "Sounds good — let me check…", true],
                    ["Mike Tran", "Thanks for the intro!", false],
                    ["Intro · Stinson cabin", "Loren wants an intro…", false, "Intro"],
                  ].map(([n, p, unread, badge], i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-xl p-2 ${
                        i === 0 ? "bg-muted" : ""
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={fakeAvatar(n as string)} alt={n as string} />
                        <AvatarFallback>{(n as string)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold">{n as string}</p>
                          {badge && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                              {badge as string}
                            </span>
                          )}
                        </div>
                        <p
                          className={`truncate text-xs ${
                            unread ? "font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {p as string}
                        </p>
                      </div>
                      {unread && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border bg-white p-6">
                  <div className="border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={fakeAvatar("sarah")} alt="S" />
                        <AvatarFallback>S</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">Sarah Mendel</div>
                        <div className="text-xs text-muted-foreground">
                          about Sun-drenched studio · Jun 12–15
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 py-4">
                    <div className="max-w-[70%] rounded-2xl bg-muted p-3 text-sm">
                      Hi! We&apos;re hoping to visit in mid-June for 3 nights.
                    </div>
                    <div className="ml-auto max-w-[70%] rounded-2xl bg-brand p-3 text-sm text-white">
                      Those dates are open — let me send terms.
                    </div>
                    <div className="mx-auto my-2 max-w-md rounded-2xl border-2 border-emerald-300 bg-white p-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Sarah sent final terms
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 rounded-xl border p-2">
                      <span className="flex-1 text-sm text-muted-foreground">
                        Write a message…
                      </span>
                      <Button size="sm">Send</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group name="/inbox · mobile list (375)" file="src/app/(app)/inbox/page.tsx">
        <PagePreview label="mobile list" width={375}>
          <PageShell mobile>
            <div className="px-4 py-4">
              <h1 className="mb-3 text-xl font-semibold">Messages</h1>
              <div className="space-y-2">
                {[
                  ["Sarah Mendel", "Sounds good — let me check…", true],
                  ["Mike Tran", "Thanks for the intro!", false],
                ].map(([n, p, unread], i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border bg-white p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={fakeAvatar(n as string)} alt={n as string} />
                      <AvatarFallback>{(n as string)[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{n as string}</p>
                      <p
                        className={`truncate text-xs ${
                          unread ? "font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {p as string}
                      </p>
                    </div>
                    {unread && <span className="h-2 w-2 rounded-full bg-brand" />}
                  </div>
                ))}
              </div>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
    </Section>
  );
}

function PageProposalsSection() {
  return (
    <Section
      title="Page · /proposals"
      blurb="Header + filter tabs + 2-col grid of ProposalCard. Max-width 960px container. Same component is reused on /profile/[id] under the 'Their proposals' section."
    >
      <Group name="/proposals · desktop (1440)" file="src/app/(app)/proposals/page.tsx">
        <PagePreview label="desktop" width={1440}>
          <PageShell>
            <div className="mx-auto max-w-[960px] px-6 py-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold md:text-3xl">
                    Proposals in your network
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Trip Wishes and Host Offers from people you can see —
                    bounded by each post&apos;s preview network.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Alerts</Button>
                  <Button>Create</Button>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                {["All", "Trip Wishes", "Host Offers"].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      i === 0
                        ? "border-brand bg-brand/10 text-brand"
                        : "bg-white text-foreground"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-4">
                {sampleProposals.slice(0, 4).map((p) => (
                  <li key={p.row.id}>
                    <ProposalCard proposal={p} viewerId={DEV_VIEWER_ID} />
                  </li>
                ))}
              </ul>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
      <Group name="/proposals · mobile (375)" file="src/app/(app)/proposals/page.tsx">
        <PagePreview label="mobile" width={375}>
          <PageShell mobile>
            <div className="px-4 py-6">
              <h1 className="text-xl font-semibold">
                Proposals in your network
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Trip Wishes and Host Offers from people you can see — bounded
                by each post&apos;s preview network.
              </p>
              <div className="mt-4 flex gap-2">
                {["All", "Wishes", "Offers"].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      i === 0
                        ? "border-brand bg-brand/10 text-brand"
                        : "bg-white"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <ul className="mt-4 space-y-3">
                {sampleProposals.slice(0, 3).map((p) => (
                  <li key={p.row.id}>
                    <ProposalCard proposal={p} viewerId={DEV_VIEWER_ID} />
                  </li>
                ))}
              </ul>
            </div>
          </PageShell>
        </PagePreview>
      </Group>
    </Section>
  );
}

function PageShell({
  children,
  mobile,
}: {
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <div className="bg-white">
      <div
        className={`flex items-center justify-between border-b bg-white/90 ${
          mobile ? "px-4 py-3" : "px-20 py-3"
        }`}
      >
        <div className="text-sm font-semibold text-brand">1° B&amp;B</div>
        {!mobile ? (
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Browse</span>
            <span>Inbox</span>
            <span>Trips</span>
            <span>Hosting</span>
          </nav>
        ) : null}
        <div className="flex items-center gap-2">
          {!mobile && (
            <Button variant="outline" size="sm">
              Vouch
            </Button>
          )}
          <div className="h-7 w-7 rounded-full bg-muted" />
        </div>
      </div>
      {children}
      {mobile && (
        <div className="sticky bottom-0 border-t bg-white px-4 py-2">
          <div className="flex items-center justify-around text-[10px] text-muted-foreground">
            {["Browse", "Inbox", "Trips", "Profile"].map((l, i) => (
              <span key={l} className={i === 0 ? "text-brand font-medium" : ""}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
