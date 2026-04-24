// src/components/user-management/CountrySelect.tsx
import Select, { StylesConfig, OptionProps } from "react-select";
import Image from "next/image";
import { Inter } from "next/font/google";
import { Globe } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export interface SelectOption {
  value: string;
  label: string;
  flag: string;
  phoneCode: string;
}

export const countryOptions: SelectOption[] = [
  { value: "AF", label: "Afghanistan", flag: "af", phoneCode: "+93" },
  { value: "AL", label: "Albania", flag: "al", phoneCode: "+355" },
  { value: "DZ", label: "Algeria", flag: "dz", phoneCode: "+213" },
  { value: "AS", label: "American Samoa", flag: "as", phoneCode: "+1" },
  { value: "AD", label: "Andorra", flag: "ad", phoneCode: "+376" },
  { value: "AO", label: "Angola", flag: "ao", phoneCode: "+244" },
  { value: "AI", label: "Anguilla", flag: "ai", phoneCode: "+1" },
  { value: "AG", label: "Antigua and Barbuda", flag: "ag", phoneCode: "+1" },
  { value: "AR", label: "Argentina", flag: "ar", phoneCode: "+54" },
  { value: "AM", label: "Armenia", flag: "am", phoneCode: "+374" },
  { value: "AW", label: "Aruba", flag: "aw", phoneCode: "+297" },
  { value: "AU", label: "Australia", flag: "au", phoneCode: "+61" },
  { value: "AT", label: "Austria", flag: "at", phoneCode: "+43" },
  { value: "AZ", label: "Azerbaijan", flag: "az", phoneCode: "+994" },
  { value: "BS", label: "Bahamas", flag: "bs", phoneCode: "+1" },
  { value: "BH", label: "Bahrain", flag: "bh", phoneCode: "+973" },
  { value: "BD", label: "Bangladesh", flag: "bd", phoneCode: "+880" },
  { value: "BB", label: "Barbados", flag: "bb", phoneCode: "+1" },
  { value: "BY", label: "Belarus", flag: "by", phoneCode: "+375" },
  { value: "BE", label: "Belgium", flag: "be", phoneCode: "+32" },
  { value: "BZ", label: "Belize", flag: "bz", phoneCode: "+501" },
  { value: "BJ", label: "Benin", flag: "bj", phoneCode: "+229" },
  { value: "BM", label: "Bermuda", flag: "bm", phoneCode: "+1" },
  { value: "BT", label: "Bhutan", flag: "bt", phoneCode: "+975" },
  { value: "BO", label: "Bolivia", flag: "bo", phoneCode: "+591" },
  {
    value: "BA",
    label: "Bosnia and Herzegovina",
    flag: "ba",
    phoneCode: "+387",
  },
  { value: "BW", label: "Botswana", flag: "bw", phoneCode: "+267" },
  { value: "BR", label: "Brazil", flag: "br", phoneCode: "+55" },
  {
    value: "IO",
    label: "British Indian Ocean Territory",
    flag: "io",
    phoneCode: "+246",
  },
  { value: "VG", label: "British Virgin Islands", flag: "vg", phoneCode: "+1" },
  { value: "BN", label: "Brunei", flag: "bn", phoneCode: "+673" },
  { value: "BG", label: "Bulgaria", flag: "bg", phoneCode: "+359" },
  { value: "BF", label: "Burkina Faso", flag: "bf", phoneCode: "+226" },
  { value: "BI", label: "Burundi", flag: "bi", phoneCode: "+257" },
  { value: "KH", label: "Cambodia", flag: "kh", phoneCode: "+855" },
  { value: "CM", label: "Cameroon", flag: "cm", phoneCode: "+237" },
  { value: "CA", label: "Canada", flag: "ca", phoneCode: "+1" },
  { value: "CV", label: "Cape Verde", flag: "cv", phoneCode: "+238" },
  { value: "KY", label: "Cayman Islands", flag: "ky", phoneCode: "+1" },
  {
    value: "CF",
    label: "Central African Republic",
    flag: "cf",
    phoneCode: "+236",
  },
  { value: "TD", label: "Chad", flag: "td", phoneCode: "+235" },
  { value: "CL", label: "Chile", flag: "cl", phoneCode: "+56" },
  { value: "CN", label: "China", flag: "cn", phoneCode: "+86" },
  { value: "CX", label: "Christmas Island", flag: "cx", phoneCode: "+61" },
  {
    value: "CC",
    label: "Cocos (Keeling) Islands",
    flag: "cc",
    phoneCode: "+61",
  },
  { value: "CO", label: "Colombia", flag: "co", phoneCode: "+57" },
  { value: "KM", label: "Comoros", flag: "km", phoneCode: "+269" },
  { value: "CK", label: "Cook Islands", flag: "ck", phoneCode: "+682" },
  { value: "CR", label: "Costa Rica", flag: "cr", phoneCode: "+506" },
  { value: "CI", label: "Ivory Coast", flag: "ci", phoneCode: "+225" },
  { value: "HR", label: "Croatia", flag: "hr", phoneCode: "+385" },
  { value: "CU", label: "Cuba", flag: "cu", phoneCode: "+53" },
  { value: "CW", label: "Curaçao", flag: "cw", phoneCode: "+599" },
  { value: "CY", label: "Cyprus", flag: "cy", phoneCode: "+357" },
  { value: "CZ", label: "Czech Republic", flag: "cz", phoneCode: "+420" },
  {
    value: "CD",
    label: "Democratic Republic of the Congo",
    flag: "cd",
    phoneCode: "+243",
  },
  { value: "DK", label: "Denmark", flag: "dk", phoneCode: "+45" },
  { value: "DJ", label: "Djibouti", flag: "dj", phoneCode: "+253" },
  { value: "DM", label: "Dominica", flag: "dm", phoneCode: "+1" },
  { value: "DO", label: "Dominican Republic", flag: "do", phoneCode: "+1" },
  { value: "EC", label: "Ecuador", flag: "ec", phoneCode: "+593" },
  { value: "EG", label: "Egypt", flag: "eg", phoneCode: "+20" },
  { value: "SV", label: "El Salvador", flag: "sv", phoneCode: "+503" },
  { value: "GQ", label: "Equatorial Guinea", flag: "gq", phoneCode: "+240" },
  { value: "ER", label: "Eritrea", flag: "er", phoneCode: "+291" },
  { value: "EE", label: "Estonia", flag: "ee", phoneCode: "+372" },
  { value: "SZ", label: "Eswatini", flag: "sz", phoneCode: "+268" },
  { value: "ET", label: "Ethiopia", flag: "et", phoneCode: "+251" },
  { value: "FK", label: "Falkland Islands", flag: "fk", phoneCode: "+500" },
  { value: "FO", label: "Faroe Islands", flag: "fo", phoneCode: "+298" },
  { value: "FJ", label: "Fiji", flag: "fj", phoneCode: "+679" },
  { value: "FI", label: "Finland", flag: "fi", phoneCode: "+358" },
  { value: "FR", label: "France", flag: "fr", phoneCode: "+33" },
  { value: "PF", label: "French Polynesia", flag: "pf", phoneCode: "+689" },
  { value: "GA", label: "Gabon", flag: "ga", phoneCode: "+241" },
  { value: "GM", label: "Gambia", flag: "gm", phoneCode: "+220" },
  { value: "GE", label: "Georgia", flag: "ge", phoneCode: "+995" },
  { value: "DE", label: "Germany", flag: "de", phoneCode: "+49" },
  { value: "GH", label: "Ghana", flag: "gh", phoneCode: "+233" },
  { value: "GI", label: "Gibraltar", flag: "gi", phoneCode: "+350" },
  { value: "GR", label: "Greece", flag: "gr", phoneCode: "+30" },
  { value: "GL", label: "Greenland", flag: "gl", phoneCode: "+299" },
  { value: "GD", label: "Grenada", flag: "gd", phoneCode: "+1" },
  { value: "GU", label: "Guam", flag: "gu", phoneCode: "+1" },
  { value: "GT", label: "Guatemala", flag: "gt", phoneCode: "+502" },
  { value: "GG", label: "Guernsey", flag: "gg", phoneCode: "+44" },
  { value: "GN", label: "Guinea", flag: "gn", phoneCode: "+224" },
  { value: "GW", label: "Guinea-Bissau", flag: "gw", phoneCode: "+245" },
  { value: "GY", label: "Guyana", flag: "gy", phoneCode: "+592" },
  { value: "HT", label: "Haiti", flag: "ht", phoneCode: "+509" },
  { value: "HN", label: "Honduras", flag: "hn", phoneCode: "+504" },
  { value: "HK", label: "Hong Kong", flag: "hk", phoneCode: "+852" },
  { value: "HU", label: "Hungary", flag: "hu", phoneCode: "+36" },
  { value: "IS", label: "Iceland", flag: "is", phoneCode: "+354" },
  { value: "IN", label: "India", flag: "in", phoneCode: "+91" },
  { value: "ID", label: "Indonesia", flag: "id", phoneCode: "+62" },
  { value: "IR", label: "Iran", flag: "ir", phoneCode: "+98" },
  { value: "IQ", label: "Iraq", flag: "iq", phoneCode: "+964" },
  { value: "IE", label: "Ireland", flag: "ie", phoneCode: "+353" },
  { value: "IM", label: "Isle of Man", flag: "im", phoneCode: "+44" },
  { value: "IL", label: "Israel", flag: "il", phoneCode: "+972" },
  { value: "IT", label: "Italy", flag: "it", phoneCode: "+39" },
  { value: "JM", label: "Jamaica", flag: "jm", phoneCode: "+1" },
  { value: "JP", label: "Japan", flag: "jp", phoneCode: "+81" },
  { value: "JE", label: "Jersey", flag: "je", phoneCode: "+44" },
  { value: "JO", label: "Jordan", flag: "jo", phoneCode: "+962" },
  { value: "KZ", label: "Kazakhstan", flag: "kz", phoneCode: "+7" },
  { value: "KE", label: "Kenya", flag: "ke", phoneCode: "+254" },
  { value: "KI", label: "Kiribati", flag: "ki", phoneCode: "+686" },
  { value: "XK", label: "Kosovo", flag: "xk", phoneCode: "+383" },
  { value: "KW", label: "Kuwait", flag: "kw", phoneCode: "+965" },
  { value: "KG", label: "Kyrgyzstan", flag: "kg", phoneCode: "+996" },
  { value: "LA", label: "Laos", flag: "la", phoneCode: "+856" },
  { value: "LV", label: "Latvia", flag: "lv", phoneCode: "+371" },
  { value: "LB", label: "Lebanon", flag: "lb", phoneCode: "+961" },
  { value: "LS", label: "Lesotho", flag: "ls", phoneCode: "+266" },
  { value: "LR", label: "Liberia", flag: "lr", phoneCode: "+231" },
  { value: "LY", label: "Libya", flag: "ly", phoneCode: "+218" },
  { value: "LI", label: "Liechtenstein", flag: "li", phoneCode: "+423" },
  { value: "LT", label: "Lithuania", flag: "lt", phoneCode: "+370" },
  { value: "LU", label: "Luxembourg", flag: "lu", phoneCode: "+352" },
  { value: "MO", label: "Macau", flag: "mo", phoneCode: "+853" },
  { value: "MG", label: "Madagascar", flag: "mg", phoneCode: "+261" },
  { value: "MW", label: "Malawi", flag: "mw", phoneCode: "+265" },
  { value: "MY", label: "Malaysia", flag: "my", phoneCode: "+60" },
  { value: "MV", label: "Maldives", flag: "mv", phoneCode: "+960" },
  { value: "ML", label: "Mali", flag: "ml", phoneCode: "+223" },
  { value: "MT", label: "Malta", flag: "mt", phoneCode: "+356" },
  { value: "MH", label: "Marshall Islands", flag: "mh", phoneCode: "+692" },
  { value: "MR", label: "Mauritania", flag: "mr", phoneCode: "+222" },
  { value: "MU", label: "Mauritius", flag: "mu", phoneCode: "+230" },
  { value: "MX", label: "Mexico", flag: "mx", phoneCode: "+52" },
  { value: "FM", label: "Micronesia", flag: "fm", phoneCode: "+691" },
  { value: "MD", label: "Moldova", flag: "md", phoneCode: "+373" },
  { value: "MC", label: "Monaco", flag: "mc", phoneCode: "+377" },
  { value: "MN", label: "Mongolia", flag: "mn", phoneCode: "+976" },
  { value: "ME", label: "Montenegro", flag: "me", phoneCode: "+382" },
  { value: "MS", label: "Montserrat", flag: "ms", phoneCode: "+1" },
  { value: "MA", label: "Morocco", flag: "ma", phoneCode: "+212" },
  { value: "MZ", label: "Mozambique", flag: "mz", phoneCode: "+258" },
  { value: "MM", label: "Myanmar", flag: "mm", phoneCode: "+95" },
  { value: "NA", label: "Namibia", flag: "na", phoneCode: "+264" },
  { value: "NR", label: "Nauru", flag: "nr", phoneCode: "+674" },
  { value: "NP", label: "Nepal", flag: "np", phoneCode: "+977" },
  { value: "NL", label: "Netherlands", flag: "nl", phoneCode: "+31" },
  { value: "NZ", label: "New Zealand", flag: "nz", phoneCode: "+64" },
  { value: "NI", label: "Nicaragua", flag: "ni", phoneCode: "+505" },
  { value: "NE", label: "Niger", flag: "ne", phoneCode: "+227" },
  { value: "NG", label: "Nigeria", flag: "ng", phoneCode: "+234" },
  { value: "NU", label: "Niue", flag: "nu", phoneCode: "+683" },
  { value: "KP", label: "North Korea", flag: "kp", phoneCode: "+850" },
  { value: "MK", label: "North Macedonia", flag: "mk", phoneCode: "+389" },
  {
    value: "MP",
    label: "Northern Mariana Islands",
    flag: "mp",
    phoneCode: "+1",
  },
  { value: "NO", label: "Norway", flag: "no", phoneCode: "+47" },
  { value: "OM", label: "Oman", flag: "om", phoneCode: "+968" },
  { value: "PK", label: "Pakistan", flag: "pk", phoneCode: "+92" },
  { value: "PW", label: "Palau", flag: "pw", phoneCode: "+680" },
  { value: "PS", label: "Palestine", flag: "ps", phoneCode: "+970" },
  { value: "PA", label: "Panama", flag: "pa", phoneCode: "+507" },
  { value: "PG", label: "Papua New Guinea", flag: "pg", phoneCode: "+675" },
  { value: "PY", label: "Paraguay", flag: "py", phoneCode: "+595" },
  { value: "PE", label: "Peru", flag: "pe", phoneCode: "+51" },
  { value: "PH", label: "Philippines", flag: "ph", phoneCode: "+63" },
  { value: "PL", label: "Poland", flag: "pl", phoneCode: "+48" },
  { value: "PT", label: "Portugal", flag: "pt", phoneCode: "+351" },
  { value: "PR", label: "Puerto Rico", flag: "pr", phoneCode: "+1" },
  { value: "QA", label: "Qatar", flag: "qa", phoneCode: "+974" },
  {
    value: "CG",
    label: "Republic of the Congo",
    flag: "cg",
    phoneCode: "+242",
  },
  { value: "RE", label: "Réunion", flag: "re", phoneCode: "+262" },
  { value: "RO", label: "Romania", flag: "ro", phoneCode: "+40" },
  { value: "RU", label: "Russia", flag: "ru", phoneCode: "+7" },
  { value: "RW", label: "Rwanda", flag: "rw", phoneCode: "+250" },
  { value: "BL", label: "Saint Barthélemy", flag: "bl", phoneCode: "+590" },
  { value: "SH", label: "Saint Helena", flag: "sh", phoneCode: "+290" },
  { value: "KN", label: "Saint Kitts and Nevis", flag: "kn", phoneCode: "+1" },
  { value: "LC", label: "Saint Lucia", flag: "lc", phoneCode: "+1" },
  { value: "MF", label: "Saint Martin", flag: "mf", phoneCode: "+590" },
  {
    value: "PM",
    label: "Saint Pierre and Miquelon",
    flag: "pm",
    phoneCode: "+508",
  },
  {
    value: "VC",
    label: "Saint Vincent and the Grenadines",
    flag: "vc",
    phoneCode: "+1",
  },
  { value: "WS", label: "Samoa", flag: "ws", phoneCode: "+685" },
  { value: "SM", label: "San Marino", flag: "sm", phoneCode: "+378" },
  {
    value: "ST",
    label: "São Tomé and Príncipe",
    flag: "st",
    phoneCode: "+239",
  },
  { value: "SA", label: "Saudi Arabia", flag: "sa", phoneCode: "+966" },
  { value: "SN", label: "Senegal", flag: "sn", phoneCode: "+221" },
  { value: "RS", label: "Serbia", flag: "rs", phoneCode: "+381" },
  { value: "SC", label: "Seychelles", flag: "sc", phoneCode: "+248" },
  { value: "SL", label: "Sierra Leone", flag: "sl", phoneCode: "+232" },
  { value: "SG", label: "Singapore", flag: "sg", phoneCode: "+65" },
  { value: "SX", label: "Sint Maarten", flag: "sx", phoneCode: "+1" },
  { value: "SK", label: "Slovakia", flag: "sk", phoneCode: "+421" },
  { value: "SI", label: "Slovenia", flag: "si", phoneCode: "+386" },
  { value: "SB", label: "Solomon Islands", flag: "sb", phoneCode: "+677" },
  { value: "SO", label: "Somalia", flag: "so", phoneCode: "+252" },
  { value: "ZA", label: "South Africa", flag: "za", phoneCode: "+27" },
  { value: "KR", label: "South Korea", flag: "kr", phoneCode: "+82" },
  { value: "SS", label: "South Sudan", flag: "ss", phoneCode: "+211" },
  { value: "ES", label: "Spain", flag: "es", phoneCode: "+34" },
  { value: "LK", label: "Sri Lanka", flag: "lk", phoneCode: "+94" },
  { value: "SD", label: "Sudan", flag: "sd", phoneCode: "+249" },
  { value: "SR", label: "Suriname", flag: "sr", phoneCode: "+597" },
  { value: "SE", label: "Sweden", flag: "se", phoneCode: "+46" },
  { value: "CH", label: "Switzerland", flag: "ch", phoneCode: "+41" },
  { value: "SY", label: "Syria", flag: "sy", phoneCode: "+963" },
  { value: "TW", label: "Taiwan", flag: "tw", phoneCode: "+886" },
  { value: "TJ", label: "Tajikistan", flag: "tj", phoneCode: "+992" },
  { value: "TZ", label: "Tanzania", flag: "tz", phoneCode: "+255" },
  { value: "TH", label: "Thailand", flag: "th", phoneCode: "+66" },
  { value: "TL", label: "Timor-Leste", flag: "tl", phoneCode: "+670" },
  { value: "TG", label: "Togo", flag: "tg", phoneCode: "+228" },
  { value: "TK", label: "Tokelau", flag: "tk", phoneCode: "+690" },
  { value: "TO", label: "Tonga", flag: "to", phoneCode: "+676" },
  { value: "TT", label: "Trinidad and Tobago", flag: "tt", phoneCode: "+1" },
  { value: "TN", label: "Tunisia", flag: "tn", phoneCode: "+216" },
  { value: "TR", label: "Turkey", flag: "tr", phoneCode: "+90" },
  { value: "TM", label: "Turkmenistan", flag: "tm", phoneCode: "+993" },
  {
    value: "TC",
    label: "Turks and Caicos Islands",
    flag: "tc",
    phoneCode: "+1",
  },
  { value: "TV", label: "Tuvalu", flag: "tv", phoneCode: "+688" },
  { value: "UG", label: "Uganda", flag: "ug", phoneCode: "+256" },
  { value: "UA", label: "Ukraine", flag: "ua", phoneCode: "+380" },
  { value: "AE", label: "United Arab Emirates", flag: "ae", phoneCode: "+971" },
  { value: "GB", label: "United Kingdom", flag: "gb", phoneCode: "+44" },
  { value: "US", label: "United States", flag: "us", phoneCode: "+1" },
  { value: "UY", label: "Uruguay", flag: "uy", phoneCode: "+598" },
  { value: "UZ", label: "Uzbekistan", flag: "uz", phoneCode: "+998" },
  { value: "VU", label: "Vanuatu", flag: "vu", phoneCode: "+678" },
  { value: "VA", label: "Vatican City", flag: "va", phoneCode: "+379" },
  { value: "VE", label: "Venezuela", flag: "ve", phoneCode: "+58" },
  { value: "VN", label: "Vietnam", flag: "vn", phoneCode: "+84" },
  { value: "WF", label: "Wallis and Futuna", flag: "wf", phoneCode: "+681" },
  { value: "YE", label: "Yemen", flag: "ye", phoneCode: "+967" },
  { value: "ZM", label: "Zambia", flag: "zm", phoneCode: "+260" },
  { value: "ZW", label: "Zimbabwe", flag: "zw", phoneCode: "+263" },
];

export const customStyles: StylesConfig<SelectOption, false> = {
  container: (provided) => ({
    ...provided,
    width: "100%",
    minWidth: 0,
  }),
  control: (provided, state) => ({
    ...provided,
    minHeight: "40px",
    height: "40px",
    borderRadius: "0.75rem",
    borderWidth: state.isFocused ? "1px" : "1px",
    borderStyle: "solid",
    borderColor: state.isFocused
      ? "#818CF8" // indigo-400
      : "#4B5563", // gray-600
    backgroundColor: "rgb(55 65 81)", // dark:bg-gray-700
    color: "#F3F4F6", // gray-100
    fontSize: "1rem",
    fontFamily: inter.style.fontFamily,
    boxShadow: "none",
    outline: "none",
    width: "100%",
    cursor: "pointer",
    "&:hover": {
      borderColor: state.isFocused ? "#818CF8" : "#6B7280",
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
    fontSize: "1rem",
    fontFamily: inter.style.fontFamily,
    color: "#F3F4F6",
    marginLeft: 0,
    minWidth: 0,
    maxWidth: "100%",
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
    fontFamily: inter.style.fontFamily,
    color: "#F3F4F6",
    minWidth: 0,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9CA3AF", // gray-400
    fontFamily: inter.style.fontFamily,
    marginLeft: 0,
    minWidth: 0,
    fontSize: "0.875rem",
    "@media (min-width: 768px)": {
      fontSize: "1rem",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    fontSize: "1rem",
    fontFamily: inter.style.fontFamily,
    backgroundColor: state.isSelected
      ? "#312E81" // indigo-900
      : state.isFocused
        ? "#374151" // gray-700
        : "#1F2937", // gray-800
    color: "#F3F4F6",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    opacity: state.isDisabled ? 0.5 : 1,
    "&:active": {
      backgroundColor: "#312E81", // indigo-900
    },
  }),
  menu: (provided) => ({
    ...provided,
    fontFamily: inter.style.fontFamily,
    backgroundColor: "#1F2937", // gray-800
    color: "#F3F4F6",
    borderRadius: "0.75rem",
    border: "1px solid #374151", // gray-700
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
    marginTop: "4px",
    zIndex: 9999,
    minWidth: 0,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: "4px",
    maxHeight: "200px",
    minWidth: 0,
    "::-webkit-scrollbar": {
      width: "6px",
    },
    "::-webkit-scrollbar-track": {
      background: "#374151", // gray-700
      borderRadius: "3px",
    },
    "::-webkit-scrollbar-thumb": {
      background: "#818CF8", // indigo-400
      borderRadius: "3px",
    },
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "0 8px",
    color: "#9CA3AF",
    "&:hover": {
      color: "#D1D5DB",
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
          ? "bg-indigo-50 dark:bg-indigo-900"
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
    <span className="flex-1 truncate text-gray-900! dark:text-white!">
      {data.label}
    </span>
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
    <span
      className={`truncate text-gray-900! dark:text-white!${inter.className}`}
    >
      {data.label}
    </span>
  </div>
);

export { Select };
