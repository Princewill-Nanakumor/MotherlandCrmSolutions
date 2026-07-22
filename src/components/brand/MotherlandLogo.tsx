import { cn } from "@/lib/utils";

type MotherlandLogoProps = {
  className?: string;
  title?: string;
};

/** Brand mark — square fill uses --brand-from (not currentColor, so dark mode text rules can't wash it out). */
export function MotherlandLogo({
  className,
  title = "Motherland CRM Solutions",
}: MotherlandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <rect
        width="256"
        height="256"
        rx="56"
        fill="var(--brand-from)"
      />
      <g fill="#fff">
        <rect x="96" y="42" width="6" height="30" rx="2" />
        <rect x="93" y="70" width="12" height="3" />
        <circle cx="112" cy="92" r="7" />
        <path d="M105 88 L108 82 L112 86 L116 82 L119 88 Z" />
        <path d="M106 98 L102 146 L110 146 L112 120 L114 146 L122 146 L118 98 Z" />
        <path d="M107 102 L92 84 L88 88 L102 108 Z" />
        <path d="M118 102 L133 94 L136 99 L120 108 Z" />
        <rect x="100" y="146" width="28" height="8" />
      </g>
      <g transform="translate(150 95)">
        <path
          fill="#fff"
          d="M22 0 C10 0 0 10 0 22 C0 38 22 62 22 62 S44 38 44 22 C44 10 34 0 22 0Z"
        />
        <circle cx="22" cy="22" r="9" fill="var(--brand-from)" />
      </g>
      <path
        d="M30 165 C55 125 105 120 170 155 C195 170 215 165 225 145 C210 185 160 188 110 170 C70 156 45 155 30 165Z"
        fill="#fff"
      />
      <path
        d="M45 198 C90 182 150 182 195 198 C150 194 90 194 45 198Z"
        fill="#fff"
      />
      <circle cx="203" cy="92" r="4" fill="#fff" />
      <circle cx="197" cy="102" r="5" fill="#fff" />
      <circle cx="190" cy="114" r="6" fill="#fff" />
      <text
        x="147"
        y="72"
        fill="#fff"
        fontSize="8"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
      >
        MOTHERLAND
      </text>
      <text
        x="147"
        y="86"
        fill="#fff"
        fontSize="15"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
      >
        CRM
      </text>
      <text
        x="147"
        y="96"
        fill="#fff"
        fontSize="6"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        SOLUTIONS
      </text>
    </svg>
  );
}
