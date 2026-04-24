// src/components/dashboardComponents/AdminLeadsTableColumns.tsx
import { Row, Table as TanstackTable, ColumnDef } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { Checkbox } from "@/components/ui/checkbox";

type LeadColumnValue = string | number | boolean | null | undefined;

// Define a union type for all possible column types
export type LeadColumn = ColumnDef<Lead, LeadColumnValue>;

export function AdminLeadsTableColumns(baseColumns: LeadColumn[]) {
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
