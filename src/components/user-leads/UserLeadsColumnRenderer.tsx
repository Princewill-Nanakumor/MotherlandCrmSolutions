// src/components/user-leads/UserLeadsColumnRenderer.tsx
"use client";

import React from "react";
import { Lead } from "@/types/leads";
import { TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import Link from "next/link";
import { UserLeadsColumnId } from "@/hooks/useUserLeadsColumnOrder";
import { maskPhoneNumber, maskEmail } from "@/utils/phoneMask";
import { formatLeadPhoneForTable } from "@/lib/phoneNormalize";
import {
  formatLeadDisplayName,
  formatLeadDetailEmail,
} from "@/lib/leadDisplayFormat";

interface Status {
  _id: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ColumnRendererProps {
  columnId: UserLeadsColumnId;
  lead: Lead;
  isSelected: boolean;
  statuses: Status[];
  statusesLoading: boolean;
  detailUrl: string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

export function renderUserLeadCell({
  columnId,
  lead,
  isSelected,
  statuses,
  statusesLoading,
  detailUrl,
  canViewPhoneNumbers = false,
  canViewEmails = false,
}: ColumnRendererProps): React.ReactElement | null {
  const currentStatus = statuses.find((s) => s._id === lead.status) ||
    statuses.find((s) => s._id === "NEW") || {
      _id: "NEW",
      name: "New",
      color: "#3B82F6",
    };

  const getStatusStyle = () => ({
    backgroundColor: `${currentStatus.color}15`,
    color: currentStatus.color,
    borderColor: `${currentStatus.color}30`,
  });

  const renderStatus = () => {
    if (statusesLoading) {
      return (
        <div className="flex items-center justify-center">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 text-gray-900! dark:text-white!"
          >
            <Loader2 className="h-3 w-3 animate-spin text-gray-900! dark:text-white!" />
            Loading...
          </Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        <Badge
          variant="outline"
          style={getStatusStyle()}
          className="flex items-center gap-1.5"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentStatus.color }}
          />
          {currentStatus.name}
        </Badge>
      </div>
    );
  };

  switch (columnId) {
    case "actions":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <div className="flex items-center justify-center">
            <Link
              href={detailUrl}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="inline-flex items-center justify-center w-8 h-8 transition-colors duration-200 bg-blue-100 rounded-full hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-gray-700"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </Link>
          </div>
        </TableCell>
      );

    case "leadId":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <span className="font-medium text-gray-900! dark:text-white!">
            {lead.leadId ? lead.leadId.toString() : "—"}
          </span>
        </TableCell>
      );

    case "name":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <span className="text-gray-900! dark:text-white!">
            {formatLeadDisplayName(lead) || "—"}
          </span>
        </TableCell>
      );

    case "email":
      const email = lead.email || "";
      if (!email || email === "") {
        return (
          <TableCell
            className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
          >
            <div className="flex items-center justify-center">
              <span className="text-gray-900! dark:text-white!">—</span>
            </div>
          </TableCell>
        );
      }
      // Apply masking based on email visibility permission
      const displayEmail = canViewEmails
        ? formatLeadDetailEmail(email)
        : maskEmail(email);
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <div className="flex items-center justify-center">
            <span className="text-gray-900! dark:text-white!">
              {displayEmail}
            </span>
          </div>
        </TableCell>
      );

    case "phone":
      const displayPhone = formatLeadPhoneForTable(lead.phone, {
        countryHint: lead.country,
        canViewFull: canViewPhoneNumbers,
        mask: maskPhoneNumber,
      });
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <div className="flex items-center justify-center">
            <span className="text-gray-900! dark:text-white!">
              {displayPhone}
            </span>
          </div>
        </TableCell>
      );

    case "country":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <span className="text-gray-900! dark:text-white!">
            {lead.country || "—"}
          </span>
        </TableCell>
      );

    case "status":
      return <TableCell className="text-center">{renderStatus()}</TableCell>;

    case "source":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <span className="text-gray-900! dark:text-white!">
            {lead.source || "—"}
          </span>
        </TableCell>
      );

    case "createdAt":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          {lead.createdAt ? (
            <div className="text-sm text-center text-gray-900! dark:text-white!">
              {(() => {
                const date = new Date(lead.createdAt);
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          ) : (
            <div className="text-center text-gray-900! dark:text-white!">
              <span>—</span>
            </div>
          )}
        </TableCell>
      );

    case "lastComment":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          {lead.lastComment ? (
            <div
              className="text-sm max-w-50 truncate mx-auto text-gray-900! dark:text-white!"
              title={lead.lastComment}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lead.lastComment}
            </div>
          ) : (
            <span className="text-gray-900! dark:text-white!">—</span>
          )}
        </TableCell>
      );

    case "lastCommentDate":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          {lead.lastCommentDate ? (
            <div className="text-sm text-center text-gray-900! dark:text-white!">
              {(() => {
                const date = new Date(lead.lastCommentDate);
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          ) : (
            <div className="text-center text-gray-900! dark:text-white!">
              <span>—</span>
            </div>
          )}
        </TableCell>
      );

    case "commentCount":
      return (
        <TableCell
          className={`text-center ${isSelected ? "text-gray-900! dark:text-white"! : "text-gray-800! dark:text-gray-300"}!`}
        >
          <div className="text-sm text-center text-gray-900! dark:text-white!">
            {lead.commentCount && lead.commentCount > 0 ? (
              <span className="inline-flex items-center justify-center font-medium text-gray-900! dark:text-white!">
                {lead.commentCount}
              </span>
            ) : (
              <span className="inline-flex items-center justify-center text-gray-900! dark:text-white!">
                —
              </span>
            )}
          </div>
        </TableCell>
      );

    default:
      return null;
  }
}
