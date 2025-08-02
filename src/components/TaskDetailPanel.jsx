// src/components/TaskDetailPanel.jsx

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import deleteIconUrl from '../assets/delete.svg';
import { collection, getDocs } from "firebase/firestore";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function SortableSubtask({ subtask, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // We stop the drag from starting if the user clicks the checkbox or the delete button
  const stopPropagation = (e) => e.stopPropagation();

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-2 rounded-md -ml-2 p-2 hover:bg-muted"
    >
      <div {...listeners} className="cursor-grab touch-none p-1">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <Checkbox
        id={`subtask-${subtask.id}`}
        checked={subtask.completed}
        onCheckedChange={() => onToggle(subtask.id)}
        onPointerDown={stopPropagation}
      />
      <label
        htmlFor={`subtask-${subtask.id}`}
        className={`flex-1 text-sm ${subtask.completed ? 'text-muted-foreground line-through' : ''}`}
      >
        {subtask.text}
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => onDelete(subtask.id)}
        onPointerDown={stopPropagation}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

export default function TaskDetailPanel({ task, onClose, onUpdate, onMoveTask, availableLabels, user, db, projectColumns = [], allProjects = [] }) {
  const isCreateMode = task?.isNew;

  const [editedTask, setEditedTask] = useState({
    ...task,
    text: task?.text || '',
    date: task?.date || '',
    priority: task?.priority || 4,
    label: task?.label || '',
    description: task?.description || '',
    comments: task?.comments || [],
    subtasks: task?.subtasks || [],
    // Add a column field to the state, defaulting to the first column if available
    column: task?.column || (projectColumns.length > 0 ? projectColumns[0] : ''),
    projectId: task?.projectId || null, // Explicitly include projectId
  });
  const [newComment, setNewComment] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [projectTags, setProjectTags] = useState([]);

  useEffect(() => {
    // Fetch project-specific tags when the task changes and has a projectId
    if (task?.projectId && user) {
      const fetchProjectTags = async () => {
        const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', task.projectId, 'tags');
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        const fetchedTags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjectTags(fetchedTags);
      };
      fetchProjectTags();
    } else {
      setProjectTags([]);
    }
  }, [task, user, db]);

  

  const handleFieldChange = (field, value) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = { id: generateUniqueId(), text: newComment.trim(), author: 'You', timestamp: new Date().toISOString() };
    setEditedTask(prev => ({ ...prev, comments: [...prev.comments, comment] }));
    setNewComment('');
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const sub = { id: generateUniqueId(), text: newSubtaskText.trim(), completed: false };
    setEditedTask(prev => ({ ...prev, subtasks: [...prev.subtasks, sub] }));
    setNewSubtaskText('');
  };

  const handleDeleteSubtask = (subtaskId) => {
    setEditedTask(prev => ({ ...prev, subtasks: prev.subtasks.filter(st => st.id !== subtaskId) }));
  };

  const handleToggleSubtask = (subtaskId) => {
    setEditedTask(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
    }));
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleSubtaskDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditedTask(prev => {
        const oldIndex = prev.subtasks.findIndex(s => s.id === active.id);
        const newIndex = prev.subtasks.findIndex(s => s.id === over.id);
        return { ...prev, subtasks: arrayMove(prev.subtasks, oldIndex, newIndex) };
    });
  };

 const handleSave = () => {
    // First, check if the task is being moved to a new project.
    // We compare the original task's projectId with the one in the editor.
    if (editedTask.projectId && editedTask.projectId !== task.projectId) {
        onMoveTask(task, editedTask);
        onClose(); // Close the panel after moving
        return; // Stop the function here to prevent a normal update
    }

    // If not moving, proceed with a normal update.
    const saveData = {
      text: editedTask.text,
      description: editedTask.description,
      date: editedTask.date,
      priority: editedTask.priority,
      label: editedTask.label,
      tag: editedTask.tag,
      comments: editedTask.comments,
      subtasks: editedTask.subtasks,
      column: editedTask.column,
    };

    onUpdate(saveData, editedTask.projectId);
    onClose();
};

  return (
  <Sheet open={!!task} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <SheetContent className="sm:max-w-[550px] sm:w-full w-[90vw] flex flex-col">
      <SheetHeader>
        <SheetTitle>{isCreateMode ? 'Create New Task' : 'Edit Task'}</SheetTitle>
        <SheetDescription>
          {isCreateMode ? "Fill in the details for your new task." : "Make changes to your task here. Click save when you're done."}
        </SheetDescription>
      </SheetHeader>

      {/* The form fields below are still the old style. We will refactor them next. */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
  <Label htmlFor="task-title">Task Title</Label>
  <Input id="task-title" value={editedTask.text} onChange={(e) => handleFieldChange('text', e.target.value)} />
</div>
        <div className="space-y-2">
  <Label htmlFor="task-description">Task Description</Label>
  <Textarea
    id="task-description"
    value={editedTask.description}
    onChange={(e) => handleFieldChange('description', e.target.value)}
    rows="3"
  />
</div>
        <div className="space-y-2">
  <Label>Subtasks</Label>
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
    <SortableContext items={editedTask.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
      <ul className="subtask-list">
        {editedTask.subtasks.slice().sort((a, b) => a.completed - b.completed).map(subtask => (
          <SortableSubtask key={subtask.id} subtask={subtask} onToggle={handleToggleSubtask} onDelete={handleDeleteSubtask} />
        ))}
      </ul>
    </SortableContext>
  </DndContext>
  <div className="flex gap-2">
    <Input
      type="text"
      placeholder="Add a new subtask..."
      value={newSubtaskText}
      onChange={e => setNewSubtaskText(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
    />
    <Button onClick={handleAddSubtask} variant="outline">Add Subtask</Button>
  </div>
</div>
        <div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="task-date">Date</Label>
    <Input id="task-date" type="date" value={editedTask.date} onChange={(e) => handleFieldChange('date', e.target.value)} />
  </div>
  <div className="space-y-2">
    <Label htmlFor="task-priority">Priority</Label>
    <Select value={String(editedTask.priority)} onValueChange={(value) => handleFieldChange('priority', parseInt(value))}>
      <SelectTrigger id="task-priority">
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1 - Urgent</SelectItem>
        <SelectItem value="2">2 - High</SelectItem>
        <SelectItem value="3">3 - Medium</SelectItem>
        <SelectItem value="4">4 - Low</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

        {isCreateMode && (
  <div className="space-y-2">
    <Label htmlFor="task-column">Column</Label>
    <Select value={editedTask.column} onValueChange={(value) => handleFieldChange('column', value)}>
      <SelectTrigger id="task-column">
        <SelectValue placeholder="Select column" />
      </SelectTrigger>
      <SelectContent>
        {projectColumns.map(col => (
          <SelectItem key={col} value={col}>{col}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

        <div className="space-y-2">
  <Label htmlFor="task-label">Add Label</Label>
  <Select value={editedTask.label} onValueChange={(value) => handleFieldChange('label', value === 'none' ? '' : value)}>
    <SelectTrigger id="task-label">
      <SelectValue placeholder="Select a label" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No Label</SelectItem>
      {availableLabels.map(({ name, emoji }) => (
        <SelectItem key={name} value={name}>{emoji ? `${emoji} ` : ''}{name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
<div className="space-y-2">
  <Label htmlFor="task-tag">Add Tag</Label>
  <Select value={editedTask.tag || ''} onValueChange={(value) => handleFieldChange('tag', value === 'none' ? '' : value)}>
    <SelectTrigger id="task-tag">
      <SelectValue placeholder="Select a tag" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No Tag</SelectItem>
      {projectTags.map((tag) => (
        <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
<div className="space-y-2">
  <Label htmlFor="move-project">Move to Project</Label>
  <Select
    onValueChange={(value) => handleFieldChange('projectId', value)}
    disabled={isCreateMode}
  >
    <SelectTrigger id="move-project">
      <SelectValue placeholder="Select a project..." />
    </SelectTrigger>
    <SelectContent>
      {allProjects.map(group => (
        <SelectGroup key={group.name}>
          <SelectLabel>{group.name}</SelectLabel>
          {group.projects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
</div>
        <div className="space-y-2">
  <Label>Comments</Label>
  <div className="space-y-4">
    {editedTask.comments?.map(c => (
      <div key={c.id}>
        <p className="text-sm">{c.text}</p>
        <p className="text-xs text-muted-foreground">{c.author} • {new Date(c.timestamp).toLocaleString()}</p>
      </div>
    ))}
  </div>
  <div className="flex gap-2">
    <Textarea
      placeholder="Add a comment..."
      value={newComment}
      onChange={e => setNewComment(e.target.value)}
      rows={2}
    />
    <Button onClick={handleAddComment} variant="outline">Add Comment</Button>
  </div>
</div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
}