// App.jsx

import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { DndContext, DragOverlay, useDroppable, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const GoalsPage = lazy(() => import('./components/GoalsPage'));
const CalendarPanel = lazy(() => import('./components/CalendarPanel'));
const JournalsPage = lazy(() => import('./components/JournalsPage'));
const JournalEntryPage = lazy(() => import('./components/JournalEntryPage'));
const TaskDetailPanel = lazy(() => import('./components/TaskDetailPanel'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const ProjectsPage = lazy(() => import('./components/ProjectsPage'));
import Auth from './Auth';
import NewProjectModal from './components/NewProjectModal';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import SortableProjectItem from './components/SortableProjectItem';
import BottomNav from './components/BottomNav';
import FAB from './components/FAB';
import ListView from './components/ListView';
import MobileSidebar from './components/MobileSidebar';
import ViewControls from './components/ViewControls';
import BoardPager from './components/BoardPager';
import { useSwipeable } from 'react-swipeable';
import logoUrl from './assets/logo.svg';
import useGroupedTasks from './hooks/useGroupedTasks';
import { auth, db } from './firebase';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  MoreVertical, GripVertical, MessageSquare, Plus, X,
  Target, BookText, Calendar, Inbox, Sunrise, CalendarDays,
  CalendarPlus, FolderKanban, Settings, LogOut, Clock, Pencil, Trash2,
  Pause, Play, Tag, Bookmark, Network
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import timerChime from './assets/mixkit-tick-tock-clock-timer-1045.wav';

const viewIcons = {
  goals: Target,
  journal: BookText,
  today: Calendar,
  inbox: Inbox,
  tomorrow: Sunrise,
  thisWeek: CalendarDays,
  nextWeek: CalendarPlus,
  projects: FolderKanban,
  settings: Settings,
};

import {
  // Authentication
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  // Firestore
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDoc,
  setDoc
} from "firebase/firestore";

// === SECTION: Utility Functions ===
const generateUniqueId = () => {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to timestamp + random string
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
};

// === SECTION: Editable Title Component ===
function EditableTitle({ title, onUpdate, className = "" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== title) {
      onUpdate(editValue.trim());
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={cn("h-8 p-1", className)}
      />
    );
  }

  return (
    <span
      className={cn("cursor-pointer rounded-md px-2 -mx-2", className)}
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {title}
    </span>
  );
}
function Column({ column, tasks = [], onAddTask, onUpdateTask, onOpenTask, onRenameColumn, onDeleteColumn, isEditable = true, availableLabels, allTags = {}, currentView }) {
  // Safety check for column prop
  if (!column) {
    console.error("Column component received undefined column prop");
    return null;
  }
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const inputRef = useRef(null);

  const sortedTasks = Array.isArray(tasks)
    ? [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.priority - b.priority;
    })
    : [];

  const { setNodeRef } = useDroppable({ id: column.id });

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const taskData = {
      text: newTask.trim(),
      column: column.id, // Use the column's unique ID
      completed: false,
      priority: 4,
    };
    onAddTask(taskData);
    setNewTask('');
    setAdding(false);
  };

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  return (
    <div className="flex flex-col w-full shrink-0 md:w-80 bg-card rounded-lg h-full max-h-full snap-start p-3" ref={setNodeRef}>
      <div className="flex items-center justify-between p-3 border-b">
        <EditableTitle
          title={column.name} // Display the column's name
          onUpdate={(newName) => onRenameColumn(column.id, newName)} // Pass the ID and new name on update
          className="font-semibold"
        />
        {isEditable && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteColumn(column.id)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Delete column</span>
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onComplete={() => onUpdateTask(column.id, task.id, { completed: !task.completed })}
              onClick={() => onOpenTask(task)}
              availableLabels={availableLabels}
              allTags={allTags}
              currentView={currentView}
            />
          ))}
        </SortableContext>
        {isEditable && (
          adding ? (
            <div className="p-1 space-y-2">
              <Card>
                <CardContent className="p-2">
                  <Textarea
                    ref={inputRef}
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    placeholder="Task title..."
                    className="w-full border-none focus-visible:ring-0 resize-none text-sm shadow-none p-1"
                    autoFocus
                  />
                </CardContent>
              </Card>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddTask} className="w-full">Add Task</Button>
                <Button variant="ghost" size="icon" onClick={() => setAdding(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center justify-center w-full p-2 text-sm text-muted-foreground rounded-md hover:bg-accent"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Task</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

// === SECTION: Task Item Components ===

// 1. Presentational Component (The Visuals)
const TaskItem = React.forwardRef(({ task, availableLabels, allTags, onComplete, onClick, listeners, className, isDraggable = true, ...props }, ref) => {
  const priorityBorderClasses = {
    1: 'border-l-red-500',
    2: 'border-l-orange-400',
    3: 'border-l-yellow-400',
    4: 'border-l-green-500',
  };

  const dateInfo = useMemo(() => {
    if (!task.date) return { colorClass: '', isVisible: false };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const dueDate = new Date(`${task.date}T00:00:00Z`);

    const isCompleted = task.completed;
    const isOverdue = dueDate < today && !isCompleted;

    let colorClass = 'text-muted-foreground'; // Default color
    if (isOverdue) {
      colorClass = 'text-red-500 font-semibold';
    } else if (dueDate.getTime() === today.getTime()) {
      colorClass = 'text-green-600 font-semibold';
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      colorClass = 'text-yellow-600 font-semibold';
    }

    return { colorClass, isVisible: true };
  }, [task.date, task.completed]);

  const subtaskProgress = useMemo(() => {
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) {
      return { isVisible: false, text: '' };
    }
    const total = subtasks.length;
    const completed = subtasks.filter(st => st.completed).length;
    return { isVisible: true, text: `${completed}/${total}` };
  }, [task.subtasks]);

  return (
    <Card
      ref={ref}
      {...props}
      data-completed={task.completed}
      className={cn(
        "p-3 data-[completed=true]:opacity-60 border-l-4 data-[completed=true]:border-l-border",
        priorityBorderClasses[task.priority] || 'border-l-transparent',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {isDraggable && (
          <div {...listeners} className="py-1 cursor-grab touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <Checkbox
          checked={task.completed}
          onCheckedChange={onComplete}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        <div className="flex-1" onClick={onClick}>
          <p className={`text-sm font-medium leading-tight ${task.completed ? 'line-through' : ''}`}>{task.text}</p>
          <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-2 text-xs">
            {dateInfo.isVisible && (
              <div className={cn("flex items-center gap-1.5", dateInfo.colorClass)}>
                <CalendarDays className="h-4 w-4" />
                <span>{formatDate(task.date)}</span>
              </div>
            )}
            {subtaskProgress.isVisible && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Network className="h-4 w-4" />
                <span>{subtaskProgress.text}</span>
              </div>
            )}
            {task.label && (() => {
              const labelInfo = availableLabels?.find(l => l.name === task.label);
              return labelInfo ? (
                <div className="flex items-center gap-1.5" style={{ color: labelInfo.color }}>
                  <Bookmark className="h-4 w-4" />
                  <span>{labelInfo.name}</span>
                </div>
              ) : null;
            })()}
            {task.tag && (() => {
              const projectTags = allTags[task.projectId] || [];
              const tagInfo = projectTags.find(t => t.name === task.tag);
              return tagInfo ? (
                <div className="flex items-center gap-1.5" style={{ color: tagInfo.color }}>
                  <Tag className="h-4 w-4" />
                  <span>{tagInfo.name}</span>
                </div>
              ) : null;
            })()}
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{task.comments.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

// 2. Sortable Logic Component (The DnD Logic)
function SortableTask({ task, onComplete, onClick, availableLabels, allTags, currentView }) {
  // Determine if dragging should be enabled based on the current view.
  const isDraggable = ['inbox', 'board'].includes(currentView);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, disabled: !isDraggable }); // Disable hook based on view

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <TaskItem
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'z-10' : ''}
      task={task}
      availableLabels={availableLabels}
      allTags={allTags}
      onComplete={onComplete}
      onClick={onClick}
      listeners={listeners}
      isDraggable={isDraggable} // Pass the flag down to show/hide the handle
      {...attributes}
    />
  );
}

// === SECTION: Timer Component ===
function Timer() {
  const [time, setTime] = useState(25 * 60); // 25 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [inputTime, setInputTime] = useState(25);


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (time === 0) {
      setTime(inputTime * 60);
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(inputTime * 60);
  };

  return (
    <div className="timer">
      <h3>Timer</h3>
      <div className="timer-display">{formatTime(time)}</div>
      <div className="timer-controls">
        <input
          type="number"
          value={inputTime}
          onChange={(e) => setInputTime(parseInt(e.target.value) || 1)}
          min="1"
          max="60"
          disabled={isRunning}
        />
        <span>min</span>
      </div>
      <div className="timer-buttons">
        {!isRunning ? (
          <button onClick={startTimer}>Start</button>
        ) : (
          <button onClick={pauseTimer}>Pause</button>
        )}
        <button onClick={resetTimer}>Reset</button>
      </div>
    </div>
  );
}
// === SECTION: Timer Modal ===
function TimerModal({
  onClose,
  time,
  setTime,
  inputTime,
  setInputTime,
  isRunning,
  onStart,
  onPause,
  onResume,
  onReset,
  formatTime
}) {
  const quickDurations = [5, 10, 15, 25, 30, 60];

  const selectQuickDuration = (minutes) => {
    if (!isRunning && minutes) {
      const newTime = parseInt(minutes, 10);
      setInputTime(newTime);
      setTime(newTime * 60);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Focus Timer</DialogTitle>
          <DialogDescription>
            Select a duration or enter a custom time to begin a focus session.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-6xl font-bold font-mono tracking-tighter">
            {formatTime(time)}
          </p>
        </div>
        <div className="space-y-4">
          <Label>Quick Select (minutes)</Label>
          <ToggleGroup
            type="single"
            value={String(inputTime)}
            onValueChange={selectQuickDuration}
            className="grid grid-cols-6"
            disabled={isRunning}
          >
            {quickDurations.map(duration => (
              <ToggleGroupItem key={duration} value={String(duration)}>
                {duration}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Label htmlFor="custom-time" className="whitespace-nowrap">
            Custom:
          </Label>
          <Input
            id="custom-time"
            type="number"
            value={inputTime}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val > 0) {
                setInputTime(val);
                if (!isRunning) setTime(val * 60);
              } else {
                setInputTime('');
              }
            }}
            min="1"
            max="120"
            disabled={isRunning}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          {isRunning ? (
            <Button onClick={onPause} variant="secondary" size="lg">Pause</Button>
          ) : (
            <Button onClick={time > 0 && time < inputTime * 60 ? onResume : onStart} size="lg">
              {time > 0 && time < inputTime * 60 ? 'Resume' : 'Launch'}
            </Button>
          )}
          <Button onClick={onReset} variant="outline" size="lg">Reset</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === SECTION: Timer Completion Modal ===
function TimerCompleteModal({ onClose }) {
  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Time's Up!</DialogTitle>
          <DialogDescription className="pt-2">
            Great focus session. Keep up the momentum!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === SECTION: Main App Component ===
function App() {
  // State for UI and Modals
  const [currentView, setCurrentView] = useState('today');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [selectedJournalId, setSelectedJournalId] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light'); // Add this line for theme state

  const [showProjectDetailPanel, setShowProjectDetailPanel] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [viewOptions, setViewOptions] = useState({});

  const getViewOption = (viewKey, option, defaultValue) => {
    return viewOptions[viewKey]?.[option] || defaultValue;
  };

  const setViewOption = (viewKey, option, value) => {
    setViewOptions(prevOptions => ({
      ...prevOptions,
      [viewKey]: {
        ...prevOptions[viewKey],
        [option]: value,
      },
    }));
  };

  const [listFilters, setListFilters] = useState({ labels: [] });
  // State for Data - Initialized as empty. Will be filled from Firestore.
  const [projectData, setProjectData] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [inboxTasks, setInboxTasks] = useState({
    columnOrder: [{ id: 'Inbox', name: 'Inbox' }],
    columns: {
      'Inbox': []
    }
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentProjectTags, setCurrentProjectTags] = useState([]);
  const [allTags, setAllTags] = useState({});

  const viewKey = currentView === 'board' ? currentProject : currentView;

  // Memoized value for the currently selected project data
  // This avoids re-calculating on every render and provides a single source of truth
  const currentProjectData = useMemo(() => {
    if (!currentGroup || !currentProject) {
      return null;
    }
    return (projectData || []).find(g => g.name === currentGroup)?.projects.find(p => p.name === currentProject);
  }, [projectData, currentGroup, currentProject]);

  const viewData = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let allTasksForListView = [];

    // Step 1: Gather all tasks relevant to the current view
    if (currentView === 'today') {
      allTasksForListView = projectData.flatMap(group =>
        group.projects.flatMap(project =>
          Object.values(project.columns).flat().filter(task => {
            if (!task.date) return false;
            const dueDate = new Date(`${task.date}T00:00:00Z`);
            return dueDate.getTime() === today.getTime() || (dueDate < today && !task.completed);
          }).map(task => ({ ...task, projectId: project.id, projectName: project.name }))
        )
      );
    } else if (['tomorrow', 'thisWeek', 'nextWeek'].includes(currentView)) {
      const { start, end } = (() => {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        if (currentView === 'tomorrow') {
          const tomorrow = new Date(now);
          tomorrow.setUTCDate(now.getUTCDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          return { start: tomorrowStr, end: tomorrowStr };
        }
        if (currentView === 'thisWeek') {
          const day = now.getUTCDay();
          const mondayOffset = day === 0 ? -6 : 1 - day;
          const weekStart = new Date(now);
          weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
          return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
        }
        // nextWeek
        const day = now.getUTCDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(now);
        weekStart.setUTCDate(now.getUTCDate() + mondayOffset + 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
      })();
      allTasksForListView = projectData.flatMap(group =>
        group.projects.flatMap(project =>
          Object.values(project.columns).flat().filter(task =>
            task.date >= start && task.date <= end
          ).map(task => ({ ...task, projectId: project.id, projectName: project.name }))
        )
      );
    } else if (currentProjectData) {
      allTasksForListView = Object.values(currentProjectData.columns || {}).flat();
    }

    // Step 2: Filter out completed tasks if needed
    const filteredTasks = allTasksForListView.filter(task => showCompletedTasks || !task.completed);

    // The hook now only returns the raw list. Grouping/sorting is delegated to ListView.
    // The 'tasksByProject' variable is no longer needed here.
    return { allTasksForListView: filteredTasks };

  }, [currentView, projectData, showCompletedTasks, currentProjectData]);
  const { allTasksForListView } = viewData;

  // This logic now lives at the top level, not inside renderContent, to follow the Rules of Hooks.
  const isGlobalView = ['today', 'tomorrow', 'thisWeek', 'nextWeek'].includes(currentView);
  const defaultGroupBy = isGlobalView ? 'project' : 'manual';
  const groupBy = getViewOption(viewKey, 'groupBy', defaultGroupBy);
  const tasksByProject = useGroupedTasks(allTasksForListView, groupBy, projectData);


  // State for App Logic
  const [user, setUser] = useState(null); // Will hold the logged-in user object
  const [isLoading, setIsLoading] = useState(true); // Used to show loading indicators
  const [activeId, setActiveId] = useState(null); // For drag-and-drop
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  const [showTimerCompleteModal, setShowTimerCompleteModal] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState({ inbox: false, board: false });
  const [newColumnName, setNewColumnName] = useState('');
  // State and refs for mobile swipeable columns
  const [activeColumnIndex, setActiveColumnIndex] = useState({ inbox: 0, board: 0 });
  const inboxScrollRef = useRef(null);
  const boardScrollRef = useRef(null);
  // Global paging state (Today/Tomorrow/This Week/Next Week)
  const [activeGlobalIndex, setActiveGlobalIndex] = useState({
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0
  });

  // Global view scroller ref (used by snap + pager)
  const globalScrollRef = useRef(null);

  // Smoothly scroll Global views to a given page index
  const goToGlobalPage = (index) => {
    const el = globalScrollRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth || 1;
    el.scrollTo({ left: index * pageWidth, behavior: 'smooth' });
  };

  // Update active page for Global views based on scroll position
  const handleGlobalScroll = () => {
    const el = globalScrollRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth || 1;
    const i = Math.round(el.scrollLeft / pageWidth);
    setActiveGlobalIndex(prev => ({
      ...prev,
      [currentView]: i
    }));
  };



  // State for Timer
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTime, setTimerTime] = useState(25 * 60);
  const [timerInputTime, setTimerInputTime] = useState(25);
  const [timerIsRunning, setTimerIsRunning] = useState(false);

  const boardSwipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left', 'board'),
    onSwipedRight: () => handleSwipe('right', 'board'),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  const inboxSwipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left', 'inbox'),
    onSwipedRight: () => handleSwipe('right', 'inbox'),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  // Global views (Today/Tomorrow/This Week/Next Week) page-swipe
  const globalSwipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const el = globalScrollRef.current;
      if (!el) return;
      const w = el.clientWidth || 1;
      const maxIndex = Math.max(0, Math.ceil(el.scrollWidth / w) - 1);
      const i = Math.round(el.scrollLeft / w);
      const next = Math.min(maxIndex, i + 1);
      el.scrollTo({ left: next * w, behavior: 'smooth' });
    },
    onSwipedRight: () => {
      const el = globalScrollRef.current;
      if (!el) return;
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      const prev = Math.max(0, i - 1);
      el.scrollTo({ left: prev * w, behavior: 'smooth' });
    },
    preventScrollOnSwipe: true,
    trackMouse: true
  });



  const mainNavItems = [
    { view: 'goals', title: 'Goals', icon: Target },
    { view: 'journal', title: 'Journal', icon: BookText },
    { view: 'today', title: 'Today', icon: Calendar },
    { view: 'inbox', title: 'Inbox', icon: Inbox },
    { view: 'tomorrow', title: 'Tomorrow', icon: Sunrise },
    { view: 'thisWeek', title: 'This Week', icon: CalendarDays },
    { view: 'nextWeek', title: 'Next Week', icon: CalendarPlus },
  ];

  const canBeToggled = ['board', 'today', 'tomorrow', 'thisWeek', 'nextWeek'].includes(currentView);

  useEffect(() => {
    if (currentProjectData && user) {
      const fetchTags = async () => {
        const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', currentProjectData.id, 'tags');
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        const fetchedTags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCurrentProjectTags(fetchedTags);
      };
      fetchTags();
    } else {
      // Clear tags if no project is selected
      setCurrentProjectTags([]);
    }
  }, [currentProjectData, user, db]); // Reruns when the active project changes
  // --- Timer Logic & Effect ---
  const timerIntervalRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, {
    // Require the mouse to move by 5 pixels before activating a drag.
    // This allows single-clicks to be registered correctly.
    activationConstraint: {
      distance: 5,
    },
  }));

  useEffect(() => {
    if (!timerIsRunning) {
      clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerTime(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setTimerIsRunning(false);
          // Call our new, unified handler
          handleTimerCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timerIsRunning]);

  useEffect(() => {
    if (showTimerCompleteModal) {
      document.getElementById('timer-chime')?.play().catch(error => {
        // This catch block helps diagnose issues if the browser blocks autoplay
        console.error("Audio playback failed:", error);
      });
    }
  }, [showTimerCompleteModal]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    // We use the input time directly to start or restart the timer
    setTimerTime(timerInputTime * 60);
    setTimerIsRunning(true);
    setShowTimerModal(false); // Close modal when timer starts
  };

  const handlePauseTimer = () => {
    setTimerIsRunning(false);
  };

  const handleResumeTimer = () => {
    setTimerIsRunning(true);
    setShowTimerModal(false); // Close modal when timer resumes
  };

  const handleResetTimer = () => {
    // No need to ask for confirmation, just reset
    setTimerIsRunning(false);
    setTimerTime(timerInputTime * 60);
  };

  const handleCancelTimer = () => {
    setTimerIsRunning(false);
    // Reset to default 25 minutes
    setTimerInputTime(25);
    setTimerTime(25 * 60);
  };

  const handleTimerCompletion = () => {
    // Play the chime
    const chime = document.getElementById('timer-chime');
    if (chime) {
      chime.play().catch(error => {
        console.error("Audio playback failed on completion:", error);
      });
    }
    // Show the completion modal
    setShowTimerCompleteModal(true);
  };
  const renderContent = () => {
    if (isLoading) {
      return <div style={{ padding: 20 }}><h2>Loading...</h2></div>;
    }

    // Get all pre-processed data from our centralized viewData hook
    const { allTasksForListView } = viewData;
    const activeTask = activeId ? findTaskById(activeId) : null;

    switch (currentView) {
      case 'projects':
        return (
          <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Projects...</h2></div>}>
            <ProjectsPage
              projectData={projectData}
              onSelectProject={(groupName, projectName) => {
                setCurrentGroup(groupName);
                setCurrentProject(projectName);
                setCurrentView('board');
              }}
            />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Settings...</h2></div>}>
            <SettingsPage
              currentUser={user}
              onUpdateName={handleUpdateName}
              initialLabels={projectLabels}
              initialGroups={projectData.map(g => g.name)}
              onUpdateLabels={updateLabels}
              onAddGroup={handleAddGroup}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={handleDeleteGroup}
              currentTheme={theme}
              onToggleTheme={toggleTheme}
              showCompletedTasks={showCompletedTasks}
              onToggleShowCompletedTasks={handleToggleShowCompletedTasks}
            />
          </Suspense>
        );
      case 'goals':
        return <Suspense fallback={<div>Loading...</div>}><GoalsPage /></Suspense>;
      case 'journal':
        return (
          <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Journals...</h2></div>}>
            <JournalsPage onSelectJournal={(id) => { setSelectedJournalId(id); setCurrentView('journalEntry'); }} />
          </Suspense>
        );
      case 'journalEntry':
        return <Suspense fallback={<div>Loading...</div>}><JournalEntryPage journalId={selectedJournalId} user={user} /></Suspense>;

      case 'today':
      case 'tomorrow':
      case 'thisWeek':
      case 'nextWeek': {
        const viewTitle = currentView === 'today'
          ? `Happy ${new Date().toLocaleDateString('en-us', { weekday: 'long' })}, ${user?.displayName || 'Friend'}!`
          : currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1').trim();



        return (
          <div className="p-6 space-y-4 h-full flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">{viewTitle}</h1>
            {getViewOption(currentView, 'mode', 'board') === 'board' ? (<>
              <div
                ref={globalScrollRef}
                {...globalSwipeHandlers}
                onScroll={handleGlobalScroll}
                className="flex md:p-4 md:gap-4 overflow-x-auto h-full no-scrollbar snap-x snap-mandatory md:snap-none"
              >
                {Object.entries(tasksByProject).map(([groupName, tasks]) => (
                  <div key={groupName} className="w-full shrink-0 md:w-80 snap-start">
                    <Column
                      column={{ id: groupName, name: groupName }}
                      tasks={tasks}
                      isEditable={false}
                      onOpenTask={(task) => setModalTask({ ...task })}
                      onUpdateTask={(col, taskId, updatedTask) => updateTask(tasks[0]?.projectId, taskId, updatedTask)}
                      availableLabels={projectLabels}
                      allTags={allTags}
                      currentView={currentView}
                    />
                  </div>
                ))}
                         </div>
              {Object.keys(tasksByProject || {}).length > 1 && (
                <BoardPager
                  count={Object.keys(tasksByProject || {}).length}
                  activeIndex={activeGlobalIndex[currentView] || 0}
                  onDotClick={(index) => goToGlobalPage(index)}
                />
              )}
            </>
            ) : (


              <div className="flex-1 overflow-y-auto">
                <DndContext sensors={sensors} onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleListDragEnd} onDragCancel={() => setActiveId(null)}>
                  <ListView
                    tasks={allTasksForListView}
                    groupBy={getViewOption(viewKey, 'groupBy', 'project')}
                    projectData={projectData}
                    availableLabels={projectLabels}
                    allTags={allTags}
                    onOpenTask={(task) => setModalTask({ ...task })}
                    onToggleComplete={(task) => updateTask(task.projectId, task.id, { completed: !task.completed })}
                    onToggleSubtask={(taskId, subtaskId) => {
                      const task = allTasksForListView.find(t => t.id === taskId);
                      if (task) handleToggleSubtask(task.projectId, taskId, subtaskId);
                    }}
                    isDraggable={false}
                  />
                  <DragOverlay>{activeTask ? <TaskItem task={activeTask} availableLabels={projectLabels} allTags={allTags} /> : null}</DragOverlay>
                </DndContext>
              </div>
            )}
          </div>
        );
      }

      case 'inbox':
        const safeInboxTasks = inboxTasks && inboxTasks.columnOrder && inboxTasks.columns ? inboxTasks : { columnOrder: [{ id: 'Inbox', name: 'Inbox' }], columns: { 'Inbox': [] } };
        return (<>
          <DndContext onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleInboxDragEnd} onDragCancel={() => setActiveId(null)}>
            <div
              ref={inboxScrollRef}
              {...inboxSwipeHandlers}
              className="flex md:p-4 md:gap-4 overflow-x-auto h-full no-scrollbar snap-x snap-mandatory md:snap-none"
            >
              {safeInboxTasks.columnOrder.filter(Boolean).map((column) => (
                <Column key={column.id} column={column}
                  tasks={(safeInboxTasks.columns[column.id] || []).filter(task => showCompletedTasks || !task.completed)}
                  onAddTask={(taskData) => addInboxTask(taskData)}
                  onUpdateTask={handleInboxTaskUpdate}
                  onOpenTask={(task) => setModalTask({ ...task, isInbox: true })}
                  onRenameColumn={renameInboxColumn} onDeleteColumn={deleteInboxColumn}
                  availableLabels={projectLabels} allTags={allTags}
                  currentView={currentView}
                />
              ))}
              {isAddingColumn.inbox ? (
                <div className="flex flex-col w-full shrink-0 md:w-80 p-3 space-y-2 bg-card rounded-lg border snap-start snap-always">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewColumn('inbox');
                      if (e.key === 'Escape') setIsAddingColumn({ ...isAddingColumn, inbox: false });
                    }}
                    placeholder="Enter column name..."
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleSaveNewColumn('inbox')}>Add column</Button>
                    <Button variant="ghost" onClick={() => setIsAddingColumn({ ...isAddingColumn, inbox: false })}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="w-full shrink-0 md:w-80 snap-start snap-always">
                  <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddingColumn({ ...isAddingColumn, inbox: true })}>
                    <Plus className="mr-2 h-4 w-4" /> Add Column
                  </Button>
                </div>
              )}
            </div>
            <DragOverlay>{activeId && findTaskById(activeId) ? <TaskItem task={findTaskById(activeId)} availableLabels={projectLabels} allTags={allTags} /> : null}</DragOverlay>
          </DndContext>
          <BoardPager
            count={safeInboxTasks?.columnOrder?.length || 0}
            activeIndex={activeColumnIndex.inbox}
            onDotClick={(index) => handlePagerDotClick(index, 'inbox')}
            onAddClick={() => handlePagerAddClick('inbox')}
          />
        </>
        );

      default:
        if (!currentProjectData) {
          return (
            <div className="p-6 text-center">
              <h2 className="text-xl font-semibold">Welcome to Rocket Productivity!</h2>
              <p className="text-muted-foreground mt-2">Select a project from the sidebar to get started, or create a new one.</p>
            </div>
          );
        }

        return getViewOption(currentProject, 'mode', 'board') === 'board' ? (
          <>
            <div className="relative h-full w-full" {...boardSwipeHandlers}>
              <DndContext onDragStart={e => setActiveId(e.active.id)} onDragEnd={e => { handleDrop(e); setActiveId(null); }} onDragCancel={() => setActiveId(null)}>
                <div ref={boardScrollRef} className="flex md:p-4 md:gap-4 overflow-x-auto h-full no-scrollbar snap-x snap-mandatory md:snap-none">
                  {currentProjectData?.columnOrder?.filter(Boolean).map((column) => (
                    <Column key={column.id} column={column}
                      tasks={(currentProjectData.columns[column.id] || []).filter(task => showCompletedTasks || !task.completed)}
                      onAddTask={(taskData) => addTask(taskData, currentProjectData.id)}
                      onUpdateTask={(colId, taskId, updatedData) => updateTask(currentProjectData.id, taskId, updatedData)}
                      onOpenTask={(task) => setModalTask({ ...task, projectId: currentProjectData.id })}
                      onRenameColumn={renameColumn} onDeleteColumn={deleteColumn}
                      availableLabels={projectLabels} allTags={allTags}
                      currentView={currentView}
                    />
                  ))}
                  {isAddingColumn.board ? (
                    <div className="flex flex-col w-full shrink-0 md:w-80 p-3 space-y-2 bg-card rounded-lg border snap-start">
                      <Input
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewColumn('board');
                          if (e.key === 'Escape') setIsAddingColumn({ ...isAddingColumn, board: false });
                        }}
                        placeholder="Enter column name..."
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleSaveNewColumn('board')}>Add column</Button>
                        <Button variant="ghost" onClick={() => setIsAddingColumn({ ...isAddingColumn, board: false })}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full shrink-0 md:w-80 p-3 snap-start">
                      <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddingColumn({ ...isAddingColumn, board: true })}>
                        <Plus className="mr-2 h-4 w-4" /> Add Column
                      </Button>
                    </div>
                  )}
                </div>
                <DragOverlay>{activeTask ? <TaskItem task={activeTask} availableLabels={projectLabels} allTags={allTags} /> : null}</DragOverlay>
              </DndContext>
            </div>
            <BoardPager
              count={currentProjectData?.columnOrder?.length || 0}
              activeIndex={activeColumnIndex.board}
              onDotClick={(index) => handlePagerDotClick(index, 'board')}
              onAddClick={() => handlePagerAddClick('board')}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ViewControls
              groupByOptions={[
                { value: 'manual', label: 'Manual' },
                { value: 'column', label: 'Column' },
                { value: 'priority', label: 'Priority' },
                { value: 'dueDate', label: 'Due Date' },
              ]}
              selectedGroupBy={getViewOption(viewKey, 'groupBy', 'manual')}
              onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
            />
            <DndContext sensors={sensors} onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleListDragEnd} onDragCancel={() => setActiveId(null)}>
              <ListView
                tasks={allTasksForListView}
                groupBy={getViewOption(viewKey, 'groupBy', 'manual')}
                projectData={projectData}
                availableLabels={projectLabels}
                allTags={allTags}
                onOpenTask={(task) => setModalTask({ ...task, projectId: currentProjectData?.id })}
                onToggleComplete={(task) => updateTask(currentProjectData.id, task.id, { completed: !task.completed })}
                onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(currentProjectData.id, taskId, subtaskId)}
                isDraggable={true}
              />
              <DragOverlay>{activeTask ? <TaskItem task={activeTask} availableLabels={projectLabels} allTags={allTags} /> : null}</DragOverlay>
            </DndContext>
          </div>
        );
    }
  };
  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user to null if logged out, or user object if logged in
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Effect to apply the theme class to the root element for Tailwind
  const handleNavigation = (view) => {
    const isMobile = window.innerWidth < 768;

    if (view === 'calendar') {
      if (isMobile) {
        // On mobile, tapping calendar maximizes it and sets the view
        setShowCalendar(true);
        setIsCalendarMaximized(true);
      } else {
        // On desktop, it's just a toggle
        setShowCalendar(!showCalendar);
      }
    } else {
      // For any other view, set the view and ensure the calendar is closed
      setShowCalendar(false);
      setIsCalendarMaximized(false);
    }

    // Always update the current view so the correct nav item is highlighted
    setCurrentView(view);
  };

  const handleFabClick = () => {
    switch (currentView) {
      case 'projects':
        setShowNewProjectModal(true);
        break;
      case 'inbox':
      case 'board':
      case 'today':
      case 'tomorrow':
      case 'thisWeek':
      case 'nextWeek':
        setModalTask({ isNew: true });
        break;
      default:
        // The FAB will be hidden on other views like settings, goals, etc.
        break;
    }
  };

  const fabVisibleViews = ['projects', 'inbox', 'board', 'today', 'tomorrow', 'thisWeek', 'nextWeek', 'journal'];
  const isFabVisible = fabVisibleViews.includes(currentView);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (user) {
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { theme: newTheme }, { merge: true });
    }
  };

  const handleToggleShowCompletedTasks = async (isChecked) => {
    setShowCompletedTasks(isChecked);
    if (user) {
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { showCompletedTasks: isChecked }, { merge: true });
    }
  };

  // Fetch all user data when user logs in
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        setIsLoading(true);

        const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
        const appDataSnap = await getDoc(appDataRef);
        const appData = appDataSnap.exists() ? appDataSnap.data() : {};

        // --- INBOX MIGRATION LOGIC ---
        let inboxData = appData.inboxTasks || { columnOrder: [], columns: {} };
        if (inboxData.columnOrder && inboxData.columnOrder.length > 0 && typeof inboxData.columnOrder[0] === 'string') {
          const oldColumnNames = [...inboxData.columnOrder];
          inboxData.columnOrder = oldColumnNames.map(name => ({ id: name, name: name }));
          const newColumns = {};
          inboxData.columnOrder.forEach(col => {
            newColumns[col.id] = (inboxData.columns[col.name] || []).map(task => ({ ...task, column: col.id }));
          });
          inboxData.columns = newColumns;
        }
        setInboxTasks(inboxData);
        // --- END INBOX MIGRATION ---

        const calendarEventsRef = collection(db, 'users', user.uid, 'calendarEvents');
        const calendarEventsSnap = await getDocs(calendarEventsRef);
        const fetchedCalendarEvents = calendarEventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCalendarEvents(fetchedCalendarEvents);

        setProjectLabels(appData.projectLabels || []);
        const groupOrder = appData.groupOrder || [];

        setTheme(appData.theme || 'light');
        setShowCompletedTasks(appData.showCompletedTasks !== undefined ? appData.showCompletedTasks : true);

        const projectsCollectionRef = collection(db, 'users', user.uid, 'projects');
        const projectsSnapshot = await getDocs(projectsCollectionRef);
        let allProjects = [];
        const allTagsData = {};

        const projectPromises = projectsSnapshot.docs.map(async (projectDoc) => {
          const project = { id: projectDoc.id, ...projectDoc.data() };

          // Fetch tasks for the project
          const tasksCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tasks');
          const tasksSnapshot = await getDocs(tasksCollectionRef);
          // Add the projectId to every task object right here
          const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), projectId: project.id }));

          // Fetch tags for the project
          const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tags');
          const tagsSnapshot = await getDocs(tagsCollectionRef);
          allTagsData[project.id] = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // --- COLUMN MIGRATION & TASK SORTING ---
          if (project.columnOrder && project.columnOrder.length > 0 && typeof project.columnOrder[0] === 'string') {
            const oldColumnNames = [...project.columnOrder];
            project.columnOrder = oldColumnNames.map(name => ({ id: name, name: name }));
            const newColumns = {};
            project.columnOrder.forEach(col => {
              newColumns[col.id] = (tasks.filter(task => task.column === col.name)).map(task => ({ ...task, column: col.id }));
            });
            project.columns = newColumns;
          } else {
            const columns = {};
            (project.columnOrder || []).forEach(col => {
              columns[col.id] = tasks.filter(task => task.column === col.id);
            });
            project.columns = columns;
          }
          // --- END MIGRATION ---

          allProjects.push(project);
        });
        await Promise.all(projectPromises);

        setAllTags(allTagsData); // Set the new state with all fetched tags

        const groupsMap = {};
        groupOrder.forEach(groupName => {
          if (!groupsMap[groupName]) {
            groupsMap[groupName] = [];
          }
        });
        allProjects.forEach(project => {
          const groupName = project.group || 'Ungrouped';
          if (!groupsMap[groupName]) {
            groupsMap[groupName] = [];
          }
          groupsMap[groupName].push(project);
        });
        for (const groupName in groupsMap) {
          groupsMap[groupName].sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        const finalSortedData = groupOrder.map(groupName => ({
          name: groupName,
          projects: groupsMap[groupName] || []
        }));
        for (const groupName in groupsMap) {
          if (!finalSortedData.some(g => g.name === groupName)) {
            finalSortedData.push({
              name: groupName,
              projects: groupsMap[groupName]
            });
          }
        }

        setProjectData(finalSortedData);
        setIsLoading(false);
      };

      fetchUserData();
    } else {
      setProjectData([]);
      setProjectLabels([]);
      setInboxTasks({ columnOrder: [], columns: {} });
      setCalendarEvents([]);
      setAllTags({});
      setCurrentView('today');
      setCurrentGroup(null);
      setCurrentProject(null);
      setIsLoading(false);
    }
  }, [user]);

  // This effect syncs local calendar events state with Firestore
  useEffect(() => {
    // Don't run on initial load or if the user is not logged in
    if (isLoading || !user) {
      return;
    }

    const syncCalendarEvents = async () => {
      const calendarEventsRef = collection(db, 'users', user.uid, 'calendarEvents');
      const querySnapshot = await getDocs(calendarEventsRef);
      const batch = writeBatch(db);

      // Delete all existing events in Firestore for this user
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add all current local events to the batch
      calendarEvents.forEach(event => {
        // Ensure the event has an ID before trying to save it
        const eventId = event.id || `${Date.now()}-${Math.random()}`;
        const newEventRef = doc(calendarEventsRef, eventId);
        batch.set(newEventRef, { ...event, id: eventId });
      });

      // Commit the batch
      await batch.commit();
    };

    // Use a timeout to debounce the sync, preventing rapid writes
    const debounceSync = setTimeout(() => {
      syncCalendarEvents();
    }, 1500); // Wait 1.5 seconds after the last change to sync

    return () => clearTimeout(debounceSync); // Clean up the timeout

  }, [calendarEvents, user, isLoading]);

  // --- Authentication Handlers ---
  const handleSignUp = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const handleLogin = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = () => {
    return signOut(auth);
  };
  const handleSidebarDragEnd = (event) => {
    const { active, over } = event;

    // Exit if dropped in the same spot or not on a valid target
    if (!over || active.id === over.id) {
      return;
    }

    // Find the group where the drag happened
    const sourceGroup = projectData.find(group =>
      group.projects.some(p => p.id === active.id)
    );

    // For now, we only handle reordering within the same group
    const isSameGroup = sourceGroup.projects.some(p => p.id === over.id);
    if (!isSameGroup) {
      console.log("Moving projects between groups will be handled in a future step.");
      return;
    }

    // Get the original and new index of the item
    const oldIndex = sourceGroup.projects.findIndex(p => p.id === active.id);
    const newIndex = sourceGroup.projects.findIndex(p => p.id === over.id);

    // 1. Create the new, reordered projects array for the optimistic UI update
    const reorderedProjects = arrayMove(sourceGroup.projects, oldIndex, newIndex);

    // Update the local state immediately
    setProjectData(prevData => {
      return prevData.map(group =>
        group.name === sourceGroup.name
          ? { ...group, projects: reorderedProjects }
          : group
      );
    });

    // 2. Create a batch write to update the 'order' field in Firestore for every affected project
    const batch = writeBatch(db);
    reorderedProjects.forEach((project, index) => {
      const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
      batch.update(projectRef, { order: index });
    });

    // Asynchronously commit the batch to save the new order
    batch.commit().catch(err => {
      console.error("Failed to save new project order:", err);
      // Optional: You could add logic here to revert the state if the save fails
    });
  };
  const handleAddProject = () => {
    setShowNewProjectModal(true);
  };
  const handleCreateProject = async (projectName, groupName) => {
    if (!user) {
      alert("You must be logged in to create a project.");
      return;
    }

    try {
      const projectsCollectionRef = collection(db, 'users', user.uid, 'projects');
      // Get the number of projects already in the target group to determine the new order
      const group = projectData.find(g => g.name === groupName);
      const projectsInGroup = group ? group.projects.length : 0;

      const newProjectData = {
        name: projectName,
        group: groupName,
        columnOrder: ['Backlog', 'Todo', 'In Progress', 'Done'],
        order: projectsInGroup, // Add the order field
      };

      const newDocRef = await addDoc(projectsCollectionRef, newProjectData);

      // Optimistically update local state
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const groupIndex = newData.findIndex(g => g.name === groupName);

        const newProjectForState = {
          ...newProjectData,
          id: newDocRef.id,
          columns: {
            'Backlog': [], 'Todo': [], 'In Progress': [], 'Done': []
          }
        };

        if (groupIndex > -1) {
          // Group already exists, push the new project into its 'projects' array
          newData[groupIndex].projects.push(newProjectForState);
        } else {
          // This is a new group, so add the new group object to the state array
          newData.push({ name: groupName, projects: [newProjectForState] });
        }
        return newData;
      });

      // Automatically select the new project
      setCurrentGroup(groupName);
      setCurrentProject(projectName);
      setCurrentView('projects');

    } catch (error) {
      console.error("Error creating project in Firestore:", error);
      alert("Failed to create project. Please try again.");
    }
  };
  const handleSaveProjectEdit = async (projectToUpdate, updatedData) => {
    if (!user || !projectToUpdate) return;

    const finalProjectData = { ...projectToUpdate, ...updatedData };
    const { id: projectId, name: newName, group: newGroup } = finalProjectData;
    const { group: oldGroup, name: oldName } = projectToUpdate;

    if (!newName || !newName.trim() || !newGroup || !newGroup.trim()) {
      console.error("Project name and group cannot be empty.");
      return;
    }

    const trimmedNewName = newName.trim();
    const trimmedNewGroup = newGroup.trim();

    const hasChanged = trimmedNewName !== oldName || trimmedNewGroup !== oldGroup;
    if (!hasChanged) {
      return; // Nothing to save
    }

    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

    try {
      await updateDoc(projectRef, {
        name: trimmedNewName,
        group: trimmedNewGroup,
      });

      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        let projectToMove;

        // Find and remove the project from its old group
        const sourceGroup = newData.find(g => g.name === oldGroup);
        if (sourceGroup) {
          const projectIndex = sourceGroup.projects.findIndex(p => p.id === projectId);
          if (projectIndex > -1) {
            [projectToMove] = sourceGroup.projects.splice(projectIndex, 1);
          }
        }

        // If the project was found, update and move it to the new group
        if (projectToMove) {
          projectToMove.name = trimmedNewName;
          projectToMove.group = trimmedNewGroup;

          let destinationGroup = newData.find(g => g.name === trimmedNewGroup);
          if (!destinationGroup) {
            // If the new group doesn't exist, create it
            destinationGroup = { name: trimmedNewGroup, projects: [] };
            newData.push(destinationGroup);
          }
          destinationGroup.projects.push(projectToMove);
        }

        return newData;
      });

      if (currentProject === oldName && currentGroup === oldGroup) {
        setCurrentProject(trimmedNewName);
        setCurrentGroup(trimmedNewGroup);
      }

      setProjectToEdit(prev => ({ ...prev, name: trimmedNewName, group: trimmedNewGroup }));

    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project.");
    }
  };

  const handleAddGroup = async (newGroupName) => {
    if (!user || !newGroupName) return;
    const currentGroupOrder = projectData.map(g => g.name);
    if (currentGroupOrder.includes(newGroupName)) {
      alert("A group with this name already exists.");
      return;
    }

    const newGroupOrder = [...currentGroupOrder, newGroupName];
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await updateDoc(appDataRef, { groupOrder: newGroupOrder });

    setProjectData(prevData => [...prevData, { name: newGroupName, projects: [] }]);
  };

  const handleRenameGroup = async (oldName, newName) => {
    if (!user || oldName === newName || !newName) return;
    if (oldName === 'Ungrouped') {
      alert("Cannot rename the 'Ungrouped' group.");
      return;
    }

    const batch = writeBatch(db);
    const groupToRename = projectData.find(g => g.name === oldName);
    if (!groupToRename) return;

    // Update all projects in the group
    groupToRename.projects.forEach(p => {
      const projRef = doc(db, 'users', user.uid, 'projects', p.id);
      batch.update(projRef, { group: newName });
    });

    // Update the groupOrder array
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    const newGroupOrder = projectData.map(g => g.name === oldName ? newName : g.name);
    batch.update(appDataRef, { groupOrder: newGroupOrder });

    await batch.commit();

    // Optimistically update state
    setProjectData(prevData => prevData.map(g => g.name === oldName ? { ...g, name: newName } : g));
  };

  const handleDeleteGroup = async (groupNameToDelete) => {
    if (groupNameToDelete === 'Ungrouped' || !user) return;

    const groupToDelete = projectData.find(g => g.name === groupNameToDelete);
    if (!groupToDelete || !groupToDelete.projects) return;

    const batch = writeBatch(db);

    // Move all projects to 'Ungrouped' and update their group field in Firestore
    groupToDelete.projects.forEach(project => {
      const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
      batch.update(projectRef, { group: "Ungrouped" });
    });

    // Remove the deleted group from the groupOrder array in Firestore
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    const newGroupOrder = projectData.map(g => g.name).filter(name => name !== groupNameToDelete);
    batch.update(appDataRef, { groupOrder: newGroupOrder });

    try {
      await batch.commit();

      // Optimistically update the local state correctly
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        let projectsToMove = [];
        const groupIdx = newData.findIndex(g => g.name === groupNameToDelete);

        if (groupIdx > -1) {
          projectsToMove = newData[groupIdx].projects || [];
          // Remove the old group
          newData.splice(groupIdx, 1);
        }

        // Find or create the 'Ungrouped' group and add the projects
        let ungroupedGroup = newData.find(g => g.name === 'Ungrouped');
        if (ungroupedGroup) {
          ungroupedGroup.projects.push(...projectsToMove);
        } else if (projectsToMove.length > 0) {
          newData.push({ name: 'Ungrouped', projects: projectsToMove });
        }
        return newData;
      });

      // If the deleted group was the active one, switch view
      if (currentGroup === groupNameToDelete) {
        setCurrentView('today');
        setCurrentGroup(null);
        setCurrentProject(null);
      }
    } catch (error) {
      console.error("Error deleting group: ", error);
      alert("Failed to delete group.");
    }
  };

  // NOTE: The 'setProjects' in your original 'renameProject', 'renameColumn', and 'updateLabels'
  // seems to be a typo and should likely be 'setProjectGroups' or operate on projectGroups structure.
  // I'm keeping them as you provided for now, but this might need review.
  // If `projects` was meant to be a different state, it's not defined.
  // Assuming they intended to modify 'projectGroups'. The below needs careful review
  // based on how 'setProjects' was intended to work.
  // For now, I will comment out the parts that would cause an error due to 'setProjects' not being defined.

  const renameProject = (oldName, newName) => {
    // This function needs to be adapted to work with 'projectGroups' state structure.
    // For example, it needs to know the group of the project being renamed.
    // console.warn("renameProject function needs review to work with projectGroups state.");
    // If you call this, it will likely error or not work as expected.
    // A corrected version would look more like handleSaveProjectEdit
  };

  const renameColumn = async (columnId, newName) => {
    if (!newName.trim() || !user || !currentProjectData) return;

    const trimmedNewName = newName.trim();
    const projectId = currentProjectData.id;
    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

    const updatedColumnOrder = currentProjectData.columnOrder.map(col =>
      col.id === columnId ? { ...col, name: trimmedNewName } : col
    );

    try {
      await updateDoc(projectRef, { columnOrder: updatedColumnOrder });
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData.flatMap(g => g.projects).find(p => p.id === projectId);
        if (project) {
          project.columnOrder = updatedColumnOrder;
        }
        return newData;
      });
    } catch (error) {
      console.error("Error renaming column:", error);
    }
  };

  const updateLabels = async (newLabels) => {
    if (!user) {
      alert("You must be logged in to save labels.");
      return;
    }
    try {
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { projectLabels: newLabels }, { merge: true });
      setProjectLabels(newLabels); // Update local state to match
    } catch (error) {
      console.error("Error saving labels:", error);
      alert("Failed to save labels. Please try again.");
    }
  };

  const handleUpdateName = async (newName) => {
    if (!user) {
      alert("You must be logged in to update your name.");
      return;
    }
    try {
      // Import updateProfile from 'firebase/auth' at the top of the file
      await updateProfile(auth.currentUser, {
        displayName: newName,
      });
      // Optimistically update the local user state to reflect the change immediately
      setUser({ ...user, displayName: newName });
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update name.");
    }
  };

  const addTask = async (taskData, projectId) => {
    if (!user || !projectId) {
      alert("Cannot add task without a project ID.");
      return;
    }

    // The incoming task data should already have a column name.
    const columnName = taskData.column;
    if (!columnName) {
      alert("Could not determine the column for the new task. Please select one.");
      return;
    }

    // Create a complete task object, ensuring all default fields are present.
    const newTaskForFirestore = {
      text: taskData.text || 'Untitled Task',
      description: taskData.description || '',
      date: taskData.date || '',
      priority: taskData.priority || 4,
      label: taskData.label || '',
      tag: taskData.tag || '',
      comments: taskData.comments || [],
      subtasks: taskData.subtasks || [],
      completed: taskData.completed || false,
      column: columnName,
      projectId: projectId,
      order: Date.now(), // Add this line to set a default order
    };

    try {
      const tasksCollectionRef = collection(db, 'users', user.uid, 'projects', projectId, 'tasks');
      const newDocRef = await addDoc(tasksCollectionRef, newTaskForFirestore);

      // Update local state to show the new task immediately.
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        for (const group of newData) {
          const project = group.projects.find(p => p.id === projectId);
          if (project) {
            if (!project.columns[columnName]) {
              project.columns[columnName] = [];
            }
            project.columns[columnName].push({ ...newTaskForFirestore, id: newDocRef.id });
            break; // Exit the loop once the project is found and updated
          }
        }
        return newData;
      });
    } catch (error) {
      console.error("Error adding task to Firestore:", error);
      alert("There was an error saving your task.");
    }
  };
  const handleToggleSubtask = async (projectId, taskId, subtaskId) => {
    if (!user || !projectId) return;

    let targetTask;
    let targetProject;

    // Find the task in the projectData state
    for (const group of projectData) {
      targetProject = group.projects.find(p => p.id === projectId);
      if (targetProject) {
        for (const colId in targetProject.columns) {
          targetTask = targetProject.columns[colId].find(t => t.id === taskId);
          if (targetTask) break;
        }
      }
      if (targetTask) break;
    }

    if (!targetTask || !targetTask.subtasks) return;

    const updatedSubtasks = targetTask.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    await updateTask(projectId, taskId, { subtasks: updatedSubtasks });
  };
  const updateTask = async (projectId, taskId, updatedTaskData) => {
    // --- Start Enhanced Debugging ---
    console.log("--- DEBUGGING updateTask ---");
    console.log("Attempting to update with projectId:", projectId);
    console.log("Attempting to update with taskId:", taskId);
    console.log("Current entire projectData state:", JSON.parse(JSON.stringify(projectData)));
    // --- End Enhanced Debugging ---

    if (!user || !projectId) {
      console.error("Update failed: No user or projectId provided.");
      return;
    }

    const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', taskId);

    try {
      if (updatedTaskData === null) {
        await deleteDoc(taskRef);
      } else {
        await updateDoc(taskRef, updatedTaskData);
      }

      // Optimistically update local state
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        for (const group of newData) {
          const project = group.projects.find(p => p.id === projectId);
          if (project) {
            for (const colName in project.columns) {
              const taskIndex = project.columns[colName].findIndex(t => t.id === taskId);
              if (taskIndex > -1) {
                if (updatedTaskData === null) {
                  project.columns[colName].splice(taskIndex, 1);
                } else {
                  project.columns[colName][taskIndex] = { ...project.columns[colName][taskIndex], ...updatedTaskData };
                }
                return newData;
              }
            }
          }
        }
        return newData;
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleTaskUpdate = async (updatedTaskData, projectId) => {
    const taskToUpdate = modalTask;
    if (!taskToUpdate) return;

    // Case 1: This is a brand new task being created in a project.
    if (taskToUpdate.isNew) {
      await addTask(updatedTaskData, projectId);
      setModalTask(null);
      return;
    }

    // Case 2: This is an existing task within a project.
    if (taskToUpdate.projectId && taskToUpdate.id) {
      await updateTask(taskToUpdate.projectId, taskToUpdate.id, updatedTaskData);
      setModalTask(null);
      return;
    }

    // Case 3: This is an inbox task.
    if (taskToUpdate.isInbox) {
      const newInboxState = JSON.parse(JSON.stringify(inboxTasks));
      let taskUpdated = false;

      for (const colName in newInboxState.columns) {
        const taskIndex = newInboxState.columns[colName].findIndex(t => t.id === taskToUpdate.id);
        if (taskIndex > -1) {
          // Update the task with all its new details
          newInboxState.columns[colName][taskIndex] = {
            ...newInboxState.columns[colName][taskIndex],
            ...updatedTaskData
          };
          taskUpdated = true;
          break;
        }
      }

      if (taskUpdated) {
        setInboxTasks(newInboxState);
        const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
        await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
      }
      setModalTask(null);
      return;
    }
  };

  const addInboxTask = async (taskData) => {
    if (!user) {
      alert("You must be logged in to add tasks.");
      return;
    }

    // Ensure inboxTasks has the proper structure
    const currentInboxTasks = inboxTasks && inboxTasks.columnOrder && inboxTasks.columns
      ? inboxTasks
      : { columnOrder: ['Inbox'], columns: { 'Inbox': [] } };

    const newTask = {
      id: generateUniqueId(),
      text: taskData.text || 'Untitled Task',
      description: taskData.description || '',
      date: taskData.date || '',
      priority: taskData.priority || 4,
      label: taskData.label || '',
      tag: '',
      comments: [],
      subtasks: [],
      completed: false,
      column: taskData.column,
    };

    try {
      // Create a deep copy of the current inbox state to avoid mutation issues
      const newInboxState = JSON.parse(JSON.stringify(currentInboxTasks));

      // Add the new task to the 'Inbox' column's array
      newInboxState.columns[taskData.column].push(newTask);

      setInboxTasks(newInboxState); // Optimistically update the UI

      // Save the entire updated inbox object to Firestore
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });

    } catch (error) {
      console.error("Error saving inbox task:", error);
      alert("Failed to save task to inbox.");
      // If the save fails, we can revert to the previous state.
      // For simplicity, we'll log the error, but a production app might revert.
    }
  };

  const handleInboxTaskUpdate = async (columnId, taskId, updatedData) => {
    if (!user) return;


    const newInboxState = JSON.parse(JSON.stringify(inboxTasks));
    let taskUpdated = false;

    const taskIndex = newInboxState.columns[columnId]?.findIndex(t => t.id === taskId);

    if (taskIndex > -1) {
      // Update the task with the new data
      newInboxState.columns[columnId][taskIndex] = {
        ...newInboxState.columns[columnId][taskIndex],
        ...updatedData
      };
      taskUpdated = true;
    }

    if (taskUpdated) {
      setInboxTasks(newInboxState);
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
    }
  };

  const handleTagUpdate = (projectId, updatedTag) => {
    setAllTags(prevAllTags => ({
      ...prevAllTags,
      [projectId]: prevAllTags[projectId].map(tag =>
        tag.id === updatedTag.id ? updatedTag : tag
      ),
    }));
  };

  // --- Mobile Swipe Logic ---
  const handleSwipe = (direction, viewType) => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const columnOrder = viewType === 'inbox' ? inboxTasks.columnOrder : currentProjectData?.columnOrder;
    if (!columnOrder || columnOrder.length <= 1) return;

    setActiveColumnIndex(prev => {
      const currentIndex = prev[viewType];
      let newIndex = currentIndex;
      if (direction === 'left') { // Swiping left goes to the next column
        newIndex = Math.min(currentIndex + 1, columnOrder.length - 1);
      } else if (direction === 'right') { // Swiping right goes to the previous column
        newIndex = Math.max(currentIndex - 1, 0);
      }

      // Only update if the index actually changes
      if (newIndex !== currentIndex) {
        return { ...prev, [viewType]: newIndex };
      }
      return prev;
    });
  };

  useEffect(() => {
    // This effect runs whenever the active column index changes, triggering the scroll.
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const viewType = ['inbox', 'board'].includes(currentView)
      ? (currentView === 'inbox' ? 'inbox' : 'board')
      : null;

    if (!viewType) return;

    const scrollRef = viewType === 'inbox' ? inboxScrollRef : boardScrollRef;
    const activeIndex = activeColumnIndex[viewType];

    if (scrollRef.current && scrollRef.current.children.length > activeIndex) {
      const columnElement = scrollRef.current.children[activeIndex];
      if (columnElement) {
        scrollRef.current.scrollTo({
          left: columnElement.offsetLeft,
          behavior: 'smooth',
        });
      }
    }
  }, [activeColumnIndex, currentView]); // Reruns when the index or view changes

  const handlePagerDotClick = (index, viewType) => {
    setActiveColumnIndex(prev => ({ ...prev, [viewType]: index }));
  };

  const handlePagerAddClick = (viewType) => {
    const columnOrder = viewType === 'inbox' ? inboxTasks.columnOrder : currentProjectData?.columnOrder;
    if (columnOrder) {
      // Set the index to the last item, which is the "Add Column" card
      setActiveColumnIndex(prev => ({ ...prev, [viewType]: columnOrder.length }));
    }
  };

  const addInboxColumn = async (newColumn) => {
    if (!user || !newColumn.name.trim()) return;

    const currentInboxTasks = inboxTasks && inboxTasks.columnOrder && inboxTasks.columns
      ? inboxTasks
      : { columnOrder: [], columns: {} };

    const newInboxState = JSON.parse(JSON.stringify(currentInboxTasks));

    newInboxState.columnOrder.push(newColumn); // Add the new column object
    newInboxState.columns[newColumn.id] = [];  // Use the new ID as the key

    setInboxTasks(newInboxState);

    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
  };

  const renameInboxColumn = async (columnId, newName) => {
    if (!user || !newName.trim()) return;

    const newInboxState = JSON.parse(JSON.stringify(inboxTasks));
    const columnToUpdate = newInboxState.columnOrder.find(c => c.id === columnId);

    if (columnToUpdate) {
      columnToUpdate.name = newName.trim();
    }

    setInboxTasks(newInboxState);
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
  };

  const deleteInboxColumn = async (columnId) => {
    if (!user) return;

    const currentInboxTasks = inboxTasks && inboxTasks.columnOrder && inboxTasks.columns
      ? inboxTasks
      : { columnOrder: [], columns: {} };

    if (currentInboxTasks.columnOrder.length <= 1) {
      alert("You must have at least one column in the inbox.");
      return;
    }

    const newInboxState = JSON.parse(JSON.stringify(currentInboxTasks));
    newInboxState.columnOrder = newInboxState.columnOrder.filter(c => c.id !== columnId);
    delete newInboxState.columns[columnId];

    setInboxTasks(newInboxState);
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
  };

  const handleInboxDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !user || !active || active.id === over.id) return;

    const newInboxState = JSON.parse(JSON.stringify(inboxTasks));
    const { columns, columnOrder } = newInboxState;

    if (!columns || !columnOrder) return; // Added safety check

    let sourceColumnId;
    for (const col of columnOrder) {
      if (columns[col.id]?.some(task => task.id === active.id)) {
        sourceColumnId = col.id;
        break;
      }
    }

    let destColumnId = over.id;
    if (columns[destColumnId] === undefined) {
      for (const col of columnOrder) {
        if (columns[col.id]?.some(task => task.id === over.id)) {
          destColumnId = col.id;
          break;
        }
      }
    }

    if (!sourceColumnId || !destColumnId) return;

    const sourceTaskIndex = columns[sourceColumnId]?.findIndex(task => task.id === active.id);

    if (sourceTaskIndex === -1 || sourceTaskIndex === undefined) return; // Added safety check

    const [movedTask] = columns[sourceColumnId].splice(sourceTaskIndex, 1);

    if (sourceColumnId !== destColumnId) {
      movedTask.column = destColumnId;
    }

    if (!columns[destColumnId]) {
      columns[destColumnId] = []; // Added safety check
    }

    const destTaskIndex = columns[destColumnId].findIndex(task => task.id === over.id);
    if (destTaskIndex >= 0) {
      columns[destColumnId].splice(destTaskIndex, 0, movedTask);
    } else {
      columns[destColumnId].push(movedTask);
    }

    setInboxTasks(newInboxState);
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await setDoc(appDataRef, { inboxTasks: newInboxState }, { merge: true });
  };

  const moveTask = async (originalTask, editedTask) => {
    const sourceProjectId = originalTask.projectId;
    const taskIdToDelete = originalTask.id;
    const destinationProjectId = editedTask.projectId;

    if (!user || !destinationProjectId || !taskIdToDelete) {
      console.error("Move failed: Missing critical data.");
      return;
    }

    try {
      // --- Step 1: Prepare the new task data ---
      const destinationProject = projectData.flatMap(g => g.projects).find(p => p.id === destinationProjectId);
      if (!destinationProject || !destinationProject.columnOrder || destinationProject.columnOrder.length === 0) {
        throw new Error("Destination project or its columns not found!");
      }

      const destinationColumnId = destinationProject.columnOrder[0].id;

      const movedTaskData = {
        ...originalTask,
        ...editedTask,
        projectId: destinationProjectId,
        column: destinationColumnId, // Set the correct destination column ID
        isInbox: false,
      };
      delete movedTaskData.isNew;
      delete movedTaskData.isInbox;

      // --- Step 2: Perform Firestore operations in a batch ---
      const batch = writeBatch(db);

      // Delete the original task (from either a project or inbox)
      if (sourceProjectId) {
        const sourceTaskRef = doc(db, 'users', user.uid, 'projects', sourceProjectId, 'tasks', taskIdToDelete);
        batch.delete(sourceTaskRef);
      }

      // Create the new task in the destination project
      const destTaskRef = doc(db, 'users', user.uid, 'projects', destinationProjectId, 'tasks', movedTaskData.id);
      batch.set(destTaskRef, movedTaskData);

      await batch.commit();

      // --- Step 3: Update local UI state ---
      if (sourceProjectId) {
        // Task was in a project, update projectData
        setProjectData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData));

          // Remove from old project
          const oldProject = newData.flatMap(g => g.projects).find(p => p.id === sourceProjectId);
          if (oldProject) {
            for (const colId in oldProject.columns) {
              oldProject.columns[colId] = oldProject.columns[colId].filter(t => t.id !== taskIdToDelete);
            }
          }

          // Add to new project
          const newProject = newData.flatMap(g => g.projects).find(p => p.id === destinationProjectId);
          if (newProject) {
            if (!newProject.columns[destinationColumnId]) {
              newProject.columns[destinationColumnId] = [];
            }
            newProject.columns[destinationColumnId].push(movedTaskData);
          }

          return newData;
        });
      } else {
        // Task was in the inbox, update both inboxTasks and projectData
        const newInboxState = JSON.parse(JSON.stringify(inboxTasks));
        for (const colId in newInboxState.columns) {
          newInboxState.columns[colId] = newInboxState.columns[colId].filter(t => t.id !== taskIdToDelete);
        }
        setInboxTasks(newInboxState);

        setProjectData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData));
          const newProject = newData.flatMap(g => g.projects).find(p => p.id === destinationProjectId);
          if (newProject) {
            if (!newProject.columns[destinationColumnId]) {
              newProject.columns[destinationColumnId] = [];
            }
            newProject.columns[destinationColumnId].push(movedTaskData);
          }
          return newData;
        });
      }

    } catch (error) {
      console.error("A critical error occurred while moving the task:", error);
      alert("An error occurred while moving the task. Please refresh to see the correct state.");
    }
  };

  const findColumnOfTask = (taskId, project) => {
    if (!project) return null;
    for (const column of project.columnOrder) {
      if (project.columns[column.id]?.some(task => task.id === taskId)) {
        return column.id;
      }
    }
    return null;
  };

  const handleDrop = async ({ active, over }) => {
    setActiveId(null);
    if (!active || !over || !user || !currentProjectData) return;

    const projectId = currentProjectData.id;
    const fromColumnId = findColumnOfTask(active.id, currentProjectData);

    // Determine if the drop target is a column or a task within a column
    let toColumnId = over.id;
    if (!currentProjectData.columns[toColumnId]) {
      toColumnId = findColumnOfTask(over.id, currentProjectData);
    }

    if (!fromColumnId || !toColumnId) return;

    const batch = writeBatch(db);

    // CASE 1: Reordering within the same column
    if (fromColumnId === toColumnId) {
      const columnTasks = [...(currentProjectData.columns[fromColumnId] || [])];
      const oldIndex = columnTasks.findIndex(t => t.id === active.id);
      const newIndex = columnTasks.findIndex(t => t.id === over.id);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);

      // Optimistically update the UI
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData.flatMap(g => g.projects).find(p => p.id === projectId);
        if (project) {
          project.columns[fromColumnId] = reorderedTasks;
        }
        return newData;
      });

      // Update order for all tasks in the reordered array in Firestore
      reorderedTasks.forEach((task, index) => {
        const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id);
        batch.update(taskRef, { order: index * 1000 });
      });

    } else {
      // CASE 2: Moving task to a different column
      const sourceTasks = [...(currentProjectData.columns[fromColumnId] || [])];
      let destTasks = [...(currentProjectData.columns[toColumnId] || [])];

      const activeIndex = sourceTasks.findIndex(t => t.id === active.id);
      if (activeIndex === -1) return;

      const [movedTask] = sourceTasks.splice(activeIndex, 1);
      movedTask.column = toColumnId;

      let newIndexInDest = destTasks.length; // Default to end of the list
      const overIndexInDest = destTasks.findIndex(t => t.id === over.id);
      if (overIndexInDest !== -1) {
        newIndexInDest = overIndexInDest;
      }
      destTasks.splice(newIndexInDest, 0, movedTask);

      // Optimistically update the UI first with the structural change
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData.flatMap(g => g.projects).find(p => p.id === projectId);
        if (project) {
          project.columns[fromColumnId] = sourceTasks;
          project.columns[toColumnId] = destTasks;
        }
        return newData;
      });

      // Now, re-order all tasks in both affected columns and update Firestore
      const sourceUpdates = sourceTasks.map((task, index) => ({ ref: doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id), data: { order: index * 1000 } }));
      const destUpdates = destTasks.map((task, index) => ({ ref: doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id), data: { order: index * 1000 } }));

      const movedTaskUpdateRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', active.id);
      batch.update(movedTaskUpdateRef, { column: toColumnId });

      [...sourceUpdates, ...destUpdates].forEach(update => {
        batch.update(update.ref, update.data);
      });
    }

    await batch.commit();
  };

  const deleteColumn = async (columnId) => {
    if (!user || !currentProjectData) return;

    const projectId = currentProjectData.id;
    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);
    const tasksToDelete = currentProjectData.columns[columnId] || [];
    const updatedColumnOrder = currentProjectData.columnOrder.filter(c => c.id !== columnId);

    const batch = writeBatch(db);
    batch.update(projectRef, { columnOrder: updatedColumnOrder });
    tasksToDelete.forEach(task => {
      const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id);
      batch.delete(taskRef);
    });

    try {
      await batch.commit();
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData.flatMap(g => g.projects).find(p => p.id === projectId);
        if (project) {
          delete project.columns[columnId];
          project.columnOrder = updatedColumnOrder;
        }
        return newData;
      });
    } catch (error) {
      console.error("Error deleting column:", error);
    }
  };
  const handleSaveNewColumn = async (view) => {
    const trimmedName = newColumnName.trim();
    if (!trimmedName) {
      setIsAddingColumn({ inbox: false, board: false });
      setNewColumnName('');
      return;
    }

    // Create a new column object with a unique ID and a display name
    const newColumn = { id: generateUniqueId(), name: trimmedName };

    try {
      if (view === 'inbox') {
        await addInboxColumn(newColumn);
      } else { // This is for the project board
        if (!user || !currentProjectData) return;

        const projectId = currentProjectData.id;
        const updatedColumnOrder = [...currentProjectData.columnOrder, newColumn];
        const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

        await updateDoc(projectRef, { columnOrder: updatedColumnOrder });

        // Optimistically update local state
        setProjectData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData));
          const project = newData
            .flatMap(g => g.projects)
            .find(p => p.id === projectId);
          if (project) {
            project.columnOrder = updatedColumnOrder;
            project.columns[newColumn.id] = []; // Use the new ID as the key
          }
          return newData;
        });
      }

      // On success, reset the state
      setIsAddingColumn({ inbox: false, board: false });
      setNewColumnName('');
    } catch (error) {
      console.error("Failed to add column:", error);
      alert("Could not add the new column. Please try again.");
    }
  };
  // Helper to find a task object given its id
  const handleListDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !user || active.id === over.id) {
      return;
    }

    const activeTask = findTaskById(active.id);
    const overTask = findTaskById(over.id);

    if (!activeTask || !overTask || !activeTask.projectId || activeTask.projectId !== overTask.projectId) {
      return; // Abort if tasks are invalid or in different projects
    }

    const projectId = activeTask.projectId;
    const project = projectData.flatMap(g => g.projects).find(p => p.id === projectId);
    if (!project) return;

    // Get all tasks for this project in a single, sorted array
    const allProjectTasks = Object.values(project.columns || {})
      .flat()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIndex = allProjectTasks.findIndex(t => t.id === active.id);
    const newIndex = allProjectTasks.findIndex(t => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = arrayMove(allProjectTasks, oldIndex, newIndex);

    // Identify which tasks need their 'order' property updated
    const updates = [];
    reorderedTasks.forEach((task, index) => {
      const newOrder = index * 1000; // Use stable, spaced-out integer ordering
      if (task.order !== newOrder) {
        updates.push({ taskId: task.id, newOrder: newOrder });
      }
    });

    // Only proceed if there are actual changes to save
    if (updates.length === 0) return;

    // Optimistically update the UI
    setProjectData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const projectToUpdate = newData.flatMap(g => g.projects).find(p => p.id === projectId);
      if (projectToUpdate) {
        updates.forEach(({ taskId, newOrder }) => {
          for (const colId in projectToUpdate.columns) {
            const task = projectToUpdate.columns[colId].find(t => t.id === taskId);
            if (task) {
              task.order = newOrder;
              break;
            }
          }
        });
      }
      return newData;
    });

    // Update Firestore in a single batch
    const batch = writeBatch(db);
    updates.forEach(({ taskId, newOrder }) => {
      const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', taskId);
      batch.update(taskRef, { order: newOrder });
    });
    await batch.commit();
  };
  const findTaskById = (taskId) => {
    // Search within projects
    for (const group of projectData) {
      for (const project of group.projects) {
        for (const column of Object.values(project.columns)) {
          const found = column.find(task => task.id === taskId);
          if (found) return found;
        }
      }
    }

    // Search within the new inbox structure
    if (inboxTasks && inboxTasks.columns) {
      for (const column of Object.values(inboxTasks.columns)) {
        const found = column.find(task => task.id === taskId);
        if (found) return found;
      }
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        {/* Optional: Add a spinner here later */}
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignUp={handleSignUp} onLogin={handleLogin} logoUrl={logoUrl} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main content area that will grow and scroll internally */}
      <div className="flex flex-1 min-h-0">
        {/* --- Main Layout: Sidebar + Content --- */}
        <div className={`hidden md:flex bg-card text-card-foreground border-r flex-col h-full transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          {/* Sidebar Content */}
          <div className="flex items-center justify-between p-4 border-b">
            <img src={logoUrl} alt="Rocket Productivity" className={`h-8 w-auto transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`} />
            <button
              className="p-1 rounded-md hover:bg-muted"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="Toggle Sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-2">
            {mainNavItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  title={item.title}
                  className={`flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${currentView === item.view ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  onClick={() => setCurrentView(item.view)}
                >
                  <Icon className="h-5 w-5" />
                  <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>{item.title}</span>
                </button>
              );
            })}
          </nav>
          <div
            className={`flex items-center justify-between p-2 mx-1 rounded-md cursor-pointer transition-colors ${currentView === 'projects' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
            onClick={() => setCurrentView('projects')}
          >
            <div className="flex items-center">
              <FolderKanban className="h-5 w-5" />
              <h3 className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Projects</h3>
            </div>
            <button
              className={`p-1 rounded-md hover:bg-muted transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}
              onClick={(e) => { e.stopPropagation(); handleAddProject(); }}
              title="Add New Project"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {!isSidebarCollapsed && (
              <DndContext sensors={sensors} onDragEnd={handleSidebarDragEnd}>
                {(projectData || []).map((group) => (
                  <div key={group.name}>
                    <h4 className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.name}
                    </h4>
                    <SortableContext items={group.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {group.projects.map(project => (
                        <SortableProjectItem
                          key={project.id}
                          id={project.id}
                        >
                          <div
                            className={`flex items-center justify-between w-full text-left p-2 rounded-md cursor-pointer transition-colors text-sm ${currentView === 'board' && currentProject === project.name && currentGroup === group.name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                            onClick={() => {
                              setCurrentView('board');
                              setCurrentGroup(group.name);
                              setCurrentProject(project.name);
                            }}
                          >
                            <span className="whitespace-nowrap">
                              {project.name}
                            </span>
                            <button
                              className="p-1 rounded-md hover:bg-muted"
                              title="Edit Project"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToEdit(project);
                                setShowProjectDetailPanel(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </SortableProjectItem>
                      ))}
                    </SortableContext>
                  </div>
                ))}
              </DndContext>
            )}
          </div>
          <div className="mt-auto p-2">
            <button
              title="Settings"
              className={`flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              onClick={() => setCurrentView('settings')}
            >
              <Settings className="h-5 w-5" />
              <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Settings</span>
            </button>
            <button
              title="Logout"
              className="flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Logout</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}
          <div className="w-full shrink-0 px-6 py-4 border-b bg-card flex items-center justify-between">
            <button className="md:hidden rounded-md p-2 hover:bg-muted" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>}
            </button>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = viewIcons[currentView];
                return Icon ? <Icon className="h-6 w-6 text-muted-foreground" /> : null;
              })()}
              <h1 className="text-xl font-bold tracking-tight">
                {currentView === 'board' && currentProject
                  ? currentProject
                  : currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1').trim()
                }
              </h1>

            </div>
            <div className="flex items-center gap-2">
              {/* Universal View Switcher */}
              {canBeToggled && (
                <div className="hidden md:flex items-center bg-muted p-1 rounded-md">
                  <button
                    className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${getViewOption(viewKey, 'mode', 'board') === 'board' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}`}
                    onClick={() => setViewOption(viewKey, 'mode', 'board')}
                    title="Board View"
                  >
                    Board
                  </button>
                  <button
                    className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${getViewOption(viewKey, 'mode', 'board') === 'list' ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50'}`}
                    onClick={() => setViewOption(viewKey, 'mode', 'list')}
                    title="List View"
                  >
                    List
                  </button>
                </div>
              )}

              {/* Conditionally render GROUP BY controls based on the current view */}
              {getViewOption(viewKey, 'mode', 'board') === 'list' && (
                <>
                  {/* Controls for Global List Views (Today, This Week, etc.) */}
                  {['today', 'tomorrow', 'thisWeek', 'nextWeek'].includes(currentView) && (
                    <ViewControls
                      groupByOptions={[
                        { value: 'project', label: 'Project' },
                        { value: 'priority', label: 'Priority' },
                        { value: 'dueDate', label: 'Due Date' },
                      ]}
                      selectedGroupBy={getViewOption(viewKey, 'groupBy', 'project')}
                      onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
                    />
                  )}
                  {/* Controls for Project-Specific List View */}
                  {currentView === 'board' && (
                    <ViewControls
                      groupByOptions={[
                        { value: 'manual', label: 'Manual' },
                        { value: 'column', label: 'Column' },
                        { value: 'priority', label: 'Priority' },
                        { value: 'dueDate', label: 'Due Date' },
                      ]}
                      selectedGroupBy={getViewOption(viewKey, 'groupBy', 'manual')}
                      onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
                    />
                  )}
                </>
              )}

              {/* Add Task Button */}
              {currentView === 'board' && currentProjectData && (
                <Button className="hidden md:flex items-center gap-2" onClick={() => setModalTask({ isNew: true, projectId: currentProjectData.id })}>
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </Button>
              )}

              {/* Timer Section */}
              {!timerIsRunning && timerTime === timerInputTime * 60 ? (
                <Button variant="outline" className="hidden md:flex items-center gap-2" onClick={() => setShowTimerModal(true)}>
                  <Clock className="h-4 w-4" />
                  <span>Timer</span>
                </Button>
              ) : (
                <div className="hidden md:flex items-center gap-1 bg-muted text-muted-foreground px-3 py-1 rounded-md text-sm font-mono">
                  <span>{formatTime(timerTime)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={timerIsRunning ? handlePauseTimer : handleResumeTimer}
                  >
                    {timerIsRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTimerModal(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelTimer}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Calendar Button */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2"
                onClick={() => {
                  const isMobile = window.innerWidth < 768;
                  if (isMobile) {
                    setShowCalendar(true);
                    setIsCalendarMaximized(true);
                  } else {
                    setShowCalendar(!showCalendar);
                  }
                }}
              >
                <Calendar className="h-4 w-4" />
                <span>Calendar</span>
              </Button>

              {/* Mobile Dropdown */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentView === 'board' && currentProjectData && (
                      <DropdownMenuItem onClick={() => setModalTask({ isNew: true, projectId: currentProjectData.id })}>
                        <Plus className="h-4 w-4 mr-2" />
                        <span>Add Task</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowTimerModal(true)}>
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{timerIsRunning ? `Timer: ${formatTime(timerTime)}` : "Timer"}</span>
                    </DropdownMenuItem>
                    {canBeToggled && (
                      getViewOption(viewKey, 'mode', 'board') === 'board'
                        ? (
                          <DropdownMenuItem onClick={() => setViewOption(viewKey, 'mode', 'list')}>
                            <span>Switch to List View</span>
                          </DropdownMenuItem>
                        )
                        : (
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
          <div className="flex-1 flex min-h-0 min-w-0">
            {/* Conditionally render the main content ONLY if calendar is not maximized */}
            {!isCalendarMaximized && (
              <div className="flex-1 overflow-auto min-h-0">
                {renderContent()}
              </div>
            )}

            {/* The Calendar Panel */}
            {showCalendar && (
              <div className={cn(
                "transition-all duration-300 bg-card border-l",
                isCalendarMaximized ? "flex-1" : "shrink-0 w-[32rem]"
              )}>
                <Suspense fallback={<div className="p-4"><h2>Loading Calendar...</h2></div>}>
                  <CalendarPanel
                    isMaximized={isCalendarMaximized}
                    onToggleMaximize={() => {
                      const isMobile = window.innerWidth < 768;
                      if (isMobile) {
                        setShowCalendar(false);
                        setIsCalendarMaximized(false);
                      } else {
                        setIsCalendarMaximized(!isCalendarMaximized);
                      }
                    }}
                    calendarEvents={calendarEvents}
                    setCalendarEvents={setCalendarEvents}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The BottomNav is part of the main vertical flex container */}
      <BottomNav
        currentView={currentView}
        onNavigate={handleNavigation}
        onShowCalendar={() => handleNavigation('calendar')}
      />

      {/* MODALS AND OVERLAYS are now at the top level to float over everything */}
      {isFabVisible && <FAB onClick={handleFabClick} />}
      {modalTask && (
        <Suspense fallback={<div>Loading...</div>}>
          <TaskDetailPanel
            task={modalTask}
            onClose={() => setModalTask(null)}
            onUpdate={handleTaskUpdate}
            onMoveTask={moveTask}
            availableLabels={projectLabels}
            user={user}
            db={db}
            projectColumns={currentProjectData?.columnOrder || []}
            allProjects={projectData}
          />
        </Suspense>
      )}
      {showProjectDetailPanel && projectToEdit && (
        <Suspense fallback={<div>Loading...</div>}>
          <ProjectDetailPanel
            project={projectToEdit}
            user={user}
            db={db}
            onClose={() => setShowProjectDetailPanel(false)}
            onUpdate={(updatedData) => {
              handleSaveProjectEdit(projectToEdit, updatedData)
            }}
            allGroups={(projectData || []).map(g => g.name)}
            onTagUpdate={handleTagUpdate}
          />
        </Suspense>
      )}
      <NewProjectModal
        show={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSave={handleCreateProject}
        groups={(projectData || []).map(g => g.name)}
      />
      {showTimerModal && (
        <TimerModal
          onClose={() => setShowTimerModal(false)}
          time={timerTime}
          setTime={setTimerTime}
          inputTime={timerInputTime}
          setInputTime={setTimerInputTime}
          isRunning={timerIsRunning}
          onStart={handleStartTimer}
          onPause={handlePauseTimer}
          onResume={handleResumeTimer}
          onReset={handleResetTimer}
          formatTime={formatTime}
        />
      )}
      {showTimerCompleteModal && (
        <TimerCompleteModal
          onClose={() => {
            const chime = document.getElementById('timer-chime');
            if (chime) {
              chime.pause();
              chime.currentTime = 0;
            }
            setShowTimerCompleteModal(false);
            handleResetTimer();
          }}
        />
      )}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        projectData={projectData}
        onSelectProject={(groupName, projectName) => {
          setCurrentView('board');
          setCurrentGroup(groupName);
          setCurrentProject(projectName);
        }}
        onEditProject={(project) => {
          setProjectToEdit(project);
          setShowProjectDetailPanel(true);
        }}
        onAddProject={() => setShowNewProjectModal(true)}
      />
      <audio id="timer-chime" src={timerChime} preload="auto"></audio>
    </div>
  );
}

export default App;