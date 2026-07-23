import { useState } from 'react';
import { Profile } from '../../types/profile';
import { fallbackAvatar } from '../../utils/avatars';

interface CollaboratorAvatarsProps {
  members: Profile[];
  ownerId: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  textColor?: string;
  className?: string;
}

export default function CollaboratorAvatars({ 
  members, 
  ownerId, 
  maxVisible = 3, 
  size = 'sm',
  textColor = 'text-slate-500 dark:text-slate-400',
  className = '' 
}: CollaboratorAvatarsProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Filter out the owner from members list since owner is shown separately
  const collaborators = members.filter(member => member.id !== ownerId);
  
  if (collaborators.length === 0) {
    return null;
  }

  // Determine size classes
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm', 
    lg: 'w-10 h-10 text-base'
  };

  const avatarSize = sizeClasses[size];
  const visibleMembers = collaborators.slice(0, maxVisible);
  const remainingCount = collaborators.length - maxVisible;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`text-xs font-semibold ${textColor}`}>Collaborators:</span>
      <div className="flex items-center -space-x-1.5">
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            className="relative group"
          >
            <img
              src={member.avatar_url || fallbackAvatar(member.id, member.display_name)}
              alt={`${member.display_name}'s avatar`}
              className={`${avatarSize} rounded-full object-cover shadow-sm ring-2 ring-slate-900`}
              title={member.display_name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackAvatar(member.id, member.display_name);
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-100 text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {member.display_name}
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              className={`${avatarSize} rounded-full bg-slate-800 ring-2 ring-slate-900 flex items-center justify-center font-semibold text-slate-300 text-xs cursor-pointer shadow-sm`}
              title={`+${remainingCount} more collaborators`}
            >
              +{remainingCount}
            </div>
            {/* Tooltip for remaining members */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-100 text-[11px] rounded-lg whitespace-nowrap z-50 shadow-xl">
                {collaborators.slice(maxVisible).map(member => member.display_name).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
