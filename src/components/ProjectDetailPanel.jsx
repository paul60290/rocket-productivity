// src/components/ProjectDetailPanel.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ProjectDetailPanel({ project, user, db, onClose, onUpdate, allGroups = [], onTagUpdate }) {
  const [editedProject, setEditedProject] = useState({
    ...project,
    name: project?.name || '',
    group: project?.group || 'Ungrouped',
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

      // Create the new list of tags for the state update
      let updatedTag;
      const newTags = tags.map(tag => {
        if (tag.id === tagId) {
          updatedTag = { ...tag, color: newColor };
          return updatedTag;
        }
        return tag;
      });
      
      // Update the local state for this panel
      setTags(newTags);

      // Notify the parent App component of the change
      if (updatedTag) {
        onTagUpdate(project.id, updatedTag);
      }

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
      group: editedProject.group,
    };
    onUpdate(saveData);
  };

  if (!project) {
    return null;
  }

  return (
    <Sheet open={!!project} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full h-full sm:max-w-[660px] sm:w-full sm:h-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>Project Settings</SheetTitle>
          <SheetDescription>
            Edit your project details and manage tags. Click "Done" when you're finished.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              type="text"
              value={editedProject.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={handleSave}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-group">Project Group</Label>
            <Select
              value={editedProject.group}
              onValueChange={(value) => {
                handleFieldChange('group', value);
                // We need a slight delay to allow state to update before saving
                setTimeout(handleSave, 100);
              }}
            >
              <SelectTrigger id="project-group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {allGroups.map(groupName => (
                  <SelectItem key={groupName} value={groupName}>
                    {groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Project Tags</Label>
            <div className="max-h-[200px] overflow-y-auto pr-2 space-y-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Popover
                      open={editingTagId === tag.id}
                      onOpenChange={(isOpen) => setEditingTagId(isOpen ? tag.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 rounded-full border-2"
                          style={{ backgroundColor: tag.color, borderColor: tag.color }}
                          aria-label={`Change color for tag ${tag.name}`}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto">
                        <ColorPicker
                          value={tag.color}
                          onChange={(newColor) => {
                            handleUpdateTagColor(tag.id, newColor);
                            setEditingTagId(null); // Close popover after selection
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTag(tag.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No tags for this project yet.</p>
              )}
            </div>
            <div className="flex w-full items-center gap-2 pt-2 border-t">
              <Input
                placeholder="Add new tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag() }}
              />
              <Button onClick={handleAddTag}>Add</Button>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={onClose}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}