interface IconProps {
  size?: number;
  className?: string;
}

export function Bud({ size = 24, className }: IconProps) {
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
      <path d="M12 21v-8" />
      <path d="M12 13C12 8 15 5 20 5c0 5-3 8-8 8z" />
      <path d="M12 13c0-4-2.5-6.5-7-6.5 0 4 2.5 6.5 7 6.5z" />
    </svg>
  );
}
