// src/hooks/useUserData.js
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function useUserData() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [projectData, setProjectData] = useState([]);
  const [projectLabels, setProjectLabels] = useState([]);
  const [inboxTasks, setInboxTasks] = useState({
    columnOrder: [{ id: 'Inbox', name: 'Inbox' }],
    columns: { Inbox: [] },
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [allTags, setAllTags] = useState({});
  const [theme, setTheme] = useState('light');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // Load all user data when logged in
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        setIsLoading(true);

        // appData
        const appDataRef = doc(db, 'users', user.uid, 'appData', 'data');
        const appDataSnap = await getDoc(appDataRef);
        const appData = appDataSnap.exists() ? appDataSnap.data() : {};

        // Inbox migration / load
        let inboxData = appData.inboxTasks || { columnOrder: [], columns: {} };
        if (inboxData.columnOrder && inboxData.columnOrder.length > 0 && typeof inboxData.columnOrder[0] === 'string') {
          const oldColumnNames = [...inboxData.columnOrder];
          inboxData.columnOrder = oldColumnNames.map(name => ({ id: name, name }));
          const newColumns = {};
          inboxData.columnOrder.forEach(col => {
            newColumns[col.id] = (inboxData.columns[col.name] || []).map(task => ({ ...task, column: col.id }));
          });
          inboxData.columns = newColumns;
        } else if (!inboxData.columnOrder || inboxData.columnOrder.length === 0) {
          inboxData = { columnOrder: [{ id: 'Inbox', name: 'Inbox' }], columns: { Inbox: (inboxData.columns?.Inbox || []) } };
        }
        setInboxTasks(inboxData);

        // Calendar events
        const calendarEventsRef = collection(db, 'users', user.uid, 'calendarEvents');
        const calendarEventsSnap = await getDocs(calendarEventsRef);
        const fetchedCalendarEvents = calendarEventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCalendarEvents(fetchedCalendarEvents);

        // App prefs
        setProjectLabels(appData.projectLabels || []);
        const groupOrder = appData.groupOrder || [];
        setTheme(appData.theme || 'light');
        setShowCompletedTasks(appData.showCompletedTasks !== undefined ? appData.showCompletedTasks : true);

        // Projects + tasks + tags
        const projectsCollectionRef = collection(db, 'users', user.uid, 'projects');
        const projectsSnapshot = await getDocs(projectsCollectionRef);
        const allProjects = [];
        const allTagsData = {};

        for (const projectDoc of projectsSnapshot.docs) {
          const project = { id: projectDoc.id, ...projectDoc.data() };

          const tasksCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tasks');
          const tasksSnapshot = await getDocs(tasksCollectionRef);
          const tasks = tasksSnapshot.docs.map(d => ({ id: d.id, ...d.data(), projectId: project.id }));

          const tagsCollectionRef = collection(db, 'users', user.uid, 'projects', project.id, 'tags');
          const tagsSnapshot = await getDocs(tagsCollectionRef);
          allTagsData[project.id] = tagsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          // Column migration + columnized tasks
          if (project.columnOrder && project.columnOrder.length > 0 && typeof project.columnOrder[0] === 'string') {
            const oldColumnNames = [...project.columnOrder];
            project.columnOrder = oldColumnNames.map(name => ({ id: name, name }));
            const newColumns = {};
            project.columnOrder.forEach(col => {
              newColumns[col.id] = (tasks.filter(t => t.column === col.name)).map(t => ({ ...t, column: col.id }));
            });
            project.columns = newColumns;
          } else {
            const columns = {};
            (project.columnOrder || []).forEach(col => {
              columns[col.id] = tasks.filter(t => t.column === col.id);
            });
            project.columns = columns;
          }

          allProjects.push(project);
        }

        // Group projects by groupOrder, then others
        const groupsMap = {};
        for (const project of allProjects) {
          const groupName = project.group || 'Ungrouped';
          if (!groupsMap[groupName]) groupsMap[groupName] = [];
          groupsMap[groupName].push(project);
        }

        const finalSortedData = [];
        for (const groupName of groupOrder) {
          if (groupsMap[groupName]) {
            finalSortedData.push({ name: groupName, projects: groupsMap[groupName] });
            delete groupsMap[groupName];
          }
        }
        for (const groupName in groupsMap) {
          finalSortedData.push({ name: groupName, projects: groupsMap[groupName] });
        }

        setAllTags(allTagsData);
        setProjectData(finalSortedData);
        setIsLoading(false);
      };

      fetchUserData();
    } else {
      // Clear on logout (UI selection state stays outside this hook)
      setProjectData([]);
      setProjectLabels([]);
      setInboxTasks({ columnOrder: [], columns: {} });
      setCalendarEvents([]);
      setAllTags({});
      setIsLoading(false);
    }
  }, [user]);

  // Debounced calendar sync to Firestore
  useEffect(() => {
    if (isLoading || !user) return;

    const syncCalendarEvents = async () => {
      const calendarEventsRef = collection(db, 'users', user.uid, 'calendarEvents');
      const querySnapshot = await getDocs(calendarEventsRef);
      const batch = writeBatch(db);

      // delete existing
      querySnapshot.docs.forEach(d => batch.delete(d.ref));

      // add current local set
      calendarEvents.forEach(event => {
        const eventId = event.id || `${Date.now()}-${Math.random()}`;
        const newEventRef = doc(calendarEventsRef, eventId);
        batch.set(newEventRef, { ...event, id: eventId });
      });

      await batch.commit();
    };

    const debounce = setTimeout(syncCalendarEvents, 1500);
    return () => clearTimeout(debounce);
  }, [calendarEvents, user, isLoading]);

    return {
    user, setUser, isLoading,
    projectData, setProjectData,
    projectLabels, setProjectLabels,
    inboxTasks, setInboxTasks,
    calendarEvents, setCalendarEvents,
    allTags, setAllTags,
    theme, setTheme,
    showCompletedTasks, setShowCompletedTasks,
  };

}
