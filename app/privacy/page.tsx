import type { Metadata } from "next";
import { InfoSection, PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "Official privacy and data protection notice for LOOPEC by CiGaRa Technologies.",
};

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Marketplace Policies"
      title="Privacy Notice"
      description="This privacy policy explains how LOOPEC collects, uses, and safeguards personal data for verified college marketplace members."
    >
      <InfoSection title="1. Information Collected & Verification Data">
        <p>
          We collect your official college email address, full name, chosen public handle, phone number, and college affiliation. When you submit verification documents (e.g., student ID card or faculty credentials), documents are stored in encrypted, private storage buckets inaccessible to the public or standard users.
        </p>
        <p>
          To coordinate transactions, the platform records listing details, photos, in-app coordination messages, orders, campus pickup locations, and settlement UPI IDs.
        </p>
      </InfoSection>

      <InfoSection title="2. Purpose of Processing & Security">
        <p>
          Your information is processed strictly to authenticate eligibility within your campus, prevent impersonation and fraud, manage peer-to-peer orders, and disburse seller payouts.
        </p>
        <p>
          Row-Level Security (RLS) is enforced at the database level to ensure private messages and transactions are visible solely to the participating buyer, seller, and authorized college administrators.
        </p>
      </InfoSection>

      <InfoSection title="3. Access Boundaries & Third Parties">
        <p>
          We do not sell, rent, or trade student data with marketing aggregators or commercial advertisers.
        </p>
        <p>
          Peer payments are handled directly via UPI apps (Google Pay, PhonePe, Paytm, BHIM) or campus handover settlements. LOOPEC never stores your bank account passwords, card numbers, CVVs, or UPI PINs.
        </p>
      </InfoSection>

      <InfoSection title="4. Data Retention & Deletion Rights">
        <p>
          College identity documents are retained during your active academic tenure to prevent duplicate accounts and fraud. You may request account closure and deletion of non-audited personal data by submitting a request to our privacy desk.
        </p>
      </InfoSection>

      <InfoSection title="5. Data Protection Officer & Contact">
        <p>
          For privacy inquiries, data access requests, or security concerns, reach out to:
        </p>
        <p className="mt-2 font-mono text-xs text-violet-900">
          Data Protection Officer · CiGaRa Technologies<br />
          Email: privacy@loopec.com · dpo@cigara.tech<br />
          CiGaRa Group, Calicut, Kerala, India
        </p>
      </InfoSection>
    </PublicPage>
  );
}
