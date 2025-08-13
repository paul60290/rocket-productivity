// src/components/ListView.jsx
import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from "@/components/ui/card";
import SortableTaskListItem from './TaskListItem';
import useGroupedTasks from '@/hooks/useGroupedTasks'; // Import our new hook

export default function ListView({
  tasks,
  groupBy,
  projectData,
  availableLabels,
  allTags,
  onOpenTask,
  onToggleComplete,
  onToggleSubtask,
  isDraggable
}) {

  // Use the hook to process the raw task list
  const groupedTasks = useGroupedTasks(tasks, groupBy, projectData);
  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-4">
        <p className="text-center text-muted-foreground">No tasks to display.</p>
      </div>
    );
  }

  const allTaskIds = Object.values(groupedTasks).flat().map(task => task.id);

  return (
    <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
      <div className="p-4 md:p-6 space-y-6">
        {Object.entries(groupedTasks).map(([groupName, tasksInGroup]) => (
          <div key={groupName}>
            <h3 className="text-lg font-semibold mb-2 px-1">{groupName}</h3>
            <Card>
              <div className="divide-y">
                {tasksInGroup.map(task => (
                  <SortableTaskListItem
                    key={task.id}
                    task={task}
                    availableLabels={availableLabels}
                    allTags={allTags}
                    onOpenTask={onOpenTask}
                    onToggleComplete={onToggleComplete}
                    _isDraggable={isDraggable}
                  />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </SortableContext>
  );
}