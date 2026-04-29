import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, type LegalTocItem } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service · Trustead",
  description:
    "Terms of Service for Trustead, a private invite-only communications platform operated by Loren Polster LLC.",
  robots: { index: true, follow: true },
};

const TOC: LegalTocItem[] = [
  { id: "tos-1", label: "1. About Trustead" },
  { id: "tos-2", label: "2. Eligibility" },
  { id: "tos-3", label: "3. The Platform" },
  { id: "tos-4", label: "4. No fees during beta" },
  { id: "tos-5", label: "5. No payment processing" },
  { id: "tos-6", label: "6. No agency or brokerage" },
  { id: "tos-7", label: "7. No reservation service" },
  { id: "tos-8", label: "8. Trust signals" },
  { id: "tos-9", label: "9. Host responsibilities" },
  { id: "tos-10", label: "10. Non-discrimination" },
  { id: "tos-11", label: "11. User content" },
  { id: "tos-12", label: "12. Prohibited conduct" },
  { id: "tos-13", label: "13. Moderation" },
  { id: "tos-14", label: "14. Disputes between users" },
  { id: "tos-15", label: "15. Termination" },
  { id: "tos-16", label: "16. Indemnification" },
  { id: "tos-17", label: "17. Disclaimers" },
  { id: "tos-18", label: "18. Limitation of liability" },
  { id: "tos-19", label: "19. Arbitration" },
  { id: "tos-20", label: "20. Governing law" },
  { id: "tos-21", label: "21. Changes" },
  { id: "tos-22", label: "22. Miscellaneous" },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      effectiveDate="April 25, 2026"
      lastUpdated="April 25, 2026"
      toc={TOC}
    >
      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) are a binding agreement
        between you (&ldquo;you,&rdquo; &ldquo;your,&rdquo; or &ldquo;User&rdquo;)
        and Loren Polster LLC, a New York limited liability company doing business
        as Trustead (&ldquo;Trustead,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
        or &ldquo;our&rdquo;). By creating an account, accessing, or using the
        Trustead platform, including any website, web application, or
        communication service operated by Trustead (the &ldquo;Platform&rdquo;),
        you agree to these Terms. If you do not agree, do not use the Platform.
      </p>

      <p>
        <strong>IMPORTANT &mdash; ARBITRATION AND CLASS ACTION WAIVER.</strong>{" "}
        Section 19 contains a mandatory binding arbitration clause and
        class-action waiver. By accepting these Terms, you agree to resolve
        disputes with Trustead through individual arbitration and waive your
        right to participate in a class action or jury trial, except as
        expressly provided in Section 19.
      </p>

      <h2 id="tos-1">
        <span className="sec-num">1.</span>About Trustead.
      </h2>
      <p>
        Trustead operates a private, invite-only communications platform that
        allows adults in trust-based personal networks to connect with one
        another regarding short-term stays in private residences. Trustead is
        currently in a closed, free beta phase. Trustead is a neutral
        communications environment. It is not a broker, agent, fiduciary,
        booking service, reservation service, travel agency, money transmitter,
        payment processor, insurer, or guarantor. Users are solely responsible
        for their own listings, messages, representations, and any agreements
        or transactions they enter into with other Users.
      </p>

      <h2 id="tos-2">
        <span className="sec-num">2.</span>Eligibility and account registration.
      </h2>
      <p>
        2.1. You must be at least 18 years old and have the legal capacity to
        enter into a binding contract under the laws of your jurisdiction.
        Trustead is not directed to children under 13 and does not knowingly
        collect personal information from children under 13. If we learn that a
        User is under 13, we will terminate the account and delete associated
        information.
      </p>
      <p>
        2.2. You must provide accurate, current, and complete information during
        registration and keep it updated.
      </p>
      <p>
        2.3. You are responsible for maintaining the security of your account
        credentials and for all activity under your account.
      </p>
      <p>
        2.4. One account per person. You may not create accounts on behalf of
        another person without authorization or create multiple accounts to
        evade suspensions.
      </p>
      <p>
        2.5. Trustead may accept or decline any registration request, and may
        suspend or terminate accounts at any time and without notice, in its
        sole discretion.
      </p>

      <h2 id="tos-3">
        <span className="sec-num">3.</span>The Platform.
      </h2>
      <p>
        The Platform allows Users to: create profiles; list or view
        private-residence short-term stay opportunities posted by other Users
        (&ldquo;Listings&rdquo;); exchange messages; indicate availability via a
        calendar tool; vouch for other Users in their personal network; view
        algorithmically generated trust-signal displays derived from
        User-submitted information; and communicate requests and acceptances
        regarding potential stays. Trustead does not facilitate, confirm, hold,
        reserve, guarantee, or insure any stay, and does not process or handle
        any payments between Users.
      </p>

      <h2 id="tos-4">
        <span className="sec-num">4.</span>No fees during beta &mdash; direct or
        indirect.
      </h2>
      <p>
        4.1. During Trustead&rsquo;s free beta phase, Trustead does not charge,
        collect, or receive any fee from Users, directly or indirectly, for use
        of the Platform or in connection with any stay arranged through the
        Platform.
      </p>
      <p>
        4.2. Trustead does not derive advertising revenue, data-licensing
        revenue, sponsorship revenue, referral compensation, or any other
        monetary or non-monetary benefit from any stay or transaction between
        Users during the beta phase.
      </p>
      <p>
        4.3. Trustead reserves the right to introduce paid features or
        subscriptions in the future. If and when Trustead does so, Trustead will
        (a) comply with all applicable laws governing short-term rental
        platforms in every jurisdiction where paid features are enabled, and
        (b) provide Users with at least thirty (30) days&rsquo; advance notice
        and updated Terms before any fees take effect.
      </p>

      <h2 id="tos-5">
        <span className="sec-num">5.</span>No payment processing.
      </h2>
      <p>
        Trustead does not process, handle, hold, route, escrow, or otherwise
        touch any funds exchanged between Users. Trustead is not a money
        transmitter, money services business, payment processor, payment
        facilitator, or payment aggregator under federal, state, or local law,
        including 31 U.S.C. &sect; 5330 and 31 C.F.R. &sect; 1010.100(ff). All
        payments between Users are made directly between them through
        third-party services of their own choosing. Trustead has no visibility
        into, control over, or responsibility for any such payment.
      </p>

      <h2 id="tos-6">
        <span className="sec-num">6.</span>No agency, brokerage, or fiduciary
        relationship.
      </h2>
      <p>
        Trustead is not a party to any agreement between Users. Trustead is not
        a real estate broker, real estate salesperson, apartment information
        vendor, rental agent, travel agent, representative, fiduciary, insurer,
        or guarantor for any User or any transaction. Trustead does not hold
        itself out as performing, and does not perform, services for which a
        real estate brokerage, rental-agent, or apartment-information-vendor
        license is required under New York Real Property Law Article 12-A
        (including &sect; 441) or analogous statutes in any other jurisdiction.
        Trustead does not negotiate, arrange, or consummate rental transactions
        on behalf of Users. Nothing in these Terms, and no feature of the
        Platform, creates any agency, brokerage, or fiduciary relationship
        between Trustead and any User.
      </p>

      <h2 id="tos-7">
        <span className="sec-num">7.</span>No reservation service; no booking
        confirmation.
      </h2>
      <p>
        Any scheduling, calendar, availability, messaging, request, or
        acceptance feature on the Platform is provided solely as a
        communications tool. These features do not constitute a reservation
        system, booking engine, or confirmation service operated by Trustead.
        Trustead does not confirm, guarantee, record, reserve, or hold any stay
        on any User&rsquo;s behalf. When a Host indicates acceptance of a
        Guest&rsquo;s request through the Platform, that acceptance is a direct
        communication between the Host and the Guest. Any resulting agreement
        is formed exclusively between the Host and the Guest, on terms they
        negotiate and confirm directly, outside the Platform. Calendar entries,
        availability displays, and request-status indicators are informational
        only; they do not create, modify, or evidence any binding obligation on
        the part of Trustead, nor do they constitute offers, acceptances, or
        reservations by Trustead.
      </p>

      <h2 id="tos-8">
        <span className="sec-num">8.</span>Trust signals are user-generated, not
        verification.
      </h2>
      <p>
        The Platform displays trust signals, vouches, connection indicators,
        degree counts, trust scores, and similar algorithmic displays
        (collectively, &ldquo;Trust Signals&rdquo;). You acknowledge and agree
        that:
      </p>
      <p>
        (a) Trust Signals are generated algorithmically from information
        voluntarily submitted by Users, including self-reported relationships
        and vouches from other Users, and reflect only what other Users have
        chosen to share;
      </p>
      <p>
        (b) Trustead does not verify the accuracy, truth, or current validity
        of any vouch, relationship claim, identity assertion, or other
        User-submitted information underlying Trust Signals;
      </p>
      <p>
        (c) Trustead does not conduct identity verification, criminal background
        checks, credit checks, property-ownership verification, or any other
        independent diligence on Users;
      </p>
      <p>
        (d) Trust Signals are not certifications, endorsements, ratings, or
        guarantees by Trustead of any User&rsquo;s identity, character, safety,
        honesty, solvency, competence, or fitness for any purpose;
      </p>
      <p>
        (e) A high trust score, vouch, or connection does not mean a User is
        safe, trustworthy, or will perform as expected;
      </p>
      <p>
        (f) You are solely responsible for conducting your own independent due
        diligence before entering into any arrangement with another User,
        regardless of Trust Signals displayed on the Platform.
      </p>
      <p>
        Trustead expressly disclaims any duty to investigate or verify Users
        and any liability for harm arising from reliance on Trust Signals.
      </p>

      <h2 id="tos-9">
        <span className="sec-num">9.</span>Host representations and
        responsibilities.
      </h2>
      <p>
        If you create or maintain a Listing, you represent and warrant that:
      </p>
      <p>
        (a) You are the lawful owner or a lawful tenant of the listed
        residence, and you have the right under your lease, deed, mortgage,
        condominium declaration, cooperative proprietary lease, homeowners-
        association rules, and any other applicable agreements to offer
        short-term use of the residence;
      </p>
      <p>
        (b) You hold all registrations, permits, licenses, and authorizations
        required under applicable law to offer the residence for short-term
        use, including any short-term rental registration, primary-residence,
        night-cap, zoning, or occupancy-tax obligations;
      </p>
      <p>
        (c) You will collect, remit, and report all applicable taxes, including
        state and local sales, hotel occupancy, transient occupancy, and
        short-term rental taxes;
      </p>
      <p>
        (d) You will comply with all applicable fair housing, anti-
        discrimination, consumer protection, safety, fire-code, and health
        laws;
      </p>
      <p>
        (e) Your Listing is accurate, not misleading, and does not infringe the
        rights of any third party;
      </p>
      <p>
        (f) You will indemnify and hold harmless Trustead from any claim, loss,
        or penalty arising from your non-compliance with any of the foregoing,
        as further described in Section 16.
      </p>

      <h2 id="tos-10">
        <span className="sec-num">10.</span>Non-discrimination and Fair Housing.
      </h2>
      <p>
        10.1. Trustead is committed to a community free from unlawful
        discrimination. You may not discriminate against any other User on the
        basis of race, color, religion, national origin, ancestry, sex, gender,
        gender identity, sexual orientation, familial status, marital status,
        disability, age, source of income, veteran or military status, or any
        other characteristic protected by applicable federal, state, or local
        law.
      </p>
      <p>
        10.2. Hosts may not refuse to rent, impose different terms, decline a
        request, or otherwise treat a Guest less favorably on any protected
        basis. Hosts may not post Listings, messages, or descriptions that
        indicate a preference, limitation, or discrimination based on any
        protected characteristic.
      </p>
      <p>
        10.3. Trustead reserves the right to remove Listings, suspend accounts,
        and terminate Users who violate this Section 10 or applicable
        anti-discrimination laws.
      </p>

      <h2 id="tos-11">
        <span className="sec-num">11.</span>User content and license.
      </h2>
      <p>
        You retain all rights in content you submit to the Platform
        (&ldquo;User Content&rdquo;). By submitting User Content, you grant
        Trustead a worldwide, non-exclusive, royalty-free, transferable license
        to host, use, display, reproduce, modify for formatting, and distribute
        such User Content on and in connection with the Platform. You represent
        that you own or have the necessary rights in User Content you submit,
        and that User Content does not violate these Terms or any applicable
        law. You are solely responsible for your User Content. Under 47 U.S.C.
        &sect; 230(f)(3), Users (not Trustead) are the information content
        providers for User Content they submit.
      </p>

      <h2 id="tos-12">
        <span className="sec-num">12.</span>Prohibited conduct.
      </h2>
      <p>You may not, and may not authorize or enable others to:</p>
      <ul>
        <li>
          Use the Platform for any unlawful purpose or in violation of these
          Terms;
        </li>
        <li>
          Post false, fraudulent, misleading, defamatory, threatening,
          harassing, or infringing content;
        </li>
        <li>Discriminate against other Users in violation of Section 10;</li>
        <li>
          Solicit or process payments through the Platform itself or represent
          that Trustead is facilitating, confirming, or guaranteeing payments;
        </li>
        <li>Use the Platform to commit fraud, identity theft, or impersonation;</li>
        <li>
          Circumvent vouch, trust, or access mechanics, or manipulate Trust
          Signals;
        </li>
        <li>
          Scrape, harvest, or systematically extract data from the Platform;
        </li>
        <li>
          Send bulk, unsolicited, or commercial messages; distribute malware or
          harmful code;
        </li>
        <li>
          Attempt to access accounts or data you are not authorized to access;
        </li>
        <li>
          Use the Platform to facilitate any stay or transaction that violates
          applicable law, including short-term-rental registration,
          primary-residence, night-cap, zoning, tax, lease, condominium, or
          homeowners-association rules.
        </li>
      </ul>

      <h2 id="tos-13">
        <span className="sec-num">13.</span>Moderation discretion.
      </h2>
      <p>
        Trustead may, in its sole discretion and without liability or any
        obligation to give notice, remove, restrict, suspend, or limit access
        to any content, Listing, message, account, vouch, Trust Signal, or
        feature that Trustead determines in good faith to be objectionable,
        unlawful, inaccurate, harmful, or inconsistent with these Terms.
        Trustead does not commit to review, monitor, remove, or act on any
        specific content or report, and any moderation action (or inaction) is
        a matter of Trustead&rsquo;s editorial discretion. Trustead&rsquo;s
        failure to act on any particular content or report does not waive any
        right to act on other content or in the future. Trustead&rsquo;s
        moderation decisions are protected under 47 U.S.C. &sect; 230(c).
      </p>

      <h2 id="tos-14">
        <span className="sec-num">14.</span>Disputes between Users.
      </h2>
      <p>
        Any dispute between Users &mdash; including disputes over payment,
        cancellation, property damage, personal injury, refunds, or stay terms
        &mdash; is solely between those Users. Trustead does not mediate,
        arbitrate, adjudicate, insure, or guarantee the outcome of any such
        dispute, and has no liability arising from any such dispute.
      </p>

      <h2 id="tos-15">
        <span className="sec-num">15.</span>Termination.
      </h2>
      <p>
        You may close your account at any time by contacting{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a> or
        using any account-closure feature provided on the Platform. Trustead
        may suspend or terminate your access to the Platform at any time, with
        or without notice, for any reason, including violation of these Terms.
        Upon termination, Sections 5, 6, 7, 8, 11 (license), 14, 16, 17, 18,
        19, 20, and 22 survive.
      </p>

      <h2 id="tos-16">
        <span className="sec-num">16.</span>Indemnification.
      </h2>
      <p>
        You will defend, indemnify, and hold harmless Trustead, its affiliates,
        and its respective officers, members, managers, employees, contractors,
        and agents from and against any claim, liability, loss, damage,
        penalty, fine, cost, or expense (including reasonable attorneys&rsquo;
        fees) arising out of or relating to: (a) your use of the Platform;
        (b) any Listing, message, vouch, or other User Content you submit;
        (c) any stay, agreement, payment, or dispute between you and another
        User; (d) your violation of these Terms or any applicable law,
        including short-term-rental, tax, fair housing, or consumer protection
        laws; (e) your violation of any third-party right, including any lease,
        condominium declaration, cooperative agreement, or homeowners-
        association rule; and (f) any reliance placed by any person on Trust
        Signals displayed on the Platform.
      </p>

      <h2 id="tos-17">
        <span className="sec-num">17.</span>Disclaimers.
      </h2>
      <p>
        THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
        TRUSTEAD DISCLAIMS ALL WARRANTIES, INCLUDING ANY IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
        NON-INFRINGEMENT. TRUSTEAD DOES NOT WARRANT THAT THE PLATFORM WILL BE
        UNINTERRUPTED, SECURE, OR ERROR-FREE. TRUSTEAD MAKES NO REPRESENTATION
        OR WARRANTY REGARDING THE IDENTITY, CHARACTER, SAFETY, HONESTY,
        SOLVENCY, COMPETENCE, OR FITNESS OF ANY USER, OR THE ACCURACY OR
        LEGALITY OF ANY LISTING, TRUST SIGNAL, OR USER CONTENT. YOUR USE OF THE
        PLATFORM AND ANY RELIANCE ON USER CONTENT OR TRUST SIGNALS IS AT YOUR
        SOLE RISK.
      </p>

      <h2 id="tos-18">
        <span className="sec-num">18.</span>Limitation of liability.
      </h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL
        TRUSTEAD OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST
        PROFITS, LOST REVENUE, LOST DATA, BUSINESS INTERRUPTION, PERSONAL
        INJURY, PROPERTY DAMAGE, OR EMOTIONAL DISTRESS ARISING OUT OF OR
        RELATING TO THE PLATFORM, ANY USER CONTENT, ANY STAY, OR ANY DISPUTE
        BETWEEN USERS, REGARDLESS OF THE THEORY OF LIABILITY, EVEN IF ADVISED
        OF THE POSSIBILITY OF SUCH DAMAGES. TRUSTEAD&rsquo;S AGGREGATE
        LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR
        THE PLATFORM WILL NOT EXCEED ONE HUNDRED DOLLARS ($100). SOME
        JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN SUCH JURISDICTIONS,
        THE ABOVE LIMITATIONS APPLY TO THE MAXIMUM EXTENT PERMITTED.
      </p>

      <h2 id="tos-19">
        <span className="sec-num">19.</span>Binding arbitration and class-action
        waiver.
      </h2>
      <p>
        19.1. <strong>Agreement to arbitrate.</strong> You and Trustead agree
        that any dispute, claim, or controversy arising out of or relating to
        these Terms or the Platform (&ldquo;Dispute&rdquo;) will be resolved
        exclusively by binding individual arbitration administered by the
        American Arbitration Association (&ldquo;AAA&rdquo;) under its Consumer
        Arbitration Rules, rather than in court, except as provided below. The
        Federal Arbitration Act governs the interpretation and enforcement of
        this Section.
      </p>
      <p>
        19.2. <strong>Class-action waiver.</strong> You and Trustead waive any
        right to assert a Dispute as a class, collective, representative, or
        private-attorney-general action, and to a jury trial. The arbitrator
        may not consolidate Disputes and may not preside over any form of
        representative or class proceeding. If this class-action waiver is
        found unenforceable, then the entirety of this Section 19 is
        unenforceable and Disputes will proceed in court.
      </p>
      <p>
        19.3. <strong>Small-claims and injunctive carve-outs.</strong> Either
        party may bring an individual action in small-claims court for any
        Dispute within its jurisdictional limits. Either party may seek
        injunctive or equitable relief in court to prevent infringement or
        misuse of intellectual property or unauthorized access to the Platform.
      </p>
      <p>
        19.4. <strong>Notice of dispute.</strong> Before starting arbitration,
        the claiming party must send a written Notice of Dispute to the other
        party describing the nature of the Dispute and the relief sought. For
        Trustead, send to 367 St Marks Ave #1087, Brooklyn, NY 11238, Attn:
        Legal. The parties will attempt to resolve the Dispute in good faith
        within sixty (60) days.
      </p>
      <p>
        19.5. <strong>Arbitration location and fees.</strong> Arbitration will
        be conducted in New York, New York, or by video/telephonic hearing at
        the claimant&rsquo;s election. The arbitrator&rsquo;s decision will be
        final and binding, subject to limited judicial review under the Federal
        Arbitration Act. AAA rules govern fee allocation.
      </p>
      <p>
        19.6. <strong>30-day opt-out.</strong> You may opt out of this
        arbitration agreement by sending a written opt-out notice to{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>{" "}
        within thirty (30) days of first accepting these Terms, stating your
        name, account email, and clear intent to opt out. Opting out does not
        affect any other provision of these Terms.
      </p>

      <h2 id="tos-20">
        <span className="sec-num">20.</span>Governing law and venue.
      </h2>
      <p>
        These Terms are governed by the laws of the State of New York, without
        regard to conflict-of-laws principles. Subject to Section 19, the
        exclusive venue for any action not subject to arbitration is the state
        or federal courts located in New York County, New York, and you consent
        to personal jurisdiction there.
      </p>

      <h2 id="tos-21">
        <span className="sec-num">21.</span>Changes to these Terms.
      </h2>
      <p>
        Trustead may update these Terms from time to time. Material changes
        will be communicated by email to the address associated with your
        account, by in-Platform notice, or by updating the &ldquo;Last
        Updated&rdquo; date above. Continued use of the Platform after changes
        take effect constitutes acceptance of the updated Terms. If you do not
        agree to a change, you must stop using the Platform and may close your
        account.
      </p>

      <h2 id="tos-22">
        <span className="sec-num">22.</span>Miscellaneous.
      </h2>
      <p>
        22.1. <em>Entire agreement.</em> These Terms, together with the{" "}
        <Link href="/privacy">Privacy Policy</Link> and any additional terms
        agreed between you and Trustead, are the entire agreement between you
        and Trustead.
      </p>
      <p>
        22.2. <em>Severability.</em> If any provision is held unenforceable,
        the remaining provisions remain in effect, except as provided in
        Section 19.2.
      </p>
      <p>
        22.3. <em>No waiver.</em> A failure or delay by Trustead in enforcing
        any right is not a waiver of that right.
      </p>
      <p>
        22.4. <em>Assignment.</em> You may not assign these Terms without
        Trustead&rsquo;s written consent. Trustead may assign these Terms
        freely.
      </p>
      <p>
        22.5. <em>Notices to you.</em> We may give notice by email, in-Platform
        notice, or by posting on the Platform.
      </p>
      <p>
        22.6. <em>No third-party beneficiaries.</em> Except as expressly
        stated, these Terms do not create any third-party-beneficiary rights.
      </p>
      <p>
        22.7. <em>Contact.</em> Questions about these Terms:{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>, 367
        St Marks Ave #1087, Brooklyn, NY 11238.
      </p>
    </LegalPageShell>
  );
}
