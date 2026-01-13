"use client";

import React from "react";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="px-6 py-4 bg-white/70 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-gray-200 dark:border-gray-700 border-t">
      <div className="max-w-7xl mx-auto flex justify-center items-center">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 overflow-hidden">
            <Image
              src="/motherlandlogo.png"
              alt="Motherland CRM Solutions Logo"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Motherland CRM Solutions
          </div>
        </div>
      </div>
    </nav>
  );
}
