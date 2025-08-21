// src/lib/notes.js
import { auth, db } from '@/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { normalizeTags, tagLabelFromSlug } from '@/lib/utils';

/** Title -> slug */
const slugifyTitle = (title = '') =>
    (title || 'untitled')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');

/** Extract plain text from a TipTap-style JSON doc */
const extractPlainText = (node) => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    const text = node.text || '';
    const kids = Array.isArray(node.content) ? node.content : [];
    const rest = kids.map(extractPlainText).join(' ');
    return [text, rest].filter(Boolean).join(' ').trim();
};

/** Collect outgoingLinks (noteIds) from wikilink nodes: { type:'wikilink', attrs:{ noteId } } */
const extractOutgoingLinks = (node, acc = new Set()) => {
    if (!node) return acc;
    if (Array.isArray(node)) return node.reduce((a, n) => extractOutgoingLinks(n, a), acc);
    if (node.type === 'wikilink' && node.attrs?.noteId) acc.add(node.attrs.noteId);
    const kids = Array.isArray(node.content) ? node.content : [];
    kids.forEach((n) => extractOutgoingLinks(n, acc));
    return acc;
};

/** Build a Firestore-ready note payload */
const buildNotePayload = ({ userId, title = '', tags = [], content = { type: 'doc', content: [] }, portfolioId = null, notebookId = null }) => {
    const titleSlug = slugifyTitle(title);
    const tagSlugs = normalizeTags(tags);
    const tagLabels = tagSlugs.map(tagLabelFromSlug);
    const plainText = extractPlainText(content).slice(0, 20000);
    const outgoingLinks = Array.from(extractOutgoingLinks(content));
    return {
        title,
        titleSlug,
        tags: tagSlugs,
        tagLabels,
        content,
        plainText,
        outgoingLinks,
        portfolioId,
        notebookId,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
};

/** NOTES --------------------------------------------------------------------*/

export const createNote = async ({ userId, title = '', tags = [], content, portfolioId = null, notebookId = null }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('createNote: userId is required');
    const colRef = collection(db, 'users', userId, 'notes');
    const payload = buildNotePayload({ userId, title, tags, content, portfolioId, notebookId });
    const docRef = await addDoc(colRef, payload);
    return { id: docRef.id, ref: docRef };
};

export const updateNote = async ({ userId, noteId, title, tags, content, portfolioId, notebookId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('updateNote: userId is required');
    if (!noteId) throw new Error('updateNote: noteId is required');

    const ref = doc(db, 'users', userId, 'notes', noteId);
    const delta = { updatedAt: serverTimestamp() };
    if (typeof portfolioId === 'string' || portfolioId === null) {
        delta.portfolioId = portfolioId || null;
    }
    if (typeof notebookId === 'string' || notebookId === null) {
        delta.notebookId = notebookId || null;
    }


    if (typeof title === 'string') {
        delta.title = title;
        delta.titleSlug = slugifyTitle(title);
    }
    if (Array.isArray(tags)) {
        const slugs = normalizeTags(tags);
        delta.tags = slugs;
        delta.tagLabels = slugs.map(tagLabelFromSlug);
    }
    if (content) {
        delta.content = content;
        delta.plainText = extractPlainText(content).slice(0, 20000);
        delta.outgoingLinks = Array.from(extractOutgoingLinks(content));
    }

    await updateDoc(ref, delta);
    return { id: noteId, ref };
};

export const deleteNote = async ({ userId, noteId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('deleteNote: userId is required');
    if (!noteId) throw new Error('deleteNote: noteId is required');
    await deleteDoc(doc(db, 'users', userId, 'notes', noteId));
};

export const getNoteById = async ({ userId, noteId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('getNoteById: userId is required');
    const snap = await getDoc(doc(db, 'users', userId, 'notes', noteId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** List notes with ANY tag (OR) */
export const listNotesByTagsOR = async ({ userId, tags = [] }) => {
    if (!userId) userId = auth.currentUser?.uid;
    const slugs = normalizeTags(tags);
    if (!userId || !slugs.length) return [];
    const q = query(
        collection(db, 'users', userId, 'notes'),
        where('tags', 'array-contains-any', slugs),
        orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** List notes with ALL tags (AND) — OR query then client-side filter */
export const listNotesByTagsAND = async ({ userId, tags = [] }) => {
    const slugs = normalizeTags(tags);
    if (!slugs.length) return [];
    const notes = await listNotesByTagsOR({ userId, tags: slugs });
    return notes.filter((n) => slugs.every((t) => n.tags?.includes(t)));
};

/** Backlinks (notes that link to this noteId) */
export const listBacklinks = async ({ userId, noteId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId || !noteId) return [];
    const q = query(
        collection(db, 'users', userId, 'notes'),
        where('outgoingLinks', 'array-contains', noteId),
        orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Realtime backlinks for a note (unsubscribe with returned fn)
export const observeBacklinks = ({ userId, noteId, onChange }) => {
  if (!userId) userId = auth.currentUser?.uid;
  if (!userId || !noteId) return () => {};
  const q = query(
    collection(db, 'users', userId, 'notes'),
    where('outgoingLinks', 'array-contains', noteId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b?.updatedAt?.toMillis?.() || 0) - (a?.updatedAt?.toMillis?.() || 0));
    onChange?.(items);
  });
};


// Recent notes (sorted by updatedAt desc)
export const listRecentNotes = async ({ userId, limitCount = 25 }) => {
  if (!userId) userId = auth.currentUser?.uid;
  if (!userId) return [];
  const q = query(
    collection(db, 'users', userId, 'notes'),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return items.slice(0, limitCount);
};
// Realtime recent notes (unsubscribe with returned fn)
export const observeRecentNotes = ({ userId, limitCount = 50, onChange }) => {
  if (!userId) userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  const q = query(
    collection(db, 'users', userId, 'notes'),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange?.(items.slice(0, limitCount));
  });
};



/** SPACES (saved tag views) --------------------------------------------------*/

export const createSpace = async ({ userId, name, icon = '🗂️', includeTags = [], mode = 'OR', sort = 'recent' }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('createSpace: userId is required');
    const tagSlugs = normalizeTags(includeTags);
    const payload = {
        name: name || 'Untitled',
        icon,
        includeTags: tagSlugs,
        mode: mode === 'AND' ? 'AND' : 'OR',
        sort: sort === 'alpha' ? 'alpha' : 'recent',
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'users', userId, 'spaces'), payload);
    return { id: docRef.id, ref: docRef };
};

export const updateSpace = async ({ userId, spaceId, name, icon, includeTags, mode, sort }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('updateSpace: userId is required');
    if (!spaceId) throw new Error('updateSpace: spaceId is required');
    const delta = { updatedAt: serverTimestamp() };
    if (typeof name === 'string') delta.name = name;
    if (typeof icon === 'string') delta.icon = icon;
    if (Array.isArray(includeTags)) delta.includeTags = normalizeTags(includeTags);
    if (mode) delta.mode = mode === 'AND' ? 'AND' : 'OR';
    if (sort) delta.sort = sort === 'alpha' ? 'alpha' : 'recent';
    await updateDoc(doc(db, 'users', userId, 'spaces', spaceId), delta);
    return { id: spaceId };
};

export const deleteSpace = async ({ userId, spaceId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) throw new Error('deleteSpace: userId is required');
    if (!spaceId) throw new Error('deleteSpace: spaceId is required');
    await deleteDoc(doc(db, 'users', userId, 'spaces', spaceId));
};

export const listSpaces = async ({ userId }) => {
    if (!userId) userId = auth.currentUser?.uid;
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'spaces'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
