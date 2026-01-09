interface RequiredFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequiredFieldsModal = ({
  isOpen,
  onClose,
}: RequiredFieldsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 dark:bg-gray-800 backdrop-blur-md p-6 rounded-lg max-w-lg w-full mx-4 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 !text-gray-900 dark:!text-white">
          Required Column Headers
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Your Excel/CSV file must contain the following column headers
          (case-sensitive):
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li>
            <span className="font-semibold">First Name</span> or{" "}
            <span className="font-semibold">Full Name</span>
          </li>
          <li>
            <span className="font-semibold">Last Name</span> (optional if Full
            Name is provided)
          </li>
          <li>
            <span className="font-semibold">Email Address</span> or{" "}
            <span className="font-semibold">Email</span>
          </li>
          <li>
            <span className="font-semibold">Phone Number</span> or{" "}
            <span className="font-semibold">Phone</span>
          </li>
          <li>
            <span className="font-semibold">Country</span>
          </li>
        </ul>
        <div className="bg-yellow-50/80 dark:bg-yellow-900/20 backdrop-blur-sm border-l-4 border-yellow-400 dark:border-yellow-500 p-4 mb-4 rounded">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <span className="font-bold">Note:</span> Headers are case-sensitive.
            Make sure they match exactly as shown above.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
