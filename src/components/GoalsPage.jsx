import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import Firebase services
import deleteIconUrl from '../assets/delete.svg';
import editIconUrl from '../assets/edit.svg';
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Trash2, Pencil, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// New component to make milestones draggable
function SortableMilestone({ milestone, onToggle, onDelete, isEditing, setEditingMilestone, onUpdateText }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.text });
  const [editText, setEditText] = useState(milestone.text);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editText.trim()) {
      onUpdateText(milestone.text, editText.trim());
    }
    setEditingMilestone(null);
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 rounded-md p-2 -ml-2 hover:bg-muted">
      <div {...listeners} className="cursor-grab touch-none p-1">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Checkbox
        id={`milestone-${milestone.text}`}
        checked={milestone.completed}
        onCheckedChange={() => onToggle(milestone.text)}
        onClick={(e) => e.stopPropagation()}
      />
      {isEditing ? (
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditingMilestone(null);
          }}
          autoFocus
          className="h-8 flex-1"
        />
      ) : (
        <label
          htmlFor={`milestone-${milestone.text}`}
          onDoubleClick={() => setEditingMilestone(milestone.text)}
          className={`flex-1 text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}
        >
          {milestone.text}
        </label>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => onDelete(milestone.text)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
        <button className="edit-goal-btn" onClick={() => onEdit(goal)}>
          <img src={editIconUrl} alt="Edit goal" />
        </button>
      </td>
      <td data-label="Delete">
        <button className="delete-goal-btn" onClick={() => deleteGoal(goal.id)}>
          <img src={deleteIconUrl} alt="Delete goal" />
        </button>
      </td>
    </tr>
  );
}

function GoalCard({ goal, onEdit, deleteGoal, toggleMilestone, listeners }) {
  return (
    <Card
      onClick={() => onEdit(goal)}
      className="cursor-pointer transition-colors hover:bg-accent flex flex-col h-full"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              {...listeners}
              className="cursor-grab touch-none p-1 -ml-1 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <CardTitle className="leading-tight">{goal.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{goal.type} | Deadline: {goal.deadline}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} />
        </div>
      </CardContent>
      {goal.milestones && goal.milestones.length > 0 && (
        <CardFooter>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="milestones">
              <AccordionTrigger onClick={(e) => e.stopPropagation()}>
                {goal.milestones.length} Milestone{goal.milestones.length !== 1 && 's'}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3 mt-2">
                  {goal.milestones.map((milestone, index) => (
                    <li key={index} className="flex items-center">
                      <Checkbox
                        id={`milestone-${goal.id}-${index}`}
                        checked={milestone.completed}
                        onCheckedChange={() => toggleMilestone(goal.id, index)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                      />
                      <label
                        htmlFor={`milestone-${goal.id}-${index}`}
                        className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {milestone.text}
                      </label>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardFooter>
      )}
    </Card>
  );
}

function SortableGoalCard(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GoalCard {...props} listeners={listeners} />
    </div>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">
            Set and track your long-term objectives.
          </p>
        </div>
        <Button onClick={() => { setEditingGoal(null); setTitle(''); setType('Short-term'); setDeadline(''); setMilestones([]); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Goal
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
          {goals.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="p-6 text-center text-muted-foreground">
                No goals yet. Click “+ New Goal” to add one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
              {goals.map((goal) => (
                <SortableGoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleOpenEditModal}
                  deleteGoal={deleteGoal}
                  toggleMilestone={toggleMilestone}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>

      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
              <DialogDescription>
                Set a clear title, type, and deadline for your objective. Add milestones to break it down.
              </DialogDescription>
            </DialogHeader>

            {/* The form below is still using old styles. We will update it next. */}
            <form onSubmit={editingGoal ? handleUpdateGoal : handleSave}>
              <div className="space-y-2">
                <Label htmlFor="goal-title">Title</Label>
                <Input id="goal-title" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="goal-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Short-term">Short-term</SelectItem>
                      <SelectItem value="Long-term">Long-term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-deadline">Deadline</Label>
                  <Input id="goal-deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Milestones</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="New milestone..."
                    value={milestoneInput}
                    onChange={e => setMilestoneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMilestone(); } }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddMilestone}>Add</Button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMilestoneDragEnd}>
                  <ul className="space-y-2 pt-2">
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Save Goal</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}






