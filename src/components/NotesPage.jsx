import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    createNote,
    getNoteById,
    updateNote,
    listRecentNotes,
    observeRecentNotes,
    deleteNote
} from "@/lib/notes";
import { listPortfolios, listNotebooksByPortfolio } from "@/lib/portfolios";
import NoteEditor from "./NoteEditor";
import { ChevronRight, ChevronDown, Folder, Book } from "lucide-react";

const NONE = "__none__";

export default function NotesPage() {
    // Current note
    const [note, setNote] = useState(null);
    const [saveStatus, setSaveStatus] = useState('idle');

    // Sidebar data
    const [sidebarNotes, setSidebarNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [portfolios, setPortfolios] = useState([]);
    // Map of portfolioKey -> notebooks[]
    const [notebooksByPortfolio, setNotebooksByPortfolio] = useState({});
    // Expanded state
    const [expandedPortfolios, setExpandedPortfolios] = useState([]); // keys: portfolioId or "__none__"
    const [expandedNotebooks, setExpandedNotebooks] = useState([]);   // notebook ids

    // ---------- Helpers ----------
    const portfolioKey = (pid) => (pid == null ? NONE : pid);

    const togglePortfolio = async (pid) => {
        const key = portfolioKey(pid);
        const isOpen = expandedPortfolios.includes(key);
        if (isOpen) {
            setExpandedPortfolios(expandedPortfolios.filter(k => k !== key));
            return;
        }
        // Open
        setExpandedPortfolios([...expandedPortfolios, key]);
        // Lazy load notebooks for this portfolio if not already loaded
        if (!notebooksByPortfolio[key]) {
            const list = await listNotebooksByPortfolio({ portfolioId: pid ?? null });
            setNotebooksByPortfolio(prev => ({ ...prev, [key]: list || [] }));
        }
    };

    const toggleNotebook = (nid) => {
        const isOpen = expandedNotebooks.includes(nid);
        setExpandedNotebooks(isOpen
            ? expandedNotebooks.filter(id => id !== nid)
            : [...expandedNotebooks, nid]
        );
    };

    const notesForNotebook = useCallback((notebookId) => {
        return sidebarNotes.filter(n => n.notebookId === notebookId);
    }, [sidebarNotes]);

    // ---------- Data loading ----------
    // Realtime list of notes for sidebar
    useEffect(() => {
        const unsub = observeRecentNotes({
            onChange: (items) => setSidebarNotes(items),
        });
        return () => unsub && unsub();
    }, []);

    // Portfolios once (+ preload "No Portfolio" notebooks)
    useEffect(() => {
        (async () => {
            const items = await listPortfolios({});
            setPortfolios(items || []);
            const list = await listNotebooksByPortfolio({ portfolioId: null });
            setNotebooksByPortfolio(prev => ({ ...prev, [NONE]: list || [] }));
        })();
    }, []);

    // Load initial note (last opened or create)
    useEffect(() => {
        (async () => {
            const lastId = localStorage.getItem('rp:lastNoteId');
            if (lastId) {
                const loaded = await getNoteById({ noteId: lastId });
                if (loaded) { setNote(loaded); return; }
            }
            // Create a starter note
            const { id } = await createNote({
                title: 'Untitled',
                tags: [],
                content: { type: 'doc', content: [] },
            });
            localStorage.setItem('rp:lastNoteId', id);
            const created = await getNoteById({ noteId: id });
            setNote(created);
        })();
    }, []);

    // ---------- Actions ----------
    const handleOpenNote = useCallback(async (noteId) => {
        if (!noteId) return;
        const loaded = await getNoteById({ noteId });
        if (loaded) {
            localStorage.setItem('rp:lastNoteId', noteId);
            setNote(loaded);
        }
    }, []);

    const handleNewNote = useCallback(async () => {
        const { id } = await createNote({
            title: 'Untitled',
            tags: [],
            content: { type: 'doc', content: [] }
        });
        localStorage.setItem('rp:lastNoteId', id);
        const created = await getNoteById({ noteId: id });
        setNote(created);
        const items = await listRecentNotes({});
        setSidebarNotes(items);
    }, []);

    const handleDeleteNote = useCallback(async () => {
        if (!note?.id) return;
        const ok = window.confirm('Delete this note? This cannot be undone.');
        if (!ok) return;

        const deleteId = note.id;
        await deleteNote({ noteId: deleteId });

        const items = await listRecentNotes({});
        setSidebarNotes(items);

        if (items.length > 0) {
            const next = items[0];
            localStorage.setItem('rp:lastNoteId', next.id);
            const loaded = await getNoteById({ noteId: next.id });
            setNote(loaded);
        } else {
            localStorage.removeItem('rp:lastNoteId');
            const { id } = await createNote({ title: 'Untitled', tags: [], content: { type: 'doc', content: [] } });
            localStorage.setItem('rp:lastNoteId', id);
            const created = await getNoteById({ noteId: id });
            setNote(created);
            const items2 = await listRecentNotes({});
            setSidebarNotes(items2);
        }
    }, [note]);

    const handleSave = useCallback(async (partial) => {
        if (!note?.id) return;
        setSaveStatus('saving');
        await updateNote({ noteId: note.id, ...partial });
        localStorage.setItem('rp:lastNoteId', note.id);
        const fresh = await getNoteById({ noteId: note.id });
        setNote(fresh);
        const items = await listRecentNotes({});
        setSidebarNotes(items);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1200);
    }, [note]);

    // ---------- Search ----------
    const searchResults = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) return [];
        return sidebarNotes.filter(n => {
            const title = (n.title || '').toLowerCase();
            const tags = (n.tagLabels || []).join(' ').toLowerCase();
            return title.includes(q) || tags.includes(q);
        });
    }, [searchQuery, sidebarNotes]);

    // ---------- Render ----------
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
                    {saveStatus === 'saving' && <span className="text-xs text-muted-foreground">Saving…</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-green-600">Saved</span>}
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleDeleteNote} disabled={!note?.id}>Delete</Button>
                    <Button onClick={handleNewNote}>New Note</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Sidebar */}
                <aside className="md:col-span-3 lg:col-span-2 rounded-xl border bg-card p-2 space-y-3">
                    {/* Search */}
                    <div className="px-2">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes or tags…"
                        />
                    </div>

                    {/* If searching: show flat results */}
{searchQuery ? (
  <div className="px-2">
    <div className="text-xs text-muted-foreground mb-1">Results</div>
    <div className="rounded-md border divide-y">
      {searchResults.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">No matches.</div>
      ) : (
        searchResults.map((n) => (
          <button
            key={n.id}
            onClick={() => handleOpenNote(n.id)}
            className={`w-full text-left p-3 hover:bg-muted ${note?.id === n.id ? 'bg-muted' : ''}`}
            title={n.title || 'Untitled'}
          >
            <div className="font-medium truncate">{n.title || 'Untitled'}</div>
            <div className="text-xs text-muted-foreground truncate">
              {(n.tagLabels || []).slice(0, 3).join(' • ')}
            </div>
          </button>
        ))
      )}
    </div>
  </div>
) : (
  /* Tree: Portfolios -> Notebooks -> Notes */
  <div className="px-2">
    {/* Real portfolios FIRST */}
    {(portfolios || []).map((p) => {
      const key = portfolioKey(p.id);
      const open = expandedPortfolios.includes(key);
      return (
        <div key={p.id} className="mt-2">
          <TreePortfolioRow
            label={p.name || 'Untitled Portfolio'}
            icon={<Folder className="h-4 w-4" />}
            isOpen={open}
            onToggle={() => togglePortfolio(p.id)}
          />
          {open && (
            <div className="ml-5 space-y-1">
              {(notebooksByPortfolio[key] || []).map((nb) => {
                const nbOpen = expandedNotebooks.includes(nb.id);
                return (
                  <div key={nb.id}>
                    <TreeNotebookRow
                      name={nb.name || 'Untitled Notebook'}
                      isOpen={nbOpen}
                      onToggle={() => toggleNotebook(nb.id)}
                    />
                    {nbOpen && (
                      <div className="ml-5 rounded-md border divide-y">
                        {notesForNotebook(nb.id).length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground">No notes.</div>
                        ) : (
                          notesForNotebook(nb.id).map((n) => (
                            <button
                              key={n.id}
                              onClick={() => handleOpenNote(n.id)}
                              className={`w-full text-left px-2 py-1.5 hover:bg-muted ${note?.id === n.id ? 'bg-muted' : ''}`}
                              title={n.title || 'Untitled'}
                            >
                              <div className="truncate">{n.title || 'Untitled'}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}

    {/* No Portfolio LAST */}
    <div className="mt-2">
      <TreePortfolioRow
        label="No Portfolio"
        icon={<Folder className="h-4 w-4" />}
        isOpen={expandedPortfolios.includes(NONE)}
        onToggle={() => togglePortfolio(null)}
      />
      {expandedPortfolios.includes(NONE) && (
        <div className="ml-5 space-y-1">
          {(notebooksByPortfolio[NONE] || []).map((nb) => {
            const nbOpen = expandedNotebooks.includes(nb.id);
            return (
              <div key={nb.id}>
                <TreeNotebookRow
                  name={nb.name || 'Untitled Notebook'}
                  isOpen={nbOpen}
                  onToggle={() => toggleNotebook(nb.id)}
                />
                {nbOpen && (
                  <div className="ml-5 rounded-md border divide-y">
                    {notesForNotebook(nb.id).length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">No notes.</div>
                    ) : (
                      notesForNotebook(nb.id).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleOpenNote(n.id)}
                          className={`w-full text-left px-2 py-1.5 hover:bg-muted ${note?.id === n.id ? 'bg-muted' : ''}`}
                          title={n.title || 'Untitled'}
                        >
                          <div className="truncate">{n.title || 'Untitled'}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
)}
</aside>

        {/* Editor */ }
    <section className="md:col-span-9 lg:col-span-10 rounded-xl border bg-card text-card-foreground p-4">
        <NoteEditor
            note={note}
            onChange={setNote}
            onSave={handleSave}
            onOpenNote={handleOpenNote}
        />
    </section>
      </div >
    </div >
  );
}

/* ----- Small tree row components ----- */
function TreePortfolioRow({ label, icon, isOpen, onToggle }) {
    return (
        <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded"
            onClick={onToggle}
            title={label}
        >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}

function TreeNotebookRow({ name, isOpen, onToggle }) {
    return (
        <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded"
            onClick={onToggle}
            title={name}
        >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Book className="h-4 w-4" />
            <span className="truncate">{name}</span>
        </button>
    );
}

