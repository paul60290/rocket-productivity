// src/lib/tags.js
import { auth, db } from '@/firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query, where, serverTimestamp,
} from 'firebase/firestore';
import { normalizeTags } from '@/lib/utils';

const uid = () => auth.currentUser?.uid;
const tagsCol = (u) => collection(db, 'users', u, 'tags');
const notesCol = (u) => collection(db, 'users', u, 'notes');

/** Return the persistent, user-wide master list of tag slugs */
export async function listAllTags({ userId } = {}) {
  const u = userId || uid(); if (!u) return [];
  const snap = await getDocs(tagsCol(u));
  return snap.docs.map(d => d.id).sort();
}

/** Ensure 1+ tags exist in the master list (id = slug) */
export async function ensureMasterTags({ tags, userId } = {}) {
  const u = userId || uid(); if (!u) return [];
  const slugs = normalizeTags(tags);
  if (!slugs.length) return [];
  const batch = writeBatch(db);
  slugs.forEach(slug => {
    batch.set(doc(tagsCol(u), slug), { createdAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
  return slugs;
}

/** Rename tag across all notes AND in master list */
export async function renameTagEverywhere({ from, to, userId } = {}) {
  const u = userId || uid(); if (!u) return { updated: 0 };
  const oldSlug = normalizeTags(from)[0];
  const newSlug = normalizeTags(to)[0];
  if (!oldSlug || !newSlug || oldSlug === newSlug) return { updated: 0 };

  // Update master list: upsert new, remove old
  {
    const b = writeBatch(db);
    b.set(doc(tagsCol(u), newSlug), { createdAt: serverTimestamp() }, { merge: true });
    b.delete(doc(tagsCol(u), oldSlug));
    await b.commit();
  }

  // Update notes in chunks
  const q = query(notesCol(u), where('tags', 'array-contains', oldSlug));
  const snap = await getDocs(q);
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const b = writeBatch(db);
    docs.slice(i, i + 400).forEach(s => {
      const data = s.data() || {};
      const old = Array.isArray(data.tags) ? data.tags : [];
      const next = Array.from(new Set(old.map(t => (t === oldSlug ? newSlug : t))));
      b.update(s.ref, { tags: next, updatedAt: serverTimestamp() });
    });
    await b.commit();
  }
  return { updated: snap.size };
}

/** Delete tag from master list AND remove it from any notes that still have it */
export async function deleteTagEverywhere({ tag, userId } = {}) {
  const u = userId || uid(); if (!u) return { updated: 0 };
  const slug = normalizeTags(tag)[0];
  if (!slug) return { updated: 0 };

  // Remove from master list
  await deleteDoc(doc(tagsCol(u), slug));

  // Remove from notes
  const q = query(notesCol(u), where('tags', 'array-contains', slug));
  const snap = await getDocs(q);
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const b = writeBatch(db);
    docs.slice(i, i + 400).forEach(s => {
      const data = s.data() || {};
      const old = Array.isArray(data.tags) ? data.tags : [];
      const next = old.filter(t => t !== slug);
      b.update(s.ref, { tags: next, updatedAt: serverTimestamp() });
    });
    await b.commit();
  }
  return { updated: snap.size };
}

