// src/components/NewProjectModal.jsx

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your new project a name and assign it to a group. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectName" className="text-right">
              Name
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Marketing Campaign"
              className="col-span-3"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectGroup" className="text-right">
              Group
            </Label>
            <Input
              id="projectGroup"
              list="group-suggestions"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              placeholder="Choose or create a group..."
              className="col-span-3"
            />
            <datalist id="group-suggestions">
              <option value="Ungrouped" />
              {groups.map(group => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!projectName.trim()}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}