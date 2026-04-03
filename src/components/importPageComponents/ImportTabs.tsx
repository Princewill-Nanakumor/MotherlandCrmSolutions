import { FC } from "react";

interface ImportTabsProps {
  activeTab: "new" | "history";
  setActiveTab: (tab: "new" | "history") => void;
}

export const ImportTabs: FC<ImportTabsProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-8 px-6">
        <button
          onClick={() => setActiveTab("new")}
          className={`px-1 py-4 font-medium transition-colors ${
            activeTab === "new"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-600! hover:text-gray-900! dark:text-gray-400! dark:hover:text-gray-200!"
          }`}
        >
          New import
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-1 py-4 font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-600! hover:text-gray-900! dark:text-gray-400! dark:hover:text-gray-200!"
          }`}
        >
          Import history
        </button>
      </div>
    </div>
  );
};
