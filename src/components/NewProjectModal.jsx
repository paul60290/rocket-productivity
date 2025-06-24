// src/components/NewProjectModal.jsx

import React, { useState } from 'react';

export default function NewProjectModal({ show, onClose, onSave, groups }) {
  const [projectName, setProjectName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Ungrouped');

  const handleSave = () => {
    if (!projectName.trim()) {
      alert('Please enter a project name.');
      return;
    }
    onSave(projectName.trim(), selectedGroup);
    // Reset form for next time
    setProjectName('');
    setSelectedGroup('Ungrouped');
    onClose();
  };

  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Marketing Campaign"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="projectGroup">Group</label>
            <input
              list="group-suggestions"
              id="projectGroup"
              type="text"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              placeholder="Choose or create a group..."
            />
            <datalist id="group-suggestions">
              <option value="Ungrouped" />
              {groups.map(group => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="save-btn" onClick={handleSave} disabled={!projectName.trim()}>
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}