// src/components/TaskDetailPanel.jsx

import React, { useState } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function SortableSubtask({ subtask, onToggle, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subtask.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <li ref={setNodeRef} style={style} {...attributes} {...listeners} className={`subtask-item ${subtask.completed ? 'completed' : ''}`}>
            <input type="checkbox" checked={subtask.completed} onPointerDown={e => e.stopPropagation()} onChange={() => onToggle(subtask.id)} />
            <span className="subtask-text">{subtask.text}</span>
            <button className="delete-subtask-btn" onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(subtask.id)}>🗑️</button>
        </li>
    );
}

export default function TaskDetailPanel({ task, onClose, onUpdate, availableLabels }) {
  const [editedTask, setEditedTask] = useState({
    ...task,
    text: task?.text || '',
    date: task?.date || '',
    priority: task?.priority || 4,
    label: task?.label || '',
    description: task?.description || '',
    comments: task?.comments || [],
    subtasks: task?.subtasks || [],
  });
  const [newComment, setNewComment] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const priorityColors = { 1: '#ff4444', 2: '#ff8800', 3: '#ffdd00', 4: '#88cc88' };

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
    const saveData = {
      text: editedTask.text,
      description: editedTask.description,
      date: editedTask.date,
      priority: editedTask.priority,
      label: editedTask.label,
      comments: editedTask.comments,
      subtasks: editedTask.subtasks,
    };
    onUpdate(saveData);
    onClose();
  };

  return (
    <div className={`task-detail-panel ${task ? 'open' : ''}`}>
      <div className="modal-header">
        <h3>Edit Task</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {/* All the form JSX from the original component goes here */}
        <div className="form-group">
            <label>Task Title</label>
            <input type="text" value={editedTask.text} onChange={(e) => handleFieldChange('text', e.target.value)} />
        </div>
        <div className="form-group">
            <label>Task Description</label>
            <textarea value={editedTask.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows="3" />
        </div>
        <div className="form-group">
            <label>Subtasks</label>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                <SortableContext items={editedTask.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <ul className="subtask-list">
                        {editedTask.subtasks.slice().sort((a, b) => a.completed - b.completed).map(subtask => (
                            <SortableSubtask key={subtask.id} subtask={subtask} onToggle={handleToggleSubtask} onDelete={handleDeleteSubtask} />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
            <input type="text" placeholder="New subtask…" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} />
            <button onClick={handleAddSubtask}>Add Subtask</button>
        </div>
        <div className="form-row">
            <div className="form-group">
                <label>Date</label>
                <input type="date" value={editedTask.date} onChange={(e) => handleFieldChange('date', e.target.value)} />
            </div>
            <div className="form-group">
                <label>Priority</label>
                <select value={editedTask.priority} onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))} style={{backgroundColor: priorityColors[editedTask.priority]}}>
                    <option value={1}>1 - Urgent</option>
                    <option value={2}>2 - High</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Low</option>
                </select>
            </div>
        </div>
        <div className="form-group">
            <label>Add Tag</label>
            <select value={editedTask.label} onChange={(e) => handleFieldChange('label', e.target.value)}>
                <option value="">Select Tag</option>
                {availableLabels.map(({ name, emoji }) => (<option key={name} value={name}>{emoji ? `${emoji} ` : ''}{name}</option>))}
            </select>
        </div>
         <div className="form-group">
            <label>Comments</label>
            <div className="comments-list">
                {editedTask.comments?.map(c => (
                <div key={c.id} className="comment-item"><p className="comment-text">{c.text}</p><p className="comment-meta">{c.author} • {new Date(c.timestamp).toLocaleString()}</p></div>
                ))}
            </div>
            <textarea rows="2" placeholder="Add a comment…" value={newComment} onChange={e => setNewComment(e.target.value)} />
            <button onClick={handleAddComment}>Add Comment</button>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSave} className="save-btn">Save</button>
      </div>
    </div>
  );
}