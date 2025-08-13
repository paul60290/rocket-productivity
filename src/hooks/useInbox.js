// src/hooks/useInbox.js
import { useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateUniqueId } from '@/lib/utils';

/**
 * Centralizes Inbox CRUD and drag logic.
 * Keeps Firestore in sync with optimistic UI updates.
 */
export default function useInbox(user, inboxTasks, setInboxTasks, setActiveId) {
  // helper: ensure we always have a valid shape
  const normalize = useCallback((state) => {
    if (state && state.columnOrder && state.columns) return state;
    return { columnOrder: [{ id: 'Inbox', name: 'Inbox' }], columns: { Inbox: [] } };
  }, []);

  // helper: persist to Firestore (no-op if logged out)
  const persist = useCallback(async (state) => {
    if (!user) return;
    const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
    await setDoc(appDataRef, { inboxTasks: state }, { merge: true });
  }, [user]);

  const addInboxTask = useCallback(async (taskData) => {
    if (!user) {
      alert("You must be logged in to add tasks.");
      return;
    }
    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));

    const columnId = taskData.column || newState.columnOrder[0]?.id || 'Inbox';
    if (!newState.columns[columnId]) newState.columns[columnId] = [];

    const newTask = {
      id: generateUniqueId(),
      text: taskData.text || 'Untitled Task',
      description: taskData.description || '',
      date: taskData.date || '',
      priority: taskData.priority ?? 4,
      label: taskData.label || '',
      tag: '',
      comments: [],
      subtasks: [],
      completed: false,
      column: columnId,
    };

    newState.columns[columnId].push(newTask);
    setInboxTasks(newState);
    await persist(newState);
  }, [user, inboxTasks, setInboxTasks, persist, normalize]);

  const handleInboxTaskUpdate = useCallback(async (columnId, taskId, updatedData) => {
    if (!user) return;
    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));
    const idx = newState.columns[columnId]?.findIndex(t => t.id === taskId);
    if (idx > -1) {
      newState.columns[columnId][idx] = { ...newState.columns[columnId][idx], ...updatedData };
      setInboxTasks(newState);
      await persist(newState);
    }
  }, [user, inboxTasks, setInboxTasks, persist, normalize]);

  const addInboxColumn = useCallback(async (newColumn) => {
    if (!user || !newColumn?.name?.trim()) return;
    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));
    // expect newColumn: { id, name }
    newState.columnOrder.push(newColumn);
    newState.columns[newColumn.id] = [];
    setInboxTasks(newState);
    await persist(newState);
  }, [user, inboxTasks, setInboxTasks, persist, normalize]);

  const renameInboxColumn = useCallback(async (columnId, newName) => {
    if (!user || !newName?.trim()) return;
    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));
    const col = newState.columnOrder.find(c => c.id === columnId);
    if (col) {
      col.name = newName.trim();
      setInboxTasks(newState);
      await persist(newState);
    }
  }, [user, inboxTasks, setInboxTasks, persist, normalize]);

  const deleteInboxColumn = useCallback(async (columnId) => {
    if (!user) return;
    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));
    if (newState.columnOrder.length <= 1) {
      alert("You must have at least one column in the inbox.");
      return;
    }
    newState.columnOrder = newState.columnOrder.filter(c => c.id !== columnId);
    delete newState.columns[columnId];
    setInboxTasks(newState);
    await persist(newState);
  }, [user, inboxTasks, setInboxTasks, persist, normalize]);

  const handleInboxDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (setActiveId) setActiveId(null);
    if (!over || !user || !active || active.id === over.id) return;

    const current = normalize(inboxTasks);
    const newState = JSON.parse(JSON.stringify(current));
    const { columns, columnOrder } = newState;
    if (!columns || !columnOrder) return;

    // find source column
    let sourceColumnId;
    for (const col of columnOrder) {
      if (columns[col.id]?.some(task => task.id === active.id)) {
        sourceColumnId = col.id;
        break;
      }
    }

    // find destination column
    let destColumnId = over.id;
    if (!columns[destColumnId]) {
      for (const col of columnOrder) {
        if (columns[col.id]?.some(task => task.id === over.id)) {
          destColumnId = col.id;
          break;
        }
      }
    }
    if (!sourceColumnId || !destColumnId) return;

    // move task
    const sourceIdx = columns[sourceColumnId]?.findIndex(t => t.id === active.id);
    if (sourceIdx === -1 || sourceIdx === undefined) return;

    const [moved] = columns[sourceColumnId].splice(sourceIdx, 1);
    if (sourceColumnId !== destColumnId) moved.column = destColumnId;
    if (!columns[destColumnId]) columns[destColumnId] = [];

    const destIdx = columns[destColumnId].findIndex(t => t.id === over.id);
    if (destIdx >= 0) {
      columns[destColumnId].splice(destIdx, 0, moved);
    } else {
      columns[destColumnId].push(moved);
    }

    setInboxTasks(newState);
    await persist(newState);
  }, [user, inboxTasks, setInboxTasks, setActiveId, persist, normalize]);

  return {
    addInboxTask,
    handleInboxTaskUpdate,
    addInboxColumn,
    renameInboxColumn,
    deleteInboxColumn,
    handleInboxDragEnd,
  };
}
