import { useState } from 'react';
import { Profile } from '../../types/profile';

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
  textColor = 'text-gray-600',
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
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm', 
    lg: 'w-8 h-8 text-base'
  };

  const avatarSize = sizeClasses[size];
  const visibleMembers = collaborators.slice(0, maxVisible);
  const remainingCount = collaborators.length - maxVisible;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className={`text-xs ${textColor}`}>Collaborators:</span>
      <div className="flex items-center -space-x-1">
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            className="relative group"
          >
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={`${member.display_name}'s avatar`}
                className={`${avatarSize} rounded-full border-2 border-white dark:border-gray-800 object-cover`}
                title={member.display_name}
              />
            ) : (
              <div
                className={`${avatarSize} rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-medium text-white`}
                title={member.display_name}
              >
                {member.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Tooltip for individual member */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {member.display_name}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
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
              className={`${avatarSize} rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 dark:bg-gray-600 flex items-center justify-center font-medium text-white cursor-pointer`}
              title={`+${remainingCount} more collaborators`}
            >
              +{remainingCount}
            </div>
            {/* Tooltip for remaining members */}
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                {collaborators.slice(maxVisible).map(member => member.display_name).join(', ')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
