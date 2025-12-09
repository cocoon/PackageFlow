/**
 * Custom framework icons that aren't available in lucide-react
 */

import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Angular icon - Shield shape with 'A' letter
 * Based on Angular's official branding
 */
export function AngularIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Shield shape */}
      <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" />
      {/* Letter A - dark in light mode, white in dark mode for contrast */}
      <path
        d="M12 7l-3 10M12 7l3 10M9.5 14h5"
        className="stroke-slate-800 dark:stroke-white"
      />
    </svg>
  );
}

/**
 * Vue icon - V shape with layered triangles
 * Based on Vue's official branding
 */
export function VueIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer V shape */}
      <path d="M2 3h4l6 14L18 3h4L12 22 2 3z" />
      {/* Inner V shape */}
      <path d="M6.5 3L12 13l5.5-10" />
    </svg>
  );
}
