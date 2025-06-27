// src/components/ProjectDetailPanel.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function ProjectDetailPanel({ project, user, db, onClose, onUpdate }) {
  const [editedProject, setEditedProject] = useState({
    ...project,
    name: project?.name || '',
  });
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name || !project || !user) return;

    if (tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) {
      alert(`A tag named "${name}" already exists for this project.`);
      return;
    }

    try {
      const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tags');
      const newTagData = {
        name: name,
        color: '#888888' 
      };
      const docRef = await addDoc(tagsCollectionRef, newTagData);
      setTags(prevTags => [...prevTags, { id: docRef.id, ...newTagData }]);
      setNewTagName('');
    } catch (error) {
      console.error("Error adding tag: ", error);
      alert("Failed to add new tag. Please try again.");
    }
  };

  const handleDeleteTag = async (tagIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) {
      return;
    }
    if (!project || !user) return;
    try {
      const tagRef = doc(db, 'users', user.uid, 'projects', project.id, 'tags', tagIdToDelete);
      await deleteDoc(tagRef);
      setTags(prevTags => prevTags.filter(tag => tag.id !== tagIdToDelete));
    } catch (error) {
      console.error("Error deleting tag: ", error);
      alert("Failed to delete tag. Please try again.");
    }
  };

  const handleUpdateTagColor = async (tagId, newColor) => {
    if (!project || !user) return;
  
    const tagRef = doc(db, 'users', user.uid, 'projects', project.id, 'tags', tagId);
  
    try {
      await updateDoc(tagRef, { color: newColor });
  
      // Optimistically update the local state
      setTags(prevTags => 
        prevTags.map(tag => 
          tag.id === tagId ? { ...tag, color: newColor } : tag
        )
      );
    } catch (error) {
      console.error("Error updating tag color: ", error);
      alert("Failed to update tag color.");
    }
  };

  const colorOptions = [
    { name: 'Scarlet Red', value: '#c92a2a' }, { name: 'Crimson', value: '#801515' },
    { name: 'Sky Blue', value: '#228be6' }, { name: 'Navy', value: '#0b3d91' },
    { name: 'Tangerine', value: '#f76707' }, { name: 'Burnt Orange', value: '#b34700' },
    { name: 'Goldenrod', value: '#f59f00' }, { name: 'Mustard', value: '#a87900' },
    { name: 'Emerald', value: '#40c057' }, { name: 'Forest Green', value: '#1e7d32' },
    { name: 'Lavender', value: '#9c36b5' }, { name: 'Royal Purple', value: '#5e2b97' },
    { name: 'Rose', value: '#f06595' }, { name: 'Mulberry', value: '#b03060' }
  ];

  useEffect(() => {
    if (project && user) {
      const fetchTags = async () => {
        const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tags');
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        const fetchedTags = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTags(fetchedTags);
      };
      fetchTags();
    } else {
      setTags([]);
    }
  }, [project, user, db]);

  useEffect(() => {
    setEditedProject({
      ...project,
      name: project?.name || '',
    });
  }, [project]);

  const handleFieldChange = (field, value) => {
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const saveData = {
      name: editedProject.name,
    };
    onUpdate(saveData);
  };

  if (!project) {
    return null;
  }

  return (
    <div className={`task-detail-panel ${project ? 'open' : ''}`}>
      <div className="modal-header">
        <h3>Project Settings</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={editedProject.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={handleSave}
            />
        </div>

        <div className="form-group">
            <label>Project Tags</label>
            <div className="label-list" style={{maxHeight: '200px', overflowY: 'auto', paddingRight: '10px'}}>
                {tags.map((tag) => (
                    <div key={tag.id} className="label-item">
                        <div className="label-color-control">
                            <div
                                className="color-display"
                                style={{ backgroundColor: tag.color }}
                                onClick={() => setEditingTagId(editingTagId === tag.id ? null : tag.id)}
                            ></div>
                            {editingTagId === tag.id && (
                            <div className="color-list">
                                {colorOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className="color-option-row"
                                    onClick={() => {
                                        handleUpdateTagColor(tag.id, option.value);
                                        setEditingTagId(null);
                                    }}
                                >
                                    <span className="color-circle" style={{ backgroundColor: option.value }}>
                                    {tag.color === option.value && <span className="checkmark">✓</span>}
                                    </span>
                                    <span className="color-name">{option.name}</span>
                                </div>
                                ))}
                            </div>
                            )}
                        </div>
                        <span>{tag.name}</span>
                        <button className="remove-btn" onClick={() => handleDeleteTag(tag.id)}>×</button>
                    </div>
                ))}
                {tags.length === 0 && (
                    <div style={{color: '#888', textAlign: 'center', padding: '10px 0'}}>No tags for this project yet.</div>
                )}
            </div>
            <div className="add-label">
                <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {if(e.key === 'Enter') handleAddTag()}}
                    placeholder="Add new tag..."
                />
                <button onClick={handleAddTag}>Add</button>
            </div>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="save-btn">Done</button>
      </div>
    </div>
  );
}