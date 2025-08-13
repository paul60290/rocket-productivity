// src/hooks/useProjectTags.js
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Loads tags for a given project when `user` or `projectId` changes.
 * Returns the tags, a setter (for optimistic updates), and a refresh() function.
 */
export default function useProjectTags(user, projectId) {
  const [tags, setTags] = useState([]);

  const fetchTags = useCallback(async () => {
    if (!user || !projectId) {
      setTags([]);
      return;
    }
    const tagsRef = collection(db, 'users', user.uid, 'projects', projectId, 'tags');
    const snap = await getDocs(tagsRef);
    const next = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTags(next);
  }, [user, projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchTags();
    })();
    return () => { cancelled = true; };
  }, [fetchTags]);

  return { tags, setTags, refresh: fetchTags };
}
