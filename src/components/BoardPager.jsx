import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function BoardPager({ count, activeIndex, onDotClick, onAddClick }) {
  const dots = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md md:hidden">
      {dots.map(index => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            activeIndex === index
              ? "bg-primary"
              : "bg-muted-foreground/50 hover:bg-muted-foreground"
          )}
          aria-label={`Go to column ${index + 1}`}
        />
      ))}
      <button
        onClick={onAddClick}
        className="flex items-center justify-center h-4 w-4 text-muted-foreground hover:text-primary"
        aria-label="Add new column"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}