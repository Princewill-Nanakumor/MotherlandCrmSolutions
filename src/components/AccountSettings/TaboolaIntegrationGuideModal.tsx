"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { buildTaboolaIntegrationGuide } from "@/lib/integrations/taboolaIntegrationGuide";

interface TaboolaIntegrationGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  authHeader: string;
  method: string;
  contentType: string;
}

export function TaboolaIntegrationGuideModal({
  open,
  onOpenChange,
  webhookUrl,
  authHeader,
  method,
  contentType,
}: TaboolaIntegrationGuideModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const guide = useMemo(
    () =>
      buildTaboolaIntegrationGuide({
        webhookUrl,
        authHeader,
        method,
        contentType,
      }),
    [webhookUrl, authHeader, method, contentType],
  );

  const copyGuide = async () => {
    try {
      await navigator.clipboard.writeText(guide);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Guide copied",
        description:
          "Integration guide copied. Share it with your Taboola manager and send the webhook secret separately.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy integration guide to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border border-gray-200 bg-white p-0 dark:border-gray-700 dark:bg-gray-800 sm:max-w-3xl">
        <DialogHeader className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <DialogTitle className="text-gray-900! dark:text-white!">
            Taboola integration guide
          </DialogTitle>
          <DialogDescription className="text-gray-500! dark:text-gray-300!">
            Share this with your Taboola manager. Send the webhook secret
            separately — it is not included in this guide.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-900 dark:border-gray-600 dark:bg-gray-900/60 dark:text-white sm:text-sm">
            {guide}
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            className="dark:border-gray-600 dark:text-white! dark:hover:bg-gray-700"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => void copyGuide()}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy guide
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
