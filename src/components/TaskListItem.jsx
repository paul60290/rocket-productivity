// src/components/TaskListItem.jsx
import React, { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  GripVertical, MessageSquare, CalendarDays, Bookmark, Tag, Network, ChevronRight
} from "lucide-react";

const priorityBorderClasses = {
    1: 'border-l-red-500',
    2: 'border-l-orange-400',
    3: 'border-l-yellow-400',
    4: 'border-l-green-500',
  };

const SubtaskItem = ({ subtask, onToggle }) => (
  <div className="flex items-center gap-3 pl-20 md:pl-28 pr-4 py-2"> {/* Responsive indentation */}
    <Checkbox
      id={`subtask-${subtask.id}`}
      checked={subtask.completed}
      onCheckedChange={onToggle}
      className="shrink-0"
    />
    <label
      htmlFor={`subtask-${subtask.id}`}
      className={cn("text-sm flex-1", subtask.completed && "line-through text-muted-foreground")}
    >
      {subtask.text}
    </label>
  </div>
);

// This is the presentational component
const TaskListItem = React.forwardRef(({ task, availableLabels, allTags, onOpenTask, onToggleComplete, onToggleSubtask, listeners, className, isDraggable = true, ...props }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const dateInfo = useMemo(() => {
    if (!task.date) return { colorClass: '', isVisible: false };
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);
    const dueDate = new Date(`${task.date}T00:00:00Z`);
    const isCompleted = task.completed;
    const isOverdue = dueDate < today && !isCompleted;

    let colorClass = 'text-muted-foreground';
    if (isOverdue) colorClass = 'text-red-500 font-semibold';
    else if (dueDate.getTime() === today.getTime()) colorClass = 'text-green-600 font-semibold';
    else if (dueDate.getTime() === tomorrow.getTime()) colorClass = 'text-yellow-600 font-semibold';

    return { colorClass, isVisible: true };
  }, [task.date, task.completed]);

  const subtaskProgress = useMemo(() => {
    if (!hasSubtasks) return { isVisible: false, text: '' };
    const total = task.subtasks.length;
    const completed = task.subtasks.filter(st => st.completed).length;
    return { isVisible: true, text: `${completed}/${total}` };
  }, [task.subtasks, hasSubtasks]);

  return (
    <Card
      ref={ref}
      {...props}
      data-completed={task.completed}
      className={cn(
        "p-0 data-[completed=true]:opacity-60 border-l-4 data-[completed=true]:border-l-border transition-colors",
        priorityBorderClasses[task.priority] || 'border-l-transparent',
        className
      )}
    >
      <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
        {/* Drag Handle */}
        {isDraggable && (
          <div {...listeners} className="py-1 cursor-grab touch-none text-muted-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Main Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task)}
          className="shrink-0"
        />

        {/* Subtask Toggle Chevron (New Position) */}
        <div
          className="flex items-center justify-center w-6"
          onClick={() => hasSubtasks && setIsExpanded(!isExpanded)}
        >
          {hasSubtasks && (
            <ChevronRight className={cn("h-4 w-4 transition-transform text-muted-foreground", isExpanded && "rotate-90")} />
          )}
        </div>

        {/* Task Content */}
        <div className="flex-1 flex flex-col cursor-pointer" onClick={() => onOpenTask(task)}>
          <p className={cn("text-sm font-medium leading-tight", task.completed && "line-through")}>
            {task.text}
          </p>
          <div className="mt-1.5 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
            {dateInfo.isVisible && (
              <div className={cn("flex items-center gap-1.5", dateInfo.colorClass)}>
                <CalendarDays className="h-4 w-4" />
                <span>{formatDate(task.date)}</span>
              </div>
            )}
            {subtaskProgress.isVisible && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Network className="h-4 w-4" />
                <span>{subtaskProgress.text}</span>
              </div>
            )}
            {task.label && (() => {
              const labelInfo = availableLabels?.find(l => l.name === task.label);
              return labelInfo ? (
                <div className="flex items-center gap-1.5" style={{ color: labelInfo.color }}>
                  <Bookmark className="h-4 w-4" />
                  <span>{labelInfo.name}</span>
                </div>
              ) : null;
            })()}
            {task.tag && (() => {
              const projectTags = allTags[task.projectId] || [];
              const tagInfo = projectTags.find(t => t.name === task.tag);
              return tagInfo ? (
                <div className="flex items-center gap-1.5" style={{ color: tagInfo.color }}>
                  <Tag className="h-4 w-4" />
                  <span>{tagInfo.name}</span>
                </div>
              ) : null;
            })()}
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{task.comments.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Subtasks */}
      {isExpanded && hasSubtasks && (
        <div className="border-t bg-muted/50"> {/* Added a subtle background color */}
          {task.subtasks.map(subtask => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={() => onToggleSubtask(task.id, subtask.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
});

// This is the new wrapper component that contains the drag-and-drop logic
export default function SortableTaskListItem({ isDraggable = true, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

 return (
    <TaskListItem
      ref={setNodeRef}
      style={style}
      task={props.task}
      {...props}
      {...attributes}
      listeners={listeners}
      isDraggable={isDraggable}
    />
  );
}