// src/lib/attachments.js
import { auth, storage } from "@/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
  deleteObject,
} from "firebase/storage";

/** Current user id helper */
const uid = () => auth.currentUser?.uid;

/** Simple filename sanitizer */
function sanitizeFilename(name) {
  return (name || "file")
    .replace(/[\/\\]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a storage path for a note attachment */
function attachmentPath({ userId, noteId, filename }) {
  if (!userId) throw new Error("attachmentPath: userId required");
  if (!noteId) throw new Error("attachmentPath: noteId required");
  const safe = sanitizeFilename(filename);
  return `users/${userId}/notes/${noteId}/attachments/${safe}`;
}

/**
 * Upload a file to Storage.
 * onProgress?: (percent) => void (0..100)
 * Returns: { path, url, name, size, contentType, updated }
 */
export function uploadAttachment({ noteId, file, onProgress }) {
  const userId = uid();
  if (!userId) throw new Error("uploadAttachment: not signed in");
  if (!noteId) throw new Error("uploadAttachment: noteId required");
  if (!file) throw new Error("uploadAttachment: file required");

  const path = attachmentPath({ userId, noteId, filename: file.name });
  const objectRef = ref(storage, path);
  const task = uploadBytesResumable(objectRef, file, {
    contentType: file.type || undefined,
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(pct);
        }
      },
      reject,
      async () => {
        try {
          const [url, meta] = await Promise.all([
            getDownloadURL(objectRef),
            getMetadata(objectRef),
          ]);
          resolve({
            path,
            url,
            name: meta.name,
            size: meta.size,
            contentType: meta.contentType || "",
            updated: meta.updated || null,
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * List attachments for a note.
 * Returns: Array<{ path, url, name, size, contentType, updated }>
 */
export async function listAttachments({ noteId }) {
  const userId = uid();
  if (!userId) throw new Error("listAttachments: not signed in");
  if (!noteId) throw new Error("listAttachments: noteId required");

  const dirRef = ref(storage, `users/${userId}/notes/${noteId}/attachments`);
  const res = await listAll(dirRef);
  const items = await Promise.all(
    res.items.map(async (itemRef) => {
      const [url, meta] = await Promise.all([getDownloadURL(itemRef), getMetadata(itemRef)]);
      return {
        path: itemRef.fullPath,
        url,
        name: meta.name,
        size: meta.size,
        contentType: meta.contentType || "",
        updated: meta.updated || null,
      };
    })
  );
  // newest first
  return items.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
}

/** Get a download URL if you already know the path */
export function getAttachmentUrl({ path }) {
  const objectRef = ref(storage, path);
  return getDownloadURL(objectRef);
}

/** Delete an attachment by path (e.g., from listAttachments) */
export async function deleteAttachment({ path }) {
  if (!path) throw new Error("deleteAttachment: path required");
  const objectRef = ref(storage, path);
  await deleteObject(objectRef);
  return { path };
}
