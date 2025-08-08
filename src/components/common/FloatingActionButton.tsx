import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Position, FloatingActionButtonProps } from './FloatingActionButtonTypes';

/**
 * FloatingActionButton - A floating action button component
 * 
 * Features:
 * - Floating button with icon
 * - Optional draggability (long press to drag)
 * - Double-click support
 * - Automatic hiding when modals are open
 * - Positioning via right/bottom/left/top
 * - Accessibility support
 */

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  ariaLabel,
  position,
  onPositionChange,
  isDraggable = false,
  onDoubleClick,
  onLongPress,
  onDragEnd,
  className = '',
  style = {},
  isDragging: externalIsDragging
}) => {
  // Refs for DOM element and state tracking
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef({
    initialX: 0,
    initialY: 0,
    buttonLeft: 0,
    buttonTop: 0,
    isDragging: false,
    hasStartedDragging: false
  });
  const pointerTypeRef = useRef<'mouse' | 'touch' | null>(null);
  const pointerDownRef = useRef<boolean>(false);
  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  
  // Component state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDraggingInternal, setIsDraggingInternal] = useState(false);
  
  // Use external dragging state if provided, otherwise use internal
  const isDragging = externalIsDragging !== undefined ? externalIsDragging : isDraggingInternal;
  
  // Apply positioning via CSS variables
  useEffect(() => {
    if (!buttonRef.current) return;
    
    const button = buttonRef.current;
    
    // Set position variables, using 'initial' for undefined values
    button.style.setProperty('--fab-right', position.right !== undefined ? `${position.right}px` : 'initial');
    button.style.setProperty('--fab-bottom', position.bottom !== undefined ? `${position.bottom}px` : 'initial');
    button.style.setProperty('--fab-left', position.left !== undefined ? `${position.left}px` : 'initial');
    button.style.setProperty('--fab-top', position.top !== undefined ? `${position.top}px` : 'initial');
  }, [position]);
  
  // Handle modal state detection
  useEffect(() => {
    const checkModalState = () => {
      setIsModalOpen(document.body.classList.contains('modal-open'));
    };
    
    // Initial check
    checkModalState();
    
    // Watch for class changes on body
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkModalState();
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Handle dragging - common function for both mouse and touch events
  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!isDraggable || !buttonRef.current) return;
    const { initialX, initialY, buttonLeft, buttonTop, isDragging: isCurrentlyDragging } = dragStateRef.current;
    if (!isCurrentlyDragging) return;

    const deltaX = clientX - initialX;
    const deltaY = clientY - initialY;

    // Get viewport and button dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = buttonRef.current.offsetWidth;
    const buttonHeight = buttonRef.current.offsetHeight;

    // New button position based on drag
    const newX = buttonLeft + deltaX;
    const newY = buttonTop + deltaY;

    // Calculate position properties
    const newPosition: Position = {};

    // Determine whether to use left/right and top/bottom based on button position
    if (newX + buttonWidth / 2 > viewportWidth / 2) {
      newPosition.right = Math.max(0, viewportWidth - (newX + buttonWidth));
      if (newPosition.right < 0) newPosition.right = 0;
      if (newPosition.right > viewportWidth - buttonWidth) newPosition.right = viewportWidth - buttonWidth;
    } else {
      newPosition.left = Math.max(0, newX);
      if (newPosition.left < 0) newPosition.left = 0;
      if (newPosition.left > viewportWidth - buttonWidth) newPosition.left = viewportWidth - buttonWidth;
    }

    if (newY + buttonHeight / 2 > viewportHeight / 2) {
      newPosition.bottom = Math.max(0, viewportHeight - (newY + buttonHeight));
      if (newPosition.bottom < 0) newPosition.bottom = 0;
      if (newPosition.bottom > viewportHeight - buttonHeight) newPosition.bottom = viewportHeight - buttonHeight;
    } else {
      newPosition.top = Math.max(0, newY);
      if (newPosition.top < 0) newPosition.top = 0;
      if (newPosition.top > viewportHeight - buttonHeight) newPosition.top = viewportHeight - buttonHeight;
    }

    onPositionChange?.(newPosition);
  }, [isDraggable, onPositionChange]);

  const startDragging = useCallback(() => {
    dragStateRef.current.isDragging = true;
    dragStateRef.current.hasStartedDragging = true;
    setIsDraggingInternal(true);
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const endDragging = useCallback(() => {
    if (dragStateRef.current.isDragging || dragStateRef.current.hasStartedDragging) {
      dragStateRef.current.isDragging = false;
      dragStateRef.current.hasStartedDragging = false;
      setIsDraggingInternal(false);
      onDragEnd?.();
    }
  }, [onDragEnd]);
  
  // Removed global listeners; listeners will be attached per-gesture in handlers below
  
  // Handle mouse down - start drag or detect double click
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    
    // Clean up any existing timers
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Initialize drag data if draggable
    if (isDraggable && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      dragStateRef.current = {
        initialX: e.clientX,
        initialY: e.clientY,
        buttonLeft: rect.left,
        buttonTop: rect.top,
        isDragging: false,
        hasStartedDragging: false
      };
      pointerTypeRef.current = 'mouse';
      pointerDownRef.current = true;

      const moveThreshold = 5;
      const onMouseMove = (ev: MouseEvent) => {
        // For mouse, start dragging once threshold is exceeded
        if (!dragStateRef.current.isDragging && pointerDownRef.current) {
          const dx = ev.clientX - dragStateRef.current.initialX;
          const dy = ev.clientY - dragStateRef.current.initialY;
          if (Math.hypot(dx, dy) > moveThreshold) {
            startDragging();
          }
        }
        if (dragStateRef.current.isDragging) {
          ev.preventDefault();
          updatePosition(ev.clientX, ev.clientY);
        }
      };

      const onMouseUp = () => {
        pointerDownRef.current = false;
        if (longPressTimerRef.current !== null) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        endDragging();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      // Set up long press detection
  longPressTimerRef.current = window.setTimeout(() => {
        startDragging();
        onLongPress?.();
  }, 450);
    }
  }, [isDraggable, onLongPress, startDragging, updatePosition, endDragging]);
  
  // Handle touch start - similar to mouse down
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    
    // Clean up any existing timers
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Initialize drag data if draggable
    if (isDraggable && buttonRef.current) {
      const touch = e.touches[0];
      const rect = buttonRef.current.getBoundingClientRect();
      
      dragStateRef.current = {
        initialX: touch.clientX,
        initialY: touch.clientY,
        buttonLeft: rect.left,
        buttonTop: rect.top,
        isDragging: false,
        hasStartedDragging: false
      };
      pointerTypeRef.current = 'touch';
      pointerDownRef.current = true;

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length === 0) return;
        // For touch, require long-press to start dragging; allow scrolling until then
        if (dragStateRef.current.isDragging) {
          ev.preventDefault();
          const t = ev.touches[0];
          updatePosition(t.clientX, t.clientY);
        }
      };

      const onTouchEnd = () => {
        pointerDownRef.current = false;
        if (longPressTimerRef.current !== null) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        document.removeEventListener('touchmove', onTouchMove as EventListener);
        document.removeEventListener('touchend', onTouchEnd as EventListener);
        endDragging();
      };

      document.addEventListener('touchmove', onTouchMove as EventListener, { passive: false } as AddEventListenerOptions);
      document.addEventListener('touchend', onTouchEnd as EventListener);
      
      // Set up long press detection
  longPressTimerRef.current = window.setTimeout(() => {
        startDragging();
        onLongPress?.();
  }, 450);
    }
  }, [isDraggable, onLongPress, startDragging, updatePosition, endDragging]);
  
  // Handle click event with delay for double-click detection
  const handleClick = useCallback(() => {
    // Don't trigger click if we're dragging
    if (isDragging || dragStateRef.current.hasStartedDragging) {
      return;
    }

    // Increment click count and decide between single/double
    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      // Schedule single click action with a delay to await possible second click
  clickTimerRef.current = window.setTimeout(() => {
        // If no second click occurred within the window, treat as single click
        if (!isDragging && !dragStateRef.current.hasStartedDragging) {
          onClick();
        }
        clickCountRef.current = 0;
        clickTimerRef.current = null;
  }, 250);
    } else if (clickCountRef.current === 2) {
      // Second click within window: treat as double click
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      onDoubleClick?.();
    }
  }, [isDragging, onClick, onDoubleClick]);
  
  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);
  
  return (
    <button
      ref={buttonRef}
      className={`floating-action-button positioned fixed rounded-full bg-primary text-white p-4 shadow-lg z-40 transition-opacity duration-200 ${
        isModalOpen ? 'opacity-0 pointer-events-none hidden fab-hidden' : 'opacity-100 fab-visible'
      } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'scale-110' : ''} ${className}`}
      style={style}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
    >
      {icon}
      {isDraggable && (
        <span className="sr-only">
          Tap for context actions. Long press to move this button. Double tap to reset position.
        </span>
      )}
    </button>
  );
}

export default FloatingActionButton;
