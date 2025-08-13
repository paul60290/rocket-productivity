// src/hooks/useAuthActions.js
import { updateProfile, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Centralizes auth flows. Accepts setUser so UI updates instantly after profile changes.
 */
export default function useAuthActions(setUser) {
  const updateDisplayName = async (newName) => {
    if (!auth.currentUser) {
      alert("You must be logged in to update your name.");
      return;
    }
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      // Immediate local update so the UI reflects it right away.
      setUser(prev => (prev ? { ...prev, displayName: newName } : prev));
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update name.");
    }
  };

  const login = async (email, password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged in useUserData() will sync the rest; we don’t need to setUser here.
    return user;
  };

  const register = async (email, password, displayName) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(user, { displayName });
      setUser(prev => (prev ? { ...prev, displayName } : { ...user, displayName }));
    }
    return user;
  };

  const logout = async () => {
    await signOut(auth);
    // Optional: setUser(null) for instant UI clear; useUserData’s listener will also handle it.
    setUser(null);
  };

  return { updateDisplayName, login, register, logout };
}
