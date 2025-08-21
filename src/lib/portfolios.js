// src/lib/portfolios.js
import { auth, db } from '@/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

/** Resolve current user */
const uid = () => auth.currentUser?.uid;

/** --------------------- PORTFOLIOS --------------------- */
export const createPortfolio = async ({ userId, name }) => {
  userId = userId || uid();
  if (!userId) throw new Error('createPortfolio: userId required');
  const ref = await addDoc(collection(db, 'users', userId, 'portfolios'), {
    name: name || 'Untitled Portfolio',
    ownerId: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ref };
};

export const updatePortfolio = async ({ userId, portfolioId, name }) => {
  userId = userId || uid();
  if (!userId || !portfolioId) throw new Error('updatePortfolio: ids required');
  const delta = { updatedAt: serverTimestamp() };
  if (typeof name === 'string') delta.name = name;
  await updateDoc(doc(db, 'users', userId, 'portfolios', portfolioId), delta);
  return { id: portfolioId };
};

export const deletePortfolio = async ({ userId, portfolioId }) => {
  userId = userId || uid();
  if (!userId || !portfolioId) throw new Error('deletePortfolio: ids required');
  await deleteDoc(doc(db, 'users', userId, 'portfolios', portfolioId));
};

export const listPortfolios = async ({ userId }) => {
  userId = userId || uid();
  if (!userId) return [];
  const q = query(collection(db, 'users', userId, 'portfolios'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** ---------------------- NOTEBOOKS ---------------------- */
export const createNotebook = async ({ userId, name, portfolioId = null }) => {
  userId = userId || uid();
  if (!userId) throw new Error('createNotebook: userId required');
  const ref = await addDoc(collection(db, 'users', userId, 'notebooks'), {
    name: name || 'Untitled Notebook',
    portfolioId: portfolioId || null,
    ownerId: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ref };
};

export const updateNotebook = async ({ userId, notebookId, name, portfolioId }) => {
  userId = userId || uid();
  if (!userId || !notebookId) throw new Error('updateNotebook: ids required');
  const delta = { updatedAt: serverTimestamp() };
  if (typeof name === 'string') delta.name = name;
  if (typeof portfolioId === 'string' || portfolioId === null) delta.portfolioId = portfolioId || null;
  await updateDoc(doc(db, 'users', userId, 'notebooks', notebookId), delta);
  return { id: notebookId };
};

export const deleteNotebook = async ({ userId, notebookId }) => {
  userId = userId || uid();
  if (!userId || !notebookId) throw new Error('deleteNotebook: ids required');
  await deleteDoc(doc(db, 'users', userId, 'notebooks', notebookId));
};

export const listNotebooks = async ({ userId }) => {
  userId = userId || uid();
  if (!userId) return [];
  const q = query(collection(db, 'users', userId, 'notebooks'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const listNotebooksByPortfolio = async ({ userId, portfolioId }) => {
  userId = userId || uid();
  if (!userId) return [];
  const q = query(
    collection(db, 'users', userId, 'notebooks'),
    where('portfolioId', '==', portfolioId || null),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
