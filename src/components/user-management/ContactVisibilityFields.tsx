"use client";

interface ContactVisibilityFieldsProps {
  canViewEmails: boolean;
  canViewPhoneNumbers: boolean;
  disabled?: boolean;
  onChange: (
    field: "canViewEmails" | "canViewPhoneNumbers",
    checked: boolean,
  ) => void;
}

export function ContactVisibilityFields({
  canViewEmails,
  canViewPhoneNumbers,
  disabled = false,
  onChange,
}: ContactVisibilityFieldsProps) {
  const items = [
    {
      field: "canViewEmails" as const,
      checked: canViewEmails,
      label: "Unmask email addresses",
      description: "Show full lead emails instead of a masked address",
    },
    {
      field: "canViewPhoneNumbers" as const,
      checked: canViewPhoneNumbers,
      label: "Unmask phone numbers",
      description: "Show full lead phone numbers instead of the last 4 digits",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Lead contact visibility
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Choose whether this person can see full emails and phone numbers on the
        leads table and lead details panel.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.field}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
              item.checked
                ? "border-(--brand-from) bg-[color-mix(in_srgb,var(--brand-from)_8%,transparent)]"
                : "border-gray-200 dark:border-gray-700"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              disabled={disabled}
              onChange={(event) => onChange(item.field, event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {item.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
