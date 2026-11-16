import type { Metadata } from "next";
import { InfoSection, PublicPage } from "@/components/public-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Official terms and campus marketplace policies for LOOPEC by CiGaRa Technologies.",
};

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Marketplace Policies"
      title="Terms of Use"
      description="These terms govern the use of LOOPEC, a college-exclusive marketplace operated by CiGaRa Technologies (part of CiGaRa Group) for verified campus communities."
    >
      <InfoSection title="1. Eligibility and Verified Accounts">
        <p>
          LOOPEC is strictly restricted to current students, faculty members, and authorized staff of participating colleges (e.g., National Institute of Technology Calicut with verified <code>@nitc.ac.in</code> credentials). Every member must use their authentic college email and verify their institute credentials.
        </p>
        <p>
          Accounts are personal and non-transferable. Platform administrators reserve the authority to approve, reject, or suspend access for violations of institute disciplinary codes or marketplace safety guidelines.
        </p>
      </InfoSection>

      <InfoSection title="2. Listings, Integrity & Prohibited Items">
        <p>
          Members may pass on and sell pre-owned academic items, electronics, books, dorm essentials, and campus necessities. All items must be accurately described with truthful representations of condition, pricing, and availability.
        </p>
        <p>
          Strictly prohibited items include: illegal substances, hazardous materials, prescription medications, weapons, counterfeit goods, examination cheats/leaks, or items prohibited by institute bylaws. Listings violating these rules will be removed instantly and may lead to permanent account suspension and institute referral.
        </p>
      </InfoSection>

      <InfoSection title="3. Campus Pickup & Zero-Fraud Handover">
        <p>
          To safeguard both parties, physical handover of all items takes place exclusively at official campus meeting points (such as the Central Library, SAC, and Hostel Gates).
        </p>
        <p>
          Buyers must thoroughly inspect the condition and functionality of items in person before releasing the 4-digit Handover PIN to the seller. Handover PIN release constitutes final acceptance of the item.
        </p>
      </InfoSection>

      <InfoSection title="4. Payments, Escrow & Platform Fee">
        <p>
          LOOPEC protects campus exchanges through online payment escrow and verified settlements. When an order is paid, funds are held securely until physical campus handover is confirmed via PIN or QR code.
        </p>
        <p>
          A transparent 5% platform commission is retained by CiGaRa Technologies to maintain secure servers, verify credentials, and guarantee buyer protection. The remaining 95% net proceeds are disbursed directly to the student seller via UPI.
        </p>
      </InfoSection>

      <InfoSection title="5. Grievances & Operator Contact">
        <p>
          LOOPEC is operated by CiGaRa Technologies, CiGaRa Group. For questions regarding account verification, order disputes, safety reports, or technical support, contact our campus operations team at:
        </p>
        <p className="mt-2 font-mono text-xs text-violet-900">
          Email: support@loopec.com · grievance@cigara.tech<br />
          Operating Entity: CiGaRa Technologies, Calicut, Kerala, India
        </p>
      </InfoSection>
    </PublicPage>
  );
}
