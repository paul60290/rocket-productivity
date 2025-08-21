// src/components/TopBar.jsx
import React from 'react';
import ViewControls from './ViewControls';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, MoreVertical, Plus, Clock, Pause, Play, Trash2, Calendar } from "lucide-react";


export default function TopBar({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentView,
  currentProject,
  ViewIcon,
  canBeToggled,
  viewKey,
  getViewOption,
  setViewOption,
  currentProjectData,
  onAddTask,
  timerIsRunning,
  timerTime,
  timerInputTime,
  formatTime,
  handlePauseTimer,
  handleResumeTimer,
  handleCancelTimer,
  setShowTimerModal,
  onShowCalendar,
}) {

  const computedTitle = currentView === 'board' && currentProject
    ? currentProject
    : (currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1').trim());

  const mode = getViewOption(viewKey, 'mode', 'board');
  const showListControls = mode === 'list';
  const groupByForListViews = [
    { value: 'project', label: 'Project' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
  ];
  const groupByForBoard = [
    { value: 'manual', label: 'Manual' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
  ];

  return (
    <div className="w-full shrink-0 px-6 py-4 border-b bg-card flex items-center justify-between">
      <button
        className="md:hidden rounded-md p-2 hover:bg-muted"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-5 w-5">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-3">
        {ViewIcon ? <ViewIcon className="h-6 w-6 text-muted-foreground" /> : null}
        <h1 className="text-xl font-bold tracking-tight">{computedTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {canBeToggled && (
          <div className="hidden md:flex items-center bg-muted p-1 rounded-md">
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'board' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}`}
              onClick={() => setViewOption(viewKey, 'mode', 'board')}
              title="Board View"
            >
              Board
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'list' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}`}
              onClick={() => setViewOption(viewKey, 'mode', 'list')}
              title="List View"
            >
              List
            </button>
          </div>
        )}

        {showListControls && (
          <>
            {['today', 'tomorrow', 'thisWeek', 'nextWeek'].includes(currentView) && (
              <ViewControls
                groupByOptions={groupByForListViews}
                selectedGroupBy={getViewOption(viewKey, 'groupBy', 'project')}
                onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
              />
            )}
            {currentView === 'board' && (
              <ViewControls
                groupByOptions={groupByForBoard}
                selectedGroupBy={getViewOption(viewKey, 'groupBy', 'manual')}
                onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
              />
            )}
          </>
        )}

        {currentView === 'board' && currentProjectData && (
          <Button
            className="hidden md:flex items-center gap-2"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </Button>
        )}

        <Button
          variant="outline"
          className="hidden md:flex items-center gap-2"
          onClick={() => onShowCalendar?.()}
          title="Calendar"
        >
          <Calendar className="h-4 w-4" />
          <span>Calendar</span>
        </Button>


        {!timerIsRunning && timerTime === timerInputTime * 60 ? (
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2"
            onClick={() => setShowTimerModal(true)}
          >
            <Clock className="h-4 w-4" />
            <span>Timer</span>
          </Button>
        ) : (
          <div className="hidden md:flex items-center gap-1 bg-muted text-muted-foreground px-3 py-1 rounded-md text-sm font-mono">
            <span>{formatTime(timerTime)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={timerIsRunning ? handlePauseTimer : handleResumeTimer}>
              {timerIsRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTimerModal(true)}>
              <Clock className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelTimer}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile overflow menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTimerModal(true)}>
                <Clock className="h-4 w-4 mr-2" />
                <span>{timerIsRunning ? `Timer: ${formatTime(timerTime)}` : "Timer"}</span>
              </DropdownMenuItem>
              {canBeToggled && (
                mode === 'board' ? (
                  <DropdownMenuItem onClick={() => setViewOption(viewKey, 'mode', 'list')}>
                    <span>Switch to List View</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setViewOption(viewKey, 'mode', 'board')}>
                    <span>Switch to Board View</span>
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
