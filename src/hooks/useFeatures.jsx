import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

const FeatureCtx = createContext({
  isOn: () => true,   // default: everything "on" for now
  ready: false,
  toggles: {},
});

export function FeatureProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [toggles, setToggles] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null)), []);

  useEffect(() => {
    setReady(false);
    setToggles({});
    if (!uid) { setReady(true); return; }

    const ref = doc(db, "users", uid, "settings", "userFeatures");
    return onSnapshot(
      ref,
      (snap) => { setToggles(snap.data()?.enabled || {}); setReady(true); },
      () => setReady(true)
    );
  }, [uid]);

    const isOn = (key) => {
    const enabled = !!toggles[key];

    // If Tasks/Projects is OFF, auto-disable only the date views.
    // Inbox remains independent so the app can be a simple todo list.
    const tasksEnabled = !!toggles["tasks"];
    const dependsOnTasks = ["today", "tomorrow", "thisWeek", "nextWeek"]; // inbox removed

    if (!tasksEnabled && dependsOnTasks.includes(key)) return false;

    return enabled;
  };


  return (
    <FeatureCtx.Provider value={{ isOn, ready, toggles }}>
      {children}
    </FeatureCtx.Provider>
  );
}

export const useFeatures = () => useContext(FeatureCtx);
