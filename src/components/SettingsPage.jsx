import React, { useState, useEffect } from 'react';
import editIconUrl from '../assets/edit.svg';
import deleteIconUrl from '../assets/delete.svg';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/ColorPicker";


export default function SettingsPage({ currentUser, onUpdateName, initialLabels, initialGroups, onUpdateLabels, onAddGroup, onRenameGroup, onDeleteGroup, currentTheme, onToggleTheme, showCompletedTasks, onToggleShowCompletedTasks }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [userName, setUserName] = useState(currentUser?.displayName || '');

  useEffect(() => {
    if (currentUser?.displayName) {
      setUserName(currentUser.displayName);
    }
  }, [currentUser]);
  const [editedLabels, setEditedLabels] = useState(initialLabels.map(label => ({ ...label, showPicker: false })));
  const [newLabel, setNewLabel] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState({ name: null, newName: '' });
  const [editingLabelId, setEditingLabelId] = useState(null);
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
  };

  return (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground">Manage your account settings, appearance, and data.</p>
    </div>
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="labels">Labels</TabsTrigger>
        <TabsTrigger value="groups">Groups</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-6">
  <Card>
    <CardHeader>
      <CardTitle>Profile & Appearance</CardTitle>
      <CardDescription>
        Update your name and customize the look and feel of the app.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="userName">Your Name</Label>
        <Input
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name"
        />
        <p className="text-sm text-muted-foreground">
          This will be used for personalized greetings.
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Dark Mode</Label>
            <CardDescription>
              Enable the dark color scheme.
            </CardDescription>
          </div>
          <Switch
            checked={currentTheme === 'dark'}
            onCheckedChange={onToggleTheme}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Show Completed Tasks</Label>
            <CardDescription>
              Display tasks that have been marked as complete.
            </CardDescription>
          </div>
          <Switch
            checked={showCompletedTasks}
            onCheckedChange={onToggleShowCompletedTasks}
          />
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
<TabsContent value="labels" className="mt-6">
  <Card>
    <CardHeader>
      <CardTitle>Global Labels</CardTitle>
      <CardDescription>
        Create and manage labels that can be used across all of your projects.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
        {editedLabels.map((label, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Popover
                open={editingLabelId === index}
                onOpenChange={(isOpen) => setEditingLabelId(isOpen ? index : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full border-2"
                    style={{ backgroundColor: label.color, borderColor: label.color }}
                    aria-label={`Change color for label ${label.name}`}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto">
                  <ColorPicker
                    value={label.color}
                    onChange={(newColor) => {
                      const updated = [...editedLabels];
                      updated[index].color = newColor;
                      setEditedLabels(updated);
                      setEditingLabelId(null);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Label name"
                value={label.name}
                onChange={(e) => {
                  const updated = [...editedLabels];
                  updated[index].name = e.target.value;
                  setEditedLabels(updated);
                }}
                className="flex-1"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLabel(label)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </CardContent>
    <CardFooter className="border-t pt-6 flex-col items-start gap-4">
      <div className="flex w-full items-center gap-2">
        <Input
          placeholder="New label name..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLabel()}
        />
        <Button onClick={addLabel}>Add Label</Button>
      </div>
      <Button variant="outline" onClick={handleSaveChanges}>Save All Label Changes</Button>
    </CardFooter>
  </Card>
</TabsContent>
<TabsContent value="groups" className="mt-6">
  <Card>
    <CardHeader>
      <CardTitle>Project Groups</CardTitle>
      <CardDescription>
        Organize your projects into groups. Changes here are saved automatically.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {groups.map((groupName) => (
        <div key={groupName} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
          {editingGroup.name === groupName ? (
            <Input
              value={editingGroup.newName}
              onChange={(e) => setEditingGroup({ ...editingGroup, newName: e.target.value })}
              onBlur={handleSaveGroupRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveGroupRename()}
              autoFocus
              className="flex-1"
            />
          ) : (
            <span className="flex-1 font-medium">{groupName}</span>
          )}
          {groupName !== 'Ungrouped' && (
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => handleStartEditGroup(groupName)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDeleteGroup(groupName)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </CardContent>
    <CardFooter className="border-t pt-6">
      <div className="flex w-full items-center gap-2">
        <Input
          placeholder="New group name..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onAddGroup(newGroupName.trim()); setNewGroupName(''); } }}
        />
        <Button onClick={() => { onAddGroup(newGroupName.trim()); setNewGroupName(''); }}>Add Group</Button>
      </div>
    </CardFooter>
  </Card>
</TabsContent>
      {/* We will add the content for each tab in the next steps */}
    </Tabs>
  </div>
);
}