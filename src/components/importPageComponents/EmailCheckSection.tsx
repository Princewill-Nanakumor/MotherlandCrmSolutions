"use client";

import { FC, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MailSearch,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MAX_EMAILS_PER_CHECK,
  type EmailCheckResultPayload,
} from "@/lib/emailCheck";
import type { ImportPageTab } from "@/components/importPageComponents/ImportTabs";

type ResultFilter =
  | "all"
  | "existing"
  | "missing"
  | "duplicates"
  | "invalid";

interface EmailCheckSectionProps {
  activeTab: ImportPageTab | string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isChecking: boolean;
  error: string | null;
  result: EmailCheckResultPayload | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearResult: () => void;
}

function downloadCsv(result: EmailCheckResultPayload) {
  const lines = ["email,status,lead_name,sheet_count"];
  for (const row of result.existing) {
    lines.push(
      `${csvEscape(row.email)},in_account,${csvEscape(row.name)},`,
    );
  }
  for (const email of result.missing) {
    lines.push(`${csvEscape(email)},not_in_account,,`);
  }
  for (const dup of result.duplicates) {
    lines.push(
      `${csvEscape(dup.email)},duplicate_in_sheet,,${dup.count}`,
    );
  }
  for (const email of result.invalid) {
    lines.push(`${csvEscape(email)},invalid,,`);
  }
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `email-check-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const EmailCheckSection: FC<EmailCheckSectionProps> = ({
  activeTab,
  fileInputRef,
  isChecking,
  error,
  result,
  handleFileUpload,
  clearResult,
}) => {
  const [filter, setFilter] = useState<ResultFilter>("all");

  const rows = useMemo(() => {
    if (!result) return [];
    const dupMap = new Map(
      (result.duplicates ?? []).map((d) => [d.email, d.count]),
    );

    const existing = result.existing.map((r) => ({
      email: r.email,
      status: "exists" as const,
      name: r.name,
      detail: dupMap.has(r.email) ? `${dupMap.get(r.email)}× in sheet` : "",
    }));
    const missing = result.missing.map((email) => ({
      email,
      status: "missing" as const,
      name: "",
      detail: dupMap.has(email) ? `${dupMap.get(email)}× in sheet` : "",
    }));
    const duplicates = (result.duplicates ?? []).map((dup) => {
      const inAccount = result.existing.find((e) => e.email === dup.email);
      return {
        email: dup.email,
        status: "duplicate" as const,
        name: inAccount?.name ?? "",
        detail: inAccount
          ? `${dup.count}× in sheet · in account`
          : `${dup.count}× in sheet · not in account`,
      };
    });
    const invalid = result.invalid.map((email) => ({
      email,
      status: "invalid" as const,
      name: "",
      detail: "",
    }));

    if (filter === "existing") return existing;
    if (filter === "missing") return missing;
    if (filter === "duplicates") return duplicates;
    if (filter === "invalid") return invalid;
    // All: unique emails by account status + invalid (duplicates are a filter)
    return [...existing, ...missing, ...invalid];
  }, [result, filter]);

  if (activeTab !== "check") return null;

  const duplicateEmails = result?.summary.duplicateEmails ?? result?.duplicates?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900! dark:text-white!">
            <MailSearch className="w-5 h-5" />
            Check emails against your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600! dark:text-gray-300!">
            Upload an Excel (.xlsx) or CSV file with an <strong>Email</strong>,{" "}
            <strong>Emails</strong>, or <strong>Email address</strong> column.
            We scan your leads and show which emails already exist and which do
            not. Nothing is imported.
          </p>

          <ul className="pl-5 space-y-1 text-sm list-disc text-gray-600 dark:text-gray-300">
            <li>Only the email column is required</li>
            <li>
              Maximum {MAX_EMAILS_PER_CHECK.toLocaleString()} emails per upload
            </li>
            <li>Matching is case-insensitive within your admin account</li>
          </ul>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,text/plain"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isChecking}
            />
            <Button
              type="button"
              disabled={isChecking}
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload sheet
                </>
              )}
            </Button>
            {result && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => downloadCsv(result)}
                >
                  <Download className="w-4 h-4" />
                  Download results CSV
                </Button>
                <Button type="button" variant="ghost" onClick={clearResult}>
                  Clear
                </Button>
              </>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="space-y-3">
            <CardTitle className="text-gray-900! dark:text-white!">
              Results
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {result.summary.uniqueEmails.toLocaleString()} unique
              </Badge>
              <Badge className="text-white bg-emerald-600 hover:bg-emerald-600">
                {result.summary.existingCount.toLocaleString()} in account
              </Badge>
              <Badge className="text-white bg-amber-500 hover:bg-amber-500">
                {result.summary.missingCount.toLocaleString()} not in account
              </Badge>
              {duplicateEmails > 0 && (
                <Badge className="text-white bg-violet-600 hover:bg-violet-600">
                  {duplicateEmails.toLocaleString()} duplicates in sheet
                </Badge>
              )}
              {result.summary.invalidCount > 0 && (
                <Badge variant="destructive">
                  {result.summary.invalidCount.toLocaleString()} invalid
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["existing", "In account"],
                  ["missing", "Not in account"],
                  ["duplicates", "Duplicates"],
                  ["invalid", "Invalid"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border border-gray-200 max-h-420px dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="px-3 py-2 font-medium w-12">#</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-gray-500"
                      >
                        No rows for this filter
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={`${row.status}-${row.email}`}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-3 py-2 tabular-nums text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                          {row.email}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "exists" ? (
                            <span className="inline-flex gap-1 items-center text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              In account
                            </span>
                          ) : row.status === "missing" ? (
                            <span className="inline-flex gap-1 items-center text-amber-700 dark:text-amber-400">
                              <XCircle className="h-3.5 w-3.5" />
                              Not in account
                            </span>
                          ) : row.status === "duplicate" ? (
                            <span className="inline-flex gap-1 items-center text-violet-700 dark:text-violet-400">
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate in sheet
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                          {row.status === "exists"
                            ? [row.name, row.detail].filter(Boolean).join(" · ") ||
                              "—"
                            : row.detail || row.name || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
