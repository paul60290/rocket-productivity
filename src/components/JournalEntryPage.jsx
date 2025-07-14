import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import MiniCalendar from './MiniCalendar';
import {
  FaBold, FaItalic, FaStrikethrough, FaCode, FaHeading,
  FaListUl, FaListOl, FaQuoteLeft, FaUndo, FaRedo
} from 'react-icons/fa';
import { MdHorizontalRule } from 'react-icons/md';

// This is our new, more robust toolbar component
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="menubar icon-toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="Bold">
          <FaBold />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="Italic">
          <FaItalic />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="Strikethrough">
          <FaStrikethrough />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().chain().focus().toggleCode().run()} className={editor.isActive('code') ? 'is-active' : ''} title="Code">
          <FaCode />
        </button>
      </div>
      <div className="toolbar-group">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="Heading 1">
          <FaHeading /> H1
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="Heading 2">
          <FaHeading /> H2
        </button>
      </div>
      <div className="toolbar-group">
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="Bullet List">
          <FaListUl />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="Numbered List">
          <FaListOl />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="Blockquote">
          <FaQuoteLeft />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <MdHorizontalRule />
        </button>
      </div>
      <div className="toolbar-group">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} title="Undo">
          <FaUndo />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} title="Redo">
          <FaRedo />
        </button>
      </div>
    </div>
  );
};

export default function JournalEntryPage({ journalId }) {
  // The 'entry' state is now managed by the editor, so we can remove it.
  const [isEditing, setIsEditing] = useState(true);
  const [journalName, setJournalName] = useState('');
  const [entryDate, setEntryDate] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState([]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '', // Start with empty content
    editable: isEditing,
  });

  // Get today's date in YYYY-MM-DD format for document ID
  const todayDocId = entryDate.toISOString().split('T')[0];

  useEffect(() => {
  const fetchContent = async () => {
    if (!editor || !journalId || !auth.currentUser) return;
    const entryRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries', todayDocId);
    const entrySnap = await getDoc(entryRef);

    if (entrySnap.exists()) {
      editor.commands.setContent(entrySnap.data().content);
      setIsEditing(false);
    } else {
      editor.commands.setContent('');
      setIsEditing(true);
    }
  };

  fetchContent();
}, [todayDocId, editor]); // Only re-run when the selected date changes

useEffect(() => {
  const fetchMetadata = async () => {
    if (!journalId || !auth.currentUser) return;
    // 1. Fetch journal name
    const journalRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId);
    const journalSnap = await getDoc(journalRef);
    if (journalSnap.exists()) {
      setJournalName(journalSnap.data().name);
    }
    // 2. Fetch all entry IDs for markers
    const entriesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries');
    const querySnapshot = await getDocs(entriesCollectionRef);
    const entryDates = querySnapshot.docs.map(doc => doc.id);
    setDaysWithEntries(entryDates);
  };

  fetchMetadata();
}, [journalId]); // Only re-run when the journal itself changes

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

      // Immediately update the UI with the new entry marker
      if (!daysWithEntries.includes(todayDocId)) {
        setDaysWithEntries([...daysWithEntries, todayDocId]);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error saving journal entry: ", error);
      alert("Failed to save entry.");
    }
  };

  return (
    <div className="settings-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="settings-page-header">
        <h1>{journalName}</h1>
        {isEditing ? (
          <button onClick={handleSave} className="save-btn">Save</button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-btn">Edit</button>
        )}
      </div>

      <div className="journal-entry-container">
        <div className="journal-editor-main">
          {isEditing && <MenuBar editor={editor} />}
          <EditorContent editor={editor} />
        </div>
        <div className="journal-sidebar">
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