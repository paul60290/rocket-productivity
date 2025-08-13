import React, { useMemo } from 'react';
import { cn, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, CalendarDays, Network, Bookmark, Tag, MessageSquare } from "lucide-react";

// The TaskItem component is a "dumb" presentational component.
// It receives all its data and functions as props.
// We use React.forwardRef to pass the 'ref' down to the DOM element,
// which is necessary for the drag-and-drop library.

const TaskItem = React.forwardRef(({ task, availableLabels, allTags, onComplete, onClick, listeners, className, isDraggable = true, ...props }, ref) => {
  const priorityBorderClasses = {
    1: 'border-l-red-500',
    2: 'border-l-orange-400',
    3: 'border-l-yellow-400',
    4: 'border-l-green-500',
  };

  const dateInfo = useMemo(() => {
    if (!task.date) return { colorClass: '', isVisible: false };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const dueDate = new Date(`${task.date}T00:00:00Z`);

    const isCompleted = task.completed;
    const isOverdue = dueDate < today && !isCompleted;

    let colorClass = 'text-muted-foreground'; // Default color
    if (isOverdue) {
      colorClass = 'text-red-500 font-semibold';
    } else if (dueDate.getTime() === today.getTime()) {
      colorClass = 'text-green-600 font-semibold';
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      colorClass = 'text-yellow-600 font-semibold';
    }

    return { colorClass, isVisible: true };
  }, [task.date, task.completed]);

  const subtaskProgress = useMemo(() => {
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) {
      return { isVisible: false, text: '' };
    }
    const total = subtasks.length;
    const completed = subtasks.filter(st => st.completed).length;
    return { isVisible: true, text: `${completed}/${total}` };
  }, [task.subtasks]);

  return (
    <Card
      ref={ref}
      {...props}
      data-completed={task.completed}
      className={cn(
        "p-3 data-[completed=true]:opacity-60 border-l-4 data-[completed=true]:border-l-border",
        priorityBorderClasses[task.priority] || 'border-l-transparent',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {isDraggable && (
          <div {...listeners} className="py-1 cursor-grab touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <Checkbox
          checked={task.completed}
          onCheckedChange={onComplete}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        <div className="flex-1" onClick={onClick}>
          <p className={`text-sm font-medium leading-tight ${task.completed ? 'line-through' : ''}`}>{task.text}</p>
          <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-2 text-xs">
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
    </Card>
  );
});

export default TaskItem;