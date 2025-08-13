// src/components/SortableProjectItem.jsx

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// This component is a "wrapper" that makes any child component draggable.
export default function SortableProjectItem(props) {
  // The useSortable hook from dnd-kit provides all the necessary props and refs.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: props.id,
    data: {
      type: 'project',
    }
  });

  // This applies the CSS transforms needed to show the item moving.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // We render a div that gets all the dnd-kit properties,
  // and inside it, we render the actual component we want to drag (props.children).
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </div>
  );
}