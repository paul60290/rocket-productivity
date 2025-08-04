// src/components/FAB.jsx
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FAB({ onClick, className }) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
  "md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50",
  className
)}
      aria-label="Add new item"
    >
      <Plus className="h-8 w-8" />
    </Button>
  );
}