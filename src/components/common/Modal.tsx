import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add('modal-open');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fade-in" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container with Max Height & Fixed Header/Footer */}
      <div 
        className={`relative w-full ${maxWidthClass} max-h-[85vh] sm:max-h-[90vh] flex flex-col glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl z-10 border border-slate-200/50 dark:border-slate-800/80 transform transition-all duration-200 ease-out animate-hype`}
        role="dialog"
        aria-modal="true"
      >
        {/* Fixed Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <div>
              {title && typeof title === 'string' ? (
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {children}
        </div>

        {/* Fixed Centered Footer */}
        {footer && (
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-center gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
