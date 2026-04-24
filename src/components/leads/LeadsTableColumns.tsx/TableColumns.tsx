// src/components/leads/LeadsTableColumns.tsx/TableColumns.tsx
import {
  Row,
  Table as TanstackTable,
  ColumnDef,
  AccessorKeyColumnDef,
  AccessorFnColumnDef,
} from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { Checkbox } from "@/components/ui/checkbox";

// Define a union type for all possible column types
export type LeadColumn =
  | AccessorKeyColumnDef<Lead, LeadColumnValue>
  | AccessorFnColumnDef<Lead, LeadColumnValue>
  | ColumnDef<Lead, LeadColumnValue>;

type LeadColumnValue = string | number | boolean | null | undefined;

export function TableColumns(baseColumns: LeadColumn[]) {
  const columns: LeadColumn[] = [
    {
      id: "select",
      header: ({ table }: { table: TanstackTable<Lead> }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: Row<Lead> }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    ...baseColumns,
  ];

  return columns;
}
