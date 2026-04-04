"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './CustomPopover.module.scss';

const CustomPopover = ({
  // Trigger
  trigger, // React element (button, icon, etc.)
  
  // Content
  children,
  
  // Positioning
  placement = 'bottom', // 'top' | 'bottom' | 'left' | 'right'
  align = 'center', // 'start' | 'center' | 'end'
  offset = 8, // Distance from trigger
  
  // Styling
  width = 'auto', // 'auto' | number (in px) | string
  maxWidth = 320,
  maxHeight = 400,
  showArrow = true,
  className = '',
  contentClassName = '',
  
  // Behavior
  closeOnClick = false, // Close when clicking inside content
  disabled = false,
  
  // Controlled mode
  open = null, // Control open state externally
  onOpenChange = null, // Callback when open state changes
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const [actualAlign, setActualAlign] = useState(align);
  
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  
  const isControlled = open !== null;
  const isPopoverOpen = isControlled ? open : isOpen;

  const handleToggle = () => {
    if (disabled) return;
    
    const newState = !isPopoverOpen;
    if (!isControlled) {
      setIsOpen(newState);
    }
    onOpenChange?.(newState);
  };

  const handleClose = () => {
    if (!isControlled) {
      setIsOpen(false);
    }
    onOpenChange?.(false);
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = 0;
    let left = 0;
    let finalPlacement = placement;
    let finalAlign = align;

    // Calculate based on placement
    const positions = {
      top: {
        top: triggerRect.top - popoverRect.height - offset,
        checkSpace: triggerRect.top - popoverRect.height - offset > 0,
        fallback: 'bottom',
      },
      bottom: {
        top: triggerRect.bottom + offset,
        checkSpace: triggerRect.bottom + popoverRect.height + offset < viewport.height,
        fallback: 'top',
      },
      left: {
        left: triggerRect.left - popoverRect.width - offset,
        checkSpace: triggerRect.left - popoverRect.width - offset > 0,
        fallback: 'right',
      },
      right: {
        left: triggerRect.right + offset,
        checkSpace: triggerRect.right + popoverRect.width + offset < viewport.width,
        fallback: 'left',
      },
    };

    // Check if there's space for preferred placement, otherwise use fallback
    const preferredPos = positions[placement];
    if (!preferredPos.checkSpace && positions[preferredPos.fallback]) {
      finalPlacement = preferredPos.fallback;
    }

    // Calculate position based on final placement
    if (finalPlacement === 'top' || finalPlacement === 'bottom') {
      top = positions[finalPlacement].top;

      // Horizontal alignment
      if (finalAlign === 'start') {
        left = triggerRect.left;
      } else if (finalAlign === 'end') {
        left = triggerRect.right - popoverRect.width;
      } else {
        left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
      }

      // Keep within viewport horizontally
      if (left < 8) {
        left = 8;
        finalAlign = 'start';
      } else if (left + popoverRect.width > viewport.width - 8) {
        left = viewport.width - popoverRect.width - 8;
        finalAlign = 'end';
      }
    } else {
      left = positions[finalPlacement].left;

      // Vertical alignment
      if (finalAlign === 'start') {
        top = triggerRect.top;
      } else if (finalAlign === 'end') {
        top = triggerRect.bottom - popoverRect.height;
      } else {
        top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
      }

      // Keep within viewport vertically
      if (top < 8) {
        top = 8;
        finalAlign = 'start';
      } else if (top + popoverRect.height > viewport.height - 8) {
        top = viewport.height - popoverRect.height - 8;
        finalAlign = 'end';
      }
    }

    setPosition({ top, left });
    setActualPlacement(finalPlacement);
    setActualAlign(finalAlign);
  };

  useEffect(() => {
    if (isPopoverOpen) {
      calculatePosition();
      
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isPopoverOpen, placement, align]);

  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        popoverRef.current &&
        !triggerRef.current.contains(e.target) &&
        !popoverRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPopoverOpen]);

  const handleContentClick = () => {
    if (closeOnClick) {
      handleClose();
    }
  };

  const popoverClasses = [
    styles.popover,
    styles[`placement-${actualPlacement}`],
    styles[`align-${actualAlign}`],
    isPopoverOpen ? styles.open : '',
    className,
  ].filter(Boolean).join(' ');

  const contentClasses = [
    styles.content,
    contentClassName,
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        ref={triggerRef}
        className={styles.trigger}
        onClick={handleToggle}
      >
        {trigger}
      </div>

      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className={popoverClasses}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: width === 'auto' ? 'auto' : typeof width === 'number' ? `${width}px` : width,
            maxWidth: `${maxWidth}px`,
            maxHeight: `${maxHeight}px`,
          }}
          onClick={handleContentClick}
        >
          {showArrow && (
            <div className={styles.arrow} aria-hidden="true" />
          )}
          <div className={contentClasses}>
            {children}
          </div>
        </div>
      )}
    </>
  );
};

export default CustomPopover;