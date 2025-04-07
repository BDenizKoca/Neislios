import React from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode; // Accept any React node as icon
  ariaLabel: string; // For accessibility
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick, icon, ariaLabel }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
      aria-label={ariaLabel}
      title={ariaLabel} // Add title attribute as well
    >
      {icon} {/* Render the passed icon */}
    </button>
  );
};

export default FloatingActionButton;