// src/components/authComponents/SelectedCountry.tsx

import Select, {
  StylesConfig,
  OptionProps,
  components,
  DropdownIndicatorProps,
} from "react-select";
import Image from "next/image";
import { countryOptions } from "./CountryData";
import { brandFontInter } from "@/lib/brandFontLoaders";
import { Globe } from "lucide-react";
import { countrySelectBrand } from "@/lib/brandTheme";

const inter = brandFontInter;

export interface SelectOption {
  value: string;
  label: string;
  flag: string;
  phoneCode: string;
}

export type { StylesConfig, OptionProps };

// Helper to detect dark mode - reliable for Next.js
const isDark = () => {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

export const customStyles: StylesConfig<SelectOption, false> = {
  container: (provided) => ({
    ...provided,
    width: "100%",
    minWidth: 0,
  }),
  control: (provided, state) => {
    const dark = isDark();
    return {
      ...provided,
      minHeight: "40px",
      height: "40px",
      borderRadius: "0.75rem",
      borderWidth: state.isFocused ? "1px" : "2px",
      borderStyle: "solid",
      borderColor: state.isFocused
        ? countrySelectBrand.focus
        : dark
          ? "#4B5563"
          : "#D1D5DB",
      backgroundColor: dark ? "#374151" : "#fff",
      color: dark ? "#F3F4F6" : "#111827",
      fontSize: "1rem",
      fontFamily: inter.style.fontFamily,
      boxShadow: "none",
      outline: "none",
      width: "100%",
      cursor: "pointer",
      [`@media (min-width: 768px)`]: {
        height: "47px",
      },
      "&:hover": {
        borderColor: state.isFocused
          ? countrySelectBrand.focus
          : dark
            ? "#4B5563"
            : "#D1D5DB",
      },
    };
  },

  valueContainer: (provided) => ({
    ...provided,
    height: "40px",
    padding: "0 0.75rem",
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  }),
  singleValue: (provided) => {
    const dark = isDark();
    return {
      ...provided,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "1rem",
      fontFamily: inter.style.fontFamily,
      color: dark ? "#F3F4F6" : "#111827",
      marginLeft: 0,
      minWidth: 0,
      maxWidth: "100%",
    };
  },
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
    fontFamily: inter.style.fontFamily,
    color: "inherit",
    minWidth: 0,
  }),
  placeholder: (provided) => {
    const dark = isDark();
    return {
      ...provided,
      color: dark ? "#9CA3AF" : "#6B7280",
      fontFamily: inter.style.fontFamily,
      marginLeft: 0,
      minWidth: 0,
      fontSize: "0.875rem",
      [`@media (min-width: 768px)`]: {
        fontSize: "1rem",
      },
    };
  },
  option: (provided, state) => {
    const dark = isDark();
    return {
      ...provided,
      display: "flex",
      alignItems: "center",
      padding: "8px 12px",
      fontSize: "1rem",
      fontFamily: inter.style.fontFamily,
      backgroundColor: state.isSelected
        ? dark
          ? countrySelectBrand.selectedDark
          : countrySelectBrand.selectedLight
        : state.isFocused
          ? dark
            ? "#374151"
            : "#F3F4F6"
          : dark
            ? "#1F2937"
            : "#fff",
      color: dark ? "#F3F4F6" : "#111827",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.5 : 1,
      "&:active": {
        backgroundColor: dark
          ? countrySelectBrand.selectedDark
          : countrySelectBrand.selectedLight,
      },
    };
  },
  menu: (provided) => {
    const dark = isDark();
    return {
      ...provided,
      fontFamily: inter.style.fontFamily,
      backgroundColor: dark ? "#1F2937" : "#fff",
      color: dark ? "#F3F4F6" : "#111827",
      borderRadius: "0.75rem",
      border: `1px solid ${dark ? "#374151" : "#E5E7EB"}`,
      boxShadow: dark
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)"
        : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      marginTop: "4px",
      zIndex: 9999,
      minWidth: 0,
    };
  },
  menuList: (provided) => ({
    ...provided,
    padding: "4px",
    maxHeight: "200px",
    minWidth: 0,
    "::-webkit-scrollbar": {
      width: "6px",
    },
    "::-webkit-scrollbar-track": {
      background: isDark() ? "#374151" : "#F3F4F6",
      borderRadius: "3px",
    },
    "::-webkit-scrollbar-thumb": {
      background: isDark() ? countrySelectBrand.scrollbarDark : "#9CA3AF",
      borderRadius: "3px",
    },
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "0 8px",
    color: "inherit",
    "&:hover": {
      color: "inherit",
    },
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

export const CustomOption = ({
  data,
  innerProps,
  isDisabled,
  isFocused,
  isSelected,
}: OptionProps<SelectOption, false>) => (
  <div
    {...innerProps}
    className={`flex items-center gap-3 p-2 cursor-pointer ${inter.className} ${
      isDisabled
        ? "opacity-50 cursor-not-allowed"
        : isSelected
          ? "brand-soft-bg"
          : isFocused
            ? "bg-gray-50 dark:bg-gray-700"
            : "bg-white dark:bg-gray-800"
    } hover:bg-gray-100 dark:hover:bg-gray-700`}
  >
    {data.flag ? (
      <Image
        src={`https://flagcdn.com/24x18/${data.flag}.png`}
        alt={data.label}
        width={24}
        height={18}
        className="object-cover w-6 h-4 shrink-0"
        loading="lazy"
      />
    ) : (
      <Globe className="w-6 h-4 text-gray-400 shrink-0 dark:text-gray-500" />
    )}
    <span className="flex-1 truncate">{data.label}</span>
    <span className="text-sm text-gray-500 dark:text-gray-400">
      {data.phoneCode}
    </span>
  </div>
);

export const CustomSingleValue = ({ data }: { data: SelectOption }) => (
  <div className="flex items-center h-full gap-2">
    {data.flag ? (
      <Image
        src={`https://flagcdn.com/24x18/${data.flag}.png`}
        alt={data.label}
        width={24}
        height={18}
        className="object-cover w-6 h-4 shrink-0"
        loading="lazy"
      />
    ) : (
      <Globe className="w-6 h-4 text-gray-400 shrink-0 dark:text-gray-500" />
    )}
    <span className={`truncate ${inter.className}`}>{data.label}</span>
  </div>
);

export const DropdownIndicator = (
  props: DropdownIndicatorProps<SelectOption, false>,
) => (
  <components.DropdownIndicator {...props}>
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.64245 9.99394 7.35753 9.99394 7.18179 9.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </svg>
  </components.DropdownIndicator>
);

export { Select, countryOptions };
