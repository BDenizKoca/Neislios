// avatars.ts
export const avatarOptions = (id: string, size = 128) => {
  const enc = encodeURIComponent(id);
  return [
    { label: 'Bottts', url: `https://api.dicebear.com/9.x/bottts/svg?seed=${enc}`, format: 'svg' },
    { label: 'Identicon', url: `https://api.dicebear.com/9.x/identicon/svg?seed=${enc}`, format: 'svg' },
    { label: 'Photo', url: `https://i.pravatar.cc/${size}?u=${enc}`, format: 'png' },
    { label: 'Robot', url: `https://robohash.org/${enc}.png?size=${size}x${size}`, format: 'png' },
    { label: 'Avatar', url: `https://api.multiavatar.com/${enc}.svg`, format: 'svg' },
  ] as const;
};

export type AvatarService = 'bottts' | 'identicon' | 'pravatar' | 'robohash' | 'multiavatar';

export const avatarByService = (id: string, service: AvatarService, size = 128) => {
  const enc = encodeURIComponent(id);
  if (service === 'bottts') return `https://api.dicebear.com/9.x/bottts/svg?seed=${enc}`;
  if (service === 'identicon') return `https://api.dicebear.com/9.x/identicon/svg?seed=${enc}`;
  if (service === 'pravatar') return `https://i.pravatar.cc/${size}?u=${enc}`;
  if (service === 'robohash') return `https://robohash.org/${enc}.png?size=${size}x${size}`;
  return `https://api.multiavatar.com/${enc}.svg`;
};

export const fallbackAvatar = (id: string) =>
  `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(id)}`;

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
