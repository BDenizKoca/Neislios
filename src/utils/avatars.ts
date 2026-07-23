// avatars.ts - Reliable Avatar Services with 100% CORS & Uptime
export const avatarOptions = (id: string, _size = 128) => {
  const enc = encodeURIComponent(id || 'User');
  return [
    { label: 'Bottts', url: `https://api.dicebear.com/7.x/bottts/svg?seed=${enc}`, format: 'svg' },
    { label: 'Avataaars', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${enc}`, format: 'svg' },
    { label: 'Thumbs', url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${enc}`, format: 'svg' },
    { label: 'Identicon', url: `https://api.dicebear.com/7.x/identicon/svg?seed=${enc}`, format: 'svg' },
    { label: 'Initials', url: `https://ui-avatars.com/api/?name=${enc}&background=e50914&color=fff&bold=true`, format: 'png' },
  ] as const;
};

export type AvatarService = 'bottts' | 'avataaars' | 'thumbs' | 'identicon' | 'initials';

export const avatarByService = (id: string, service: AvatarService, _size = 128) => {
  const enc = encodeURIComponent(id || 'User');
  if (service === 'bottts') return `https://api.dicebear.com/7.x/bottts/svg?seed=${enc}`;
  if (service === 'avataaars') return `https://api.dicebear.com/7.x/avataaars/svg?seed=${enc}`;
  if (service === 'thumbs') return `https://api.dicebear.com/7.x/thumbs/svg?seed=${enc}`;
  if (service === 'identicon') return `https://api.dicebear.com/7.x/identicon/svg?seed=${enc}`;
  return `https://ui-avatars.com/api/?name=${enc}&background=e50914&color=fff&bold=true`;
};

export const fallbackAvatar = (id: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(id || 'User')}&background=e50914&color=fff&bold=true`;

export const pickDeterministic = (id: string, options: string[]) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return options[h % options.length];
};

// Helper to get a deterministic default avatar for new users
export const getDefaultAvatar = (id: string) => {
  const options = avatarOptions(id);
  return pickDeterministic(id, options.map(o => o.url));
};
