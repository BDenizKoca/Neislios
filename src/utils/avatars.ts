// avatars.ts - Reliable Avatar Services with 100% CORS & Uptime
export const avatarOptions = (idOrName: string, displayName?: string, _size = 128) => {
  const encSeed = encodeURIComponent(idOrName || 'User');
  const nameToUse = (displayName && displayName.trim()) ? displayName.trim() : idOrName;
  const encName = encodeURIComponent(nameToUse || 'User');

  return [
    { label: 'Bottts', url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encSeed}`, format: 'svg' },
    { label: 'Avataaars', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encSeed}`, format: 'svg' },
    { label: 'Thumbs', url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encSeed}`, format: 'svg' },
    { label: 'Identicon', url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encSeed}`, format: 'svg' },
    { label: 'Initials', url: `https://ui-avatars.com/api/?name=${encName}&background=e50914&color=fff&bold=true`, format: 'png' },
  ] as const;
};

export type AvatarService = 'bottts' | 'avataaars' | 'thumbs' | 'identicon' | 'initials';

export const avatarByService = (idOrName: string, service: AvatarService, displayName?: string, _size = 128) => {
  const encSeed = encodeURIComponent(idOrName || 'User');
  const nameToUse = (displayName && displayName.trim()) ? displayName.trim() : idOrName;
  const encName = encodeURIComponent(nameToUse || 'User');

  if (service === 'bottts') return `https://api.dicebear.com/7.x/bottts/svg?seed=${encSeed}`;
  if (service === 'avataaars') return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encSeed}`;
  if (service === 'thumbs') return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encSeed}`;
  if (service === 'identicon') return `https://api.dicebear.com/7.x/identicon/svg?seed=${encSeed}`;
  return `https://ui-avatars.com/api/?name=${encName}&background=e50914&color=fff&bold=true`;
};

export const fallbackAvatar = (idOrName: string, displayName?: string) => {
  const nameToUse = (displayName && displayName.trim()) ? displayName.trim() : idOrName;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse || 'User')}&background=e50914&color=fff&bold=true`;
};

export const pickDeterministic = (id: string, options: string[]) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return options[h % options.length];
};

// Helper to get a deterministic default avatar for new users
export const getDefaultAvatar = (idOrName: string, displayName?: string) => {
  const options = avatarOptions(idOrName, displayName);
  return pickDeterministic(idOrName, options.map(o => o.url));
};
