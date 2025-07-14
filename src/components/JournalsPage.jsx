import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

export default function JournalsPage({ onSelectJournal }) {
    const [journals, setJournals] = useState([]);
    const [newJournalName, setNewJournalName] = useState('');
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
            // In the future, this will navigate to the selected journal's entries.
            onClick={() => onSelectJournal(journal.id)}
          >
            {journal.name}
          </div>
        ))}
      </div>
    </div>
  );
}