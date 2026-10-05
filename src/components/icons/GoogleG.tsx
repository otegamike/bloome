interface IconProps {
  size?: number;
  className?: string;
}

export function GoogleG({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#4285F4"
        d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6c-.3 1.4-1.2 2.5-2.5 3.2v2.7h4c2.4-2.2 3.1-5 3.1-7.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.1 0 5.7-1 7.6-2.8l-4-2.7c-1 .7-2.4 1.2-3.6 1.2-2.8 0-5.1-1.9-6-4.4H2v2.8C3.9 20.9 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M6 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.9H2C1.4 8.5 1 10.2 1 12s.4 3.5 1 5.1l4-2.8z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3 .6 4.1 1.7l3.6-3.6C17.6 1.4 15.1 0 12 0 7.7 0 3.9 2.1 2 6.9l4 2.8c.9-2.5 3.2-4.3 6-4.3z"
      />
    </svg>
  );
}
