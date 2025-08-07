import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const PopoverContext = createContext();

export function Popover({ children, open, onOpenChange }) {
  const popoverRef = useRef(null);

  // Effect to handle clicking outside the popover to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onOpenChange?.(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div ref={popoverRef} className="relative inline-block text-left">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }) {
  const { onOpenChange } = useContext(PopoverContext);
  const child = React.Children.only(children);

  // Clone the trigger element (e.g., a Button) and add our onClick handler
  return React.cloneElement(child, {
    onClick: (e) => {
      onOpenChange?.(prev => !prev);
      child.props.onClick?.(e);
    },
  });
}

export function PopoverContent({ children, className, align = 'center' }) {
  const { open } = useContext(PopoverContext);

  if (!open) return null;

  const alignmentClasses = {
    center: 'left-1/2 -translate-x-1/2',
    start: 'left-0',
    end: 'right-0',
  };

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-auto rounded-md border bg-popover text-popover-foreground shadow-lg outline-none",
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}