import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  FilePenLine,
  Flag,
  Gavel,
  Info,
  Mail,
  Scale,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import IconTile from "@/components/ui/IconTile";
import PageContainer from "@/components/ui/PageContainer";
import { pageMetadata } from "@/lib/page-metadata";
import { TERMS_LAST_UPDATED } from "@/lib/terms";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms for using Tenant Voice NS: what the site is, what you can post, how reviews are moderated, and how to raise a concern about a review.",
  path: "/terms",
});

// Change TERMS_VERSION and TERMS_LAST_UPDATED (lib/terms) whenever the terms
// below, or the Policies page, change in a way that matters.
const LAST_UPDATED = TERMS_LAST_UPDATED;

// A draft of these terms should be read by a lawyer before launch. The
// Policies page explains how moderation, privacy and ratings work in more
// detail, and these terms refer to it rather than repeating it.
export default function TermsPage() {
  return (
    <div>
      <PageContainer>
        <div className="space-y-6">
          <header className="space-y-3">
            <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
              Terms of Service
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
              The rules for using Tenant Voice NS.
            </h1>
            <p className="text-lg text-[#66706B]">
              By using this site or submitting a review, you agree to these
              terms and to our{" "}
              <Link href="/policies" className="font-medium text-[#2F4F46] underline">
                Policies and review guidelines
              </Link>
              .
            </p>
            <p className="text-sm text-[#66706B]">
              Last updated {LAST_UPDATED}.
            </p>
          </header>

          <TermsSection icon={Info} title="What this site is">
            <p>
              Tenant Voice NS is an independent, volunteer-run project based in
              Nova Scotia. It publishes moderated, anonymous reviews of rental
              properties by people who have lived in them. It isn&apos;t
              affiliated with any landlord, property manager, or government.
            </p>
            <p>
              Reviews are about properties, not people. We don&apos;t rate or
              name landlords or property managers.
            </p>
            <p>
              Reviews are individual renters&apos; experiences and opinions. We
              don&apos;t verify every statement. Nothing on the site is legal
              advice, a legal finding, an inspection, or a guarantee of what a
              property is or will be like.
            </p>
          </TermsSection>

          <TermsSection icon={FilePenLine} title="Your reviews">
            <p>
              You must be old enough to agree to these terms under the law
              where you live, or have a parent or guardian&apos;s permission.
            </p>
            <p>
              When you submit a review, you confirm that it describes your own
              direct experience of the property, that it is true to the best of
              your knowledge, and that it follows our review guidelines. You are
              responsible for what you write.
            </p>
            <p>
              You keep ownership of your review. You give Tenant Voice NS a
              non-exclusive, royalty-free, worldwide licence to store, display
              and publish it on this site for as long as it is published, and to
              keep it privately as described in our Policies. Moderators may
              remove words from a review that break the guidelines, but never
              add or change your words or ratings.
            </p>
            <p>
              Any pictures you attach as proof are never published. You confirm
              that you took them or are allowed to share them, and that you have
              covered anything that identifies another person.
            </p>
          </TermsSection>

          <TermsSection icon={Ban} title="What you must not do">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Name or describe any person in a review, including a landlord,
                property manager, staff member or another tenant.
              </li>
              <li>
                Post anything false, fabricated, duplicated, or written about
                a property you haven&apos;t lived in.
              </li>
              <li>
                Post threats, harassment, discriminatory content, private
                contact details, or anything meant as retaliation.
              </li>
              <li>
                Use the report feature in bad faith, for example to get true
                reviews taken down.
              </li>
              <li>
                Scrape the site, use automated tools to submit reviews or
                reports, or try to get around its security checks.
              </li>
            </ul>
          </TermsSection>

          <TermsSection icon={Gavel} title="Moderation and removal">
            <p>
              Every review is checked before it is published. We may reject,
              edit by removing words, hide, or remove any review or picture at
              our discretion, including to follow the law or to protect people.
              We aren&apos;t obliged to publish any review. We may also keep
              records, and give information to others, where the law or a
              court order requires it. How moderation works,
              and how to appeal a decision, is explained in our{" "}
              <Link href="/policies#moderation" className="font-medium text-[#2F4F46] underline">
                Policies
              </Link>
              .
            </p>
          </TermsSection>

          <TermsSection icon={Flag} title="Raising a concern about a review">
            <p>
              Anyone, including a landlord, property manager or property owner,
              can report a published review using the &ldquo;Report this
              review&rdquo; link under it.
            </p>
            <p>
              If you report a review as a <strong>legal concern</strong>, it is
              hidden from the site immediately, before anyone has checked it.
              The moderator then decides whether to restore it or keep it down.
              Hiding a review this way is not a finding that it is wrong or
              unlawful. Please use it for genuine legal concerns and include an
              email address and a short explanation so we can reply. Reports of
              other kinds leave the review up while the moderator checks it.
            </p>
            <p>
              If you believe something on the site infringes your copyright,
              email us with what it is and where it appears.
            </p>
            <p>
              You can also write to us at{" "}
              <Link
                href="mailto:hello@tenantvoicens.ca"
                className="font-medium text-[#2F4F46] underline"
              >
                hello@tenantvoicens.ca
              </Link>
              . Tell us which property and review you mean, and what the
              concern is.
            </p>
          </TermsSection>

          <TermsSection icon={ShieldAlert} title="Accounts">
            <p>
              An account is optional. You are responsible for keeping your
              sign-in details secure. You can delete your account at any time
              from the Account page. Your published reviews stay on the site,
              still anonymous, but are no longer linked to you. See our{" "}
              <Link href="/policies#privacy" className="font-medium text-[#2F4F46] underline">
                Policies
              </Link>{" "}
              for how we handle your information.
            </p>
          </TermsSection>

          <TermsSection icon={Scale} title="Disclaimers, liability and changes">
            <p>
              The site and its content are provided &ldquo;as is&rdquo;, without
              promises that it is accurate, complete, or always available. To
              the fullest extent the law allows, Tenant Voice NS and the people
              who run it aren&apos;t liable for losses that come from using the
              site or relying on a review, and we aren&apos;t responsible for
              what reviewers write. Nothing in these terms limits any right you
              have that can&apos;t be limited by law.
            </p>
            <p>
              We may change these terms as the site grows. The date at the top
              shows the latest version, and using the site after a change means
              you accept it.
            </p>
            <p>
              These terms are governed by the laws of Nova Scotia and the
              federal laws of Canada that apply there.
            </p>
          </TermsSection>

          <TermsSection icon={Mail} title="Contact">
            <p>
              Questions about these terms can be sent to{" "}
              <Link
                href="mailto:hello@tenantvoicens.ca"
                className="font-medium text-[#2F4F46] underline"
              >
                hello@tenantvoicens.ca
              </Link>
              . Please do not include passwords, sign-in links, or other
              secrets.
            </p>
          </TermsSection>

          <footer className="text-sm text-[#66706B]">
            Tenant Voice NS · Last updated {LAST_UPDATED}.
          </footer>
        </div>
      </PageContainer>
    </div>
  );
}

function TermsSection({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6 text-gray-700">
      <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
        <IconTile icon={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}
