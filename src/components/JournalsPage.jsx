import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import editIconUrl from '../assets/edit.svg';
import deleteIconUrl from '../assets/delete.svg';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Journals</h1>
          <p className="text-muted-foreground">
            Capture your thoughts, notes, and daily progress.
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Input
            type="text"
            placeholder="New journal name..."
            value={newJournalName}
            onChange={(e) => setNewJournalName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateJournal()}
            className="flex-1 sm:flex-auto"
          />
          <Button onClick={handleCreateJournal}>
            <Plus className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {journals.map((journal) => (
    <Card key={journal.id} className="flex flex-col">
      <div
        className="p-4 flex-1 cursor-pointer hover:bg-accent"
        onClick={() => {
          if (editingJournalId !== journal.id) {
            onSelectJournal(journal.id);
          }
        }}
      >
        {editingJournalId === journal.id ? (
          <Input
            type="text"
            value={editingJournalName}
            onChange={(e) => setEditingJournalName(e.target.value)}
            onBlur={() => handleRenameJournal(journal.id, editingJournalName)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameJournal(journal.id, editingJournalName);
              if (e.key === 'Escape') setEditingJournalId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="font-semibold text-card-foreground">{journal.name}</span>
        )}
      </div>
      <div className="p-2 border-t flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Rename Journal"
          onClick={(e) => {
            e.stopPropagation();
            setEditingJournalId(journal.id);
            setEditingJournalName(journal.name);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Delete Journal"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteJournal(journal.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  ))}
</div>
    </div>
  );
}