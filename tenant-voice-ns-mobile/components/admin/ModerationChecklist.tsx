import { ChevronDown, ListChecks } from "lucide-react";

// What to approve and what to reject, kept next to the queue so decisions
// stay consistent. Mirrors the review guidelines on the Policies page, plus
// the main defamation risk: factual accusations the site can't support.
// Reviews are about the property only, never about a person.
const approve = [
  "The writer's own experience of the property: its condition, repairs, heat and hot water, noise, pests, safety, shared spaces.",
  "Criticism, even harsh, when it's about the property and framed as experience: “the heat didn't work for most of January”, “the hallways are usually a mess”.",
  "Reviews that are mostly ratings and ticked problems, with little or no text. They're complete reviews.",
];

const reject = [
  "Names or identifies any person: another tenant, a neighbour, a staff member, a landlord or a property manager. Use “Remove words” where you can.",
  "Names a landlord or management company, or is mostly about how a person behaved rather than the property's condition. Reviews are about the place, not the people.",
  "Private rentals (houses, suites, rooms, duplexes, condos): anything identifying the landlord, their family, roommates or the writer.",
  "A specific accusation of illegal or dishonest conduct stated as fact (theft, fraud, illegal eviction, discrimination) that can't be backed up. A one-person role, like “the superintendent”, counts as identifying someone here.",
  "Details that could identify the writer or other tenants, like unit numbers or schedules.",
  "Threats, harassment, slurs, discriminatory content or personal attacks.",
  "Private contact details or personal information (phone numbers, emails, health details).",
  "Not a genuine experience: spam, ads, about a different property, someone else's story retold, or reads as retaliation rather than an account of living there.",
];

const habits = [
  "Small violation in an otherwise good review? Use “Remove words” to take out only the problem words and approve. The review gets the “Edited by a moderator” label. If removing them would change the meaning or leave little behind, reject with a note instead.",
  "Not sure? Reject with a note saying why. The writer can submit again without the problem part.",
  "Always add a note when you reject or unpublish. It's your record if someone appeals or complains.",
  "A “Legal concern” report hides the review automatically. Open the Reports tab promptly: restore it or keep it down, and add a note either way. If a landlord raises a concern some other way, look at it promptly too. Unpublish factual accusations you can't support; opinions and experiences about the property can stay.",
  "Some reviews have private proof pictures. They help you check a claim and are never public. Don't download, copy or share them.",
];

export default function ModerationChecklist() {
  return (
    <details
      className="group rounded-3xl border border-[#E6E3DA] bg-white p-5 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 text-lg font-bold text-[#294B3A]">
        <ListChecks className="h-6 w-6 shrink-0 text-[#2F4F46]" aria-hidden="true" />
        <span className="flex-1">
          Moderation checklist
          <span className="block text-sm font-normal text-[#66706B]">
            What to approve and what to reject
          </span>
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-[#66706B] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-4 space-y-5 text-[#4A5A52] lg:grid lg:grid-cols-2 lg:gap-x-8 lg:space-y-0">
        <ChecklistGroup title="Approve" items={approve} />
        <ChecklistGroup title="Reject (and note why)" items={reject} />
        <div className="lg:col-span-2 lg:mt-5">
          <ChecklistGroup title="Good habits" items={habits} />
        </div>
      </div>
    </details>
  );
}

function ChecklistGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-[#1F2A24]">{title}</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
