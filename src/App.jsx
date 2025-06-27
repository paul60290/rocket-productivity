// App.jsx

import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { DndContext, DragOverlay, useDroppable, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import './App.css';
const GoalsPage = lazy(() => import('./components/GoalsPage'));
const CalendarPanel = lazy(() => import('./components/CalendarPanel'));
const TaskDetailPanel = lazy(() => import('./components/TaskDetailPanel'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const ProjectsPage = lazy(() => import('./components/ProjectsPage'));
import Auth from './Auth';
import NewProjectModal from './components/NewProjectModal';
import SortableProjectItem from './components/SortableProjectItem';
import logoUrl from './assets/logo.svg';
import goalsIconUrl from './assets/goals-icon.svg';
import todayIconUrl from './assets/today-icon.svg';
import inboxIconUrl from './assets/inbox-icon.svg';
import tomorrowIconUrl from './assets/tomorrow-icon.svg';
import thisWeekIconUrl from './assets/this-week-icon.svg';
import nextWeekIconUrl from './assets/next-week-icon.svg';
import projectsIconUrl from './assets/projects-icon.svg';
import settingsIconUrl from './assets/settings-icon.svg';
import logoutIconUrl from './assets/logout-icon.svg';
import { auth, db } from './firebase';
import {
  // Authentication
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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

// === SECTION: Label & Group Management Modal ===
function ManagerModal({ groups, labels, onClose, onUpdateLabels, onAddGroup, onRenameGroup, onDeleteGroup }) {
  const [activeTab, setActiveTab] = useState('labels');
  const [editedLabels, setEditedLabels] = useState(labels.map(label => ({ ...label, showPicker: false })));
  const [newLabel, setNewLabel] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState({ name: null, newName: '' });

  const colorOptions = [
    { name: 'Scarlet Red', value: '#c92a2a' }, { name: 'Crimson', value: '#801515' },
    { name: 'Sky Blue', value: '#228be6' }, { name: 'Navy', value: '#0b3d91' },
    { name: 'Tangerine', value: '#f76707' }, { name: 'Burnt Orange', value: '#b34700' },
    { name: 'Goldenrod', value: '#f59f00' }, { name: 'Mustard', value: '#a87900' },
    { name: 'Emerald', value: '#40c057' }, { name: 'Forest Green', value: '#1e7d32' },
    { name: 'Lavender', value: '#9c36b5' }, { name: 'Royal Purple', value: '#5e2b97' },
    { name: 'Rose', value: '#f06595' }, { name: 'Mulberry', value: '#b03060' }
  ];
  const addLabel = () => {
    const cleaned = newLabel.trim();
    if (cleaned && !editedLabels.some(l => l.name === cleaned)) {
      setEditedLabels([...editedLabels, { name: cleaned, emoji: '', color: '#007bff', showPicker: false }]);
      setNewLabel('');
    }
  };
  const removeLabel = (labelToRemove) => {
    setEditedLabels(editedLabels.filter(label => label.name !== labelToRemove.name));
  };

  const handleStartEditGroup = (groupName) => {
    setEditingGroup({ name: groupName, newName: groupName });
  };

  const handleSaveGroupRename = () => {
    if (editingGroup.name && editingGroup.newName.trim()) {
      onRenameGroup(editingGroup.name, editingGroup.newName.trim());
    }
    setEditingGroup({ name: null, newName: '' });
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-tabs">
          <button className={activeTab === 'labels' ? 'active' : ''} onClick={() => setActiveTab('labels')}>Labels</button>
          <button className={activeTab === 'groups' ? 'active' : ''} onClick={() => setActiveTab('groups')}>Groups</button>
        </div>
        <div className="modal-scroll-body">
          {activeTab === 'labels' && (
             <>
              <div className="label-list">
                {editedLabels.map((label, index) => (
                  <div key={index} className="label-item">
                    <input type="text" placeholder="Label name" value={label.name} onChange={(e) => {
                      const updated = [...editedLabels];
                      updated[index] = { ...label, name: e.target.value };
                      setEditedLabels(updated);
                    }}/>
                    <div className="label-color-control">
                      <div className="color-display" style={{ backgroundColor: label.color }} onClick={() => {
                        const updated = [...editedLabels];
                        updated[index] = { ...updated[index], showPicker: !updated[index].showPicker };
                        setEditedLabels(updated);
                      }}></div>
                      {label.showPicker && (
                        <div className="color-list">
                          {colorOptions.map((option) => (
                            <div key={option.value} className="color-option-row" onClick={() => {
                              const updated = [...editedLabels];
                              updated[index] = { ...updated[index], color: option.value, showPicker: false };
                              setEditedLabels(updated);
                            }}>
                              <span className="color-circle" style={{ backgroundColor: option.value }}>
                                {label.color === option.value && <span className="checkmark">✓</span>}
                              </span>
                              <span className="color-name">{option.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeLabel(label)} className="remove-btn">×</button>
                  </div>
                ))}
              </div>
              <div className="add-label">
                <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} placeholder="Add new label..."/>
                <button onClick={addLabel}>Add</button>
              </div>
            </>
          )}
          {activeTab === 'groups' && (
            <>
              <div className="label-list">
                {groups.map((groupName) => (
                  <div key={groupName} className="label-item">
                    {editingGroup.name === groupName ? (
                      <input type="text" value={editingGroup.newName}
                        onChange={(e) => setEditingGroup({ ...editingGroup, newName: e.target.value })}
                        onBlur={handleSaveGroupRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveGroupRename()}
                        autoFocus
                      />
                    ) : (
                      <span onDoubleClick={() => handleStartEditGroup(groupName)} title="Double-click to rename">{groupName}</span>
                    )}
                    <div>
                      {groupName !== 'Ungrouped' && (
                        <>
                          <button onClick={() => handleStartEditGroup(groupName)} className="edit-project-btn" title="Rename Group">✏️</button>
                          <button onClick={() => onDeleteGroup(groupName)} className="remove-btn" title="Delete Group">×</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="add-label">
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Create new group..."
                  onKeyDown={(e) => {if(e.key === 'Enter'){ onAddGroup(newGroupName.trim()); setNewGroupName('');}}}
                />
                <button onClick={() => { onAddGroup(newGroupName.trim()); setNewGroupName('');}}>Add Group</button>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => { onUpdateLabels(editedLabels); onClose(); }} className="save-btn">Save Changes</button>
        </div>
      </div>
    </div>
  );
}



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
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={`editable-input ${className}`}
      />
    );
  }

  return (
    <span 
      className={`editable-title ${className}`}
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {title}
    </span>
  );
}
function Column({ title, tasks = [], onAddTask, onUpdateTask, onOpenTask, onRenameColumn, onDeleteColumn, isEditable = true, availableLabels }) {

  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const inputRef = useRef(null);
// === SORT TASKS BY PRIORITY (1 = highest) ===
const sortedTasks = Array.isArray(tasks)
  ? [...tasks].sort((a, b) => a.priority - b.priority)
  : [];

  const { setNodeRef } = useDroppable({ id: title });

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    
    // Create a task object WITHOUT a client-side ID.
    // Firestore will generate the one and only ID.
    const taskData = {
      text: newTask.trim(),
      completed: false,
      date: '',
      priority: 4,
      label: '',
      description: '',
      comments: [],
      subtasks: []
    };
    
    onAddTask(title, taskData);
    setNewTask('');
    setAdding(false);
  };

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }

    const closeInput = (e) => {
      const taskInputContainer = inputRef.current?.parentElement;
      if (taskInputContainer && !taskInputContainer.contains(e.target)) {
        setAdding(false);
        setNewTask('');
      }
    };

    if (adding) {
      document.addEventListener('mousedown', closeInput);
    }
    
    return () => document.removeEventListener('mousedown', closeInput);
  }, [adding]);

  return (
    <div className="column" ref={setNodeRef}>
      <div className="column-header">
  <EditableTitle
    title={title}
    onUpdate={onRenameColumn}
    className="column-title"
  />
  {isEditable && (
    <button
      className="delete-column-btn"
      onClick={() => onDeleteColumn(title)}
    >
      🗑️
    </button>
  )}
</div>
           <div className="task-list">
  <SortableContext
  items={sortedTasks.map(task => task.id)}
  strategy={verticalListSortingStrategy}
>
  {sortedTasks.map((task, index) => (
    <SortableTask
      key={task.id}
      task={task}
      onComplete={() => onUpdateTask(title, task.id, null)}
      onClick={() => onOpenTask(task)}
      availableLabels={availableLabels}
    />
  ))}
</SortableContext>
</div>


      {isEditable && (adding ? (
        <div className="task-input">
          <input
            ref={inputRef}
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Type your task..."
          />
          <button onClick={handleAddTask}>Add</button>
        </div>
      ) : (
        <button className="add-task-btn" onClick={() => setAdding(true)}>
          + Add Task
        </button>
      ))}
    </div>
  );
}

// === SECTION: Task Item Components ===

// 1. Presentational Component (The Visuals)
const TaskItem = React.forwardRef(({ task, availableLabels, onComplete, onClick, listeners, ...props }, ref) => {
  const priorityColors = { 1: '#ff4444', 2: '#ff8800', 3: '#ffdd00', 4: '#88cc88' };

  const handleRadioClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if(onComplete) onComplete();
  };
  
  const handleTextClick = (e) => {
    e.stopPropagation();
    if(onClick) onClick();
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // By adding 'T00:00:00', we specify that the date string is in the local timezone,
    // which prevents the off-by-one day error.
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString();
  };

  return (
    // We now apply a single onClick handler to the entire card.
    <div ref={ref} {...props} onClick={onClick} className={`task-card ${task.completed ? 'completed' : ''}`}>
      {/* This is the new drag handle. The listeners are applied ONLY here. */}
      <div className="drag-handle" {...listeners}>
        <svg viewBox="0 0 20 20" width="12"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" fill="currentColor"></path></svg>
      </div>
      <input
        type="radio"
        className="complete-btn"
        onMouseDown={handleRadioClick}
        onChange={() => {}}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="task-content" onClick={handleTextClick}>
        <span className="task-text">
          {task.text}
        </span>
        {(task.date || task.label) && (
          <div className="task-meta">
            {task.date && <span className="task-date">{formatDate(task.date)}</span>}
            {task.label && (() => {
              const label = availableLabels?.find(l => l.name === task.label);
              return label ? (
                <span className="task-label" style={{ backgroundColor: label.color || '#007bff' }}>
                  {label.emoji ? `${label.emoji} ` : ''}{label.name}
                </span>
              ) : null;
            })()}
            {task.comments?.length > 0 && (
              <span className="task-comment-count">💬 {task.comments.length}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});


// 2. Sortable Logic Component (The DnD Logic)
function SortableTask({ task, onComplete, onClick, availableLabels }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const priorityColors = { 1: '#ff4444', 2: '#ff8800', 3: '#ffdd00', 4: '#88cc88' };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeft: `4px solid ${priorityColors[task.priority] || '#88cc88'}`
  };

  return (
    <TaskItem
      ref={setNodeRef}
      style={style}
      task={task}
      availableLabels={availableLabels}
      onComplete={onComplete}
      onClick={onClick}
      listeners={listeners} // Pass listeners as a separate prop
      {...attributes}
    />
  );
}

// === SECTION: Today View Component ===
function TodayView({ projects, onUpdateTask, onOpenTask, availableLabels }) {
  const today = new Date().toISOString().split('T')[0];
  
  // Group today's tasks by project
  const todaysTasksByProject = {};

  // Correctly loop over the array of groups and nested array of projects
  projects.forEach(group => {
    group.projects.forEach(project => {
      Object.values(project.columns).flat().forEach(task => {
        if (task.date === today) {
          if (!todaysTasksByProject[project.name]) {
            todaysTasksByProject[project.name] = [];
          }
          todaysTasksByProject[project.name].push({ ...task, projectId: project.id });
        }
      });
    });
  });

Object.values(todaysTasksByProject).forEach(tasks =>
  tasks.sort((a, b) => a.priority - b.priority)
);


if (Object.keys(todaysTasksByProject).length === 0) {
  return (
    <div className="today-view">
      <h1>Today's Schedule</h1>
      <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '2rem' }}>
        💤 Nothing Scheduled Today
      </p>
    </div>
  );
}

  return (
    <div className="today-view">
      <h1>Today's Tasks</h1>
      <div className="today-columns">
        {Object.entries(todaysTasksByProject).map(([projectName, tasks]) => (
          <Column
            key={projectName}
            title={projectName}
            tasks={tasks}
            onAddTask={() => {}}
            onUpdateTask={(col, taskId, updatedTask) => {
              const task = tasks.find(t => t.id === taskId);
              if (task && task.projectId) {
                onUpdateTask(task.projectId, taskId, updatedTask);
              }
            }}
            onOpenTask={(task) => setModalTask({ ...task, projectId: task.projectId })}
            isEditable={false}
            availableLabels={availableLabels}
          />
        ))}
      </div>
    </div>
  );
}
// === SECTION: Tomorrow View Component ===
function TomorrowView({ projects, onUpdateTask, onOpenTask, availableLabels }) {
  const today = new Date();
  const tomorrowDate = new Date(today.setDate(today.getDate() + 1))
    .toISOString()
    .split('T')[0];

  // Group tomorrow’s tasks by project
  const tasksByProject = {};

  // Correctly loop over the array of groups and nested array of projects
  projects.forEach(group => {
    group.projects.forEach(project => {
      Object.values(project.columns).flat().forEach(task => {
        if (task.date === tomorrowDate) {
          if (!tasksByProject[project.name]) {
            tasksByProject[project.name] = [];
          }
          tasksByProject[project.name].push({ ...task, projectId: project.id });
        }
      });
    });
  });

  // Sort each project’s task list by priority
  Object.values(tasksByProject).forEach(list =>
    list.sort((a, b) => a.priority - b.priority)
  );

  if (Object.keys(tasksByProject).length === 0) {
    return (
      <div className="today-view">
        <h1>Tomorrow’s Tasks</h1>
        <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '2rem' }}>
          💤 Nothing Scheduled Tomorrow
        </p>
      </div>
    );
  }

  return (
    <div className="today-view">
      <h1>Tomorrow’s Tasks</h1>
      <div className="today-columns">
        {Object.entries(tasksByProject).map(([projectName, tasks]) => (
          <Column
            key={projectName}
            title={projectName}
            tasks={tasks}
            onAddTask={() => {}}
            onUpdateTask={(col, taskId, updatedTask) => {
              const task = tasks.find(t => t.id === taskId);
              if (task && task.projectId) {
                onUpdateTask(task.projectId, taskId, updatedTask);
              }
            }}
            onOpenTask={onOpenTask}
            isEditable={false}
            availableLabels={availableLabels}
          />
        ))}
      </div>
    </div>
  );
}
// === SECTION: This Week View Component ===
function ThisWeekView({ projects, onUpdateTask, onOpenTask, availableLabels }) {
  const now = new Date();
  // Calculate Monday of current week
  const day = now.getDay(); // Sunday = 0
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  // Calculate Sunday of current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const tasksByProject = {};

  // Correctly loop over the array of groups and nested array of projects
  projects.forEach(group => {
    group.projects.forEach(project => {
      Object.values(project.columns).flat().forEach(task => {
        if (task.date >= weekStartStr && task.date <= weekEndStr) {
          if (!tasksByProject[project.name]) {
            tasksByProject[project.name] = [];
          }
          tasksByProject[project.name].push({ ...task, projectId: project.id });
        }
      });
    });
  });

  Object.values(tasksByProject).forEach(list =>
    list.sort((a, b) => a.priority - b.priority)
  );

  if (Object.keys(tasksByProject).length === 0) {
    return (
      <div className="today-view">
        <h1>This Week’s Tasks</h1>
        <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '2rem' }}>
          🗓️ Nothing Scheduled This Week
        </p>
      </div>
    );
  }

  return (
    <div className="today-view">
      <h1>This Week’s Tasks</h1>
      <div className="today-columns">
        {Object.entries(tasksByProject).map(([proj, tasks]) => (
          <Column
            key={proj}
            title={proj}
            tasks={tasks}
            onAddTask={() => {}}
            onUpdateTask={(col, taskId, updatedTask) => {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.projectId) {
              onUpdateTask(task.projectId, taskId, updatedTask);
            }
          }}
            onOpenTask={onOpenTask}
            isEditable={false}
            availableLabels={availableLabels}
          />
        ))}
      </div>
    </div>
  );
}

// === SECTION: Next Week View Component ===
function NextWeekView({ projects, onUpdateTask, onOpenTask, availableLabels }) {
  const now = new Date();
  // Calculate Monday of current week
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset + 7); // next week Monday
  const weekStartStr = weekStart.toISOString().split('T')[0];
  // Next week Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const tasksByProject = {};
  
  // Correctly loop over the array of groups and nested array of projects
  projects.forEach(group => {
    group.projects.forEach(project => {
      Object.values(project.columns).flat().forEach(task => {
        if (task.date >= weekStartStr && task.date <= weekEndStr) {
          if (!tasksByProject[project.name]) {
            tasksByProject[project.name] = [];
          }
          tasksByProject[project.name].push({ ...task, projectId: project.id });
        }
      });
    });
  });

  Object.values(tasksByProject).forEach(list =>
    list.sort((a, b) => a.priority - b.priority)
  );

  if (Object.keys(tasksByProject).length === 0) {
    return (
      <div className="today-view">
        <h1>Next Week’s Tasks</h1>
        <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '2rem' }}>
          📅 Nothing Scheduled Next Week
        </p>
      </div>
    );
  }

  return (
    <div className="today-view">
      <h1>Next Week’s Tasks</h1>
      <div className="today-columns">
        {Object.entries(tasksByProject).map(([proj, tasks]) => (
          <Column
            key={proj}
            title={proj}
            tasks={tasks}
            onAddTask={() => {}}
            onUpdateTask={(col, taskId, updatedTask) => {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.projectId) {
              onUpdateTask(task.projectId, taskId, updatedTask);
            }
          }}
            onOpenTask={onOpenTask}
            isEditable={false}
            availableLabels={availableLabels}
          />
        ))}
      </div>
    </div>
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
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content timer-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Timer</h3>
        <div className="timer-display">{formatTime(time)}</div>
        <div className="timer-controls">
          <label>Set duration (minutes):</label>
          <input
            type="number"
            value={inputTime}
            onChange={(e) => setInputTime(parseInt(e.target.value) || 1)}
            min="1"
            max="120"
            disabled={isRunning}
          />
        </div>
        <div className="timer-buttons">
          {isRunning ? (
            <button onClick={onPause}>Pause</button>
          ) : (
            <button onClick={time > 0 && time < inputTime * 60 ? onResume : onStart}>
              {time > 0 && time < inputTime * 60 ? 'Resume' : 'Start'}
            </button>
          )}
          <button onClick={onReset}>Reset</button>
        </div>
      </div>
    </div>
  );
}
function EditProjectModal({ projectData, current, onClose, onSave }) {
  const [newName, setNewName] = useState(current.oldName);
  const [newGroup, setNewGroup] = useState(current.oldGroup);

  const groupOptions = projectData.map(g => g.name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Edit Project</h3>

        <div className="form-group">
          <label>Project Name</label>
          <input 
            type="text" 
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>

        <div className="form-group">
  <label>Project Group</label>
  <select value={newGroup} onChange={e => setNewGroup(e.target.value)}>
  {groupOptions.map(group => (
    <option key={group} value={group}>{group}</option>
  ))}
</select>

</div>


        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button 
            onClick={() => onSave({ oldGroup: current.oldGroup, oldName: current.oldName, newGroup, newName })}
            className="save-btn"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// === SECTION: Main App Component ===
function App() {
  // State for UI and Modals
  const [currentView, setCurrentView] = useState('today');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  
  // State for Data - Initialized as empty. Will be filled from Firestore.
  const [projectData, setProjectData] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [inboxTasks, setInboxTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  
  
  // State for App Logic
  const [user, setUser] = useState(null); // Will hold the logged-in user object
  const [isLoading, setIsLoading] = useState(true); // Used to show loading indicators
  const [activeId, setActiveId] = useState(null); // For drag-and-drop
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
  
  
  // State for Timer
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTime, setTimerTime] = useState(25 * 60);
  const [timerInputTime, setTimerInputTime] = useState(25);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  // Memoized value for the currently selected project data
  // This avoids re-calculating on every render and provides a single source of truth
  const currentProjectData = useMemo(() => {
    if (!currentGroup || !currentProject) {
      return null;
    }
    return projectData.find(g => g.name === currentGroup)?.projects.find(p => p.name === currentProject);
  }, [projectData, currentGroup, currentProject]);
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
          // Optional: Add a sound or notification here
          alert("Timer finished!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timerIsRunning]);

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
      
// Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user to null if logged out, or user object if logged in
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);
  // Fetch all user data when user logs in
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        setIsLoading(true);

        // 1. Fetch app-wide data first, including the order of groups
        const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
        const appDataSnap = await getDoc(appDataRef);
        const appData = appDataSnap.exists() ? appDataSnap.data() : {};

        // 1.5. Fetch Calendar Events
        const calendarEventsRef = collection(db, 'users', user.uid, 'calendarEvents');
        const calendarEventsSnap = await getDocs(calendarEventsRef);
        const fetchedCalendarEvents = calendarEventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCalendarEvents(fetchedCalendarEvents);
        
        setInboxTasks(appData.inboxTasks || []);
        setProjectLabels(appData.projectLabels || [
          { name: 'Work', emoji: '', color: '#228be6' },
          { name: 'Personal', emoji: '', color: '#40c057' }
        ]);
        const groupOrder = appData.groupOrder || []; // Get the saved group order

        // 2. Fetch all projects and their associated tasks
        const projectsCollectionRef = collection(db, 'users', user.uid, 'projects');
        const projectsSnapshot = await getDocs(projectsCollectionRef);
        let allProjects = [];

        const projectPromises = projectsSnapshot.docs.map(async (projectDoc) => {
          const project = { id: projectDoc.id, ...projectDoc.data() };
          const tasksCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tasks');
          const tasksSnapshot = await getDocs(tasksCollectionRef);
          const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const columns = {};
          project.columnOrder.forEach(colName => {
            columns[colName] = tasks.filter(task => task.column === colName) || [];
          });
          
          allProjects.push({ ...project, columns });
        });

        await Promise.all(projectPromises);

        // 3. Process the flat list of projects into an ordered, grouped structure
        const groupsMap = {};

        // Group projects by their group name
        allProjects.forEach(project => {
          const groupName = project.group || 'Ungrouped';
          if (!groupsMap[groupName]) {
            groupsMap[groupName] = [];
          }
          groupsMap[groupName].push(project);
        });

        // Sort projects within each group by their 'order' field
        for (const groupName in groupsMap) {
          groupsMap[groupName].sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        // 4. Assemble the final sorted array based on the saved groupOrder
        const finalSortedData = groupOrder
          .map(groupName => ({
            name: groupName,
            projects: groupsMap[groupName] || []
          }))
          .filter(group => groupsMap[group.name]); // Only include groups that actually exist

        // Add any groups that exist in the data but are not in groupOrder yet (e.g., new groups)
        const orderedGroupsInState = finalSortedData.map(g => g.name);
        for (const groupName in groupsMap) {
          if (!orderedGroupsInState.includes(groupName)) {
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
      // Clear all data on logout
      setProjectData([]); // Use new state setter
      setProjectLabels([]);
      setInboxTasks([]);
      setCalendarEvents([]);
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
  const handleSaveProjectEdit = async ({ oldGroup, oldName, newGroup, newName }) => {
    if (!newName.trim() || !user) return;

    let projectToMove;
  
    // Find the project and its ID from the current state
    const oldGroupData = projectData.find(g => g.name === oldGroup);
    if (oldGroupData) {
      projectToMove = oldGroupData.projects.find(p => p.name === oldName);
    }
  
    if (!projectToMove || !projectToMove.id) {
      console.error("Could not find project to update in local state.");
      return;
    }
  
    const projectId = projectToMove.id;
    const trimmedNewName = newName.trim();
  
    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);
  
    try {
      // Update the document in Firestore
      await updateDoc(projectRef, {
        name: trimmedNewName,
        group: newGroup
      });
  
      // Optimistically update the local state array
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
  
        // 1. Find and remove the project from its old group
        const oldGroupIndex = newData.findIndex(g => g.name === oldGroup);
        if (oldGroupIndex > -1) {
          newData[oldGroupIndex].projects = newData[oldGroupIndex].projects.filter(p => p.id !== projectId);
        }
  
        // 2. Prepare the updated project object
        const updatedProject = { ...projectToMove, name: trimmedNewName, group: newGroup };
  
        // 3. Find the new group and add the project to it
        const newGroupIndex = newData.findIndex(g => g.name === newGroup);
        if (newGroupIndex > -1) {
          newData[newGroupIndex].projects.push(updatedProject);
          // Sort projects in the new group by their original order
          newData[newGroupIndex].projects.sort((a, b) => a.order - b.order);
        } else {
          // If the group doesn't exist, create it and add the project
          newData.push({ name: newGroup, projects: [updatedProject] });
        }
  
        // 4. Clean up any groups that may have become empty
        return newData.filter(g => g.projects.length > 0);
      });
  
      // If the currently viewed project was the one being edited, update the view
      if (currentProject === oldName && currentGroup === oldGroup) {
        setCurrentProject(trimmedNewName);
        setCurrentGroup(newGroup);
      }
  
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project.");
    }
  
    setShowProjectEditModal(false);
    setProjectToEdit(null);
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
    if (!window.confirm(`Delete group "${groupNameToDelete}"? All projects within will be moved to 'Ungrouped'.`)) return;

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

  const renameColumn = async (oldColumnName, newColumnName) => {
    if (oldColumnName === newColumnName || !newColumnName.trim() || !user || !currentProjectData) return;
  
    const trimmedNewName = newColumnName.trim();
    const projectId = currentProjectData.id;
  
    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);
    const tasksToUpdate = currentProjectData.columns[oldColumnName] || [];
    const updatedColumnOrder = currentProjectData.columnOrder.map(col =>
      col === oldColumnName ? trimmedNewName : col
    );
  
    const batch = writeBatch(db);
    batch.update(projectRef, { columnOrder: updatedColumnOrder });
    tasksToUpdate.forEach(task => {
      const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id);
      batch.update(taskRef, { column: trimmedNewName });
    });
  
    try {
      await batch.commit();
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData
          .find(g => g.name === currentGroup)?.projects
          .find(p => p.id === projectId);
        if (project) {
          project.columns[trimmedNewName] = (project.columns[oldColumnName] || []).map(task => ({ ...task, column: trimmedNewName }));
          delete project.columns[oldColumnName];
          project.columnOrder = updatedColumnOrder;
        }
        return newData;
      });
    } catch (error) {
      console.error("Error renaming column:", error);
    }
  };
  
  const updateLabels = async (newLabels) => {
    if (!user) return;
    setProjectLabels(newLabels); // Optimistic local update
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    try {
      // Use setDoc with merge to create/update the document without overwriting other fields
      await setDoc(appDataRef, { projectLabels: newLabels }, { merge: true });
    } catch (error) {
      console.error("Error saving labels:", error);
      alert("Failed to save labels.");
    }
  };

  const addTask = async (columnName, taskData) => {
    // --- SCENARIO 1: Adding to the Inbox ---
    if (currentView === 'inbox') {
      const newInboxTasks = [...inboxTasks, taskData];
      setInboxTasks(newInboxTasks);
      if (!user) return;
      const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
      await setDoc(appDataRef, { inboxTasks: newInboxTasks }, { merge: true });
      return;
    }

    // --- SCENARIO 2: Adding to a Project Board ---
    if (!user || !currentProjectData) {
      alert("No project selected!");
      return;
    }
    
    const newTaskForFirestore = { ...taskData, column: columnName };
    try {
      const tasksCollectionRef = collection(db, 'users', user.uid, 'projects', currentProjectData.id, 'tasks');
      const newDocRef = await addDoc(tasksCollectionRef, newTaskForFirestore);

      // Optimistically update local state
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const project = newData
          .find(g => g.name === currentGroup)?.projects
          .find(p => p.id === currentProjectData.id);
        
        if (project) {
          if (!project.columns[columnName]) {
            project.columns[columnName] = [];
          }
          project.columns[columnName].push({ ...newTaskForFirestore, id: newDocRef.id });
        }
        return newData;
      });
    } catch (error) {
      console.error("Error adding task to Firestore:", error);
    }
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

  const handleTaskUpdate = async (updatedTaskData) => {
    const taskToUpdate = modalTask;
    if (!taskToUpdate || !taskToUpdate.id) return;
  
    // The modalTask object now has the projectId if it's from a project
    if (taskToUpdate.projectId) {
      await updateTask(taskToUpdate.projectId, taskToUpdate.id, updatedTaskData);
    } else {
      // It's an inbox task
      const newInboxTasks = inboxTasks.map(t =>
        t.id === taskToUpdate.id ? { ...t, ...updatedTaskData } : t
      );
      setInboxTasks(newInboxTasks);
      if (user) {
        const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
        await setDoc(appDataRef, { inboxTasks: newInboxTasks }, { merge: true });
      }
    }
    setModalTask(null);
  };

  const findColumnOfTask = (taskId) => {
    if (!currentProjectData) return null;
    for (const [colName, tasks] of Object.entries(currentProjectData.columns)) {
      if (tasks.some(task => task.id === taskId)) {
        return colName;
      }
    }
    return null;
  };

  const handleDrop = async ({ active, over }) => {
    setActiveId(null);
    if (!active || !over || !over.id || !user || !currentProjectData) return;
  
    const fromColumn = findColumnOfTask(active.id);
    // The drop target `over` can be a column or another task.
    const toColumn = findColumnOfTask(over.id) || (currentProjectData.columns[over.id] ? over.id : null);
  
    if (!fromColumn || !toColumn || fromColumn === toColumn) {
      return; // No valid move occurred
    }
  
    // Update Firestore
    const taskRef = doc(db, 'users', user.uid, 'projects', currentProjectData.id, 'tasks', active.id);
    await updateDoc(taskRef, { column: toColumn });
  
    // Optimistically update local state
    setProjectData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const project = newData
        .find(g => g.name === currentGroup)?.projects
        .find(p => p.id === currentProjectData.id);

      if (project) {
        const taskIndex = project.columns[fromColumn].findIndex(t => t.id === active.id);
        if (taskIndex > -1) {
          const [taskToMove] = project.columns[fromColumn].splice(taskIndex, 1);
          taskToMove.column = toColumn;
          if (!project.columns[toColumn]) {
            project.columns[toColumn] = [];
          }
          project.columns[toColumn].unshift(taskToMove);
        }
      }
      return newData;
    });
  };

const deleteColumn = async (colName) => {
    if (!window.confirm(`Delete column "${colName}" and all its tasks? This cannot be undone.`) || !user || !currentProjectData) return;

    const projectId = currentProjectData.id;
    const projectRef = doc(db, 'users', user.uid, 'projects', projectId);
    const tasksToDelete = currentProjectData.columns[colName] || [];
    const updatedColumnOrder = currentProjectData.columnOrder.filter(name => name !== colName);

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
            const project = newData
              .find(g => g.name === currentGroup)?.projects
              .find(p => p.id === projectId);
            if (project) {
                delete project.columns[colName];
                project.columnOrder = updatedColumnOrder;
            }
            return newData;
        });
    } catch (error) {
        console.error("Error deleting column:", error);
    }
  };
// Helper to find a task object given its id
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
    // Search within inbox
    const foundInInbox = inboxTasks.find(task => task.id === taskId);
    if (foundInInbox) return foundInInbox;

    return null;
  };

  const renderContent = () => {
    if (isLoading) {
    return <div style={{ padding: 20 }}><h2>Loading...</h2></div>;
  }
   switch (currentView) {
  case 'projects':
  return (
    <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Projects...</h2></div>}>
      <ProjectsPage 
        projectData={projectData}
        onSelectProject={(groupName, projectName) => {
  setCurrentGroup(groupName);
  setCurrentProject(projectName);
  setCurrentView('board'); // <-- ADD THIS LINE
}}
      />
    </Suspense>
  );
  case 'settings':
    return (
      <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Settings...</h2></div>}>
        <SettingsPage
          initialLabels={projectLabels}
          initialGroups={projectData.map(g => g.name)}
          onUpdateLabels={updateLabels}
          onAddGroup={handleAddGroup}
          onRenameGroup={handleRenameGroup}
          onDeleteGroup={handleDeleteGroup}
        />
      </Suspense>
    );
  case 'goals':
    return (
      <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Page...</h2></div>}>
        <GoalsPage />
      </Suspense>
    );
  case 'today':
    return (
      <TodayView 
        projects={projectData}
        onUpdateTask={updateTask}
        onOpenTask={(task) => setModalTask(task)}
        availableLabels={projectLabels}
      />
    );
  case 'tomorrow':
    return (
      <TomorrowView
        projects={projectData}
        onUpdateTask={updateTask}
        onOpenTask={(task) => setModalTask(task)}
        availableLabels={projectLabels}
      />
    );
  case 'thisWeek':
    return (
      <ThisWeekView
        projects={projectData}
        onUpdateTask={updateTask}
        onOpenTask={(task) => setModalTask(task)}
        availableLabels={projectLabels}
      />
    );
  case 'nextWeek':
    return (
      <NextWeekView
        projects={projectData}
        onUpdateTask={updateTask}
        onOpenTask={(task) => setModalTask(task)}
        availableLabels={projectLabels}
      />
    );
  case 'inbox':
    return (
      <div className="inbox-view">
        <h1>Capture Your Tasks</h1>
        <Column
          title="Quick Capture"
          tasks={inboxTasks}
          onAddTask={addTask}
          onUpdateTask={() => {}}
          onOpenTask={(task) => {
            console.log("Opening task from inbox:", task);
            setModalTask({ ...task });
          }}
          onRenameColumn={() => {}} // Inbox column name is not editable
          availableLabels={projectLabels}
        />
      </div>
    );
  default:
    const activeTask = activeId ? findTaskById(activeId) : null;

    if (!currentProjectData) {
      // If no project is selected, show a welcome/instructional message.
      return (
        <div style={{ padding: 20 }}>
          <h2>Welcome to Rocket Productivity!</h2>
          <p>Select a project from the sidebar to get started, or create a new one.</p>
        </div>
      );
    }

    return (
      <DndContext
        onDragStart={event => setActiveId(event.active.id)}
        onDragEnd={event => { handleDrop(event); setActiveId(null); }}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board">
          {currentProjectData.columnOrder.map((colName) => (
            <Column
              key={colName}
              title={colName}
              tasks={currentProjectData.columns[colName] || []}
              onAddTask={addTask}
              onUpdateTask={(column, taskId, updatedTask) => {
                // Pass the project's Firestore ID, not its name or group
                updateTask(currentProjectData.id, taskId, updatedTask);
              }}
              onOpenTask={(task) => {
                console.log("Opening task from project board:", task);
                setModalTask({ ...task, projectId: currentProjectData.id });
              }}
              onRenameColumn={(newName) => renameColumn(colName, newName)}
              onDeleteColumn={deleteColumn}
              availableLabels={projectLabels}
            />
          ))}

          {/* ← Add‐Column placeholder at end */}
          <button
            className="add-column-btn add-column-placeholder"
            onClick={async () => {
              const name = prompt("Enter new column name:");
              if (!name || !name.trim() || !user || !currentProjectData) return;

              const colName = name.trim();
              const projectId = currentProjectData.id;

              if (currentProjectData.columnOrder.includes(colName)) {
                alert("Column already exists.");
                return;
              }

              const updatedColumnOrder = [...currentProjectData.columnOrder, colName];
              const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

              try {
                await updateDoc(projectRef, { columnOrder: updatedColumnOrder });
                setProjectData(prevData => {
                  const newData = JSON.parse(JSON.stringify(prevData));
                  const project = newData
                    .find(g => g.name === currentGroup)?.projects
                    .find(p => p.id === projectId);
                  if (project) {
                    project.columnOrder = updatedColumnOrder;
                    project.columns[colName] = [];
                  }
                  return newData;
                });
              } catch (error) {
                console.error("Error adding column:", error);
                alert("Failed to add column.");
              }
            }}
          >
            + Add Column
          </button>
        </div>
        <DragOverlay>
        {activeTask ? (
          <TaskItem
            task={activeTask}
            availableLabels={projectLabels}
          />
        ) : null}
      </DragOverlay>
      </DndContext>
    );
}
  };

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {modalTask && (
  <Suspense fallback={<div>Loading...</div>}>
    <TaskDetailPanel
      task={modalTask}
      onClose={() => setModalTask(null)}
      onUpdate={handleTaskUpdate}
      availableLabels={projectLabels}
    />
  </Suspense>
)}
      {!user ? (
        <Auth onSignUp={handleSignUp} onLogin={handleLogin} />
      ) : (
        <>
<div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
  <div className="sidebar-header">
    <img src={logoUrl} alt="Rocket Productivity" className="sidebar-logo" />
    <button
      className="sidebar-toggle-btn"
      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      title="Toggle Sidebar"
    >
      «
    </button>
  </div>

    <div className="nav-section">
  <button
    title="Goals"
    className={`nav-btn ${currentView === 'goals' ? 'active' : ''}`}
    onClick={() => setCurrentView('goals')}
  >
    <img src={goalsIconUrl} className="nav-icon" alt="Goals" />
    <span className="nav-btn-text">Goals</span>
  </button>
  <button
    title="Today" 
    className={`nav-btn ${currentView === 'today' ? 'active' : ''}`}
    onClick={() => setCurrentView('today')}
  >
    <img src={todayIconUrl} className="nav-icon" alt="Today" />
    <span className="nav-btn-text">Today</span>
  </button>
  <button
    title="Inbox" 
    className={`nav-btn ${currentView === 'inbox' ? 'active' : ''}`}
    onClick={() => setCurrentView('inbox')}
  >
    <img src={inboxIconUrl} className="nav-icon" alt="Inbox" />
    <span className="nav-btn-text">Inbox</span>
  </button>
  <button
    title="Tomorrow"
    className={`nav-btn ${currentView === 'tomorrow' ? 'active' : ''}`}
    onClick={() => setCurrentView('tomorrow')}
  >
    <img src={tomorrowIconUrl} className="nav-icon" alt="Tomorrow" />
    <span className="nav-btn-text">Tomorrow</span>
  </button>
  <button
    title="This Week"
    className={`nav-btn ${currentView === 'thisWeek' ? 'active' : ''}`}
    onClick={() => setCurrentView('thisWeek')}
  >
    <img src={thisWeekIconUrl} className="nav-icon" alt="This Week" />
    <span className="nav-btn-text">This Week</span>
  </button>
  <button
    title="Next Week"
    className={`nav-btn ${currentView === 'nextWeek' ? 'active' : ''}`}
    onClick={() => setCurrentView('nextWeek')}
  >
    <img src={nextWeekIconUrl} className="nav-icon" alt="Next Week" />
    <span className="nav-btn-text">Next Week</span>
  </button>
</div>

  <div 
  className={`nav-header project-nav-header ${currentView === 'projects' ? 'active' : ''}`}
  onClick={() => setCurrentView('projects')}
>
  <div className="nav-header-title">
    <img src={projectsIconUrl} className="nav-icon" alt="Projects" />
    <h3>Projects</h3>
  </div>
  <div className="nav-buttons">
    <button 
      className="manage-btn"
      onClick={handleAddProject}
      title="Add New Project"
    >
      ➕
    </button>
  </div>
</div>

<div className="sidebar-project-list">
  <DndContext sensors={sensors} onDragEnd={handleSidebarDragEnd}>
    {projectData.map((group) => (
      <div key={group.name} style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#666' }}>{group.name}</h4>
        <SortableContext items={group.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {group.projects.map(project => (
            <SortableProjectItem
              key={project.id}
              id={project.id}
            >
              <div
                className={`project-button ${currentView === 'board' && currentProject === project.name && currentGroup === group.name ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('board'); // Change the view to show the board
                  setCurrentGroup(group.name);
                  setCurrentProject(project.name);
                }}
              >
                <span className="project-entry">
                  {project.name}
                  <span 
                    className="edit-project-btn"
                    title="Edit Project"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToEdit({ oldGroup: group.name, oldName: project.name });
                      setShowProjectEditModal(true);
                    }}
                  >
                    ✏️
                  </span>
                </span>
              </div>
            </SortableProjectItem>
          ))}
        </SortableContext>
      </div>
    ))}
  </DndContext>
</div>
<div className="logout-section">
  <button
    title="Settings"
    onClick={() => setCurrentView('settings')}
    className={`nav-btn ${currentView === 'settings' ? 'active' : ''}`}
  >
    <img src={settingsIconUrl} className="nav-icon" alt="Settings" />
    <span className="nav-btn-text">Settings</span>
  </button>
  <button title="Logout" onClick={handleLogout} className="nav-btn logout-btn-override">
    <img src={logoutIconUrl} className="nav-icon" alt="Logout" />
    <span className="nav-btn-text">Logout</span>
  </button>
</div>
      </div>

<div className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-menu-is-open' : ''}`}>
      {isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}
            <div className="header">
 <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
    {isMobileMenuOpen ? '✕' : '☰'}
  </button>
  <h1>
    {currentView === 'board' && currentProject
      ? currentProject
      : currentView === 'projects'
      ? 'Projects'
      : currentView === 'today'
      ? 'Today'
      : currentView
    }
  </h1>
  <div className="header-actions">
    {!timerIsRunning && timerTime === timerInputTime * 60 ? (
      <button className="timer-toggle" onClick={() => setShowTimerModal(true)}>
        ⏰ Timer
      </button>
    ) : (
      <div className="mini-timer">
        <span>{formatTime(timerTime)}</span>
        <button className="mini-timer-btn" onClick={() => setShowTimerModal(true)}>⚙️</button>
        <button className="mini-timer-btn" onClick={handleCancelTimer}>❌</button>
      </div>
    )}
    <button 
    className="calendar-toggle"
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
  📅 Calendar
</button>
  </div>
</div>
            
            <div className={`content-wrapper ${showCalendar ? 'with-calendar' : ''}`}>
              <div className="content">
                {renderContent()}
              </div>
              {showCalendar && (
                <div className={`calendar-container ${isCalendarMaximized ? 'calendar-maximized' : ''}`}>
                  <Suspense fallback={<div className="calendar-panel"><h2>Loading Calendar...</h2></div>}>
                    <CalendarPanel
    isMaximized={isCalendarMaximized}
    onToggleMaximize={() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        // On mobile, the "minimize" button should just close the calendar
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

          {showProjectEditModal && projectToEdit && (
            <EditProjectModal
              projectData={projectData}
              current={projectToEdit}
              onClose={() => setShowProjectEditModal(false)}
              onSave={handleSaveProjectEdit}
            />
          )}
          <NewProjectModal
        show={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSave={handleCreateProject}
        groups={projectData.map(g => g.name)}
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
    </>
  )}
</div>
);
}

export default App;