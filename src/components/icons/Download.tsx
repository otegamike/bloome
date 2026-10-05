interface IconProps {
  size?: number;
  className?: string;
}

export function Download({ size = 24, className }: IconProps) {
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
      <path d="M12 4v11" />
      <path d="M8 11.5L12 15.5l4-4" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}
