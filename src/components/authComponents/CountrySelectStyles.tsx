// src/components/authComponents/CountrySelectStyles.tsx
import { StylesConfig } from "react-select";
import { countrySelectBrand } from "@/lib/brandTheme";

export interface SelectOption {
  value: string;
  label: string;
  flag: string;
  phoneCode: string;
}

export const getCountrySelectStyles = (
  hasError: boolean = false,
  appearance: "light" | "darkHero" = "light",
): StylesConfig<SelectOption, false> => {
  const dark = appearance === "darkHero";

  if (dark) {
    return {
      container: (provided) => ({
        ...provided,
        width: "100%",
        minWidth: 0,
      }),
      control: (base, state) => ({
        ...base,
        minHeight: "40px",
        height: "40px",
        borderRadius: "0.5rem",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: hasError
          ? "#EF4444"
          : state.isFocused
            ? countrySelectBrand.focus
            : "rgba(255, 255, 255, 0.2)",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        color: "#FFFFFF",
        fontSize: "0.875rem",
        fontWeight: 600,
        fontFamily: "inherit",
        outline: "none",
        width: "100%",
        cursor: "pointer",
        transition: "none",
        boxShadow:
          hasError && state.isFocused
            ? "0 0 0 3px rgba(239, 68, 68, 0.35)"
            : !hasError && state.isFocused
              ? countrySelectBrand.focusRingHero
              : "none",
        "&:hover": {
          borderColor: hasError
            ? "#EF4444"
            : state.isFocused
              ? countrySelectBrand.focus
              : "rgba(255, 255, 255, 0.32)",
        },
        "@media (min-width: 640px)": {
          minHeight: "48px",
          height: "48px",
          fontSize: "1rem",
        },
      }),
      valueContainer: (provided, state) => ({
        ...provided,
        height: "40px",
        padding: state.hasValue ? "0 0.75rem" : "0 0.75rem 0 2.5rem",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        "@media (min-width: 640px)": {
          height: "48px",
          padding: state.hasValue ? "0 0.75rem" : "0 0.75rem 0 3rem",
        },
      }),
      singleValue: (provided) => ({
        ...provided,
        display: "flex",
        alignItems: "center",
        fontSize: "0.875rem",
        fontWeight: 600,
        fontFamily: "inherit",
        color: "#FFFFFF",
        marginLeft: 0,
        minWidth: 0,
        maxWidth: "100%",
        "@media (min-width: 640px)": {
          fontSize: "1rem",
        },
      }),
      input: (provided) => ({
        ...provided,
        margin: 0,
        padding: 0,
        fontFamily: "inherit",
        color: "#FFFFFF",
        fontWeight: 600,
        minWidth: 0,
        fontSize: "0.875rem",
        "@media (min-width: 640px)": {
          fontSize: "1rem",
        },
      }),
      placeholder: (provided) => ({
        ...provided,
        color: "rgba(255, 255, 255, 0.72)",
        fontWeight: 600,
        fontFamily: "inherit",
        marginLeft: 0,
        minWidth: 0,
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        "@media (min-width: 640px)": {
          fontSize: "1rem",
        },
      }),
      option: (provided, state) => ({
        ...provided,
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        fontSize: "0.875rem",
        fontWeight: 600,
        fontFamily: "inherit",
        backgroundColor: state.isSelected
          ? countrySelectBrand.selectedHero
          : state.isFocused
            ? "rgba(255, 255, 255, 0.08)"
            : "rgb(15, 23, 42)",
        color: "#FFFFFF",
        cursor: state.isDisabled ? "not-allowed" : "pointer",
        opacity: state.isDisabled ? 0.5 : 1,
        "&:active": {
          backgroundColor: countrySelectBrand.selectedHeroActive,
        },
        "@media (min-width: 640px)": {
          fontSize: "1rem",
        },
      }),
      menu: (provided) => ({
        ...provided,
        fontFamily: "inherit",
        backgroundColor: "rgb(15, 23, 42)",
        color: "#F3F4F6",
        borderRadius: "0.5rem",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.35)",
        marginTop: "4px",
        zIndex: 9999,
        minWidth: 0,
      }),
      menuList: (provided) => ({
        ...provided,
        padding: "2px",
        maxHeight: "180px",
        minWidth: 0,
        backgroundColor: "rgb(15, 23, 42)",
        "::-webkit-scrollbar": {
          width: "6px",
        },
        "::-webkit-scrollbar-track": {
          background: "rgba(255,255,255,0.06)",
          borderRadius: "3px",
        },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.25)",
          borderRadius: "3px",
        },
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        padding: "0 8px",
        color: "rgba(255,255,255,0.55)",
      }),
      indicatorSeparator: () => ({
        display: "none",
      }),
    };
  }

  return {
    container: (provided) => ({
      ...provided,
      width: "100%",
      minWidth: 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "40px",
      height: "40px",
      borderRadius: "0.5rem",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: hasError
        ? "#EF4444"
        : state.isFocused
          ? countrySelectBrand.focus
          : "#D1D5DB",
      backgroundColor: "#FFFFFF",
      color: "#111827",
      fontSize: "0.875rem",
      fontFamily: "inherit",
      outline: "none",
      width: "100%",
      cursor: "pointer",
      transition: "none",
      boxShadow:
        hasError && state.isFocused
          ? "0 0 0 1px #EF4444"
          : !hasError && state.isFocused
            ? countrySelectBrand.focusRing
            : "none",
      "&:hover": {
        borderColor: hasError
          ? "#EF4444"
          : state.isFocused
            ? countrySelectBrand.focus
            : "#D1D5DB",
      },
      "@media (min-width: 640px)": {
        minHeight: "48px",
        height: "48px",
        fontSize: "1rem",
      },
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      height: "40px",
      padding: state.hasValue
        ? "0 0.75rem"
        : "0 0.75rem 0 2.5rem",
      display: "flex",
      alignItems: "center",
      minWidth: 0,
      "@media (min-width: 640px)": {
        height: "48px",
        padding: state.hasValue ? "0 0.75rem" : "0 0.75rem 0 3rem",
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      fontSize: "0.875rem",
      fontFamily: "inherit",
      color: "#111827",
      marginLeft: 0,
      minWidth: 0,
      maxWidth: "100%",
      "@media (min-width: 640px)": {
        fontSize: "1rem",
      },
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontFamily: "inherit",
      color: "#111827",
      minWidth: 0,
      fontSize: "0.875rem",
      "@media (min-width: 640px)": {
        fontSize: "1rem",
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#6B7280",
      fontFamily: "inherit",
      marginLeft: 0,
      minWidth: 0,
      fontSize: "0.875rem",
      display: "flex",
      alignItems: "center",
      "@media (min-width: 640px)": {
        fontSize: "1rem",
      },
    }),
    option: (provided, state) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      padding: "8px 12px",
      fontSize: "0.875rem",
      fontFamily: "inherit",
      backgroundColor: state.isSelected
        ? countrySelectBrand.selectedLight
        : state.isFocused
          ? "#F3F4F6"
          : "#FFFFFF",
      color: "#111827",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.5 : 1,
      "&:active": {
        backgroundColor: countrySelectBrand.selectedLight,
      },
      "@media (min-width: 640px)": {
        fontSize: "1rem",
      },
    }),
    menu: (provided) => ({
      ...provided,
      fontFamily: "inherit",
      backgroundColor: "#FFFFFF",
      color: "#111827",
      borderRadius: "0.5rem",
      border: "1px solid #E5E7EB",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      marginTop: "4px",
      zIndex: 9999,
      minWidth: 0,
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
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "0 8px",
      color: "#6B7280",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
  };
};
