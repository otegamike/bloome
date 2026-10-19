interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

export function Drop({ size = 24, className, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.3 12 3 12 3z" />
    </svg>
  );
}
