import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

import EditableTitle from './EditableTitle'; // The component we just made!
import SortableTask from './SortableTask';

function Column({ column, tasks = [], onAddTask, onUpdateTask, onOpenTask, onRenameColumn, onDeleteColumn, isEditable = true, availableLabels, allTags = {}, currentView }) {
  // Safety check for column prop
  if (!column) {
    console.error("Column component received undefined column prop");
    return null;
  }
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const inputRef = useRef(null);

  const sortedTasks = Array.isArray(tasks)
    ? [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.priority - b.priority;
    })
    : [];

  const { setNodeRef } = useDroppable({ id: column.id });

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const taskData = {
      text: newTask.trim(),
      column: column.id, // Use the column's unique ID
      completed: false,
      priority: 4,
    };
    onAddTask(taskData);
    setNewTask('');
    setAdding(false);
  };

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  return (
    <div className="flex flex-col w-full shrink-0 md:w-80 bg-card rounded-lg h-full max-h-full snap-start p-3" ref={setNodeRef}>
      <div className="flex items-center justify-between p-3 border-b">
        <EditableTitle
          title={column.name} // Display the column's name
          onUpdate={(newName) => onRenameColumn(column.id, newName)} // Pass the ID and new name on update
          className="font-semibold"
        />
        {isEditable && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteColumn(column.id)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Delete column</span>
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onComplete={() => onUpdateTask(column.id, task.id, { completed: !task.completed })}
              onClick={() => onOpenTask(task)}
              availableLabels={availableLabels}
              allTags={allTags}
              currentView={currentView}
            />
          ))}
        </SortableContext>
        {isEditable && (
          adding ? (
            <div className="p-1 space-y-2">
              <Card>
                <CardContent className="p-2">
                  <Textarea
                    ref={inputRef}
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    placeholder="Task title..."
                    className="w-full border-none focus-visible:ring-0 resize-none text-sm shadow-none p-1"
                    autoFocus
                  />
                </CardContent>
              </Card>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddTask} className="w-full">Add Task</Button>
                <Button variant="ghost" size="icon" onClick={() => setAdding(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="flex items-center justify-center w-full p-2 text-sm text-muted-foreground rounded-md hover:bg-accent"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Add Task</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default Column;