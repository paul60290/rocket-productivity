import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import Firebase services
import { auth, db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from "firebase/firestore";

// New component to make milestones draggable
function SortableMilestone({ milestone, onToggle, onDelete, isEditing, setEditingMilestone, onUpdateText }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: milestone.text });
  const [editText, setEditText] = useState(milestone.text);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editText.trim()) {
      onUpdateText(milestone.text, editText.trim());
    }
    setEditingMilestone(null);
  };

  return (
    <li ref={setNodeRef} style={style} className="milestone-item">
      <div className="milestone-content-left">
        <span {...attributes} {...listeners} className="drag-handle">⠿</span>
        <input
          type="checkbox"
          checked={milestone.completed}
          onChange={() => onToggle(milestone.text)}
          onClick={(e) => e.stopPropagation()}
        />
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditingMilestone(null);
            }}
            autoFocus
            style={{flexGrow: 1}} // Ensure input takes up space
          />
        ) : (
          <span className="milestone-text" onDoubleClick={() => setEditingMilestone(milestone.text)}>
            {milestone.text}
          </span>
        )}
      </div>
      <button className="delete-milestone-btn" onClick={() => onDelete(milestone.text)}>🗑️</button>
    </li>
  );
}


// SortableRow component now uses the goal's unique ID from Firestore
function SortableRow({ goal, expandedGoal, setExpandedGoal, toggleMilestone, deleteGoal, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: goal.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td data-label="Drag" {...attributes} {...listeners} className="drag-handle" style={{ cursor: 'grab', textAlign: 'center' }}>
        ⠿
      </td>
      <td data-label="Goal">{goal.title}</td>
      <td data-label="Type">{goal.type}</td>
      <td data-label="Deadline">{goal.deadline}</td>
      <td data-label="Progress">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${goal.progress}%` }} />
        </div>
        {goal.progress}%
      </td>
      <td data-label="Milestones" className="milestones-cell" onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}>
        {expandedGoal === goal.id ? (
          <ul className="milestone-list-expanded">
            {goal.milestones.map((m, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={(e) => {
                        e.stopPropagation(); // Prevent row from collapsing on click
                        toggleMilestone(goal.id, i);
                    }}
                  />{' '}
                  {m.text}
                </label>
              </li>
            ))}
          </ul>
        ) : goal.milestones.length > 0 ? (
          `${goal.milestones.length} milestone${goal.milestones.length > 1 ? 's' : ''}`
        ) : (
          '—'
        )}
      </td>
      <td data-label="Status">{goal.status}</td>
       <td data-label="Edit">
        <button className="edit-goal-btn" onClick={() => onEdit(goal)}>✏️</button>
      </td>
      <td data-label="Delete">
        <button className="delete-goal-btn" onClick={() => deleteGoal(goal.id)}>🗑️</button>
      </td>
    </tr>
  );
}

// GoalsPage now manages its own state and Firestore interaction
export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null); // <-- ADD THIS: State to hold the goal being edited

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Short-term');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [milestoneInput, setMilestoneInput] = useState('');
  const [editingMilestone, setEditingMilestone] = useState(null); // <-- ADD THIS

  // Fetch goals from Firestore when the component mounts
  useEffect(() => {
    const fetchGoals = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      const goalsCollectionRef = collection(db, 'users', auth.currentUser.uid, 'goals');
      const q = query(goalsCollectionRef, orderBy("order"));
      const querySnapshot = await getDocs(q);
      const fetchedGoals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGoals(fetchedGoals);
      setIsLoading(false);
    };

    fetchGoals();
  }, []);

  const handleAddMilestone = () => {
    const text = milestoneInput.trim();
    if (!text) return;
    setMilestones([...milestones, text]);
    setMilestoneInput('');
  };

  const handleUpdateMilestoneText = (oldText, newText) => {
    const newMilestones = milestones.map(m => m === oldText ? newText : m);
    setMilestones(newMilestones);
    setEditingMilestone(null); // Exit edit mode
  };

  const handleMilestoneDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMilestones((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setType(goal.type);
    setDeadline(goal.deadline);
    setMilestones(goal.milestones.map(m => m.text));
    setShowModal(true);
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!editingGoal || !auth.currentUser) return;

    const milestoneObjs = milestones.map(text => {
      const existing = editingGoal.milestones.find(m => m.text === text);
      return existing || { text, completed: false };
    });

    const doneCount = milestoneObjs.filter(m => m.completed).length;
    const progress = Math.round((doneCount / milestoneObjs.length) * 100) || 0;

    const updatedData = {
      title,
      type,
      deadline,
      milestones: milestoneObjs,
      progress,
      status: progress === 100 ? 'Done' : 'On Track',
    };

    const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', editingGoal.id);
    await updateDoc(goalRef, updatedData);

    setGoals(goals.map(g => g.id === editingGoal.id ? { ...g, ...updatedData } : g));
    
    // Reset and close
    setShowModal(false);
    setEditingGoal(null);
    setTitle('');
    setType('Short-term');
    setDeadline('');
    setMilestones([]);
  };

  // Toggle milestone completion and update the goal in Firestore
  const toggleMilestone = async (goalId, milestoneIndex) => {
    const goalToUpdate = goals.find(g => g.id === goalId);
    if (!goalToUpdate) return;
    
    const updatedMilestones = goalToUpdate.milestones.map((m, i) =>
      i === milestoneIndex ? { ...m, completed: !m.completed } : m
    );
    const doneCount = updatedMilestones.filter(m => m.completed).length;
    const progress = Math.round((doneCount / updatedMilestones.length) * 100) || 0;
    
    const updatedGoalData = {
      ...goalToUpdate,
      milestones: updatedMilestones,
      progress,
      status: progress === 100 ? 'Done' : 'On Track',
    };

    // Optimistically update local state
    setGoals(goals.map(g => g.id === goalId ? updatedGoalData : g));
    
    // Update Firestore
    const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', goalId);
    await updateDoc(goalRef, {
        milestones: updatedMilestones,
        progress: progress,
        status: progress === 100 ? 'Done' : 'On Track',
    });
  };

  // Save new goal to Firestore
  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const milestoneObjs = milestones.map(text => ({ text, completed: false }));
    const newGoal = {
      title,
      type,
      deadline,
      progress: 0,
      milestones: milestoneObjs,
      status: 'On Track',
      order: goals.length, // Set the order to be the last item
    };

    const goalsCollectionRef = collection(db, 'users', auth.currentUser.uid, 'goals');
    const docRef = await addDoc(goalsCollectionRef, newGoal);

    // Optimistically update local state with the new ID
    setGoals([...goals, { ...newGoal, id: docRef.id }]);

    // Reset form + close
    setTitle('');
    setType('Short-term');
    setDeadline('');
    setMilestones([]);
    setShowModal(false);
  };

  // Delete a goal from Firestore
  const deleteGoal = async (goalId) => {
    if (!auth.currentUser || !window.confirm("Are you sure you want to delete this goal?")) return;

    // Optimistically update local state
    setGoals(goals.filter(g => g.id !== goalId));
    
    // Delete from Firestore
    const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', goalId);
    await deleteDoc(goalRef);
  };

  // Drag-and-drop handler to update order in Firestore
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = goals.findIndex(g => g.id === active.id);
    const newIndex = goals.findIndex(g => g.id === over.id);
    const reorderedGoals = arrayMove(goals, oldIndex, newIndex);

    setGoals(reorderedGoals); // Optimistic update

    // Update the 'order' field for all documents in a batch
    const batch = writeBatch(db);
    reorderedGoals.forEach((goal, index) => {
      const goalRef = doc(db, 'users', auth.currentUser.uid, 'goals', goal.id);
      batch.update(goalRef, { order: index });
    });
    await batch.commit();
  };

  const sensors = useSensors(useSensor(PointerSensor));

  if (isLoading) {
      return <div className="goals-page"><h2>Loading Goals...</h2></div>;
  }

  return (
    <div className="goals-page">
      <div className="goals-header">
        <h2>Goals</h2>
        <span className="goals-summary">
          {goals.length} {goals.length === 1 ? 'goal' : 'goals'} total
        </span>
        <button className="new-goal-btn" onClick={() => { setEditingGoal(null); setTitle(''); setType('Short-term'); setDeadline(''); setMilestones([]); setShowModal(true); }}>
          + New Goal
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="goals-table">
          <thead>
            <tr>
              <th style={{ width: '24px' }}></th>
              <th>Goal</th>
              <th>Type</th>
              <th>Deadline</th>
              <th>Progress</th>
              <th>Milestones</th>
              <th>Status</th>
              <th colSpan="2">Actions</th> {/* <-- CHANGE THIS */}
            </tr>
          </thead>
          <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {goals.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '1em' }}>
                    No goals yet. Click “+ New Goal” to add one.
                  </td>
                </tr>
              ) : (
                goals.map((goal) => (
                  <SortableRow
                    key={goal.id}
                    goal={goal}
                    expandedGoal={expandedGoal}
                    setExpandedGoal={setExpandedGoal}
                    toggleMilestone={toggleMilestone}
                    deleteGoal={deleteGoal}
                    onEdit={handleOpenEditModal} // <-- ADD THIS
                  />
                ))
              )}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingGoal ? 'Edit Goal' : 'New Goal'}</h3> {/* <-- CHANGE THIS */}
            <form onSubmit={editingGoal ? handleUpdateGoal : handleSave}> {/* <-- CHANGE THIS */}
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="Short-term">Short-term</option>
                  <option value="Long-term">Long-term</option>
                </select>
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Milestones</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="New milestone"
                    value={milestoneInput}
                    onChange={e => setMilestoneInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddMilestone(); }}}
                  />
                  <button type="button" onClick={handleAddMilestone}>Add</button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMilestoneDragEnd}>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2em', listStyleType: 'none' }}>
                    <SortableContext items={milestones} strategy={verticalListSortingStrategy}>
                      {milestones.map((milestoneText) => (
                        <SortableMilestone
                          key={milestoneText}
                          milestone={{ text: milestoneText, completed: editingGoal?.milestones.find(m => m.text === milestoneText)?.completed || false }}
                          onToggle={() => { /* We will add toggle logic later if needed */ }}
                          onDelete={() => setMilestones(prev => prev.filter(m => m !== milestoneText))}
                          isEditing={editingMilestone === milestoneText}
                          setEditingMilestone={setEditingMilestone}
                          onUpdateText={handleUpdateMilestoneText}
                        />
                      ))}
                    </SortableContext>
                  </ul>
                </DndContext>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="save-btn">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






