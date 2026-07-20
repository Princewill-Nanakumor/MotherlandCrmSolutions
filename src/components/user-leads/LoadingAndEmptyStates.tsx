// src/components/user-leads/LoadingAndEmptyStates.tsx
import { TableRow, TableCell } from "@/components/ui/Table";
import { Loader2 } from "lucide-react";

export function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="text-center py-8">
        <div className="flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin brand-icon" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function EmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="text-center py-8">
        <div className="text-gray-500">No leads found</div>
      </TableCell>
    </TableRow>
  );
}
