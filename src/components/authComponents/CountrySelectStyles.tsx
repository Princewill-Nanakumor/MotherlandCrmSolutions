// src/components/authComponents/CountrySelectStyles.tsx
import { StylesConfig } from "react-select";

export interface SelectOption {
  value: string;
  label: string;
  flag: string;
  phoneCode: string;
}

export const getCountrySelectStyles = (
  hasError: boolean = false
): StylesConfig<SelectOption, false> => {
  return {
    container: (provided) => ({
      ...provided,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "40px", // h-10 for mobile
      height: "40px",
      borderRadius: "0.5rem",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: hasError
        ? "#EF4444" // red-500
        : state.isFocused
          ? "#6366F1" // indigo-500
          : "#D1D5DB", // gray-300 for light mode
      backgroundColor: "#FFFFFF", // white for light mode
      color: "#111827", // gray-900 for light mode
      fontSize: "0.875rem", // text-sm
      fontFamily: "inherit",
      outline: "none",
      width: "100%",
      cursor: "pointer",
      transition: "none",
      boxShadow:
        hasError && state.isFocused
          ? "0 0 0 1px #EF4444" // red focus ring when error and focused
          : !hasError && state.isFocused
            ? "0 0 0 1px #6366F1" // indigo focus ring when no error and focused
            : "none",
      "&:hover": {
        borderColor: hasError
          ? "#EF4444"
          : state.isFocused
            ? "#6366F1"
            : "#D1D5DB",
      },
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        borderColor: hasError
          ? "#EF4444" // red-500
          : state.isFocused
            ? "#6366F1" // indigo-500
            : "#4B5563", // gray-600 for dark mode
        backgroundColor: "#374151", // gray-700 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        "&:hover": {
          borderColor: hasError
            ? "#EF4444"
            : state.isFocused
              ? "#6366F1"
              : "#4B5563",
        },
      },
      // Manual dark mode class
      ".dark &": {
        borderColor: hasError
          ? "#EF4444" // red-500
          : state.isFocused
            ? "#6366F1" // indigo-500
            : "#4B5563", // gray-600 for dark mode
        backgroundColor: "#374151", // gray-700 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        "&:hover": {
          borderColor: hasError
            ? "#EF4444"
            : state.isFocused
              ? "#6366F1"
              : "#4B5563",
        },
      },
      // Responsive height
      "@media (min-width: 640px)": {
        minHeight: "48px", // h-12 for desktop
        height: "48px",
        fontSize: "1rem", // text-base
      },
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      height: "40px", // h-10 for mobile
      padding: state.hasValue
        ? "0 0.75rem" // No left padding when value is selected
        : "0 0.75rem 0 2.5rem", // Add left padding for globe icon spacing when no value
      display: "flex",
      alignItems: "center",
      minWidth: 0,
      // Responsive height and padding
      "@media (min-width: 640px)": {
        height: "48px", // h-12 for desktop
        padding: state.hasValue ? "0 0.75rem" : "0 0.75rem 0 3rem", // More left padding for larger screens when no value
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      fontSize: "0.875rem", // text-sm
      fontFamily: "inherit",
      color: "#111827", // gray-900 for light mode
      marginLeft: 0,
      minWidth: 0,
      maxWidth: "100%",
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        color: "#F3F4F6", // gray-100 for dark mode
      },
      ".dark &": {
        color: "#F3F4F6", // gray-100 for dark mode
      },
      // Responsive font size
      "@media (min-width: 640px)": {
        fontSize: "1rem", // text-base
      },
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontFamily: "inherit",
      color: "#111827", // gray-900 for light mode
      minWidth: 0,
      fontSize: "0.875rem", // text-sm
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        color: "#F3F4F6", // gray-100 for dark mode
      },
      ".dark &": {
        color: "#F3F4F6", // gray-100 for dark mode
      },
      // Responsive font size
      "@media (min-width: 640px)": {
        fontSize: "1rem", // text-base
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#6B7280", // gray-500 for light mode
      fontFamily: "inherit",
      marginLeft: 0, // Remove marginLeft since we're using padding on valueContainer
      minWidth: 0,
      fontSize: "0.875rem", // text-sm
      display: "flex",
      alignItems: "center",
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        color: "#9CA3AF", // gray-400 for dark mode
      },
      ".dark &": {
        color: "#9CA3AF", // gray-400 for dark mode
      },
      // Responsive font size
      "@media (min-width: 640px)": {
        fontSize: "1rem", // text-base
      },
    }),
    option: (provided, state) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      padding: "8px 12px",
      fontSize: "0.875rem", // text-sm
      fontFamily: "inherit",
      backgroundColor: state.isSelected
        ? "#EEF2FF" // indigo-50 for light mode
        : state.isFocused
          ? "#F3F4F6" // gray-100 for light mode
          : "#FFFFFF", // white for light mode
      color: "#111827", // gray-900 for light mode
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.5 : 1,
      "&:active": {
        backgroundColor: "#EEF2FF",
      },
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        backgroundColor: state.isSelected
          ? "#312E81" // indigo-900 for dark mode
          : state.isFocused
            ? "#374151" // gray-700 for dark mode
            : "#1F2937", // gray-800 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        "&:active": {
          backgroundColor: "#312E81",
        },
      },
      ".dark &": {
        backgroundColor: state.isSelected
          ? "#312E81" // indigo-900 for dark mode
          : state.isFocused
            ? "#374151" // gray-700 for dark mode
            : "#1F2937", // gray-800 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        "&:active": {
          backgroundColor: "#312E81",
        },
      },
      // Responsive font size
      "@media (min-width: 640px)": {
        fontSize: "1rem", // text-base
      },
    }),
    menu: (provided) => ({
      ...provided,
      fontFamily: "inherit",
      backgroundColor: "#FFFFFF", // white for light mode
      color: "#111827", // gray-900 for light mode
      borderRadius: "0.5rem",
      border: "1px solid #E5E7EB", // gray-200 for light mode
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      marginTop: "4px",
      zIndex: 9999,
      minWidth: 0,
      // Dark mode styles
      "@media (prefers-color-scheme: dark)": {
        backgroundColor: "#1F2937", // gray-800 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        border: "1px solid #374151", // gray-700 for dark mode
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
      },
      ".dark &": {
        backgroundColor: "#1F2937", // gray-800 for dark mode
        color: "#F3F4F6", // gray-100 for dark mode
        border: "1px solid #374151", // gray-700 for dark mode
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
      },
    }),
    menuList: (provided) => ({
      ...provided,
      padding: "2px",
      maxHeight: "180px",
      minWidth: 0,
      "::-webkit-scrollbar": {
        width: "6px",
      },
      "::-webkit-scrollbar-track": {
        background: "#F3F4F6",
        borderRadius: "3px",
      },
      "::-webkit-scrollbar-thumb": {
        background: "#9CA3AF",
        borderRadius: "3px",
      },
      // Dark mode scrollbar styles
      "@media (prefers-color-scheme: dark)": {
        "::-webkit-scrollbar-track": {
          background: "#374151",
        },
        "::-webkit-scrollbar-thumb": {
          background: "#818CF8",
        },
      },
      ".dark &": {
        "::-webkit-scrollbar-track": {
          background: "#374151", // gray-700 for dark mode
        },
        "::-webkit-scrollbar-thumb": {
          background: "#818CF8", // indigo-400 for dark mode
        },
      },
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "0 8px",
      color: "#6B7280",
      "@media (prefers-color-scheme: dark)": {
        color: "#9CA3AF",
      },
      ".dark &": {
        color: "#9CA3AF",
      },
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };
};
