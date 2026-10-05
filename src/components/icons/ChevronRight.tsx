interface IconProps {
  size?: number;
  className?: string;
}

export function ChevronRight({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.5 5.5L16 12l-6.5 6.5" />
    </svg>
  );
}
