import React, { useState, useCallback, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Minus, Undo, Redo } from "lucide-react";
import TipTapLink from '@tiptap/extension-link';
import { Node } from '@tiptap/core';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Tag as TagIcon, Folder, Book, Plus, Trash2, Pencil, Save, Upload } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listAllTags, ensureMasterTags, renameTagEverywhere, deleteTagEverywhere } from "@/lib/tags";
import { Checkbox } from "@/components/ui/checkbox";
import { listPortfolios, listNotebooksByPortfolio } from "@/lib/portfolios";

import { observeRecentNotes, observeBacklinks } from "@/lib/notes";
import { uploadAttachment, listAttachments, deleteAttachment } from "@/lib/attachments";
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

export default function NoteEditor({ note, onChange, onSave, onOpenNote, onDelete }) {
    // Title & tags
    const [title, setTitle] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);

    // Containers
    const [portfolios, setPortfolios] = useState([]);
    const [notebooks, setNotebooks] = useState([]);
    // Small pickers open state
    const [portfolioPickerOpen, setPortfolioPickerOpen] = useState(false);
    const [notebookPickerOpen, setNotebookPickerOpen] = useState(false);
    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const [manageTagsOpen, setManageTagsOpen] = useState(false);
    const [manageList, setManageList] = useState([]);
    const [manageEditingSlug, setManageEditingSlug] = useState(null);
    const [manageEditingValue, setManageEditingValue] = useState('');




    const [portfolioId, setPortfolioId] = useState(note?.portfolioId ?? null);
    const [notebookId, setNotebookId] = useState(note?.notebookId ?? null);
    const currentPortfolioName = React.useMemo(
        () => (portfolios.find(p => p.id === portfolioId)?.name) || 'No portfolio',
        [portfolios, portfolioId]
    );
    const currentNotebookName = React.useMemo(
        () => (notebooks.find(n => n.id === notebookId)?.name) || 'No notebook',
        [notebooks, notebookId]
    );


    // Wikilink picker
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkQuery, setLinkQuery] = useState('');
    const [linkResults, setLinkResults] = useState([]);

    // Backlinks
    const [backlinks, setBacklinks] = useState([]);
    const [loadingBacklinks, setLoadingBacklinks] = useState(false);

    // Autosave timer (debounced)
    const saveTimerRef = React.useRef(null);

    // Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
                link: false,
            }),
            TipTapLink.configure({
                autolink: true,
                linkOnPaste: true,
                openOnClick: true,
                HTMLAttributes: {
                    rel: 'noreferrer noopener',
                    target: '_blank',
                    class: 'text-primary underline underline-offset-2 hover:opacity-80',
                },
            }),
            Wikilink,
        ],

        content: note?.content || { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start writing…' }] }] },
        onUpdate: ({ editor }) => {
            scheduleAutoSave();
        },

        editorProps: {
            attributes: { class: 'tiptap prose prose-sm max-w-none focus:outline-none min-h-[280px] py-3' },
            handleClickOn(view, pos, node, nodePos, event) {
                // 1) Node-level click (when ProseMirror gives us the wikilink node)
                try {
                    if (node?.type?.name === 'wikilink') {
                        const targetId = node?.attrs?.noteId || null;
                        if (targetId) {
                            event?.preventDefault?.();
                            onOpenNote?.(targetId);
                            return true;
                        }
                    }
                } catch (_) { }

                // 2) DOM-level fallback (works even if a child span/text is clicked)
                const el = (event?.target instanceof Element)
                    ? event.target.closest('[data-wikilink="true"]')
                    : null;

                if (el) {
                    const targetId = el.getAttribute('data-note-id');
                    if (targetId) {
                        event.preventDefault();
                        onOpenNote?.(targetId);
                        return true;
                    }
                }
                return false;
            },

        },
    });

    const scheduleAutoSave = React.useCallback(() => {
        if (!note) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const content = editor?.getJSON() || { type: 'doc', content: [] };
            const currentNoteState = {
                ...note,
                title,
                tags,
                content,
                portfolioId,
                notebookId,
            };
            onSave?.(currentNoteState);
        }, 10000);
    }, [note, title, tags, portfolioId, notebookId, onSave, editor]);

    React.useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);



    // Attachments
    const [attachments, setAttachments] = useState([]);
    const [uploadPct, setUploadPct] = useState(0);
    const fileInputRef = React.useRef(null);

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

    React.useEffect(() => {
        if (!manageTagsOpen) return;
        (async () => {
            const list = await listAllTags({});
            setManageList(Array.isArray(list) ? list : []);
        })();
    }, [manageTagsOpen, tags]);


    // Load all tags when the "Manage Tags" dialog opens
    React.useEffect(() => {
        if (!manageTagsOpen) return;
        (async () => {
            const list = await listAllTags({});
            setManageList(Array.isArray(list) ? list : []);
        })();
    }, [manageTagsOpen]);


    // Load attachments for current note
    React.useEffect(() => {
        (async () => {
            if (!note?.id) { setAttachments([]); return; }
            try {
                const list = await listAttachments({ noteId: note.id });
                setAttachments(list);
            } catch { }
        })();
    }, [note?.id]);

    const refreshAttachments = React.useCallback(async () => {
        if (!note?.id) return;
        const list = await listAttachments({ noteId: note.id });
        setAttachments(list);
    }, [note?.id]);

    const onPickFile = () => fileInputRef.current?.click();

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !note?.id) return;
        setUploadPct(1);
        try {
            await uploadAttachment({ noteId: note.id, file, onProgress: setUploadPct });
            await refreshAttachments();
        } finally {
            setUploadPct(0);
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (path) => {
        const ok = window.confirm('Delete this attachment?');
        if (!ok) return;
        await deleteAttachment({ path });
        await refreshAttachments();
    };

    // Persistent tag list for the "Add tags" popover (comes from /users/{uid}/tags)
    const [pickerTags, setPickerTags] = React.useState([]);

    // Load tags when either the Add-tags popover or Manage-tags dialog opens
    React.useEffect(() => {
        if (!tagPickerOpen && !manageTagsOpen) return;
        (async () => {
            const list = await listAllTags({});
            const safe = Array.isArray(list) ? list : [];
            if (tagPickerOpen) setPickerTags(safe);
            if (manageTagsOpen) setManageList(safe);
        })();
    }, [tagPickerOpen, manageTagsOpen]);




    const toggleTag = (slug, checked) => {
        if (checked) addTags(slug);
        else removeTag(slug);
    };



    // Tag helpers
    const addTags = useCallback((raw) => {
        const next = normalizeTags(raw);
        // Persist newly created tags into the master list so they don’t “disappear”
        ensureMasterTags({ tags: next }).catch(() => { });
        setPickerTags(prev => Array.from(new Set([...(prev || []), ...next])).sort());
        if (!next.length) return;

        const merged = normalizeTags([...(tags || []), ...next]);
        setTags(merged);
        setTagInput('');
        // Reflect in parent immediately
        onChange?.({ ...(note || {}), tags: merged });
        scheduleAutoSave();


        // PERSIST so tags survive reload & appear in pickers/managers
        const content = editor?.getJSON() || { type: 'doc', content: [] };
        onSave?.({ title, tags: merged, content, portfolioId, notebookId });
    }, [tags, note, onChange, editor, title, portfolioId, notebookId, onSave]);


    const removeTag = useCallback((slug) => {
        setTags((t) => {
            const next = (t || []).filter((x) => x !== slug);
            // Reflect in parent
            onChange?.({ ...(note || {}), tags: next });

            // PERSIST change so it’s durable and pickers/managers stay in sync
            const content = editor?.getJSON() || { type: 'doc', content: [] };
            onSave?.({ title, tags: next, content, portfolioId, notebookId });

            return next;
        });
    }, [note, onChange, editor, title, portfolioId, notebookId, onSave]);


    const onTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            addTags(tagInput);
        }
    };

    // Save
    const handleSave = React.useCallback(() => {
        if (!note) return;
        const content = editor?.getJSON() || { type: 'doc', content: [] };
        const currentNoteState = {
            ...note,
            title,
            tags,
            content,
            portfolioId,
            notebookId,
        };
        onSave?.(currentNoteState);
    }, [note, editor, onSave, title, tags, portfolioId, notebookId]);

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
            {/* Title (plain, bigger) */}
            <Input
                value={title}
                onChange={(e) => {
                    const v = e.target.value;
                    setTitle(v);
                    onChange?.({ ...(note || {}), title: v });
                    scheduleAutoSave();
                }}
                placeholder="Title"
                className="w-full bg-transparent border-none shadow-none px-0
             text-3xl md:text-4xl font-bold leading-tight tracking-tight
             focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none"
            />

            {/* Location breadcrumb */}
            <div className="text-xs md:text-sm text-muted-foreground -mt-2">
                <span className="truncate">{currentPortfolioName}</span>
                <span> › </span>
                <span className="truncate">{currentNotebookName}</span>
            </div>

            {/* Portfolio / Notebook quick actions */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {/* Portfolio */}
                <Popover open={portfolioPickerOpen} onOpenChange={setPortfolioPickerOpen}>
                    <PopoverTrigger asChild>
                        <button type="button" className="inline-flex items-center px-1.5 py-1 rounded hover:bg-muted/60">
                            <Folder className="h-4 w-4 mr-1" />
                            {portfolioId ? 'Change portfolio' : 'Add to portfolio'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                        <div className="max-h-64 overflow-auto">
                            <button
                                className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 ${portfolioId == null ? 'bg-muted/50' : ''}`}
                                onClick={() => {
                                    setPortfolioId(null);
                                    setNotebookId(null);
                                    onChange?.({ ...(note || {}), portfolioId: null, notebookId: null });
                                    setPortfolioPickerOpen(false);
                                }}
                            >
                                — No portfolio —
                            </button>
                            {(portfolios || []).map(p => (
                                <button
                                    key={p.id}
                                    className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 ${portfolioId === p.id ? 'bg-muted/50' : ''}`}
                                    onClick={() => {
                                        setPortfolioId(p.id);
                                        setNotebookId(null);
                                        onChange?.({ ...(note || {}), portfolioId: p.id, notebookId: null });
                                        scheduleAutoSave();
                                        setPortfolioPickerOpen(false);
                                    }}
                                    title={p.name}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Notebook (scoped to selected portfolio) */}
                <Popover open={notebookPickerOpen} onOpenChange={setNotebookPickerOpen}>
                    <PopoverTrigger asChild>
                        <button type="button" className="inline-flex items-center px-1.5 py-1 rounded hover:bg-muted/60" disabled={false}>
                            <Book className="h-4 w-4 mr-1" />
                            {notebookId ? 'Change notebook' : 'Add to notebook'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                        <div className="max-h-64 overflow-auto">
                            <button
                                className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 ${!notebookId ? 'bg-muted/50' : ''}`}
                                onClick={() => {
                                    setNotebookId(null);
                                    onChange?.({ ...(note || {}), notebookId: null });
                                    setNotebookPickerOpen(false);
                                }}
                            >
                                — No notebook —
                            </button>
                            {(notebooks || []).length === 0 ? (
                                <div className="px-2 py-2 text-xs text-muted-foreground">No notebooks in this portfolio.</div>
                            ) : (
                                notebooks.map(n => (
                                    <button
                                        key={n.id}
                                        className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 ${notebookId === n.id ? 'bg-muted/50' : ''}`}
                                        onClick={() => {
                                            setNotebookId(n.id);
                                            onChange?.({ ...(note || {}), notebookId: n.id });
                                            scheduleAutoSave();
                                            setNotebookPickerOpen(false);
                                        }}
                                        title={n.name}
                                    >
                                        {n.name}
                                    </button>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>


            {/* Tags */}
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

                <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                    <PopoverTrigger asChild>
                        <button type="button" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/60">
                            <TagIcon className="h-4 w-4 mr-1" />
                            Add tags
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                        <div className="space-y-2">
                            <div className="max-h-56 overflow-auto pr-1">
                                {pickerTags.length === 0 ? (
                                    <div className="text-xs text-muted-foreground px-1.5 py-2">No tags yet.</div>
                                ) : (
                                    pickerTags.map(slug => (
                                        <label key={slug} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/60">
                                            <Checkbox
                                                checked={(tags || []).includes(slug)}
                                                onCheckedChange={(val) => toggleTag(slug, !!val)}
                                            />
                                            <span className="truncate">{tagLabelFromSlug(slug)}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    placeholder="New tag…"
                                />
                                <Button
                                    type="button"
                                    onClick={() => { addTags(tagInput); setTagInput(''); }}
                                >
                                    Add
                                </Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setManageTagsOpen(true); setTagPickerOpen(false); }}
                                >
                                    Manage tags…
                                </Button>
                            </div>

                        </div>
                    </PopoverContent>
                </Popover>
            </div>


            {/* Toolbar (compact) */}
            <div className="flex items-center flex-wrap gap-1.5 rounded-md bg-muted/30 p-1">
                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('bold')}
                    onPressedChange={() => editor?.chain().focus().toggleBold().run()}
                    aria-label="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('italic')}
                    onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
                    aria-label="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('heading', { level: 1 })}
                    onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    aria-label="H1"
                >
                    <Heading1 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('heading', { level: 2 })}
                    onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    aria-label="H2"
                >
                    <Heading2 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('heading', { level: 3 })}
                    onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    aria-label="H3"
                >
                    <Heading3 className="h-4 w-4" />
                </Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('bulletList')}
                    onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
                    aria-label="Bulleted list"
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={!!editor?.isActive('orderedList')}
                    onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
                    aria-label="Numbered list"
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>

                <Separator orientation="vertical" className="h-5" />

                <Button type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()} aria-label="Divider">
                    <Minus className="h-4 w-4" />
                </Button>

                {/* Keep Wikilink, but smaller */}
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
                            [[ Wikilink ]]
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2">
                        <div className="space-y-2">
                            <Input
                                autoFocus
                                placeholder="Search notes…"
                                value={linkQuery}
                                onChange={(e) => setLinkQuery(e.target.value)}
                            />
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
                                                // autosave after insert
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


                <div className="ml-auto flex items-center gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().undo().run()} aria-label="Undo">
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => editor?.chain().focus().redo().run()} aria-label="Redo">
                        <Redo className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleSave} className="flex items-center gap-1">
                    <Save className="h-4 w-4" />
                    Save
                </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete?.()} disabled={!note?.id} aria-label="Delete note">
                    <Trash2 className="h-4 w-4" />
                </Button>
                </div>

            </div>


            {/* Content */}
            <style>{`
  .tiptap ul { list-style: disc; margin-left: 1.25rem; padding-left: 0; }
  .tiptap ol { list-style: decimal; margin-left: 1.25rem; padding-left: 0; }
  .tiptap li { margin: 0.25rem 0; }
  .tiptap li p { margin: 0; }
`}</style>
            <div className="rounded-xl border bg-background">
                <EditorContent editor={editor} />
            </div>

            {/* Attachments */}
            <div className="text-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-card-foreground">Attachments</div>
                    <div className="flex items-center gap-2">
                        {uploadPct > 0 && <span className="text-xs text-muted-foreground">{uploadPct}%</span>}
                        <Button type="button" variant="ghost" size="sm" onClick={onPickFile} disabled={!note?.id} className="flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Upload file
                    </Button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
                    </div>
                </div>

                {attachments.length === 0 ? (
                    <div className="text-muted-foreground">No attachments yet.</div>
                ) : (
                    <ul className="divide-y">
                        {attachments.map(att => (
                            <li key={att.path} className="flex items-center justify-between px-2 py-1.5 gap-3">
                                <div className="min-w-0">
                                    <div className="truncate">{att.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {(att.contentType || 'file')} • {Math.round((att.size || 0) / 1024)} KB
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                                        Open
                                    </a>
                                    <Button type="button" variant="link" className="text-red-600 px-0 h-auto" onClick={() => handleDeleteAttachment(att.path)}>
                                        Delete
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {/* Manage Tags dialog */}
            <Dialog open={manageTagsOpen} onOpenChange={setManageTagsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Tags</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* Current tags list with delete */}
                        <div className="rounded-md border max-h-60 overflow-auto divide-y">
                            {manageList.length === 0 ? (
                                <div className="text-sm text-muted-foreground p-3">No tags yet.</div>
                            ) : (
                                manageList.map((slug) => (
                                    <div key={slug} className="flex items-center justify-between px-3 py-2 gap-2">
                                        {/* Left side: label or inline editor */}
                                        {manageEditingSlug === slug ? (
                                            <Input
                                                autoFocus
                                                value={manageEditingValue}
                                                onChange={(e) => setManageEditingValue(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Escape') {
                                                        setManageEditingSlug(null);
                                                        return;
                                                    }
                                                    if (e.key === 'Enter') {
                                                        const from = manageEditingSlug;
                                                        const to = (manageEditingValue || '').trim();
                                                        setManageEditingSlug(null);
                                                        if (!from || !to || from === to) return;
                                                        await renameTagEverywhere({ from, to });
                                                        const list = await listAllTags({});
                                                        setManageList(Array.isArray(list) ? list : []);
                                                        setPickerTags(Array.isArray(list) ? list : []);
                                                        setTags(prev => {
                                                            const next = (prev || []).map(s => (s === from ? to : s));
                                                            onChange?.({ ...(note || {}), tags: next });
                                                            scheduleAutoSave();
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                onBlur={async () => {
                                                    const from = manageEditingSlug;
                                                    const to = (manageEditingValue || '').trim();
                                                    setManageEditingSlug(null);
                                                    if (!from || !to || from === to) return;
                                                    await renameTagEverywhere({ from, to });
                                                    const list = await listAllTags({});
                                                    setManageList(Array.isArray(list) ? list : []);
                                                    setPickerTags(Array.isArray(list) ? list : []);
                                                    setTags(prev => {
                                                        const next = (prev || []).map(s => (s === from ? to : s));
                                                        onChange?.({ ...(note || {}), tags: next });
                                                        return next;
                                                    });
                                                }}
                                                className="h-7"
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                className="truncate text-left w-full hover:underline underline-offset-2"
                                                onClick={() => { setManageEditingSlug(slug); setManageEditingValue(slug); }}
                                                title={slug}
                                            >
                                                {slug}
                                            </button>
                                        )}

                                        {/* Right side: actions */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setManageEditingSlug(slug); setManageEditingValue(slug); }}
                                                title="Rename"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600"
                                                onClick={async () => {
                                                    await deleteTagEverywhere({ tag: slug });  // no OS confirm
                                                    const list = await listAllTags({});
                                                    setManageList(Array.isArray(list) ? list : []);
                                                    setPickerTags(Array.isArray(list) ? list : []);
                                                    setTags(prev => {
                                                        const next = (prev || []).filter(s => s !== slug);
                                                        onChange?.({ ...(note || {}), tags: next });
                                                        return next;
                                                    });
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))

                            )}
                        </div>

                        {/* Datalist for quick pick */}
                        <datalist id="all-tags-datalist">
                            {manageList.map(slug => <option key={slug} value={slug} />)}
                        </datalist>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setManageTagsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Backlinks */}
            <div className="text-sm mt-2">
                <div className="font-medium text-card-foreground mb-2">Backlinks</div>
                {loadingBacklinks ? (
                    <div className="text-muted-foreground">Loading…</div>
                ) : backlinks.length === 0 ? (
                    <div className="text-muted-foreground">No backlinks yet.</div>
                ) : (
                    <ul className="space-y-0.5">
                        {backlinks.map(b => (
                            <li key={b.id}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onOpenNote?.(b.id); }}
                                    className="block w-full truncate text-primary underline underline-offset-2 hover:opacity-80"
                                    title={b.title || 'Untitled'}
                                >
                                    {b.title || 'Untitled'}
                                </a>
                            </li>
                        ))}
                    </ul>

                )}
            </div>
        </div>
    );
}

