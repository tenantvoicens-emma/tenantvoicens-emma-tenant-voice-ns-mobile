import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  HeartHandshake,
  House,
  Mail,
  MapPin,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Star,
  UserCheck,
} from "lucide-react";

import IconTile from "@/components/ui/IconTile";
import {
  propertyRatingGuide,
  type RatingGuideEntry,
} from "@/lib/rating-guide";
import { reviewIssues } from "@/lib/review-issues";
import { MAX_EVIDENCE_FILES } from "@/lib/review-evidence";
import PageContainer from "@/components/ui/PageContainer";
import { pageMetadata } from "@/lib/page-metadata";
import { TERMS_LAST_UPDATED } from "@/lib/terms";

export const metadata: Metadata = pageMetadata({
  title: "Policies and review guidelines",
  description:
    "How Tenant Voice NS moderates reviews of properties, protects renters' privacy, calculates ratings and handles concerns about a review.",
  path: "/policies",
});

// Change TERMS_VERSION and TERMS_LAST_UPDATED (lib/terms) whenever the
// policies below, or the Terms of Service, change in a way that matters.
const LAST_UPDATED = TERMS_LAST_UPDATED;

export default function PoliciesPage() {
  return (
    <div>
      <PageContainer>
        <div className="space-y-6">
          <header className="space-y-3">
            <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
              Policies and review guidelines
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
              Trust is part of the product.
            </h1>
            <p className="text-lg text-[#66706B]">
              Tenant Voice NS should protect fair, first-hand feedback while treating
              renters and property owners fairly. See also our{" "}
              <Link href="/terms" className="font-medium text-[#2F4F46] underline">
                Terms of Service
              </Link>
              .
            </p>
            <p className="text-sm text-[#66706B]">
              Last updated {LAST_UPDATED}.
            </p>
          </header>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={HeartHandshake} />
              Our mission
            </h2>
            <p className="text-gray-700">
              Tenant Voice NS helps Nova Scotia renters understand what it may be
              like to live in a property by sharing structured tenant
              experiences of the property itself.
            </p>
            <p className="text-gray-700">
              Tenant Voice NS is an independent, volunteer-run project based in
              Nova Scotia. It isn&apos;t affiliated with any landlord, property
              manager, or government.
            </p>
            <p className="text-gray-700">
              We review properties, not people. Reviews are about a place and
              its condition, and are shown on the page for its address. We
              don&apos;t rate landlords or property managers, and reviews
              shouldn&apos;t name them or anyone else.
            </p>
            <p className="text-gray-700">
              Whether homes are safe, heated and kept in good repair is a
              matter of public interest, and renters often have no other way
              to learn what a place is really like before they sign a lease.
              That is why this site exists.
            </p>
            <p className="text-gray-700">
              That includes places that get it right. Good rentals deserve to
              be found, so a review of a place that works well is as welcome
              and as useful as a review about a problem.
            </p>
          </section>

          <section id="review-guidelines" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={MessagesSquare} />
              Review guidelines
            </h2>
            <p className="text-gray-700">
              Reviews should describe your own direct experience of the
              property. Focus on specific events and observations about the
              place, and write respectfully. Do not present rumours,
              assumptions, or another person’s account as your own experience.
            </p>
            <p className="text-gray-700">
              You may discuss repairs and maintenance, heat and hot water,
              building condition, pests, safety, noise, shared spaces,
              amenities, and other relevant parts of the property. Positive and
              negative experiences are equally welcome. If you&apos;re happy
              where you live, please say so: it helps other renters find good
              places to rent.
            </p>
            <p className="text-gray-700">
              We don&apos;t ask for, pay for or reward reviews of any kind, and
              we don&apos;t accept reviews written to promote a property or to
              harm one. Please don&apos;t review a property you own, manage or
              are paid to promote, or one you haven&apos;t lived in.
            </p>
            <p className="font-medium text-gray-800">
              Do not name or describe any person, including a landlord, property
              manager or staff member. Do not include threats, harassment,
              discriminatory content, personal attacks, private contact
              details, information identifying another tenant, or material
              unrelated to the property.
            </p>
            <p className="text-gray-700">
              Instead of writing about a person, write about what happened at
              the property: &ldquo;The heat didn&apos;t work for most of
              January and the repair took about three weeks.&rdquo;
            </p>
          </section>

          <section id="how-ratings-work" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={Star} />
              How ratings work
            </h2>
            <p className="text-gray-700">
              Each review can give one overall star rating for the property. A
              property&apos;s overall score is the average of its reviews. If
              a reviewer skipped an overall rating, the average of their
              detailed ratings is used instead.
            </p>
            <p className="text-gray-700">
              Detailed ratings are optional. Choose N/A if a category
              doesn’t apply or you’re not sure, or just skip it. N/A and
              skipped categories are left out of the score, not counted as
              zero.
            </p>
            <p className="text-gray-700">
              Every rating runs from 1 to 5, and 5 is always the best for a
              renter. So 5 for noise levels means quiet, not noisy.
            </p>
            <h3 className="font-semibold text-[#294B3A]">Detailed property ratings</h3>
            <RatingGuideList entries={propertyRatingGuide} />
            <h3 className="font-semibold text-[#294B3A]">Problems reviewers can tick</h3>
            <p className="text-gray-700">
              Instead of, or as well as, writing about it, a reviewer can tick
              problems they had at the property. A property&apos;s page shows
              how many reviewers ticked each one. These are renters&apos; own
              reports, not inspections or findings.
            </p>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              {reviewIssues.map((issue) => (
                <li key={issue.value}>{issue.label}</li>
              ))}
            </ul>
            <p className="text-gray-700">
              Summary scores use approved reviews with numeric ratings. Each
              review contributes its average numeric score for that rating group;
              those per-review averages are then averaged together. The page
              shows how many reviews contributed to each summary.
            </p>
          </section>

          <section id="moderation" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={ShieldCheck} />
              Moderation
            </h2>
            <p className="text-gray-700">
              Every submitted review starts as pending and is not shown publicly
              unless approved by the authorized moderator. The moderator may
              approve or reject a submission under these guidelines and applicable
              privacy, safety, or legal requirements.
            </p>
            <p className="text-gray-700">
              Rejected reviews and their ratings are never shown publicly. They
              are kept privately in the moderation area for 24 months after
              they were rejected, for recordkeeping and appeals, and then
              deleted automatically, along with any proof pictures attached to
              them. A published review that is taken down is treated the same
              way unless it is put back.
            </p>
            <h3 id="reporting" className="scroll-mt-6 font-semibold text-[#294B3A]">
              Reporting a review
            </h3>
            <p className="text-gray-700">
              Anyone, including a landlord or property manager, can report a
              published review with the &ldquo;Report this review&rdquo; link
              under it. Choose a reason and add details if you like. Only the
              moderator sees reports. A reported review stays up while the
              moderator checks it against these guidelines, then keeps it up,
              removes the part that breaks them, or unpublishes it. Most
              reports do not remove a review by themselves.
            </p>
            <h3 id="legal-concerns" className="scroll-mt-6 font-semibold text-[#294B3A]">
              Legal concerns
            </h3>
            <p className="text-gray-700">
              If you choose the reason &ldquo;Legal concern&rdquo;, the review
              is hidden from the site right away, before anyone has checked
              it. The moderator then decides whether to put it back or keep it
              down, and looks at hidden reviews as soon as they can. We do
              this so that a review someone says may be unlawful isn&apos;t
              left up while it&apos;s looked at. It is not a finding that the
              review is wrong. Because it takes a review down straight away, a
              legal concern needs your email address and a short explanation
              of which part of the review is the concern and why. Please use
              it only for genuine legal concerns.
            </p>
            <p className="text-gray-700">
              When we receive a legal concern, a court order or a legal threat,
              we keep the related records for as long as needed to deal with
              the matter. That includes a review that was taken down, its
              history, the reports about it and any proof pictures, even past
              the usual 24 months.
            </p>
            <p className="text-gray-700">
              Adding your email to a report is optional, and it&apos;s used only
              to reply to you about it. Reports are kept privately and deleted
              24 months after the moderator has dealt with them.
            </p>
            <p className="text-gray-700">
              To appeal a moderation decision, email us (see Contact below) with
              the building&apos;s name and what the review says.
            </p>
            <h3 id="moderator-edits" className="scroll-mt-6 font-semibold text-[#294B3A]">
              Moderator edits
            </h3>
            <p className="text-gray-700">
              If a review breaks our guidelines in a small way, we may remove
              only the part that breaks them instead of rejecting the whole
              review. That includes names of private people, personal or
              identifying details, and accusations of illegal or dishonest
              conduct stated as fact. We never add words, reword what you
              wrote or change your ratings. Edited reviews are marked
              &ldquo;Edited by a moderator&rdquo;, and the original is kept
              privately in the moderation area. If we can&apos;t remove the
              problem without changing what your review means, we&apos;ll
              reject it so you can resubmit.
            </p>
          </section>

          <section id="privacy" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={UserCheck} />
              Privacy and anonymity
            </h2>
            <p className="text-gray-700">
              Review submissions do not require a public user account and are not
              displayed with a username or account identity. Do not put your name
              or anyone else’s identifying information in review text.
            </p>
            <p className="text-gray-700">
              This does not mean the submission process is technically anonymous:
              Cloudflare Turnstile and hosting or database providers may process
              technical information to deliver and protect the service. The sole
              moderator can read pending submissions in the private moderation
              area. Do not submit information you would not want the moderator to
              see.
            </p>
            <p className="text-gray-700">
              An account is optional. If you create one, it&apos;s stored with
              our database provider, Supabase. Your password is kept only as a
              one-way hash, so no one, including us, can see it. Your email is
              used only for signing in and account messages such as password
              resets, and is never shown publicly.
            </p>
            <p className="text-gray-700">
              Reviews are never linked to an account, even when you&apos;re
              signed in, so nothing we store ties a review to your email
              address. Reviews submitted while signed in before{" "}
              {TERMS_LAST_UPDATED} were privately linked to the account; that
              link was never shown publicly, and it is removed if you delete
              your account.
            </p>
            <p className="text-gray-700">
              You can delete your account at any time from the Account page.
              That deletes your email address and password straight away. Your
              published reviews stay on the site, still anonymous, but are no
              longer linked to you.
            </p>
            <p className="text-gray-700">
              You can attach up to {MAX_EVIDENCE_FILES} pictures to a review as
              proof, such as a photo of the problem. This is optional. Pictures
              are never shown publicly. They are stored privately and only the
              moderator can see them, to check a review if it&apos;s
              challenged. They&apos;re resized in your browser before they are
              sent, which also removes location and camera details, but a
              picture can still show names, faces or unit numbers, so cover or
              crop those first. A picture is deleted when its review is
              deleted.
            </p>
            <p className="text-gray-700">
              Earlier reviews could include a rating of the landlord or property
              manager. Those ratings are no longer shown or collected. They
              are kept privately and are not available to the public.
            </p>
            <p className="text-gray-700">
              <span className="font-medium text-gray-800">Where information is kept.</span>{" "}
              Our database is hosted by Supabase in the United States. The
              site is hosted by Vercel, and Cloudflare Turnstile checks that
              submissions come from people; both may process technical
              information in other countries. Because information is stored
              outside Canada, it can be subject to the laws and legal
              processes of those places.
            </p>
            <p className="text-gray-700">
              <span className="font-medium text-gray-800">Court orders.</span>{" "}
              If a court orders us to hand over information we hold, we may
              have to comply. We hold very little: we don&apos;t keep IP
              addresses (only the one-way fingerprint below), new reviews
              aren&apos;t linked to any account, and an email given in a
              report is kept only for replying. Our hosting providers keep
              their own technical logs, which we don&apos;t control.
            </p>
            <p className="text-gray-700">
              <span className="font-medium text-gray-800">Your choices.</span>{" "}
              To ask what we hold about you, to correct it, or to have it
              deleted, email us (see Contact below). If you sent a review
              without signing in, we can&apos;t tell which one is yours, so
              tell us the property and what it says.
            </p>
            <p className="text-gray-700">
              To stop spam, we keep a one-way fingerprint of your IP address
              (not the address itself) for about 48 hours.
            </p>
            <p className="text-gray-700">
              We count visits to each page with Vercel Web Analytics, from our
              hosting provider. It doesn&apos;t use cookies, doesn&apos;t
              follow you to other sites, and shows us only totals, such as how
              many people viewed a page and which site linked to it.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={Scale} />
              Accuracy and disclaimer
            </h2>
            <p className="text-gray-700">
              Reviews represent individual contributors’ experiences and opinions.
              They are the views of the renters who wrote them, not of Tenant
              Voice NS. We do not independently verify every statement. A
              review or rating is not a legal finding, and information on this
              site is not legal advice or a guarantee of future conditions.
            </p>
            <p className="text-gray-700">
              Make housing decisions using your own judgement and other reliable
              sources. Ratings are summaries of submitted experiences, not proof
              that a claim is true or false. A positive review is one
              renter&apos;s opinion, not an endorsement: Tenant Voice NS
              doesn&apos;t certify, rank or recommend any property or owner.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={FileText} />
              Use of this site
            </h2>
            <p className="text-gray-700">
              By submitting a review, you confirm that it reflects your own
              experience and follows these guidelines. Tenant Voice NS may reject
              or remove content that violates them. Do not use the service to
              harass, threaten, expose private information, or submit fabricated
              or duplicate reviews.
            </p>
          </section>

          <section id="private-rentals" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={House} />
              Houses, rooms and other private rentals
            </h2>
            <p className="text-gray-700">
              You can review a house, a basement or backyard suite, a room in a
              shared home, a unit in a duplex or small building, or a condo
              rented from its owner. These are often where renters run into
              the worst problems, and other renters deserve to know.
            </p>
            <p className="text-gray-700">
              With only a few tenants, the landlord may be able to tell who
              wrote a review. If you still live there, you may want to wait
              until you&apos;ve moved out. That choice is yours.
            </p>
            <p className="text-gray-700">
              To help protect you, a private rental&apos;s page shows the street
              address but never a unit number, and shows only the year each
              review was written. Its reviews aren&apos;t included in Recent
              reviews on the Discover page. The moderator removes names and
              details that could identify you, your roommates, the landlord
              or the landlord&apos;s family.
            </p>
            <p className="text-gray-700">
              A private rental&apos;s page appears only once two of its
              reviews are approved. With a single review, the owner could
              often tell who wrote it. If a review is later taken down and
              fewer than two remain, the page is taken down until there are
              two again.
            </p>
          </section>

          <section id="data-sources" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={MapPin} />
              Where our building list comes from
            </h2>
            <p className="text-gray-700">
              The rental buildings you can review come from the Halifax
              Regional Municipality&apos;s Residential Rental Registry, so for
              now the list covers the Halifax region. Contains information
              licenced under the{" "}
              <Link
                href="https://data-hrm.hub.arcgis.com/pages/open-data-licence"
                className="font-medium text-[#2F4F46] underline"
              >
                Open Government Licence—Halifax
              </Link>
              . Tenant Voice NS isn&apos;t affiliated with or endorsed by
              Halifax Regional Municipality, and the registry is a list of
              registered rentals, not a finding about any property. Buildings with four or more registered rental
              units are listed. Houses, suites, rooms and duplexes from the
              registry aren&apos;t shown as a list. Each one appears only once
              two of its reviews are approved.
            </p>
            <p className="text-gray-700">
              Building names, where we have them, come from{" "}
              <Link
                href="https://www.openstreetmap.org/copyright"
                className="font-medium text-[#2F4F46] underline"
              >
                OpenStreetMap
              </Link>
              , © OpenStreetMap contributors, available under the Open Database
              Licence. Buildings without a name are listed by street address.
            </p>
            <p className="text-gray-700">
              If the place you rented isn&apos;t listed, including anywhere else
              in Nova Scotia, you can add it when you write a review. The
              moderator checks every added address, and it appears on the site
              only once a review for it is approved. A house, suite, room,
              duplex or condo appears only once two of its reviews are
              approved, so that no one can tell who wrote a lone review.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={Mail} />
              Contact
            </h2>
            <p className="text-gray-700">
              Questions or content concerns can be sent to{" "}
              <Link
                href="mailto:hello@tenantvoicens.ca"
                className="font-medium text-[#2F4F46] underline"
              >
                hello@tenantvoicens.ca
              </Link>
              . Please do not include passwords, sign-in links, or other secrets.
            </p>
            <p className="text-gray-700">
              If any part of the site is hard to use or read, tell us at the
              same address and we&apos;ll work on it. If you believe a picture
              or text on the site infringes your copyright, email us with what
              it is and where it appears.
            </p>
          </section>

          <footer className="text-sm text-[#66706B]">
            Tenant Voice NS · Last updated {LAST_UPDATED}. These policies may
            change as the site grows; the date above shows the latest version.
          </footer>
        </div>
      </PageContainer>
    </div>
  );
}

function RatingGuideList({ entries }: { entries: RatingGuideEntry[] }) {
  return (
    <ul className="list-disc space-y-1 pl-6 text-gray-700">
      {entries.map((entry) => (
        <li key={entry.value}>
          <span className="font-medium text-gray-800">{entry.label}:</span>{" "}
          5 means {entry.high}; 1 means {entry.low}.
        </li>
      ))}
    </ul>
  );
}
