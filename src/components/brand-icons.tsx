type IconProps = { className?: string };

/** Official-style brand marks (Lucide no longer ships brand icons). */

export function MessengerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="msgr-g" cx="19%" cy="99%" r="109%">
          <stop offset="0" stopColor="#0099FF" />
          <stop offset=".61" stopColor="#A033FF" />
          <stop offset=".93" stopColor="#FF5280" />
          <stop offset="1" stopColor="#FF7061" />
        </radialGradient>
      </defs>
      <path
        fill="url(#msgr-g)"
        d="M12 1.5C6.08 1.5 1.5 5.84 1.5 11.7c0 3.07 1.26 5.72 3.3 7.55.17.15.27.37.28.6l.06 1.87a.84.84 0 0 0 1.18.74l2.09-.92a.84.84 0 0 1 .56-.04c.96.26 1.98.4 3.03.4 5.92 0 10.5-4.34 10.5-10.2S17.92 1.5 12 1.5Z"
      />
      <path
        fill="#fff"
        d="m5.7 14.67 3.08-4.89a1.58 1.58 0 0 1 2.28-.42l2.45 1.84a.63.63 0 0 0 .76 0l3.31-2.51c.44-.34 1.02.19.72.66l-3.08 4.88a1.58 1.58 0 0 1-2.28.42l-2.45-1.83a.63.63 0 0 0-.76 0l-3.31 2.51c-.44.34-1.02-.19-.72-.66Z"
      />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="ig-g" cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#FDF497" />
          <stop offset=".05" stopColor="#FDF497" />
          <stop offset=".45" stopColor="#FD5949" />
          <stop offset=".6" stopColor="#D6249F" />
          <stop offset=".9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="22" height="22" x="1" y="1" fill="url(#ig-g)" rx="6" />
      <rect width="13" height="13" x="5.5" y="5.5" fill="none" stroke="#fff" strokeWidth="1.8" rx="4" />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.4" cy="7.6" r="1" fill="#fff" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.4 15.36 15.9 12h-3.2V9.83c0-.92.45-1.82 1.89-1.82h1.46V5.15S14.72 4.9 13.47 4.9c-2.62 0-4.33 1.59-4.33 4.47V12H6.27v3.36h2.87V23.5a11.4 11.4 0 0 0 3.55 0v-8.14h2.7Z"
      />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" fill="#111" rx="6" />
      <g transform="translate(5 4.5) scale(.62)">
        <path
          fill="#fff"
          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
        />
      </g>
    </svg>
  );
}
