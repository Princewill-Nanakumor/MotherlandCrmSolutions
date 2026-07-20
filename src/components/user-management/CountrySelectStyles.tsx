// src/components/user-management/CountrySelectStyles.tsx
import { StylesConfig } from "react-select";
import { countrySelectBrand } from "@/lib/brandTheme";

export interface SelectOption {
  value: string;
  label: string;
  flag: string;
  phoneCode: string;
}

export const getCountrySelectStyles = (
  hasError: boolean = false
): StylesConfig<SelectOption, false> => {
  const isDarkMode =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return {
    container: (provided) => ({
      ...provided,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "38px",
      height: "38px",
      borderRadius: "0.5rem",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: hasError
        ? "#EF4444"
        : state.isFocused
          ? countrySelectBrand.focus
          : isDarkMode
            ? "#4B5563"
            : "#D1D5DB", // gray-600 for dark, gray-300 for light
      backgroundColor: isDarkMode ? "rgb(55 65 81)" : "#FFFFFF", // dark:bg-gray-700 or white
      color: isDarkMode ? "#FFFFFF" : "#111827", // white for dark, gray-900 for light
      fontSize: "0.875rem",
      fontFamily: "inherit",
      outline: "none",
      width: "100%",
      cursor: "pointer",
      transition: "none",
      boxShadow:
        hasError && state.isFocused
          ? "0 0 0 1px #EF4444" // red focus ring when error and focused
          : !hasError && state.isFocused
            ? countrySelectBrand.focusRing
            : "none",
      "&:hover": {
        borderColor: hasError
          ? "#EF4444"
          : state.isFocused
            ? countrySelectBrand.focus
            : isDarkMode
              ? "#4B5563"
              : "#D1D5DB",
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: "40px",
      padding: "0 0.75rem",
      display: "flex",
      alignItems: "center",
      minWidth: 0,
    }),
    singleValue: (provided) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "0.875rem",
      fontFamily: "inherit",
      color: isDarkMode ? "#FFFFFF" : "#111827", // white for dark, gray-900 for light
      marginLeft: 0,
      minWidth: 0,
      maxWidth: "100%",
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontFamily: "inherit",
      color: isDarkMode ? "#FFFFFF" : "#111827", // white for dark, gray-900 for light
      minWidth: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isDarkMode ? "#9CA3AF" : "#6B7280", // gray-400 for dark, gray-500 for light
      fontFamily: "inherit",
      marginLeft: 0,
      minWidth: 0,
      fontSize: "0.875rem",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }),
    option: (provided, state) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      padding: "8px 12px",
      fontSize: "0.875rem",
      fontFamily: "inherit",
      backgroundColor: state.isSelected
        ? isDarkMode
          ? countrySelectBrand.selectedDark
          : countrySelectBrand.selectedLight
        : state.isFocused
          ? isDarkMode
            ? "#374151"
            : "#F3F4F6" // gray-700 for dark, gray-100 for light
          : isDarkMode
            ? "#1F2937"
            : "#FFFFFF", // gray-800 for dark, white for light
      color: isDarkMode ? "#FFFFFF" : "#111827", // white for dark, gray-900 for light
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.5 : 1,
      "&:active": {
        backgroundColor: isDarkMode
          ? countrySelectBrand.selectedDark
          : countrySelectBrand.selectedLight,
      },
    }),
    menu: (provided) => ({
      ...provided,
      fontFamily: "inherit",
      backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF", // gray-800 for dark, white for light
      color: isDarkMode ? "#FFFFFF" : "#111827", // white for dark, gray-900 for light
      borderRadius: "0.5rem",
      border: isDarkMode ? "1px solid #374151" : "1px solid #E5E7EB", // gray-700 for dark, gray-200 for light
      boxShadow: isDarkMode
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      marginTop: "4px",
      zIndex: 9999,
      minWidth: 0,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: "2px",
      maxHeight: "143px",
      minWidth: 0,
      "::-webkit-scrollbar": {
        width: "6px",
      },
      "::-webkit-scrollbar-track": {
        background: isDarkMode ? "#374151" : "#F3F4F6",
        borderRadius: "3px",
      },
      "::-webkit-scrollbar-thumb": {
        background: isDarkMode ? countrySelectBrand.scrollbarDark : "#9CA3AF",
        borderRadius: "3px",
      },
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "0 8px",
      color: isDarkMode ? "#9CA3AF" : "#6B7280",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };
};
