// src/components/ViewControls.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListFilter, ArrowDownUp } from "lucide-react";

export default function ViewControls({
  // Props for Grouping
  groupByOptions = [],
  selectedGroupBy,
  onGroupByChange,

  // Props for Sorting (if we add it later)
  
  // Props for Filtering
  filterOptions = [],
  activeFilters = {},
  onFilterChange
}) {
  return (
    <div className="flex items-center gap-2">
      {/* --- Group By Dropdown --- */}
      {groupByOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              <span>Group By</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Group By</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={selectedGroupBy} onValueChange={onGroupByChange}>
              {groupByOptions.map(option => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* --- Filter Dropdown --- */}
      {filterOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ListFilter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* We will build out the multi-select filter logic here later */}
            <DropdownMenuItem>
              <span className="text-muted-foreground text-xs">Filter options will appear here</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}