import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function EditableTitle({ title, onUpdate, className = "" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== title) {
      onUpdate(editValue.trim());
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={cn("h-8 p-1", className)}
      />
    );
  }

  return (
    <span
      className={cn("cursor-pointer rounded-md px-2 -mx-2", className)}
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {title}
    </span>
  );
}

export default EditableTitle;