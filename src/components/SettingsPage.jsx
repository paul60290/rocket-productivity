import React, { useState, useEffect } from 'react';
import deleteIconUrl from '../assets/delete.svg';


export default function SettingsPage({
  initialLabels,
  initialGroups,
  onUpdateLabels,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}) {
  const [activeTab, setActiveTab] = useState('labels');
  const [editedLabels, setEditedLabels] = useState(initialLabels.map(label => ({ ...label, showPicker: false })));
  const [newLabel, setNewLabel] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState({ name: null, newName: '' });
  const [groups, setGroups] = useState(initialGroups);

  // This effect ensures that if the groups are updated in App.jsx (e.g., a new project is created with a new group),
  // the state in this component stays in sync.
  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);


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
  
  const handleSaveChanges = () => {
      // For now, only labels need an explicit save. Group changes happen instantly.
      onUpdateLabels(editedLabels);
      alert("Label changes saved!"); // Provide user feedback
  };

  return (
  <div className="settings-page">
      <div className="settings-page-header">
          <h1>Settings</h1>
            <button onClick={handleSaveChanges} className="save-btn">Save Changes</button>
        </div>
        
        <div className="modal-tabs">
          <button className={activeTab === 'labels' ? 'active' : ''} onClick={() => setActiveTab('labels')}>Labels</button>
          <button className={activeTab === 'groups' ? 'active' : ''} onClick={() => setActiveTab('groups')}>Groups</button>
        </div>

        {/* We can reuse the modal-scroll-body class or create a new one */}
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
                      <div className="color-display" style={{ backgroundColor: label.color }} onClick={(e) => {
                        // Close all other pickers first
                        const updated = editedLabels.map((l, i) => ({
                          ...l, 
                          showPicker: i === index ? !l.showPicker : false
                        }));
                        setEditedLabels(updated);
                        
                        // Manage CSS classes for z-index stacking
                        const labelItems = document.querySelectorAll('.label-item');
                        labelItems.forEach(item => item.classList.remove('picker-open'));
                        
                        if (!updated[index].showPicker) {
                          e.target.closest('.label-item').classList.add('picker-open');
                        }
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
                          <button onClick={() => onDeleteGroup(groupName)} className="delete-group-btn" title="Delete Group">
    <img src={deleteIconUrl} alt="Delete Group" />
</button>
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
    </div>
  );
}