// src/components/dashboardComponents/Header.tsx
"use client";

import {
  Search,
  Plus,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  User,
} from "lucide-react";
import { cn } from "@/libs/utils";

interface HeaderProps {
  isSecondaryOpen?: boolean;
  onLeadsUpdated?: () => Promise<void>;
}

export default function Header({ isSecondaryOpen = true }: HeaderProps) {
  return (
    <header className="border">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center flex-1">
          <div className="flex items-center space-x-2 ml-2">
            <span className="font-medium">Leads</span>
            <span className="text-gray-500">/</span>
            <span>Leads Inbox</span>
          </div>

          <div
            className={cn(
              "ml-8 flex-1 transition-all duration-300",
              isSecondaryOpen ? "max-w-2xl" : "max-w-4xl"
            )}
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search Pipedrive"
                className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-(--brand-focus)"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Plus size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <MessageCircle size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <HelpCircle size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Lightbulb size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
