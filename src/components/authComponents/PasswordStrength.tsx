// src/components/authComponents/PasswordStrength.tsx
"use client";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (password: string) => {
    if (!password) return 0;

    let score = 0;
    // Length check
    if (password.length >= 8) score++;
    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    // Number check
    if (/[0-9]/.test(password)) score++;
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) score++;
    // Very strong condition
    if (password.length >= 12 && score >= 3) score++;

    return Math.min(score, 5); // Cap at 5 for our indicators
  };

  const strength = getStrength(password);
  const strengthText = [
    "Very Weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very Strong",
  ];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-emerald-500",
  ];
  const strengthTextColors = [
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-blue-500",
    "text-green-500",
    "text-emerald-500",
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          Password strength:
        </span>
        <span
          className={`font-medium ${strengthTextColors[strength] || "text-gray-400"}`}
        >
          {strengthText[strength] || "Very Weak"}
        </span>
      </div>

      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-full rounded-full flex-1 transition-all duration-300 ${
              level <= strength
                ? strengthColors[strength]
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <ul className="text-xs text-gray-500 space-y-1 mt-2">
        <li
          className={`flex items-center ${password.length >= 8 ? "text-green-500" : ""}`}
        >
          {password.length >= 8 ? "✓" : "•"} At least 8 characters
        </li>
        <li
          className={`flex items-center ${/[A-Z]/.test(password) ? "text-green-500" : ""}`}
        >
          {/[A-Z]/.test(password) ? "✓" : "•"} Uppercase letter
        </li>
        <li
          className={`flex items-center ${/[0-9]/.test(password) ? "text-green-500" : ""}`}
        >
          {/[0-9]/.test(password) ? "✓" : "•"} Number
        </li>
        <li
          className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? "text-green-500" : ""}`}
        >
          {/[^A-Za-z0-9]/.test(password) ? "✓" : "•"} Special character
        </li>
      </ul>
    </div>
  );
}
