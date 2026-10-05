interface IconProps {
  size?: number;
  className?: string;
}

export function Home({ size = 24, className }: IconProps) {
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
      <path d="M12 21c-1 0-1.5-1-1.5-2" />
      <path d="M12 19c-4 0-7-2.5-7-6 2 0 3.5.5 4.5 1.5C10 10 10 5 12 3c2 2 2 7 2.5 11.5 1-1 2.5-1.5 4.5-1.5 0 3.5-3 6-7 6z" />
    </svg>
  );
}
