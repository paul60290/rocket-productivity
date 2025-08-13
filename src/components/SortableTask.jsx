import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem'; // This now imports from our new TaskItem.jsx file

// This component adds the drag-and-drop logic to the presentational TaskItem.
function SortableTask({ task, onComplete, onClick, availableLabels, allTags, currentView }) {
  // Determine if dragging should be enabled based on the current view.
  const isDraggable = ['inbox', 'board'].includes(currentView);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    disabled: !isDraggable,
    data: {
      type: 'task',
      task: task,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <TaskItem
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'z-10' : ''}
      task={task}
      availableLabels={availableLabels}
      allTags={allTags}
      onComplete={onComplete}
      onClick={onClick}
      listeners={listeners}
      isDraggable={isDraggable} // Pass the flag down to show/hide the handle
      {...attributes}
    />
  );
}

export default SortableTask;