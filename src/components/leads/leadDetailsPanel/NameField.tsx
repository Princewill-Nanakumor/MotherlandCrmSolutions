import { FC } from "react";
import { User, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NameFieldProps {
  firstName: string;
  lastName: string;
  isEditing: boolean;
  editedFirstName: string;
  editedLastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onCopy?: (text: string) => void;
  copied?: boolean;
}

export const NameField: FC<NameFieldProps> = ({
  firstName,
  lastName,
  isEditing,
  editedFirstName,
  editedLastName,
  onFirstNameChange,
  onLastNameChange,
  onCopy,
  copied = false,
}) => {
  const capitalizeName = (name: string) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };
  const capitalizedFirstName = capitalizeName(firstName);
  const capitalizedLastName = capitalizeName(lastName);
  const fullName = `${capitalizedFirstName} ${capitalizedLastName}`.trim();

  if (isEditing) {
    return (
      <div className="flex items-start gap-3">
        <User className="w-5 h-5 mt-2 text-gray-400! dark:text-gray-500!" />
        <div className="flex-1 space-y-2">
          <div>
            <label className="block mb-1 text-sm text-gray-500! dark:text-gray-400!">
              First Name *
            </label>
            <Input
              value={editedFirstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="Enter first name"
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-500! dark:text-gray-400!">
              Last Name
            </label>
            <Input
              value={editedLastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Enter last name"
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-gray-700! dark:text-gray-300!">
      <User className="w-5 h-5 text-gray-400! dark:text-gray-500!" />
      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400!">Name</p>
        <div className="flex items-center justify-between">
          <p className="text-gray-900! dark:text-white!">{fullName}</p>
          {onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(fullName);
              }}
              className="ml-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy name"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
