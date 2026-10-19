import { useState } from 'react';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ name, photoUrl, size = 'md' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-28 h-28 text-2xl',
  }[size];

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-border shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary text-primary-foreground font-body font-semibold flex items-center justify-center shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}