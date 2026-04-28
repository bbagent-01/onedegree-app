import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Our Beta Status · Trustead",
  description:
    "Trustead is a private, invite-only communications platform in free beta. No fees, no payment processing, no guarantees.",
  robots: { index: true, follow: true },
};

export default function LegalStatusPage() {
  return (
    <LegalPageShell
      title="Our status: free beta"
      effectiveDate="April 25, 2026"
      lastUpdated="April 25, 2026"
    >
      <p>
        Trustead is a private, invite-only communications platform. We let
        adults in trust-based personal networks connect with one another about
        short-term stays in private residences. We are currently in a closed,
        free beta phase.
      </p>

      <p>
        <strong>During beta, Trustead:</strong>
      </p>
      <ul>
        <li>
          Does not charge any fees of any kind, directly or indirectly &mdash;
          no subscriptions, no per-booking fees, no tips, no paid features, no
          advertising revenue, no data sales, no sponsorships, and no other
          compensation tied to stays between Users.
        </li>
        <li>Does not process payments between Users.</li>
        <li>Does not hold, route, or handle any funds.</li>
        <li>Does not confirm, guarantee, reserve, or insure any stay.</li>
        <li>Does not act as a broker, agent, or fiduciary for any User.</li>
      </ul>

      <p>
        Hosts and Guests arrange all terms, payments, agreements, and disputes
        directly with one another. Trustead is a neutral communications
        environment, not a booking service, reservation service, hosting
        platform, or travel agency.
      </p>

      <p>
        <strong>Host responsibilities.</strong> Hosts remain fully responsible
        for complying with all applicable laws in their jurisdiction &mdash;
        including any short-term-rental registration, primary-residence rules,
        night caps, occupancy taxes, and lease, condominium, or
        homeowners-association restrictions. Trustead does not verify or
        warrant Host compliance.
      </p>

      <p>
        <strong>Our future plans.</strong> Trustead intends to introduce paid
        membership features in the future. Before we collect any fee, we will
        complete all platform-level registrations, verifications, and reporting
        required in every jurisdiction where we enable paid features, and we
        will update our Terms of Service and notify Users at least thirty (30)
        days before any paid tier launches.
      </p>

      <p>
        <strong>Questions.</strong> Regulators, press, and Users with questions
        can reach us at{" "}
        <a href="mailto:hello@staytrustead.com">hello@staytrustead.com</a>.
      </p>
    </LegalPageShell>
  );
}
