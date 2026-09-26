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
import { isCheckboxEventTarget } from "@/lib/tableSelectHitTarget";

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
        <div
          data-select-cell=""
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (isCheckboxEventTarget(e.target)) return;
            table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());
          }}
        >
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }: { row: Row<Lead> }) => (
        <div
          data-select-cell=""
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (isCheckboxEventTarget(e.target)) return;
            row.toggleSelected(!row.getIsSelected());
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ),
    },
    ...baseColumns,
  ];

  return columns;
}
