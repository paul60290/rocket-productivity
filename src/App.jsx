// App.jsx

import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { Preferences } from "@capacitor/preferences";
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
import Column from './components/Column';
import TaskItem from './components/TaskItem';
import TimerModal from './components/TimerModal';
import TimerCompleteModal from './components/TimerCompleteModal';
import NewProjectModal from './components/NewProjectModal';
import ProjectDetailPanel from './components/ProjectDetailPanel';
import SortableProjectItem from './components/SortableProjectItem';
import BottomNav from './components/BottomNav';
import FAB from './components/FAB';
import ListView from './components/ListView';
import MobileSidebar from './components/MobileSidebar';
import ViewControls from './components/ViewControls';
import BoardPager from './components/BoardPager';
import TopBar from './components/TopBar';
import DesktopSidebar from './components/DesktopSidebar';
import { useSwipeable } from 'react-swipeable';
import { useTimer } from './hooks/useTimer';
import useUserData from './hooks/useUserData';
import MainContent from './components/MainContent';
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
import { cn, formatDate, generateUniqueId } from "@/lib/utils";
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
  

  const [showProjectDetailPanel, setShowProjectDetailPanel] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    time: timerTime,
    setTime: setTimerTime,
    inputTime: timerInputTime,
    setInputTime: setTimerInputTime,
    isRunning: timerIsRunning,
    showTimerModal,
    setShowTimerModal,
    showTimerCompleteModal,
    setShowTimerCompleteModal,
    formatTime,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleCancelTimer,
  } = useTimer();
  const sensors = useSensors(useSensor(PointerSensor, {
    // Require the mouse to move by 5 pixels before activating a drag.
    // This allows single-clicks to be registered correctly.
    activationConstraint: {
      distance: 5,
    },
  }));
  
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
  const [currentProjectTags, setCurrentProjectTags] = useState([]);
  const {
  user, isLoading,
  projectData, setProjectData,
  projectLabels, setProjectLabels,
  inboxTasks, setInboxTasks,
  calendarEvents, setCalendarEvents,
  allTags, setAllTags,
  theme, setTheme,
  showCompletedTasks, setShowCompletedTasks,
} = useUserData();

  

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
  // === WIDGET SYNC: derive title + top 3 tasks for current view ===
  const widgetViewTitle = React.useMemo(() => {
    if (currentView === 'board' && currentProject) return currentProject;
    return currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }, [currentView, currentProject]);

  const visibleTasks = React.useMemo(() => {
    const list = Array.isArray(allTasksForListView) ? allTasksForListView : [];
    const sorted = [...list].sort((a, b) => {
      const ac = !!a.completed, bc = !!b.completed;
      if (ac !== bc) return ac - bc;                 // incomplete first
      return (a.priority ?? 999) - (b.priority ?? 999); // lowest priority number first
    });
    return sorted.slice(0, 3);
  }, [allTasksForListView]);

  useEffect(() => {
    const top3 = visibleTasks.map(t => {
      const title = (t.text ?? t.title ?? t.name ?? '').toString().trim();
      return title ? `• ${title}` : '';
    });

    (async () => {
      try {
        await Preferences.set({ key: 'widget.title', value: 'Rocket Productivity' });
        await Preferences.set({ key: 'widget.context', value: widgetViewTitle });
        await Preferences.set({ key: 'widget.lines', value: JSON.stringify(top3) });
      } catch (e) {
        console.warn('Widget sync failed:', e);
      }
    })();
  }, [widgetViewTitle, visibleTasks]);


  // This logic now lives at the top level, not inside renderContent, to follow the Rules of Hooks.
  const isGlobalView = ['today', 'tomorrow', 'thisWeek', 'nextWeek'].includes(currentView);
  const defaultGroupBy = isGlobalView ? 'project' : 'manual';
  const groupBy = getViewOption(viewKey, 'groupBy', defaultGroupBy);
  const tasksByProject = useGroupedTasks(allTasksForListView, groupBy, projectData);


  // State for App Logic
  const [activeId, setActiveId] = useState(null); // For drag-and-drop
  const [isCalendarMaximized, setIsCalendarMaximized] = useState(false);
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
    preventScrollOnSwipe: false,
    trackMouse: false,
    touchEventOptions: { passive: true }
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

  // Listen to authentication state changes
  

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
  // Allow swiping to the last "Add Column" card by using the scroller's child count
  const getMaxSwipeIndex = (viewType) => {
    const ref = viewType === 'inbox' ? inboxScrollRef : boardScrollRef;
    const childCount = ref.current?.children?.length ?? 0;
    return Math.max(0, childCount - 1);
  };

  const handleSwipe = (direction, viewType) => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const maxIndex = getMaxSwipeIndex(viewType);
    if (maxIndex === 0) return;

    setActiveColumnIndex(prev => {
      const currentIndex = prev[viewType] ?? 0;
      let newIndex = currentIndex;

      if (direction === 'left') {
        newIndex = Math.min(currentIndex + 1, maxIndex);
      } else if (direction === 'right') {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      return newIndex !== currentIndex ? { ...prev, [viewType]: newIndex } : prev;
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

    if (!activeTask || !overTask || activeTask.projectId !== overTask.projectId) {
      return;
    }

    const projectId = activeTask.projectId;
    const project = projectData.flatMap(g => g.projects).find(p => p.id === projectId);
    if (!project) return;

    // Get all tasks for this project, sorted by their current order.
    const allProjectTasks = Object.values(project.columns || {})
      .flat()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIndex = allProjectTasks.findIndex(t => t.id === active.id);
    const newIndex = allProjectTasks.findIndex(t => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create the new, correctly ordered array.
    const reorderedTasks = arrayMove(allProjectTasks, oldIndex, newIndex);

    const batch = writeBatch(db);
    const updates = [];

    // Go through the newly ordered list and assign a new, sequential order value.
    reorderedTasks.forEach((task, index) => {
      const newOrder = index * 1000; // Using spaced integers is a robust practice.
      if (task.order !== newOrder) {
        updates.push({ id: task.id, newOrder: newOrder });
        const taskRef = doc(db, 'users', user.uid, 'projects', projectId, 'tasks', task.id);
        batch.update(taskRef, { order: newOrder });
      }
    });

    // Only update state and Firestore if there are actual changes.
    if (updates.length > 0) {
      // Optimistically update the UI by rebuilding the columns with the newly sorted tasks.
      setProjectData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const projectToUpdate = newData.flatMap(g => g.projects).find(p => p.id === projectId);

        if (projectToUpdate) {
          // Clear out the existing columns
          for (const colId in projectToUpdate.columns) {
            projectToUpdate.columns[colId] = [];
          }

          // Repopulate the columns based on the newly reordered list
          reorderedTasks.forEach((task, index) => {
            task.order = index * 1000; // Ensure order property is updated
            if (projectToUpdate.columns[task.column]) {
              projectToUpdate.columns[task.column].push(task);
            }
          });
        }

        return newData;
      });

      // Commit all changes to Firestore at once.
      await batch.commit().catch(err => {
        console.error("Failed to save new task order:", err);
      });
    }
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

  const handleDragEnd = (event) => {
    const { active, over } = event;

    // If the item is dropped over nothing, reset and exit.
    if (!over) {
      setActiveId(null);
      return;
    }

    // Use the 'type' data we added in the last step to determine what was dragged.
    const activeType = active.data.current?.type;

    if (activeType === 'project') {
      // This was a project being reordered in the sidebar.
      handleSidebarDragEnd(event);
    } else if (activeType === 'task') {
      // This was a task card. Now, figure out which view we're in.
      if (currentView === 'inbox') {
        handleInboxDragEnd(event);
      } else if (currentView === 'board' && getViewOption(viewKey, 'mode', 'board') === 'board') {
        // This handles dragging tasks between columns on a project board.
        handleDrop(event);
      } else {
        // This handles reordering tasks in any of the "List" views.
        handleListDragEnd(event);
      }
    } else {
      // If it's an unknown type, just reset the state.
      setActiveId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignUp={handleSignUp} onLogin={handleLogin} logoUrl={logoUrl} />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
        {/* --- Main Layout: Sidebar + Content --- */}
        <div className="flex flex-1 min-h-0">
          <DesktopSidebar
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            currentView={currentView}
            setCurrentView={setCurrentView}
            mainNavItems={mainNavItems}
            projectData={projectData}
            currentGroup={currentGroup}
            currentProject={currentProject}
            onSelectProject={(groupName, projectName) => {
              setCurrentGroup(groupName);
              setCurrentProject(projectName);
              setCurrentView('board');
            }}
            onEditProject={(project) => {
              setProjectToEdit(project);
              setShowProjectDetailPanel(true);
            }}
            onAddProject={handleAddProject}
            onLogout={handleLogout}
          />

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}
            <TopBar
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              currentView={currentView}
              currentProject={currentProject}
              ViewIcon={viewIcons[currentView]}
              canBeToggled={canBeToggled}
              viewKey={viewKey}
              getViewOption={getViewOption}
              setViewOption={setViewOption}
              currentProjectData={currentProjectData}
              onAddTask={() => setModalTask({ isNew: true, projectId: currentProjectData.id })}
              timerIsRunning={timerIsRunning}
              timerTime={timerTime}
              timerInputTime={timerInputTime}
              formatTime={formatTime}
              handlePauseTimer={handlePauseTimer}
              handleResumeTimer={handleResumeTimer}
              handleCancelTimer={handleCancelTimer}
              setShowTimerModal={setShowTimerModal}
            />

            <div className="flex-1 flex min-h-0 min-w-0">
              {!isCalendarMaximized && (
                <div className="flex-1 overflow-auto min-h-0">
                  <MainContent
                    sensors={sensors}
                    currentView={currentView}
                    currentProject={currentProject}
                    currentProjectData={currentProjectData}
                    selectedJournalId={selectedJournalId}
                    viewOptions={viewOptions}
                    getViewOption={getViewOption}
                    user={user}
                    projectData={projectData}
                    projectLabels={projectLabels}
                    inboxTasks={inboxTasks}
                    allTags={allTags}
                    tasksByProject={tasksByProject}
                    allTasksForListView={allTasksForListView}
                    isLoading={isLoading}
                    activeId={activeId}
                    showCompletedTasks={showCompletedTasks}
                    activeColumnIndex={activeColumnIndex}
                    activeGlobalIndex={activeGlobalIndex}
                    isAddingColumn={isAddingColumn}
                    newColumnName={newColumnName}
                    inboxScrollRef={inboxScrollRef}
                    boardScrollRef={boardScrollRef}
                    globalScrollRef={globalScrollRef}
                    onSelectProject={(groupName, projectName) => {
                      setCurrentGroup(groupName);
                      setCurrentProject(projectName);
                      setCurrentView('board');
                    }}
                    onUpdateName={handleUpdateName}
                    updateLabels={updateLabels}
                    handleAddGroup={handleAddGroup}
                    handleRenameGroup={handleRenameGroup}
                    handleDeleteGroup={handleDeleteGroup}
                    toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    handleToggleShowCompletedTasks={handleToggleShowCompletedTasks}
                    onSelectJournal={(id) => { setSelectedJournalId(id); setCurrentView('journalEntry'); }}
                    setModalTask={setModalTask}
                    updateTask={updateTask}
                    handleListDragEnd={handleListDragEnd}
                    handleInboxDragEnd={handleInboxDragEnd}
                    addInboxTask={addInboxTask}
                    handleInboxTaskUpdate={handleInboxTaskUpdate}
                    renameInboxColumn={renameInboxColumn}
                    deleteInboxColumn={deleteInboxColumn}
                    handleSaveNewColumn={handleSaveNewColumn}
                    setIsAddingColumn={setIsAddingColumn}
                    setNewColumnName={setNewColumnName}
                    handleDrop={handleDrop}
                    addTask={addTask}
                    renameColumn={renameColumn}
                    deleteColumn={deleteColumn}
                    handleToggleSubtask={handleToggleSubtask}
                    findTaskById={findTaskById}
                    setActiveId={setActiveId}
                    inboxSwipeHandlers={inboxSwipeHandlers}
                    boardSwipeHandlers={boardSwipeHandlers}
                    globalSwipeHandlers={globalSwipeHandlers}
                    handlePagerDotClick={handlePagerDotClick}
                    handlePagerAddClick={handlePagerAddClick}
                    goToGlobalPage={goToGlobalPage}
                    handleGlobalScroll={handleGlobalScroll}
                    setViewOption={setViewOption}
                  />
                </div>
              )}
              {showCalendar && (
                <div className={cn("transition-all duration-300 bg-card border-l", isCalendarMaximized ? "flex-1" : "shrink-0 w-[32rem]")}>
                  <Suspense fallback={<div className="p-4"><h2>Loading Calendar...</h2></div>}>
                    <CalendarPanel
                      isMaximized={isCalendarMaximized}
                      onToggleMaximize={() => { setIsCalendarMaximized(!isCalendarMaximized); }}
                      calendarEvents={calendarEvents}
                      setCalendarEvents={setCalendarEvents}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav currentView={currentView} onNavigate={handleNavigation} onShowCalendar={() => handleNavigation('calendar')} />
        {isFabVisible && <FAB onClick={handleFabClick} />}
        {modalTask && (<Suspense fallback={<div>Loading...</div>}><TaskDetailPanel task={modalTask} onClose={() => setModalTask(null)} onUpdate={handleTaskUpdate} onMoveTask={moveTask} availableLabels={projectLabels} user={user} db={db} projectColumns={currentProjectData?.columnOrder || []} allProjects={projectData} /></Suspense>)}
        {showProjectDetailPanel && projectToEdit && (<Suspense fallback={<div>Loading...</div>}><ProjectDetailPanel project={projectToEdit} user={user} db={db} onClose={() => setShowProjectDetailPanel(false)} onUpdate={(updatedData) => { handleSaveProjectEdit(projectToEdit, updatedData) }} allGroups={(projectData || []).map(g => g.name)} onTagUpdate={handleTagUpdate} /></Suspense>)}
        <NewProjectModal show={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} onSave={handleCreateProject} groups={(projectData || []).map(g => g.name)} />
        {showTimerModal && (<TimerModal onClose={() => setShowTimerModal(false)} time={timerTime} setTime={setTimerTime} inputTime={timerInputTime} setInputTime={setTimerInputTime} isRunning={timerIsRunning} onStart={handleStartTimer} onPause={handlePauseTimer} onResume={handleResumeTimer} onReset={handleResetTimer} formatTime={formatTime} />)}
        {showTimerCompleteModal && (<TimerCompleteModal onClose={() => { const chime = document.getElementById('timer-chime'); if (chime) { chime.pause(); chime.currentTime = 0; } setShowTimerCompleteModal(false); handleResetTimer(); }} />)}
        <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} currentView={currentView} onNavigate={setCurrentView} onLogout={handleLogout} projectData={projectData} onSelectProject={(groupName, projectName) => { setCurrentView('board'); setCurrentGroup(groupName); setCurrentProject(projectName); }} onEditProject={(project) => { setProjectToEdit(project); setShowProjectDetailPanel(true); }} onAddProject={() => setShowNewProjectModal(true)} />
        <audio id="timer-chime" src={timerChime} preload="auto"></audio>
      </div>
      <DragOverlay>
        {activeId ? <TaskItem task={findTaskById(activeId)} availableLabels={projectLabels} allTags={allTags} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;