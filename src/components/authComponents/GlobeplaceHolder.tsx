// src/components/authComponents/GlobeplaceHolder.tsx
// /Users/safeconnection/Downloads/drivecrm/src/components/authComponents/GlobeplaceHolder.tsx

import { components, PlaceholderProps } from "react-select";
import { Globe } from "lucide-react";
import type { SelectOption } from "./SelectedCountry";

export const CustomPlaceholder = (
  props: PlaceholderProps<SelectOption, false>
) => (
  <components.Placeholder {...props}>
    <span className="flex items-center gap-2">
      <Globe className="w-5 h-5 text-gray-400  mr-0 md:mr-1 lg:mr-2" />
      <span>{props.children}</span>
    </span>
  </components.Placeholder>
);
