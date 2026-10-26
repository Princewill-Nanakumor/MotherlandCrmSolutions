import {
  coerceContactEntries,
  type LeadContactEntry,
} from "@/lib/leadContactEntries";

export type LeadContactFieldChange = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

function asEmail(value: unknown): string {
  return asText(value).toLowerCase();
}

function formatExtra(entry: LeadContactEntry): string {
  const value = asText(entry.value);
  const label = asText(entry.label);
  return label ? `${value} (${label})` : value;
}

function extraFieldLabel(
  kind: "Email" | "Phone",
  index: number,
  entry?: LeadContactEntry | null,
): string {
  const label = asText(entry?.label);
  if (label) return `${kind} (${label})`;
  return `${kind} ${index + 2}`;
}

function diffContactExtras(
  before: LeadContactEntry[],
  after: LeadContactEntry[],
  kind: "Email" | "Phone",
): LeadContactFieldChange[] {
  const changes: LeadContactFieldChange[] = [];
  const max = Math.max(before.length, after.length);

  for (let i = 0; i < max; i++) {
    const oldEntry = before[i];
    const newEntry = after[i];
    const field = extraFieldLabel(kind, i, newEntry ?? oldEntry);

    if (!oldEntry && newEntry) {
      changes.push({
        field,
        oldValue: null,
        newValue: formatExtra(newEntry),
      });
      continue;
    }
    if (oldEntry && !newEntry) {
      changes.push({
        field: extraFieldLabel(kind, i, oldEntry),
        oldValue: formatExtra(oldEntry),
        newValue: null,
      });
      continue;
    }
    if (oldEntry && newEntry) {
      const oldText = formatExtra(oldEntry);
      const newText = formatExtra(newEntry);
      if (oldText !== newText) {
        changes.push({ field, oldValue: oldText, newValue: newText });
      }
    }
  }

  return changes;
}

/**
 * Diff contact-related fields present on `after` against `before`.
 * Only keys present on `after` are considered (partial updates).
 */
export function diffLeadContactChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): LeadContactFieldChange[] {
  const changes: LeadContactFieldChange[] = [];

  const scalars: Array<{
    key: string;
    label: string;
    normalize?: (value: unknown) => string;
  }> = [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "email", label: "Email", normalize: asEmail },
    { key: "phone", label: "Phone" },
    { key: "country", label: "Country" },
    { key: "source", label: "Source" },
  ];

  for (const { key, label, normalize } of scalars) {
    if (!Object.prototype.hasOwnProperty.call(after, key)) continue;
    const norm = normalize ?? asText;
    const oldValue = norm(before[key]);
    const newValue = norm(after[key]);
    if (oldValue === newValue) continue;
    changes.push({
      field: label,
      oldValue: oldValue || null,
      newValue: newValue || null,
    });
  }

  if (Object.prototype.hasOwnProperty.call(after, "emails")) {
    changes.push(
      ...diffContactExtras(
        coerceContactEntries(before.emails),
        coerceContactEntries(after.emails),
        "Email",
      ),
    );
  }

  if (Object.prototype.hasOwnProperty.call(after, "phones")) {
    changes.push(
      ...diffContactExtras(
        coerceContactEntries(before.phones),
        coerceContactEntries(after.phones),
        "Phone",
      ),
    );
  }

  return changes;
}

export function summarizeLeadContactUpdateDetails(
  changes: LeadContactFieldChange[],
): string {
  if (changes.length === 0) return "Updated contact information";
  if (changes.length === 1) {
    const change = changes[0];
    if (change.oldValue == null && change.newValue) {
      return `Added ${change.field.toLowerCase()}`;
    }
    if (change.newValue == null && change.oldValue) {
      return `Removed ${change.field.toLowerCase()}`;
    }
    return `Updated ${change.field.toLowerCase()}`;
  }
  return `Updated contact information (${changes.length} changes)`;
}
