import { ChevronDown, ListChecks } from "lucide-react";

// What to approve and what to reject, kept next to the queue so decisions
// stay consistent. Mirrors the review guidelines on the Policies page, plus
// the main defamation risk: factual accusations the site can't support.
const approve = [
  "The writer's own experience or opinion of the building, landlord or management.",
  "Criticism, even harsh, when it's framed as experience: “repairs took weeks”, “the hallways are usually a mess”.",
  "Naming the landlord, property manager or management company. Businesses are fair to name.",
];

const reject = [
  "Names or identifies a private person: another tenant, a neighbour, or a staff member by name.",
  "A specific accusation of illegal or dishonest conduct stated as fact (theft, fraud, illegal eviction, discrimination) that can't be backed up. A one-person role, like “the superintendent”, counts as identifying someone here.",
  "Details that could identify the writer or other tenants, like unit numbers or schedules.",
  "Threats, harassment, slurs, discriminatory content or personal attacks.",
  "Private contact details or personal information (phone numbers, emails, health details).",
  "Not a genuine experience: spam, ads, about a different building, someone else's story retold, or reads as retaliation rather than an account of renting there.",
];

const habits = [
  "Not sure? Reject with a note saying why. The writer can submit again without the problem part.",
  "Always add a note when you reject or unpublish. It's your record if someone appeals or complains.",
  "When a landlord raises a concern about a published review, look at it promptly. Unpublish factual accusations you can't support; opinions and experiences can stay.",
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
