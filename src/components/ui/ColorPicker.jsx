import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export function ColorPicker({ value, onChange, className }) {
  const swatches = [
    // Reds
    '#f06595', '#c92a2a',
    // Oranges
    '#f76707', '#b34700',
    // Yellows
    '#f59f00', '#a87900',
    // Greens
    '#40c057', '#1e7d32',
    // Blues
    '#228be6', '#0b3d91',
    // Purples
    '#9c36b5', '#5e2b97',
     // Grays
    '#868e96', '#343a40',
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-7 gap-2">
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={cn(
              "h-8 w-8 rounded-md border-2 transition-all",
              value?.toLowerCase() === swatch.toLowerCase()
                ? 'border-ring ring-2 ring-offset-2 ring-offset-background'
                : 'border-transparent hover:border-muted-foreground/50'
            )}
            style={{ backgroundColor: swatch }}
            onClick={() => onChange(swatch)}
            aria-label={`Select color ${swatch}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 shrink-0">
          <div
            className="absolute inset-0 rounded-md border"
            style={{ backgroundColor: value }}
          />
          <Input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer p-0 opacity-0"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Custom color picker"
          />
        </div>
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FFFFFF"
          className="font-mono"
        />
      </div>
    </div>
  );
}