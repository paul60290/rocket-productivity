// src/components/BottomNav.jsx
import React from 'react';
import { Calendar, Inbox, BookText, FolderKanban, CalendarDays, StickyNote } from 'lucide-react';
import { cn } from "@/lib/utils";

const navItems = [
  { view: 'today', icon: Calendar, label: 'Today' },
  { view: 'inbox', icon: Inbox, label: 'Inbox' },
  { view: 'journal', icon: BookText, label: 'Journal' },
  { view: 'notes', icon: StickyNote, label: 'Notes' },
  { view: 'projects', icon: FolderKanban, label: 'Projects' },
  { view: 'calendar', icon: CalendarDays, label: 'Calendar' },
];

export default function BottomNav({ currentView, onNavigate }) {
  return (
    <div className="md:hidden shrink-0 bg-card border-t">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentView === item.view;

          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center space-y-1 h-full transition-colors",
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}