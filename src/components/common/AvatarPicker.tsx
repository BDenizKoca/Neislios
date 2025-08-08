import { useState } from 'react';
import { avatarOptions } from '../../utils/avatars';

interface AvatarPickerProps {
  id: string;
  size?: number;
  onPick?: (url: string) => void;
  className?: string;
}

export default function AvatarPicker({ id, size = 128, onPick, className = '' }: AvatarPickerProps) {
  const options = avatarOptions(id, size);
  const [chosen, setChosen] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});

  const handleImageLoad = (url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: false }));
  };

  const handleImageError = (url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: false }));
    setErrorStates(prev => ({ ...prev, [url]: true }));
  };

  const handleImageLoadStart = (url: string) => {
    setLoadingStates(prev => ({ ...prev, [url]: true }));
  };

  const handlePick = (url: string) => {
    setChosen(url);
    onPick?.(url);
  };

  return (
    <div className={`flex gap-3 items-center flex-wrap ${className}`}>
      {options.map(option => {
        const isLoading = loadingStates[option.url];
        const hasError = errorStates[option.url];
        const isChosen = chosen === option.url;

        if (hasError) return null; // Hide failed images

        return (
          <button
            key={option.label}
            onClick={() => handlePick(option.url)}
            className={`p-2 rounded-lg border-2 transition-all duration-200 bg-white dark:bg-gray-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
              isChosen 
                ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            aria-pressed={isChosen ? 'true' : 'false'}
            title={`Select ${option.label} avatar`}
            disabled={isLoading}
          >
            <div className="flex flex-col items-center">
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <img
                  src={option.url}
                  alt={option.label}
                  width={48}
                  height={48}
                  className={`rounded transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => handleImageLoad(option.url)}
                  onError={() => handleImageError(option.url)}
                  onLoadStart={() => handleImageLoadStart(option.url)}
                />
              </div>
              <div className="text-xs mt-1 text-gray-600 dark:text-gray-400 text-center font-medium">
                {option.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
