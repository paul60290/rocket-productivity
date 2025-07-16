import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import editIconUrl from '../assets/edit.svg';
import deleteIconUrl from '../assets/delete.svg';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function JournalsPage({ onSelectJournal }) {
    const [journals, setJournals] = useState([]);
    const [newJournalName, setNewJournalName] = useState('');
    const [editingJournalId, setEditingJournalId] = useState(null);
const [editingJournalName, setEditingJournalName] = useState('');
    const handleCreateJournal = async () => {
    if (!newJournalName.trim() || !auth.currentUser) return;
    try {
      const journalsCollectionRef = collection(db, 'users', auth.currentUser.uid, 'journals');
      const docRef = await addDoc(journalsCollectionRef, {
        name: newJournalName.trim(),
        createdAt: new Date()
      });
      // Add the new journal to the local state to update the UI
      setJournals([...journals, { id: docRef.id, name: newJournalName.trim() }]);
      setNewJournalName('');
    } catch (error) {
      console.error("Error creating journal: ", error);
      alert("Failed to create journal.");
    }
  };
  const handleDeleteJournal = async (journalId) => {
    if (!window.confirm("Are you sure you want to delete this journal? This cannot be undone.")) {
      return;
    }
    if (!auth.currentUser) return;

    try {
      const journalRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId);
      await deleteDoc(journalRef);

      // Update local state to remove the journal
      setJournals(journals.filter(journal => journal.id !== journalId));
    } catch (error) {
      console.error("Error deleting journal: ", error);
      alert("Failed to delete journal.");
    }
  };
  const handleRenameJournal = async (journalId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName || !auth.currentUser) {
      setEditingJournalId(null); // Exit editing mode if name is empty
      return;
    }

    const originalJournal = journals.find(j => j.id === journalId);
    if (originalJournal && originalJournal.name === trimmedName) {
        setEditingJournalId(null); // Exit if name hasn't changed
        return;
    }


    try {
      const journalRef = doc(db, 'users', auth.currentUser.uid, 'journals', journalId);
      await updateDoc(journalRef, {
        name: trimmedName
      });

      // Update local state
      setJournals(journals.map(j => j.id === journalId ? { ...j, name: trimmedName } : j));
    } catch (error) {
      console.error("Error renaming journal: ", error);
      alert("Failed to rename journal.");
    } finally {
        setEditingJournalId(null); // Always exit editing mode
    }
  };
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchJournals = async () => {
      const journalsCollectionRef = collection(db, 'users', auth.currentUser.uid, 'journals');
      const q = query(journalsCollectionRef);
      const querySnapshot = await getDocs(q);
      const fetchedJournals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJournals(fetchedJournals);
    };

    fetchJournals();
  }, []); // The empty array ensures this runs only once on mount
  return (
    <div className="projects-page-container">
      <h1>My Journals</h1>
      <div className="add-label" style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          value={newJournalName}
          onChange={(e) => setNewJournalName(e.target.value)}
          placeholder="New journal name..."
          onKeyDown={(e) => e.key === 'Enter' && handleCreateJournal()}
        />
        <button onClick={handleCreateJournal}>Create Journal</button>
      </div>
      <div className="project-grid">
  {journals.map((journal) => (
    <div
      key={journal.id}
      className="project-card"
      onClick={() => {
        if (editingJournalId !== journal.id) {
          onSelectJournal(journal.id);
        }
      }}
    >
      {editingJournalId === journal.id ? (
        <input
          type="text"
          value={editingJournalName}
          onChange={(e) => setEditingJournalName(e.target.value)}
          onBlur={() => handleRenameJournal(journal.id, editingJournalName)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRenameJournal(journal.id, editingJournalName);
            }
            if (e.key === 'Escape') {
              setEditingJournalId(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <>
          <span onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingJournalId(journal.id);
            setEditingJournalName(journal.name);
          }}>
            {journal.name}
          </span>
          <div className="project-card-actions">
  <button
    className="edit-project-btn"
    title="Edit Journal"
    onClick={(e) => {
      e.stopPropagation();
      setEditingJournalId(journal.id);
      setEditingJournalName(journal.name);
    }}
  >
    <img src={editIconUrl} alt="Edit Journal" />
  </button>
  <button
    className="delete-group-btn"
    title="Delete Journal"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteJournal(journal.id);
    }}
  >
    <img src={deleteIconUrl} alt="Delete Journal" />
  </button>
</div>
        </>
      )}
    </div>
  ))}
</div>
    </div>
  );
}