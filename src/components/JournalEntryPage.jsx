import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

export default function JournalEntryPage({ journalId }) {
  const [entry, setEntry] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [journalName, setJournalName] = useState('');
  const [entryDate, setEntryDate] = useState(new Date());

  // Get today's date in YYYY-MM-DD format for document ID
  const todayDocId = entryDate.toISOString().split('T')[0];

  useEffect(() => {
    if (!journalId || !auth.currentUser) return;

    const fetchJournalData = async () => {
      // 1. Fetch the journal's name
      const journalRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId);
      const journalSnap = await getDoc(journalRef);
      if (journalSnap.exists()) {
        setJournalName(journalSnap.data().name);
      }

      // 2. Fetch todays entry for this journal
      const entryRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries', todayDocId);
      const entrySnap = await getDoc(entryRef);
      if (entrySnap.exists()) {
        setEntry(entrySnap.data().content);
        setIsEditing(false); // If an entry exists, start in view modes
      } else {
        setEntry('');
        setIsEditing(true); // If no entry exists, start in edit mode
      }
    };

    fetchJournalData();
  }, [journalId, todayDocId]); // Rerun if the journal or date changes

 const handleSave = async () => {
    if (!journalId || !auth.currentUser) return;

    try {
      const entryRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId, 'entries', todayDocId);
      await setDoc(entryRef, {
        content: entry,
        lastModified: new Date()
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving journal entry: ", error);
      alert("Failed to save entry.");
    }
  };

  return (
    <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="settings-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
    <h1>{journalName}</h1>
    <input 
        type="date"
        value={entryDate.toISOString().split('T')[0]}
        onChange={(e) => setEntryDate(new Date(e.target.value))}
        className="form-group"
        style={{ padding: '8px', border: '1px solid var(--border-primary)', borderRadius: '4px' }}
    />
</div>
        {isEditing ? (
          <button onClick={handleSave} className="save-btn">Save</button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="edit-btn">Edit</button>
        )}
      </div>

      <div className="form-group">
        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          readOnly={!isEditing}
          placeholder="What's on your mind?"
          style={{ 
            width: '100%', 
            minHeight: '400px', 
            padding: '15px',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            lineHeight: '1.6'
          }}
        />
      </div>
    </div>
  );
}