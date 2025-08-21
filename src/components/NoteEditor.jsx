import React, { useState, useCallback } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listPortfolios, listNotebooksByPortfolio, createPortfolio, createNotebook } from "@/lib/portfolios";
import { observeRecentNotes, observeBacklinks } from "@/lib/notes";
import { normalizeTags, tagLabelFromSlug } from "@/lib/utils";

/** Minimal inline [[wikilink]] node */
const Wikilink = Node.create({
    name: 'wikilink',
    inline: true,
    group: 'inline',
    atom: true,
    addAttributes() {
        return {
            noteId: { default: null },
            titleSlug: { default: '' },
            text: { default: '[[link]]' },
        };
    },
    parseHTML() { return [{ tag: 'a[data-wikilink]' }]; },
    renderHTML({ HTMLAttributes }) {
        const { text, noteId } = HTMLAttributes;
        return ['a',
            { 'data-wikilink': 'true', 'data-note-id': noteId || '', class: 'underline decoration-dashed cursor-pointer px-0.5 rounded hover:bg-muted' },
            text || '[[link]]'
        ];
    },
    addCommands() {
        return {
            insertWikilink:
                attrs =>
                    ({ commands }) =>
                        commands.insertContent({ type: this.name, attrs }),
        };
    },
});

export default function NoteEditor({ note, onChange, onSave, onOpenNote }) {
    // Title & tags
    const [title, setTitle] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);

    // Containers
    const [portfolios, setPortfolios] = useState([]);
    const [notebooks, setNotebooks] = useState([]);
    // Name modals
    const [showNewPortfolio, setShowNewPortfolio] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [showNewNotebook, setShowNewNotebook] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [portfolioId, setPortfolioId] = useState(note?.portfolioId ?? null);
    const [notebookId, setNotebookId] = useState(note?.notebookId ?? null);

    // Wikilink picker
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkQuery, setLinkQuery] = useState('');
    const [linkResults, setLinkResults] = useState([]);

    // Backlinks
    const [backlinks, setBacklinks] = useState([]);
    const [loadingBacklinks, setLoadingBacklinks] = useState(false);

    // Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Wikilink,
        ],
        content: note?.content || { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start writing…' }] }] },
        onUpdate: ({ editor }) => {
            const payload = { ...(note || {}), content: editor.getJSON() };
            onChange?.(payload);
        },
        editorProps: {
            attributes: { class: 'tiptap prose prose-sm max-w-none focus:outline-none min-h-[280px] py-3' },
            handleClickOn(view, pos, node, nodePos, event) {
                try {
                    if (node?.type?.name === 'wikilink') {
                        const targetId = node?.attrs?.noteId || null;
                        if (targetId) { onOpenNote?.(targetId); return true; }
                    }
                } catch (_) { }
                const el = event?.target;
                if (el && el.dataset && el.dataset.wikilink === 'true') {
                    const targetId = el.dataset.noteId || null;
                    if (targetId) { onOpenNote?.(targetId); return true; }
                }
                return false;
            },
        },
    });

    // Sync incoming note (title, tags, containers, content)
    React.useEffect(() => {
        setTitle(note?.title || '');
        setTags(note?.tags || []);
        setPortfolioId(note?.portfolioId ?? null);
        setNotebookId(note?.notebookId ?? null);
        if (editor && note?.content) {
            const json = editor.getJSON();
            const same = JSON.stringify(json) === JSON.stringify(note.content);
            if (!same) editor.commands.setContent(note.content, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [note?.id]);

    // Load portfolios once
    React.useEffect(() => {
        (async () => { setPortfolios(await listPortfolios({}) || []); })();
    }, []);

    // Load notebooks when portfolio changes
    React.useEffect(() => {
        (async () => { setNotebooks(await listNotebooksByPortfolio({ portfolioId: portfolioId || null }) || []); })();
    }, [portfolioId]);

    // Realtime recent notes -> wikilink picker
    React.useEffect(() => {
        const unsub = observeRecentNotes({ onChange: (items) => setLinkResults(items) });
        return () => unsub && unsub();
    }, []);

    // Realtime backlinks for current note
    React.useEffect(() => {
        if (!note?.id) { setBacklinks([]); return; }
        setLoadingBacklinks(true);
        const unsub = observeBacklinks({
            noteId: note.id,
            onChange: (items) => { setBacklinks(items); setLoadingBacklinks(false); },
        });
        return () => unsub && unsub();
    }, [note?.id]);

    // Tag helpers
    const addTags = useCallback((raw) => {
        const next = normalizeTags(raw);
        if (!next.length) return;
        const merged = normalizeTags([...(tags || []), ...next]);
        setTags(merged);
        setTagInput('');
        onChange?.({ ...(note || {}), tags: merged });
    }, [tags, note, onChange]);

    const removeTag = useCallback((slug) => {
        setTags((t) => {
            const next = (t || []).filter((x) => x !== slug);
            onChange?.({ ...(note || {}), tags: next });
            return next;
        });
    }, [note, onChange]);

    const onTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            addTags(tagInput);
        }
    };

    // Save
    const handleSave = React.useCallback(() => {
        const content = editor?.getJSON() || { type: 'doc', content: [] };
        const payload = { title, tags, content, portfolioId, notebookId };
        onSave?.(payload);
    }, [editor, onSave, title, tags, portfolioId, notebookId]);

    // Save on ⌘/Ctrl+S
    React.useEffect(() => {
        const onKey = (e) => {
            const isSave = (e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey);
            if (isSave) {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleSave]);



    return (
        <div className="space-y-4">
            {/* Title (moved up) */}
            <Input
                value={title}
                onChange={(e) => {
                    const v = e.target.value;
                    setTitle(v);
                    onChange?.({ ...(note || {}), title: v });
                }}
                placeholder="Title"
                className="text-2xl font-semibold h-12"
            />
            {/* Portfolio / Notebook picker */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Portfolio */}
                <div className="flex items-center gap-2">
                    <Select
                        value={portfolioId ?? "__none__"}
                        onValueChange={(val) => {
                            const pid = val === "__none__" ? null : val;
                            setPortfolioId(pid);
                            setNotebookId(null);
                            onChange?.({ ...(note || {}), portfolioId: pid, notebookId: null });
                        }}
                    >
                        <SelectTrigger className="w-56"><SelectValue placeholder="Select Portfolio" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Select Portfolio</SelectItem>
                            {portfolios.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setNewPortfolioName(''); setShowNewPortfolio(true); }}
                        title="Create Portfolio"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                </div>

                {/* Notebook */}
                <div className="flex items-center gap-2">
                    <Select
                        value={notebookId ?? "__none__"}
                        onValueChange={(val) => {
                            const nid = val === "__none__" ? null : val;
                            setNotebookId(nid);
                            onChange?.({ ...(note || {}), notebookId: nid });
                        }}
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Select Notebook" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Select Notebook</SelectItem>
                            {notebooks.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setNewNotebookName(''); setShowNewNotebook(true); }}
                        title="Create Notebook"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                </div>
            </div>


            {/* Tag strip */}
            <div className="flex flex-wrap items-center gap-2">
                {(tags || []).map((slug) => (
                    <Badge key={slug} variant="secondary" className="flex items-center gap-1">
                        {tagLabelFromSlug(slug)}
                        <button
                            type="button"
                            onClick={() => removeTag(slug)}
                            className="ml-1 opacity-70 hover:opacity-100"
                            aria-label={`Remove ${slug}`}
                            title="Remove tag"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}

                <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    placeholder="Add tags (press Enter)"
                    className="w-56"
                />
                <Button variant="outline" onClick={() => addTags(tagInput)}>Add</Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 border rounded-lg p-2 bg-card">
                <Button type="button" variant={editor?.isActive('bold') ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</Button>
                <Button type="button" variant={editor?.isActive('italic') ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</Button>
                <Button type="button" variant={editor?.isActive('heading', { level: 1 }) ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button>
                <Button type="button" variant={editor?.isActive('heading', { level: 2 }) ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
                <Button type="button" variant={editor?.isActive('heading', { level: 3 }) ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>
                <Button type="button" variant={editor?.isActive('bulletList') ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</Button>
                <Button type="button" variant={editor?.isActive('orderedList') ? 'default' : 'outline'} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbers</Button>
                <Button type="button" variant="outline" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>Divider</Button>

                {/* Wikilink popover */}
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline">[[ Wikilink ]]</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2">
                        <div className="space-y-2">
                            <Input autoFocus placeholder="Search notes…" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} />
                            <div className="max-h-64 overflow-auto rounded-md border">
                                {linkResults
                                    .filter(n => (n.title || 'untitled').toLowerCase().includes(linkQuery.toLowerCase()))
                                    .slice(0, 25)
                                    .map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => {
                                                editor?.chain().focus().insertWikilink({
                                                    noteId: n.id,
                                                    titleSlug: n.titleSlug || '',
                                                    text: `[[${n.title || 'Untitled'}]]`,
                                                }).run();
                                                // Auto-save so backlinks update immediately
                                                const content = editor?.getJSON() || { type: 'doc', content: [] };
                                                onSave?.({ title, tags, content, portfolioId, notebookId });
                                                setLinkOpen(false);
                                                setLinkQuery('');
                                            }}
                                            className="block w-full text-left px-3 py-2 hover:bg-muted"
                                            title={n.title || 'Untitled'}
                                        >
                                            <div className="font-medium truncate">{n.title || 'Untitled'}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {(n.tagLabels || []).slice(0, 3).join(' • ')}
                                            </div>
                                        </button>
                                    ))}
                                {linkResults.filter(n => (n.title || 'untitled').toLowerCase().includes(linkQuery.toLowerCase())).length === 0 && (
                                    <div className="px-3 py-6 text-sm text-muted-foreground text-center">No matching notes.</div>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="ml-auto flex gap-2">
                    <Button type="button" variant="outline" onClick={() => editor?.chain().focus().undo().run()}>Undo</Button>
                    <Button type="button" variant="outline" onClick={() => editor?.chain().focus().redo().run()}>Redo</Button>
                    <Button type="button" onClick={handleSave} disabled={!note?.id} title="Save (⌘/Ctrl+S)">
                        Save
                    </Button>

                </div>
            </div>

            {/* Content */}
            <div className="rounded-xl border bg-background">
                <EditorContent editor={editor} />
            </div>

            {/* Backlinks */}
            <div className="rounded-xl border bg-card p-4 text-sm">
                <div className="font-medium text-card-foreground mb-2">Backlinks</div>
                {loadingBacklinks ? (
                    <div className="text-muted-foreground">Loading…</div>
                ) : backlinks.length === 0 ? (
                    <div className="text-muted-foreground">No backlinks yet.</div>
                ) : (
                    <ul className="space-y-1">
                        {backlinks.map(b => (
                            <li key={b.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpenNote?.(b.id)}
                                    className="w-full text-left truncate text-primary hover:underline underline-offset-2 px-1 py-0.5 rounded hover:bg-muted"
                                    title={b.title || 'Untitled'}
                                    role="link"
                                >
                                    {b.title || 'Untitled'}
                                </button>
                            </li>
                        ))}
                    </ul>

                )}
            </div>
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

                                // Refresh portfolios and select the new one
                                const list = await listPortfolios({});
                                setPortfolios(list);
                                setPortfolioId(id);
                                setNotebookId(null);
                                onChange?.({ ...(note || {}), portfolioId: id, notebookId: null });

                                setShowNewPortfolio(false);
                            }}
                        >
                            Create
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
                                const name = (newNotebookName || '').trim() || 'Untitled Notebook';
                                const { id } = await createNotebook({ name, portfolioId: portfolioId || null });

                                // Reload notebooks for the currently selected portfolio
                                let list = await listNotebooksByPortfolio({ portfolioId: portfolioId || null });

                                // If the freshly-created notebook isn’t in the list yet, insert it optimistically
                                if (!list.some(n => n.id === id)) {
                                    list = [{ id, name, portfolioId: portfolioId || null, updatedAt: null, createdAt: null }, ...list];
                                }

                                setNotebooks(list);
                                setNotebookId(id);
                                onChange?.({ ...(note || {}), notebookId: id, portfolioId: portfolioId || null });

                                setShowNewNotebook(false);
                            }}
                        >
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

