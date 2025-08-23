import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    createNote,
    getNoteById,
    updateNote,
    listRecentNotes,
    observeAllNotes,
    deleteNote
} from "@/lib/notes";
import { listPortfolios, listNotebooksByPortfolio, createPortfolio, createNotebook, updatePortfolio, deletePortfolio, updateNotebook, deleteNotebook } from "@/lib/portfolios";
import NoteEditor from "./NoteEditor";
import { ChevronRight, ChevronDown, Folder, Book, MoreVertical, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";


const NONE = "__none__";

export default function NotesPage() {
    // Current note
    const [note, setNote] = useState(null);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [recentNotes, setRecentNotes] = useState([]);


    // Sidebar data
    const [sidebarNotes, setSidebarNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [portfolios, setPortfolios] = useState([]);
    // Map of portfolioKey -> notebooks[]
    const [notebooksByPortfolio, setNotebooksByPortfolio] = useState({});
    // Expanded state
    const [expandedPortfolios, setExpandedPortfolios] = useState([]); // keys: portfolioId or "__none__"
    const [expandedNotebooks, setExpandedNotebooks] = useState([]);   // notebook ids
    // Sidebar dialogs & targets
    const [showNewPortfolio, setShowNewPortfolio] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [showRenamePortfolio, setShowRenamePortfolio] = useState(false);
    const [renamePortfolioName, setRenamePortfolioName] = useState('');
    const [activePortfolioId, setActivePortfolioId] = useState(null);

    const [showNewNotebook, setShowNewNotebook] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [activeNotebookPortfolioId, setActiveNotebookPortfolioId] = useState(null);

    const [showRenameNotebook, setShowRenameNotebook] = useState(false);
    const [renameNotebookName, setRenameNotebookName] = useState('');
    const [activeNotebookId, setActiveNotebookId] = useState(null);
    // Force NoteEditor to re-mount when containers change so it reloads its lists
    const [editorRefreshKey, setEditorRefreshKey] = useState(0);



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

    const { notesByNotebook, notesByPortfolio, uncategorizedNotes } = useMemo(() => {
        const byNotebook = new Map();
        const byPortfolio = new Map();
        const uncategorized = [];

        // Dedupe notes first to prevent duplicates from rapid updates
        const uniqueNotes = Array.from(new Map(sidebarNotes.map(n => [n.id, n])).values());

        for (const n of uniqueNotes) {
            if (n.notebookId) {
                if (!byNotebook.has(n.notebookId)) byNotebook.set(n.notebookId, []);
                byNotebook.get(n.notebookId).push(n);
            } else if (n.portfolioId) {
                if (!byPortfolio.has(n.portfolioId)) byPortfolio.set(n.portfolioId, []);
                byPortfolio.get(n.portfolioId).push(n);
            } else {
                uncategorized.push(n);
            }
        }

        const sortNotes = (a, b) => {
            const ta = (a.title || '').toLowerCase();
            const tb = (b.title || '').toLowerCase();
            if (ta < tb) return -1;
            if (ta > tb) return 1;
            return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        };

        for (const arr of byNotebook.values()) arr.sort(sortNotes);
        for (const arr of byPortfolio.values()) arr.sort(sortNotes);
        uncategorized.sort(sortNotes);

        return {
            notesByNotebook: byNotebook,
            notesByPortfolio: byPortfolio,
            uncategorizedNotes: uncategorized
        };
    }, [sidebarNotes]);

    const notesForNotebook = useCallback(
        (notebookId) => notesByNotebook.get(notebookId) || [],
        [notesByNotebook]
    );


    // ---------- Data loading ----------
    // Realtime list of notes for sidebar
    useEffect(() => {
        const unsub = observeAllNotes({
            onChange: (items) => {
                // Dedupe by id to avoid occasional duplicates from rapid updates
                const byId = new Map();
                for (const n of items || []) byId.set(n.id, n);
                setSidebarNotes(Array.from(byId.values()));
            },
        });
        return () => unsub && unsub();
    }, []);

    // Load recent notes for the main view
    useEffect(() => {
        (async () => {
            const items = await listRecentNotes({ limitCount: 10 });
            setRecentNotes(items || []);
        })();
    }, []);

    // Portfolios once (+ preload ALL notebooks)
    useEffect(() => {
        (async () => {
            const portfolioItems = await listPortfolios({});
            setPortfolios(portfolioItems || []);

            // Preload all notebooks for every portfolio
            const notebooksMap = {};
            const noneList = await listNotebooksByPortfolio({ portfolioId: null });
            notebooksMap[NONE] = noneList || [];

            if (portfolioItems) {
                for (const p of portfolioItems) {
                    const key = portfolioKey(p.id);
                    const list = await listNotebooksByPortfolio({ portfolioId: p.id });
                    notebooksMap[key] = list || [];
                }
            }
            setNotebooksByPortfolio(notebooksMap);
        })();
    }, []);


    // ---------- Actions ----------
    const handleOpenNote = useCallback(async (noteId) => {
        if (!noteId) return;
        const loaded = await getNoteById({ noteId });
        if (loaded) {
            localStorage.setItem('rp:lastNoteId', noteId);
            setNote(loaded);
            setSidebarOpen(false);
        }
    }, []);

    const handleNewNote = useCallback(() => {
        setNote({
            id: `temp-${Date.now()}`, // Temporary ID for local state management
            isNew: true,              // Flag to identify this as an unsaved note
            title: '',                // Start with a blank title
            tags: [],
            content: { type: 'doc', content: [{ type: 'paragraph' }] }, // Start with a blank paragraph
            portfolioId: null,
            notebookId: null,
        });
        setSidebarOpen(false); // Ensure sidebar is closed on mobile after creating a note
    }, []);

    const handleDeleteNote = useCallback(async () => {
    // Prevent deleting a new, unsaved note.
    if (!note || note.isNew) return;

    const noteToDelete = { ...note };
    const originalSidebarNotes = [...sidebarNotes];

    // 1. Optimistically update the UI immediately.
    setSidebarNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
    setNote(null);

    // 2. Show a toast notification with an Undo action.
    toast("Note deleted", {
        action: {
            label: "Undo",
            onClick: () => {
                // If Undo is clicked, restore the note to the UI.
                setSidebarNotes(originalSidebarNotes);
                setNote(noteToDelete);
            },
        },
        // This function runs if the toast is dismissed by timeout or by swiping.
        // If the Undo button was clicked, it won't run.
        onDismiss: (t) => {
            if (t.action) return; // Don't delete if Undo was clicked
            deleteNote({ noteId: noteToDelete.id });
        },
        onAutoClose: () => {
            deleteNote({ noteId: noteToDelete.id });
        },
    });
}, [note, sidebarNotes]);

    const handleSave = useCallback(async (noteToSave) => {
        // If the note is new and has no title, don't save it.
        if (noteToSave.isNew && !noteToSave.title?.trim()) {
            return;
        }

        setSaveStatus('saving');
        let finalNote;

        // If it's a new note, create it in the database.
        if (noteToSave.isNew) {
            const { id } = await createNote({
                title: noteToSave.title,
                tags: noteToSave.tags,
                content: noteToSave.content,
                portfolioId: noteToSave.portfolioId,
                notebookId: noteToSave.notebookId,
            });
            finalNote = await getNoteById({ noteId: id });
        
        // Otherwise, update the existing note.
        } else {
            const updatePayload = {
                noteId: noteToSave.id,
                title: noteToSave.title,
                tags: noteToSave.tags,
                content: noteToSave.content,
                portfolioId: noteToSave.portfolioId,
                notebookId: noteToSave.notebookId,
            };
            await updateNote(updatePayload);
            finalNote = await getNoteById({ noteId: noteToSave.id });
        }

        // After saving, update the local state with the definitive version from the database.
        // This replaces the temporary note with the real, saved note.
        if (finalNote) {
            setNote(finalNote);
            localStorage.setItem('rp:lastNoteId', finalNote.id);
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1200);
    }, []);

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
                <div className="flex gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setSidebarOpen(s => !s)}
                    >
                        {sidebarOpen ? 'Hide' : 'Show'} Sidebar
                    </Button>
                    <Button size="sm" onClick={handleNewNote}>New Note</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Sidebar */}
                <aside className={(sidebarOpen ? 'block' : 'hidden') + ' md:block md:col-span-3 lg:col-span-2 p-1 space-y-3'}>
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
                            <div className="divide-y">
                                {searchResults.length === 0 ? (
                                    <div className="p-3 text-sm text-muted-foreground">No matches.</div>
                                ) : (
                                    searchResults.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleOpenNote(n.id)}
                                            className={`w-full text-left px-2.5 py-2 hover:bg-muted/60 ${note?.id === n.id ? 'bg-muted/60' : ''}`}
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
                            {/* Header row: Portfolios + add */}
                            <div className="flex items-center justify-between px-1 py-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolios</div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted"
                                    title="New Portfolio"
                                    onClick={() => { setNewPortfolioName(''); setShowNewPortfolio(true); }}
                                >
                                    <Plus className="h-3 w-3" /> New
                                </button>
                            </div>
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
                                            onNewNotebook={() => { setActiveNotebookPortfolioId(p.id); setNewNotebookName(''); setShowNewNotebook(true); }}
                                            onRename={() => {
                                                setActivePortfolioId(p.id);
                                                setRenamePortfolioName(p.name || '');
                                                setShowRenamePortfolio(true);
                                            }}
                                            onDelete={async () => {
                                                const ok = window.confirm('Delete this portfolio? All notebooks will be moved to "No Portfolio".');
                                                if (!ok) return;
                                                const nbs = await listNotebooksByPortfolio({ portfolioId: p.id });
                                                await Promise.all(nbs.map(nb => updateNotebook({ notebookId: nb.id, portfolioId: null })));
                                                await deletePortfolio({ portfolioId: p.id });
                                                const plist = await listPortfolios({});
                                                setPortfolios(plist);
                                                const noneList = await listNotebooksByPortfolio({ portfolioId: null });
                                                setNotebooksByPortfolio(prev => ({ ...prev, [NONE]: noneList, [portfolioKey(p.id)]: [] }));
                                                setExpandedPortfolios(prev => prev.filter(k => k !== portfolioKey(p.id)));
                                            }}
                                        />


                                        {open && (
                                            <div className="ml-5 space-y-1">
                                                {/* Notebooks in this portfolio */}
                                                {(notebooksByPortfolio[key] || []).map((nb) => {
                                                    const nbOpen = expandedNotebooks.includes(nb.id);
                                                    return (
                                                        <div key={nb.id}>
                                                            <TreeNotebookRow
                                                                name={nb.name || 'Untitled Notebook'}
                                                                isOpen={expandedNotebooks.includes(nb.id)}
                                                                onToggle={() => toggleNotebook(nb.id)}
                                                                onRename={() => {
                                                                    setActiveNotebookId(nb.id);
                                                                    setActiveNotebookPortfolioId(p.id);
                                                                    setRenameNotebookName(nb.name || '');
                                                                    setShowRenameNotebook(true);
                                                                }}
                                                                onDelete={async () => {
                                                                    const ok = window.confirm('Delete this notebook? Notes will keep their notebookId until you move them.');
                                                                    if (!ok) return;
                                                                    await deleteNotebook({ notebookId: nb.id });
                                                                    const nlist = await listNotebooksByPortfolio({ portfolioId: p.id });
                                                                    setNotebooksByPortfolio(prev => ({ ...prev, [portfolioKey(p.id)]: nlist }));
                                                                    setExpandedNotebooks(prev => prev.filter(id => id !== nb.id));
                                                                }}
                                                            />

                                                            {nbOpen && (
                                                                <div className="ml-4 divide-y">
                                                                    {notesForNotebook(nb.id).length === 0 ? (
                                                                        <div className="p-2 text-xs text-muted-foreground">No notes.</div>
                                                                    ) : (
                                                                        notesForNotebook(nb.id).map((n) => (
                                                                            <button
                                                                                key={n.id}
                                                                                onClick={() => handleOpenNote(n.id)}
                                                                                className={`w-full text-left px-2 py-1 flex items-center gap-2 hover:bg-muted/60 ${note?.id === n.id ? 'bg-muted/60' : ''}`}
                                                                                title={n.title || 'Untitled'}
                                                                            >
                                                                                <StickyNote className="h-3.5 w-3.5 shrink-0" />
                                                                                <span className="truncate">{n.title || 'Untitled'}</span>
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Notes directly in this portfolio */}
                                                <div className="ml-4 divide-y">
                                                    {(notesByPortfolio.get(p.id) || []).map((n) => (
                                                    <button
                                                        key={n.id}
                                                        onClick={() => handleOpenNote(n.id)}
                                                        className={`w-full text-left px-2 py-1 flex items-center gap-2 hover:bg-muted/60 ${note?.id === n.id ? 'bg-muted/60' : ''}`}
                                                        title={n.title || 'Untitled'}
                                                    >
                                                        <StickyNote className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{n.title || 'Untitled'}</span>
                                                    </button>
                                                ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Uncategorized Notes LAST */}
                            <div className="mt-2">
                                <TreePortfolioRow
                                    label="Uncategorized Notes"
                                    icon={<Folder className="h-4 w-4" />}
                                    isOpen={expandedPortfolios.includes(NONE)}
                                    onToggle={() => togglePortfolio(null)}
                                />

                                {expandedPortfolios.includes(NONE) && (
                                    <div className="ml-4 divide-y">
                                        {uncategorizedNotes.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground">No uncategorized notes.</div>
                                        ) : (
                                            uncategorizedNotes.map((n) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => handleOpenNote(n.id)}
                                                    className={`w-full text-left px-2 py-1 flex items-center gap-2 hover:bg-muted/60 ${note?.id === n.id ? 'bg-muted/60' : ''}`}
                                                    title={n.title || 'Untitled'}
                                                >
                                                    <StickyNote className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{n.title || 'Untitled'}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Editor or Recent Notes */}
                <section className="md:col-span-9 lg:col-span-10 p-1 md:p-2">
                    {note ? (
                        <NoteEditor
                            key={note.id}
                            note={note}
                            onChange={setNote}
                            onSave={handleSave}
                            onOpenNote={handleOpenNote}
                            onDelete={handleDeleteNote}
                        />
                    ) : (
                        <div className="p-4">
                            <h2 className="text-xl font-semibold mb-4">Recent Notes</h2>
                            {recentNotes.length > 0 ? (
                                <div className="space-y-2">
                                    {recentNotes.map(n => {
                                        const portfolioName = portfolios.find(p => p.id === n.portfolioId)?.name;
                                        const notebookName = Object.values(notebooksByPortfolio).flat().find(nb => nb.id === n.notebookId)?.name;
                                        const location = [portfolioName, notebookName].filter(Boolean).join(' / ');

                                        return (
                                            <button
                                                key={n.id}
                                                onClick={() => handleOpenNote(n.id)}
                                                className="w-full text-left p-3 rounded-lg hover:bg-muted/60"
                                                title={n.title || 'Untitled'}
                                            >
                                                <div className="font-medium truncate">{n.title || 'Untitled'}</div>
                                                {location && (
                                                    <div className="text-sm text-muted-foreground mt-1 truncate">{location}</div>
                                                )}
                                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-4">
                                                    <span>
                                                        Created: {new Date(n.createdAt?.seconds * 1000).toLocaleDateString()}
                                                    </span>
                                                    <span>
                                                        Updated: {new Date(n.updatedAt?.seconds * 1000).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">You don't have any notes yet. Click "New Note" to get started.</p>
                            )}
                        </div>
                    )}
                </section>
            </div >
            {/* New Portfolio dialog */}
            <Dialog open={showNewPortfolio} onOpenChange={setShowNewPortfolio}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Portfolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            autoFocus
                            value={newPortfolioName}
                            onChange={(e) => setNewPortfolioName(e.target.value)}
                            placeholder="Portfolio name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowNewPortfolio(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                const name = (newPortfolioName || '').trim() || 'Untitled Portfolio';
                                const { id } = await createPortfolio({ name });

                                // Optimistically insert so it appears immediately
                                setPortfolios(prev => {
                                    const exists = prev.some(p => p.id === id);
                                    if (exists) return prev;
                                    return [{ id, name, createdAt: null, updatedAt: null }, ...prev];
                                });

                                // Prepare empty notebook list for this new portfolio in the sidebar map
                                const key = portfolioKey(id);
                                setNotebooksByPortfolio(prev => ({ ...prev, [key]: [] }));

                                // Expand and close dialog
                                setExpandedPortfolios(prev => prev.includes(key) ? prev : [...prev, key]);
                                setShowNewPortfolio(false);

                                // Nudge NoteEditor to reload its dropdown lists
                                setEditorRefreshKey(k => k + 1);

                                // Optional: also re-fetch to reconcile ordering once serverTimestamp lands
                                const plist = await listPortfolios({});
                                setPortfolios(plist || []);
                            }}

                        >
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Portfolio dialog */}
            <Dialog open={showRenamePortfolio} onOpenChange={setShowRenamePortfolio}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Portfolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            autoFocus
                            value={renamePortfolioName}
                            onChange={(e) => setRenamePortfolioName(e.target.value)}
                            placeholder="Portfolio name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRenamePortfolio(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!activePortfolioId) return;
                                const name = (renamePortfolioName || '').trim() || 'Untitled Portfolio';
                                await updatePortfolio({ portfolioId: activePortfolioId, name });
                                const plist = await listPortfolios({});
                                setPortfolios(plist);
                                setShowRenamePortfolio(false);
                            }}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Notebook dialog */}
            <Dialog open={showNewNotebook} onOpenChange={setShowNewNotebook}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Notebook</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            autoFocus
                            value={newNotebookName}
                            onChange={(e) => setNewNotebookName(e.target.value)}
                            placeholder="Notebook name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowNewNotebook(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                const pid = activeNotebookPortfolioId ?? null;
                                const key = portfolioKey(pid);
                                const name = (newNotebookName || '').trim() || 'Untitled Notebook';
                                const { id } = await createNotebook({ name, portfolioId: pid });

                                // Optimistically insert into the correct portfolio bucket
                                setNotebooksByPortfolio(prev => {
                                    const curr = prev[key] || [];
                                    if (curr.some(nb => nb.id === id)) return prev;
                                    return { ...prev, [key]: [{ id, name, portfolioId: pid, createdAt: null, updatedAt: null }, ...curr] };
                                });

                                // Keep that portfolio expanded, close dialog
                                setExpandedPortfolios(prev => prev.includes(key) ? prev : [...prev, key]);
                                setShowNewNotebook(false);

                                // Nudge NoteEditor to reload its dropdown lists
                                setEditorRefreshKey(k => k + 1);

                                // Optional: reconcile with Firestore ordering after serverTimestamp resolves
                                const list = await listNotebooksByPortfolio({ portfolioId: pid });
                                setNotebooksByPortfolio(prev => ({ ...prev, [key]: list || [] }));
                            }}

                        >
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Notebook dialog */}
            <Dialog open={showRenameNotebook} onOpenChange={setShowRenameNotebook}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Notebook</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            autoFocus
                            value={renameNotebookName}
                            onChange={(e) => setRenameNotebookName(e.target.value)}
                            placeholder="Notebook name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRenameNotebook(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                if (!activeNotebookId) return;
                                const name = (renameNotebookName || '').trim() || 'Untitled Notebook';
                                await updateNotebook({ notebookId: activeNotebookId, name });
                                const pid = activeNotebookPortfolioId ?? null;
                                const list = await listNotebooksByPortfolio({ portfolioId: pid });
                                setNotebooksByPortfolio(prev => ({ ...prev, [portfolioKey(pid)]: list }));
                                setShowRenameNotebook(false);
                            }}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}

/* ----- Small tree row components ----- */
function TreePortfolioRow({ label, icon, isOpen, onToggle, onRename, onDelete, onNewNotebook }) {
    return (
        <div className="w-full px-1.5 py-1 rounded hover:bg-muted/60">
            <div className="flex items-center gap-2 min-w-0">
                <button
                    type="button"
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    onClick={onToggle}
                    title={label}
                >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    {icon}
                    <span className="truncate">{label}</span>
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="ml-1.5 h-5 w-5 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent"
                            title="Portfolio actions"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {onNewNotebook && (
                            <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNewNotebook(); }}>
                                    New Notebook
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {onRename && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                                Rename Portfolio
                            </DropdownMenuItem>
                        )}
                        {onDelete && <DropdownMenuSeparator />}
                        {onDelete && (
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                Delete Portfolio
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}



function TreeNotebookRow({ name, isOpen, onToggle, onRename, onDelete }) {
    return (
        <div className="w-full px-1.5 py-1 rounded hover:bg-muted/60">
            <div className="flex items-center gap-2 min-w-0">
                <button
                    type="button"
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    onClick={onToggle}
                    title={name}
                >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <Book className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{name}</span>
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="ml-1.5 h-5 w-5 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent"
                            title="Notebook actions"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {onRename && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                                Rename Notebook
                            </DropdownMenuItem>
                        )}
                        {onDelete && <DropdownMenuSeparator />}
                        {onDelete && (
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                Delete Notebook
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}



