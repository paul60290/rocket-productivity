import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";


export default function MiniCalendar({ selectedDate, onDateChange, entries = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} />);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dayDateString = dayDate.toISOString().split('T')[0];

    const isToday = new Date().toDateString() === dayDate.toDateString();
    const isSelected = selectedDate.toDateString() === dayDate.toDateString();
    const hasEntry = entries.includes(dayDateString);

    days.push(
      <div
        key={i}
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-full cursor-pointer transition-colors relative text-sm",
          "hover:bg-accent hover:text-accent-foreground",
          { "bg-primary text-primary-foreground hover:bg-primary/90": isSelected },
          { "bg-accent text-accent-foreground": isToday && !isSelected },
        )}
        onClick={() => onDateChange(dayDate)}
      >
        <span>{i}</span>
        {hasEntry && !isSelected && <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />}
        {hasEntry && isSelected && <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary-foreground" />}
      </div>
    );
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeMonth(-1)} title="Previous Month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeMonth(1)} title="Next Month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        <div className="font-medium text-muted-foreground">S</div>
        <div className="font-medium text-muted-foreground">M</div>
        <div className="font-medium text-muted-foreground">T</div>
        <div className="font-medium text-muted-foreground">W</div>
        <div className="font-medium text-muted-foreground">T</div>
        <div className="font-medium text-muted-foreground">F</div>
        <div className="font-medium text-muted-foreground">S</div>
        {days}
      </div>
    </Card>
  );
}