import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isEqual,
  format,
} from 'date-fns';

export function Calendar({ selected, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const daysInMonthGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    // 0 = Sunday, 1 = Monday, etc.
    const startingDayIndex = getDay(start);

    // Create an array of empty placeholders for the days before the 1st of the month
    const placeholders = Array.from({ length: startingDayIndex }, (_, i) => ({
      key: `placeholder-${i}`,
      isEmpty: true,
    }));

    const days = daysInMonth.map(date => ({
      key: date.toISOString(),
      date,
      isToday: isToday(date),
      isSelected: selected ? isEqual(date, selected) : false,
    }));

    return [...placeholders, ...days];
  }, [currentMonth, selected]);
  
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  return (
    <div className="p-3 min-w-max">
      {/* Header: Month and Year, with navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold" aria-live="polite">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid for days of the week and dates */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {/* Day of the week headers */}
        {daysOfWeek.map(day => (
          <div key={day} className="font-medium text-muted-foreground text-xs" aria-hidden="true">
            {day}
          </div>
        ))}

        {/* Dates grid */}
        {daysInMonthGrid.map(day => (
          day.isEmpty ? (
            <div key={day.key} />
          ) : (
            <button
              key={day.key}
              onClick={() => onSelect(day.date)}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                day.isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                !day.isSelected && day.isToday && "bg-accent text-accent-foreground",
              )}
            >
              {format(day.date, 'd')}
            </button>
          )
        ))}
      </div>
    </div>
  );
}