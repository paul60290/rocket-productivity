// src/hooks/useGroupedTasks.js
import { useMemo } from 'react';
import { formatDate } from '@/lib/utils';

export default function useGroupedTasks(tasks, groupBy, projectData) {
  const groupedTasks = useMemo(() => {
    // A stable, manually sorted list is our baseline
    const sortedTasks = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));

    const tasksByGroup = {};

    switch (groupBy) {
      case 'priority':
        ['1', '2', '3', '4'].forEach(p => { tasksByGroup[`Priority ${p}`] = []; });
        sortedTasks.forEach(task => {
          tasksByGroup[`Priority ${task.priority}`].push(task);
        });
        break;

      case 'dueDate':
        const sortedByDate = [...sortedTasks].sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        });
        sortedByDate.forEach(task => {
          const groupName = task.date ? formatDate(task.date) : 'No Date';
          if (!tasksByGroup[groupName]) tasksByGroup[groupName] = [];
          tasksByGroup[groupName].push(task);
        });
        break;

      case 'project':
        sortedTasks.forEach(task => {
          const groupName = task.projectName || 'Uncategorized';
          if (!tasksByGroup[groupName]) tasksByGroup[groupName] = [];
          tasksByGroup[groupName].push(task);
        });
        break;

      case 'column':
        const currentProject = projectData.flatMap(g => g.projects).find(p => p.id === tasks[0]?.projectId);
        if (currentProject) {
            currentProject.columnOrder.forEach(col => {
                tasksByGroup[col.name] = [];
            });
            sortedTasks.forEach(task => {
                const col = currentProject.columnOrder.find(c => c.id === task.column);
                if (col) {
                    tasksByGroup[col.name].push(task);
                }
            });
        }
        break;

      case 'manual':
      default:
        const groupName = tasks[0]?.projectName || 'Tasks';
        tasksByGroup[groupName] = sortedTasks;
        break;
    }

    // Filter out any groups that ended up with no tasks
    for (const groupName in tasksByGroup) {
      if (tasksByGroup[groupName].length === 0) {
        delete tasksByGroup[groupName];
      }
    }

    return tasksByGroup;
  }, [tasks, groupBy, projectData]);

  return groupedTasks;
}