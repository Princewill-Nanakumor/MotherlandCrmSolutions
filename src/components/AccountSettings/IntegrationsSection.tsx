"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface FieldMappingRow {
  taboola: string;
  crm: string;
  shownIn: string;
}

interface TaboolaStatusResponse {
  webhookUrl: string;
  authHeader: string;
  method: string;
  contentType: string;
  receivesLeadsForThisAdmin: boolean;
  config: {
    secretConfigured: boolean;
    defaultAdminConfigured: boolean;
    campaignMappingsCount: number;
    allowedAdminIdsCount: number;
    ready: boolean;
  };
  fieldMapping: FieldMappingRow[];
}

interface TaboolaTestResponse {
  ok: boolean;
  webhookReachable: boolean;
  checks: Array<{ name: string; ok: boolean; message: string }>;
}

function StatusPill({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function IntegrationsSection() {
  const { toast } = useToast();
  const [status, setStatus] = useState<TaboolaStatusResponse | null>(null);
  const [testResult, setTestResult] = useState<TaboolaTestResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/taboola/status", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load integration status");
      }
      const data = (await response.json()) as TaboolaStatusResponse;
      setStatus(data);
    } catch (error) {
      toast({
        title: "Could not load integrations",
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/integrations/taboola/test", {
        method: "POST",
        credentials: "include",
      });
      const data = (await response.json()) as TaboolaTestResponse;
      setTestResult(data);
      toast({
        title: data.ok ? "Integration test passed" : "Integration test failed",
        description: data.ok
          ? "Taboola webhook is ready to receive leads."
          : "Review the checks below and server environment variables.",
        variant: data.ok ? "success" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description:
          error instanceof Error ? error.message : "Could not run test",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = async () => {
    if (!status?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(status.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Webhook URL copied to clipboard",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="p-6 bg-white border shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
          <Plug className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
            Integrations
          </h2>
          <p className="text-sm text-gray-500 dark:text-white!">
            Live lead feeds into your CRM
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading integration status...
        </div>
      ) : status ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900! dark:text-white!">
                  Taboola
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Send leads from Taboola campaigns directly to All Leads.
                </p>
              </div>
              <StatusPill
                ok={status.config.ready}
                label={status.config.ready ? "Ready" : "Needs setup"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill
                ok={status.config.secretConfigured}
                label="Secret configured"
              />
              <StatusPill
                ok={
                  status.config.defaultAdminConfigured ||
                  status.config.campaignMappingsCount > 0
                }
                label="Tenant routing"
              />
              <StatusPill
                ok={status.receivesLeadsForThisAdmin}
                label={
                  status.receivesLeadsForThisAdmin
                    ? "Leads route to you"
                    : "Leads route elsewhere"
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Webhook URL
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white break-all">
                  <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                  {status.webhookUrl}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyWebhookUrl()}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <span className="font-medium text-gray-900 dark:text-white">
                  Method:
                </span>{" "}
                {status.method}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-white">
                  Content-Type:
                </span>{" "}
                {status.contentType}
              </p>
              <p>
                <span className="font-medium text-gray-900 dark:text-white">
                  Auth header:
                </span>{" "}
                {status.authHeader}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void runTest()}
                disabled={testing}
                className="text-white"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test connection
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadStatus()}
              >
                Refresh status
              </Button>
            </div>

            {testResult ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Test results
                </p>
                {testResult.checks.map((check) => (
                  <div
                    key={check.name}
                    className="flex items-start gap-2 text-sm"
                  >
                    {check.ok ? (
                      <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {check.name}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {check.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Field mapping
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      Taboola
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      CRM
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      Shown in UI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {status.fieldMapping.map((row) => (
                    <tr
                      key={row.taboola}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {row.taboola}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.crm}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.shownIn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            Give your Taboola manager the webhook URL above and ask them to POST
            JSON with fields: FirstName, LastName, Email, PhoneNumber, Language,
            IP, ClickID, and Page. Use the auth header{" "}
            <code className="font-mono">{status.authHeader}</code> with the
            shared secret configured on the server.
          </div>
        </div>
      ) : null}
    </section>
  );
}
