"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TableSortDirection = "asc" | "desc";

type TableSortIconProps = {
  active: boolean;
  direction: TableSortDirection;
  className?: string;
  neutralClassName?: string;
  activeClassName?: string;
};

/** Inactive: ⇅; active column: ↑ asc / ↓ desc. */
export function TableSortIcon({
  active,
  direction,
  className = "h-4 w-4 shrink-0",
  neutralClassName = "text-muted-foreground opacity-80",
  activeClassName = "text-foreground",
}: TableSortIconProps) {
  if (!active) {
    return (
      <ArrowUpDown className={cn(className, neutralClassName)} aria-hidden />
    );
  }
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <Icon
      className={cn(className, activeClassName)}
      aria-label={
        direction === "asc" ? "Sorted ascending" : "Sorted descending"
      }
    />
  );
}
