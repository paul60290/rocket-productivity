// src/components/TaskDetailPanel.jsx

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, getDocs } from "firebase/firestore";

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function SortableSubtask({ subtask, onToggle, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subtask.id });

    // The styles from dnd-kit for dragging
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // We stop the drag from starting if the user clicks the checkbox or the delete button
    const stopPropagation = (e) => e.stopPropagation();

    return (
        <li ref={setNodeRef} style={style} {...attributes} {...listeners} className={`subtask-item ${subtask.completed ? 'completed' : ''}`}>
            <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => onToggle(subtask.id)}
                onPointerDown={stopPropagation}
            />
            <span className="subtask-text">{subtask.text}</span>
            <button
                className="delete-subtask-btn"
                onClick={() => onDelete(subtask.id)}
                onPointerDown={stopPropagation}
            >
                🗑️
            </button>
        </li>
    );
}

export default function TaskDetailPanel({ task, onClose, onUpdate, availableLabels, user, db, projectColumns = [] }) {
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
      tag: editedTask.tag,
      comments: editedTask.comments,
      subtasks: editedTask.subtasks,
      column: editedTask.column,
    };
    // Pass the projectId back along with the task data
    onUpdate(saveData, editedTask.projectId);
    onClose();
  };

  return (
    <div className={`task-detail-panel ${task ? 'open' : ''}`}>
      <div className="modal-header">
        <h3>{isCreateMode ? 'Create New Task' : 'Edit Task'}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
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

        {/* Column Selector - Only in Create Mode */}
        {isCreateMode && (
          <div className="form-group">
            <label>Column</label>
            <select value={editedTask.column} onChange={(e) => handleFieldChange('column', e.target.value)}>
              {projectColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
            <label>Add Label</label>
            <select value={editedTask.label} onChange={(e) => handleFieldChange('label', e.target.value)}>
                <option value="">Select Label</option>
                {availableLabels.map(({ name, emoji }) => (<option key={name} value={name}>{emoji ? `${emoji} ` : ''}{name}</option>))}
            </select>
        </div>
        <div className="form-group">
            <label>Add Tag</label>
            <select value={editedTask.tag || ''} onChange={(e) => handleFieldChange('tag', e.target.value)}>
                <option value="">Select Tag</option>
                {projectTags.map((tag) => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                ))}
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
    <button onClick={onClose} className="btn btn-tertiary">Cancel</button>
    <button onClick={handleSave} className="btn btn-primary">Save</button>
  </div>
    </div>
  );
}