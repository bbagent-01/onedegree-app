import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPageShell,
  type LegalTocItem,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy · Trustead",
  description:
    "How Trustead collects, uses, and shares information about you. Operated by Loren Polster LLC.",
  robots: { index: true, follow: true },
};

const TOC: LegalTocItem[] = [
  { id: "pp-1", label: "1. Who we are" },
  { id: "pp-2", label: "2. Information we collect" },
  { id: "pp-3", label: "3. How we use information" },
  { id: "pp-4", label: "4. How we share" },
  { id: "pp-5", label: "5. Cookies" },
  { id: "pp-6", label: "6. Your rights" },
  { id: "pp-7", label: "7. Data retention" },
  { id: "pp-8", label: "8. Security" },
  { id: "pp-9", label: "9. Children" },
  { id: "pp-10", label: "10. Third-party links" },
  { id: "pp-11", label: "11. Changes" },
  { id: "pp-12", label: "12. Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      effectiveDate="April 25, 2026"
      lastUpdated="April 25, 2026"
      toc={TOC}
    >
      <p>
        This Privacy Policy explains how Loren Polster LLC dba Trustead
        (&ldquo;Trustead,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
        &ldquo;our&rdquo;) collects, uses, and shares information about you in
        connection with the Trustead platform (&ldquo;Platform&rdquo;). This
        policy is part of, and incorporated into, our{" "}
        <Link href="/terms">Terms of Service</Link>. Capitalized terms have the
        meanings given in the Terms of Service.
      </p>

      <h2 id="pp-1">
        <span className="sec-num">1.</span>Who we are.
      </h2>
      <p>
        Trustead is operated by Loren Polster LLC, a New York limited liability
        company. Contact:{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>, 367
        St Marks Ave #1087, Brooklyn, NY 11238.
      </p>

      <h2 id="pp-2">
        <span className="sec-num">2.</span>Information we collect.
      </h2>
      <p>
        <em>2.1. Information you provide.</em>
      </p>
      <ul>
        <li>
          <strong>Account:</strong> name, email, phone number, date of birth
          (for age verification), profile photo (optional), city or
          neighborhood.
        </li>
        <li>
          <strong>Invitations and vouches:</strong> the identity of the person
          who invited you, the people you vouch for, and vouches you receive.
        </li>
        <li>
          <strong>Listings and messages:</strong> content you post, including
          listing details, photos, messages to other Users, calendar entries,
          and request/acceptance communications.
        </li>
        <li>
          <strong>Support and feedback:</strong> the content of any
          communication you send us.
        </li>
      </ul>
      <p>
        <em>2.2. Information collected automatically.</em>
      </p>
      <ul>
        <li>
          Device information: IP address, browser type, operating system,
          device identifiers.
        </li>
        <li>
          Usage information: pages viewed, actions taken, referring URLs,
          timestamps.
        </li>
        <li>Cookies and similar technologies (see Section 5).</li>
      </ul>
      <p>
        <em>2.3. Information from third parties.</em> If you sign in using a
        third-party identity provider, we receive basic profile information
        from that provider. We do not receive protected-class information
        (race, religion, sexual orientation, disability status, etc.) from
        third parties, and we do not collect such information through the
        Platform.
      </p>

      <h2 id="pp-3">
        <span className="sec-num">3.</span>How we use information.
      </h2>
      <p>We use information to:</p>
      <ul>
        <li>Operate, maintain, and improve the Platform;</li>
        <li>Verify your age (18+);</li>
        <li>
          Display Trust Signals based on User-submitted vouches and network
          connections;
        </li>
        <li>
          Send you transactional and service-related messages (including
          verification codes, security notices, and Terms updates);
        </li>
        <li>Respond to your requests, feedback, or questions;</li>
        <li>
          Detect, prevent, and address fraud, abuse, and security incidents;
        </li>
        <li>
          Comply with applicable laws, enforce our Terms, and protect our
          rights.
        </li>
      </ul>
      <p>
        We do not sell personal information. We do not use personal information
        for targeted advertising. We do not share personal information with
        data brokers.
      </p>

      <h2 id="pp-4">
        <span className="sec-num">4.</span>How we share information.
      </h2>
      <p>
        <em>4.1. With other Users.</em> Profile information, listings, vouches,
        Trust Signals, and messages you send are visible to other Users in
        accordance with the Platform&rsquo;s visibility rules and your
        settings.
      </p>
      <p>
        <em>4.2. With service providers.</em> We share information with vendors
        that help us operate the Platform (hosting, email, analytics, customer
        support, authentication, security). Service providers are contractually
        limited to processing personal information on our behalf.
      </p>
      <p>
        <em>4.3. For legal reasons.</em> We may share information if we believe
        in good faith that it is required by law, subpoena, court order, or to
        protect the safety, rights, or property of Trustead, our Users, or the
        public.
      </p>
      <p>
        <em>4.4. In a business transaction.</em> If Trustead is involved in a
        merger, acquisition, financing, or sale of assets, your information may
        be transferred as part of that transaction, subject to this Privacy
        Policy.
      </p>
      <p>
        <em>4.5. With your consent.</em> We share information in any other
        situation with your explicit consent.
      </p>

      <h2 id="pp-5">
        <span className="sec-num">5.</span>Cookies and similar technologies.
      </h2>
      <p>
        We use cookies and similar technologies to keep you signed in, remember
        preferences, and measure how the Platform is used. You can control
        cookies through your browser settings. Disabling cookies may limit
        functionality. We do not use third-party advertising cookies.
      </p>

      <h2 id="pp-6">
        <span className="sec-num">6.</span>Your rights and choices.
      </h2>
      <p>
        <em>6.1. All Users.</em> You can access, update, or delete your account
        information through the Platform, or by contacting{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>. You
        can opt out of non-transactional emails via the unsubscribe link or in
        your account preferences.
      </p>
      <p>
        <em>6.2. California residents (CCPA/CPRA).</em> You have the right to
        (a) know what personal information we collect, use, disclose, and
        retain; (b) access or receive a copy of your personal information;
        (c) request deletion of your personal information; (d) correct
        inaccurate personal information; (e) limit use of sensitive personal
        information; and (f) not be discriminated against for exercising these
        rights. To exercise these rights, email{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>. We
        will verify your identity before responding. We do not sell personal
        information and do not share it for cross-context behavioral
        advertising.
      </p>
      <p>
        <em>6.3. Other U.S. state residents.</em> Residents of states with
        comprehensive privacy laws (including Virginia, Colorado, Connecticut,
        Utah, Oregon, Texas, Montana, New Jersey, Delaware, New Hampshire,
        Iowa, Indiana, Tennessee, Nebraska, and others) may have similar
        rights. Contact{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a> to
        exercise applicable rights.
      </p>
      <p>
        <em>6.4. Appeals.</em> If we deny your rights request, you may appeal
        by replying to our denial. If we deny your appeal, you may contact your
        state attorney general.
      </p>

      <h2 id="pp-7">
        <span className="sec-num">7.</span>Data retention.
      </h2>
      <p>
        We retain personal information while your account is active and for as
        long as reasonably necessary to provide the Platform, comply with legal
        obligations, resolve disputes, and enforce our agreements. When you
        delete your account, we will delete or de-identify your personal
        information, subject to limited retention for legal, security,
        fraud-prevention, and backup purposes.
      </p>

      <h2 id="pp-8">
        <span className="sec-num">8.</span>Security.
      </h2>
      <p>
        We use reasonable technical, administrative, and physical safeguards to
        protect personal information. No system is perfectly secure; we cannot
        guarantee absolute security.
      </p>

      <h2 id="pp-9">
        <span className="sec-num">9.</span>Children.
      </h2>
      <p>
        Trustead is not directed to children under 13 and does not knowingly
        collect personal information from children under 13. Users must be 18
        or older. If we learn we have collected personal information from a
        child under 13, we will delete it. Parents or guardians who believe
        their child has provided information should contact{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>.
      </p>

      <h2 id="pp-10">
        <span className="sec-num">10.</span>Third-party links and services.
      </h2>
      <p>
        The Platform may contain links to third-party sites or services. Their
        privacy practices are governed by their own policies. We are not
        responsible for third-party practices.
      </p>

      <h2 id="pp-11">
        <span className="sec-num">11.</span>Changes to this Privacy Policy.
      </h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be communicated by email to the address on your account or by
        in-Platform notice. The &ldquo;Last Updated&rdquo; date above reflects
        the most recent revision.
      </p>

      <h2 id="pp-12">
        <span className="sec-num">12.</span>Contact.
      </h2>
      <p>
        Questions about this Privacy Policy or your information:{" "}
        <a href="mailto:hello@trustead.app">hello@trustead.app</a>, 367
        St Marks Ave #1087, Brooklyn, NY 11238, Attn: Privacy.
      </p>
    </LegalPageShell>
  );
}
