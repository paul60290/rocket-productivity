import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import MiniCalendar from './MiniCalendar';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Undo, Redo
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";


// This is our new, more robust toolbar component
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md p-1 flex items-center flex-wrap gap-1 mb-4">
      <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('code')} onPressedChange={() => editor.chain().focus().toggleCode().run()} title="Code">
        <Code className="h-4 w-4" />
      </Toggle>
      
      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive('heading', { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
        <Quote className="h-4 w-4" />
      </Toggle>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} title="Undo">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} title="Redo">
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function JournalEntryPage({ journalId, user }) {
  // The 'entry' state is now managed by the editor, so we can remove it.
  const [isEditing, setIsEditing] = useState(true);
  const [journalName, setJournalName] = useState('');
  const [entryDate, setEntryDate] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState([]);

  const editor = useEditor({
  extensions: [StarterKit],
  content: '', // Start with empty content
  editable: isEditing,
  editorProps: {
    attributes: {
      class: 'min-h-[600px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
    },
  },
});

  // Get today's date in YYYY-MM-DD format for document ID
  const todayDocId = entryDate.toISOString().split('T')[0];

  useEffect(() => {
    const fetchContent = async () => {
      if (!editor || !journalId || !user) { // Use user from props
        if (editor) editor.commands.setContent('');
        return;
      }
      const entryRef = doc(db, 'users', user.uid, 'journals', journalId, 'entries', todayDocId); // Use user from props
      const entrySnap = await getDoc(entryRef);

      if (entrySnap.exists()) {
        if (editor.getHTML() !== entrySnap.data().content) {
          editor.commands.setContent(entrySnap.data().content);
        }
        setIsEditing(false);
      } else {
        editor.commands.setContent('');
        setIsEditing(true);
      }
    };

    fetchContent();
  }, [todayDocId, editor, journalId, user]); // Use user from props in dependency array

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!journalId || !user) { // Use user from props
        setJournalName('');
        setDaysWithEntries([]);
        return;
      }
      // 1. Fetch journal name
      const journalRef = doc(db, 'users', user.uid, 'journals', journalId); // Use user from props
      const journalSnap = await getDoc(journalRef);
      if (journalSnap.exists()) {
        setJournalName(journalSnap.data().name);
      } else {
        setJournalName('Journal Not Found');
      }
      // 2. Fetch all entry IDs for markers
      const entriesCollectionRef = collection(db, 'users', user.uid, 'journals', journalId, 'entries'); // Use user from props
      const querySnapshot = await getDocs(entriesCollectionRef);
      const entryDates = querySnapshot.docs.map(doc => doc.id);
      setDaysWithEntries(entryDates);
    };

    fetchMetadata();
  }, [journalId, user]); // Use user from props in dependency array

  // This effect syncs the editor's editable status with the component's state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditing);
  }, [isEditing, editor]);

  const handleSave = async () => {
    if (!journalId || !auth.currentUser || !editor) return;

    const htmlContent = editor.getHTML();

    // Prevent saving an empty entry unless it's to clear an existing one
    if (editor.isEmpty && !daysWithEntries.includes(todayDocId)) {
      return;
    }

    try {
      const entryRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries', todayDocId);
      await setDoc(entryRef, {
        content: htmlContent,
        lastModified: new Date()
      });

      // Re-fetch the list of entries to ensure the calendar marks are up to date
      const entriesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries');
      const querySnapshot = await getDocs(entriesCollectionRef);
      const entryDates = querySnapshot.docs.map(doc => doc.id);
      setDaysWithEntries(entryDates);

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving journal entry: ", error);
      alert("Failed to save entry.");
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{journalName}</h1>
        {isEditing ? (
          <Button onClick={handleSave}>Save Entry</Button>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        <div className="lg:col-span-3 flex flex-col">
          {isEditing && <MenuBar editor={editor} />}
          <EditorContent editor={editor} />
        </div>
        <div className="lg:col-span-1">
          <MiniCalendar
            selectedDate={entryDate}
            onDateChange={setEntryDate}
            entries={daysWithEntries}
          />
        </div>
      </div>
    </div>
  );
}