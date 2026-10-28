import Link from "next/link";
import {
  FileText,
  HeartHandshake,
  Mail,
  MapPin,
  MessagesSquare,
  Scale,
  ShieldCheck,
  Star,
  UserCheck,
} from "lucide-react";

import BackLink from "@/components/navigation/BackLink";
import IconTile from "@/components/ui/IconTile";
import PageContainer from "@/components/ui/PageContainer";

const propertyRatings = [
  "Cleanliness",
  "Safety",
  "Common areas",
  "Noise levels",
  "Parking",
  "Amenities",
  "Building condition",
  "Pet friendliness",
];

const landlordRatings = [
  "Communication",
  "Repair speed",
  "Professionalism",
  "Lease transparency",
  "Move-in experience",
];

export default function PoliciesPage() {
  return (
    <main>
      <PageContainer>
        <div className="space-y-6">
          <BackLink fallback={{ url: "/", label: "Discover" }} />

          <header className="space-y-3">
            <p className="text-lg font-medium uppercase tracking-wide text-[#5B7A68]">
              Policies and review guidelines
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
              Trust is part of the product.
            </h1>
            <p className="text-lg text-[#66706B]">
              Tenant Voice NS should protect honest feedback while treating
              renters and housing providers fairly.
            </p>
            <p className="text-sm text-[#66706B]">
              Draft for review. These policies describe the current build and may
              change before public launch.
            </p>
          </header>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={HeartHandshake} />
              Our mission
            </h2>
            <p className="text-gray-700">
              Tenant Voice NS helps Nova Scotia renters understand what it may be
              like to live in a property by sharing structured tenant experiences
              and information about property management.
            </p>
            <p className="text-gray-700">
              Properties are the primary way to search. Property-condition ratings
              and landlord or management ratings are kept separate because a
              building and the people managing it can offer different experiences.
            </p>
          </section>

          <section id="review-guidelines" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={MessagesSquare} />
              Review guidelines
            </h2>
            <p className="text-gray-700">
              Reviews should describe your own direct rental experience. Focus on
              specific events and observations, and write respectfully. Do not
              present rumours, assumptions, or another person’s account as your
              own experience.
            </p>
            <p className="text-gray-700">
              You may discuss maintenance, communication, building condition,
              safety, noise, shared spaces, amenities, and other relevant parts of
              renting. Positive and negative experiences are both welcome.
            </p>
            <p className="font-medium text-gray-800">
              Do not include threats, harassment, discriminatory content, personal
              attacks, private contact details, information identifying another
              tenant, or material unrelated to renting.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={Star} />
              How ratings work
            </h2>
            <p className="text-gray-700">
              Ratings are structured by category. Choose N/A if a category
              doesn’t apply or you’re not sure, or just skip it. N/A and
              skipped categories are left out of the score, not counted as
              zero.
            </p>
            <h3 className="font-semibold text-[#294B3A]">Property ratings</h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              {propertyRatings.map((rating) => <li key={rating}>{rating}</li>)}
            </ul>
            <h3 className="font-semibold text-[#294B3A]">Landlord ratings</h3>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              {landlordRatings.map((rating) => <li key={rating}>{rating}</li>)}
            </ul>
            <p className="text-gray-700">
              Summary scores use approved reviews with numeric ratings. Each
              review contributes its average numeric score for that rating group;
              those per-review averages are then averaged together. The page
              shows how many reviews contributed to each summary.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
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
              Rejected reviews are retained privately in the moderation area for
              recordkeeping and possible future appeals. Rejected reviews and
              their ratings are not displayed publicly. A formal appeal workflow
              and an in-product report button are not available in this build yet.
            </p>
            <p className="text-gray-700">
              A landlord, property manager, or other affected person may contact
              Tenant Voice NS to request a review of published content. A request
              does not automatically remove a review; it will be considered by the
              moderator.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
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
              To limit spam, the server creates a keyed, one-way fingerprint from
              the connecting IP address and uses it to enforce a submission limit.
              The raw IP address is not stored in the rate-limit table. Old rate-
              limit records are eligible for cleanup after 48 hours. Hosting or
              network providers may separately retain technical logs under their
              own policies.
            </p>
          </section>

          <section className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={Scale} />
              Accuracy and disclaimer
            </h2>
            <p className="text-gray-700">
              Reviews represent individual contributors’ experiences and opinions.
              Tenant Voice NS does not independently verify every statement. A
              review or rating is not a legal finding, and information on this
              site is not legal advice or a guarantee of future conditions.
            </p>
            <p className="text-gray-700">
              Make housing decisions using your own judgement and other reliable
              sources. Ratings are summaries of submitted experiences, not proof
              that a claim is true or false.
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

          <section id="data-sources" className="scroll-mt-6 space-y-3 rounded-3xl border border-[#E6E3DA] bg-white p-6">
            <h2 className="flex items-center gap-4 text-xl font-bold text-[#294B3A]">
              <IconTile icon={MapPin} />
              Where our building list comes from
            </h2>
            <p className="text-gray-700">
              The rental buildings you can review come from the Halifax
              Regional Municipality&apos;s Residential Rental Registry, used with
              credit under its open data licence. Only buildings with four or
              more registered rental units are listed, so a review can&apos;t
              single out the one or two tenants of a house or duplex.
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
              If your building isn&apos;t listed, you can add it when you write a
              review. The moderator checks every added building, and it appears
              on the site only once a review for it is approved.
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
                href="mailto:tenantvoicens@gmail.com"
                className="font-medium text-[#2F4F46] underline"
              >
                tenantvoicens@gmail.com
              </Link>
              . Please do not include passwords, sign-in links, or other secrets.
            </p>
          </section>

          <footer className="text-sm text-[#66706B]">
            Tenant Voice NS · Policies are a working draft and are not legal
            advice.
          </footer>
        </div>
      </PageContainer>
    </main>
  );
}
