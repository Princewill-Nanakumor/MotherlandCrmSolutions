"use client";

import { Lead } from "@/types/leads";
import { LeadColumn } from "@/components/leads/LeadsTableColumns.tsx/TableColumns";
import { useCurrentUserPermission } from "./useCurrentUserPermission";
import { maskPhoneNumber, maskEmail } from "@/utils/phoneMask";
import { formatLeadPhoneForTable } from "@/lib/phoneNormalize";
import { normalizeLeadId } from "@/lib/leadId";

export function useAdminLeadsTableColumns(): LeadColumn[] {
  const { canViewPhoneNumbers, canViewEmails } = useCurrentUserPermission();
  return [
    {
      id: "leadId",
      accessorKey: "leadId",
      header: "ID",
      cell: (info) => {
        const leadId = info.getValue() as string | number | undefined;
        const normalizedLeadId = normalizeLeadId(leadId);
        return (
          <div className="text-center font-medium">
            {normalizedLeadId || "—"}
          </div>
        );
      },
      sortingFn: (a, b) => {
        const idA = normalizeLeadId(a.original.leadId);
        const idB = normalizeLeadId(b.original.leadId);
        return idA.localeCompare(idB, undefined, { numeric: true });
      },
    },
    {
      id: "name",
      accessorFn: (row: Lead) => {
        const capitalizeName = (name: string) => {
          if (!name) return "";
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        };
        const firstName = capitalizeName(row.firstName || "");
        const lastName = capitalizeName(row.lastName || "");
        return row.name || `${firstName} ${lastName}`.trim() || "—";
      },
      header: "Name",
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="font-medium">
            {value || "—"}
          </div>
        );
      },
      sortingFn: (a, b) => {
        const capitalizeName = (name: string) => {
          if (!name) return "";
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        };
        const nameA =
          a.original.name ||
          `${capitalizeName(a.original.firstName || "")} ${capitalizeName(a.original.lastName || "")}`.trim();
        const nameB =
          b.original.name ||
          `${capitalizeName(b.original.firstName || "")} ${capitalizeName(b.original.lastName || "")}`.trim();
        return nameA.localeCompare(nameB);
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: (info) => {
        const email = info.row.original.email;
        if (!email || email === "—") {
          return (
            <div className="font-medium">—</div>
          );
        }
        // Apply masking based on email visibility permission
        const displayEmail = canViewEmails
          ? email.charAt(0).toUpperCase() + email.slice(1) // Capitalize first letter if visible
          : maskEmail(email);
        return (
          <div className="font-medium">
            {displayEmail}
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.email || "—").localeCompare(b.original.email || "—"),
    },
    {
      id: "phone",
      accessorFn: (row: Lead) => row.phone || "—",
      header: "Phone",
      cell: (info) => {
        const phone = info.row.original.phone;
        const displayPhone = formatLeadPhoneForTable(phone, {
          countryHint: info.row.original.country,
          canViewFull: canViewPhoneNumbers,
          mask: maskPhoneNumber,
        });
        return (
          <div className="text-center font-medium">
            {displayPhone}
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.phone || "—").localeCompare(b.original.phone || "—"),
    },
    {
      id: "country",
      accessorFn: (row: Lead) => row.country || "—",
      header: "Country",
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="text-center font-medium">
            {value || "—"}
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.country || "—").localeCompare(b.original.country || "—"),
    },
    {
      id: "status",
      accessorFn: (row: Lead) => row.status || "—",
      header: "Status",
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="text-center font-medium">
            {value || "—"}
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.status || "—").localeCompare(b.original.status || "—"),
    },
    {
      id: "source",
      accessorFn: (row: Lead) => row.source || "—",
      header: "Source",
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="text-center font-medium">
            {value || "—"}
          </div>
        );
      },
      sortingFn: (a, b) =>
        (a.original.source || "—").localeCompare(b.original.source || "—"),
    },
    {
      id: "assignedTo",
      header: "Assigned To",
      accessorFn: (row: Lead) => {
        const assignedTo = row.assignedTo;
        if (!assignedTo) return "Unassigned";

        // Check if assignedTo is a string or object
        if (typeof assignedTo === "string") {
          return assignedTo;
        }

        // If it's an object, check if firstName and lastName exist
        if (assignedTo.firstName && assignedTo.lastName) {
          return `${assignedTo.firstName} ${assignedTo.lastName}`;
        }

        return "Unknown User";
      },
      cell: (info) => {
        const value = info.getValue() as string;
        return (
          <div className="text-center font-medium">
            {value || "—"}
          </div>
        );
      },
      sortingFn: (a, b) => {
        const assignedToA = a.original.assignedTo;
        const assignedToB = b.original.assignedTo;

        // Helper function to get assigned user name
        const getAssignedUserName = (
          assignedTo:
            | string
            | { id: string; firstName: string; lastName: string }
            | null
            | undefined
        ) => {
          if (!assignedTo) return "Unassigned";

          if (typeof assignedTo === "string") {
            return assignedTo;
          }

          if (assignedTo.firstName && assignedTo.lastName) {
            return `${assignedTo.firstName} ${assignedTo.lastName}`;
          }

          return "Unknown User";
        };

        const nameA = getAssignedUserName(assignedToA);
        const nameB = getAssignedUserName(assignedToB);

        return nameA.localeCompare(nameB);
      },
    },
  ];
}
