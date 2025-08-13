import React, { Suspense } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';

// Lazy load all the page-level components
const GoalsPage = React.lazy(() => import('./GoalsPage'));
const JournalsPage = React.lazy(() => import('./JournalsPage'));
const JournalEntryPage = React.lazy(() => import('./JournalEntryPage'));
const SettingsPage = React.lazy(() => import('./SettingsPage'));
const ProjectsPage = React.lazy(() => import('./ProjectsPage'));

import Column from './Column';
import ListView from './ListView';
import TaskItem from './TaskItem';
import BoardPager from './BoardPager';
import ViewControls from './ViewControls';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";


// This component acts as a router, deciding which view to display.
// It receives a lot of props from App.jsx, which holds the main state.
function MainContent({
    sensors,
    // View control
    currentView,
    currentProject,
    currentProjectData,
    selectedJournalId,
    viewOptions,
    getViewOption,

    // Data
    user,
    projectData,
    projectLabels,
    inboxTasks,
    allTags,
    tasksByProject,
    allTasksForListView,

    // UI State
    isLoading,
    activeId,
    showCompletedTasks,
    activeColumnIndex,
    activeGlobalIndex,
    isAddingColumn,
    newColumnName,

    // Refs for scrolling
    inboxScrollRef,
    boardScrollRef,
    globalScrollRef,

    // Event handlers
    onSelectProject,
    onUpdateName,
    updateLabels,
    handleAddGroup,
    handleRenameGroup,
    handleDeleteGroup,
    toggleTheme,
    theme,
    onThemeChange,
    handleToggleShowCompletedTasks,
    onSelectJournal,
    setModalTask,
    updateTask,
    handleListDragEnd,
    handleInboxDragEnd,
    addInboxTask,
    handleInboxTaskUpdate,
    renameInboxColumn,
    deleteInboxColumn,
    handleSaveNewColumn,
    setIsAddingColumn,
    setNewColumnName,
    handleDrop,
    addTask,
    renameColumn,
    deleteColumn,
    handleToggleSubtask,
    findTaskById,

    // Swipe handlers
    inboxSwipeHandlers,
    boardSwipeHandlers,
    globalSwipeHandlers,

    // Pager handlers
    handlePagerDotClick,
    handlePagerAddClick,
    goToGlobalPage,
    handleGlobalScroll,

    // View options
    setViewOption,
}) {


    if (isLoading) {
        return <div style={{ padding: 20 }}><h2>Loading...</h2></div>;
    }

    const activeTask = activeId ? findTaskById(activeId) : null;
    const viewKey = currentView === 'board' ? currentProject : currentView;

    switch (currentView) {
        case 'projects':
            return (
                <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Projects...</h2></div>}>
                    <ProjectsPage
                        projectData={projectData}
                        onSelectProject={onSelectProject}
                    />
                </Suspense>
            );
        case 'settings':
            return (
                <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Settings...</h2></div>}>
                    <SettingsPage
                        currentUser={user}
                        onUpdateName={onUpdateName}
                        initialLabels={projectLabels}
                        initialGroups={projectData.map(g => g.name)}
                        onUpdateLabels={updateLabels}
                        onAddGroup={handleAddGroup}
                        onRenameGroup={handleRenameGroup}
                        onDeleteGroup={handleDeleteGroup}
                        currentTheme={getViewOption('app', 'theme', 'light')}
                        onToggleTheme={toggleTheme}
                        theme={theme}
                        onThemeChange={onThemeChange}
                        showCompletedTasks={showCompletedTasks}
                        onToggleShowCompletedTasks={handleToggleShowCompletedTasks}
                    />
                </Suspense>
            );
        case 'goals':
            return <Suspense fallback={<div>Loading...</div>}><GoalsPage /></Suspense>;
        case 'journal':
            return (
                <Suspense fallback={<div style={{ padding: 20 }}><h2>Loading Journals...</h2></div>}>
                    <JournalsPage onSelectJournal={onSelectJournal} />
                </Suspense>
            );
        case 'journalEntry':
            return <Suspense fallback={<div>Loading...</div>}><JournalEntryPage journalId={selectedJournalId} user={user} /></Suspense>;

        case 'today':
        case 'tomorrow':
        case 'thisWeek':
        case 'nextWeek': {
            const viewTitle = currentView === 'today'
                ? `Happy ${new Date().toLocaleDateString('en-us', { weekday: 'long' })}, ${user?.displayName || 'Friend'}!`
                : currentView.charAt(0).toUpperCase() + currentView.slice(1).replace(/([A-Z])/g, ' $1').trim();

            return (
                <div className="p-6 space-y-4 h-full flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight">{viewTitle}</h1>
                    {getViewOption(currentView, 'mode', 'board') === 'board' ? (<>
                        <div className="-mx-6 md:mx-0 flex-1 min-h-0">
                            <div className="relative h-full w-full" {...globalSwipeHandlers}>
                                <div
                                    ref={globalScrollRef}
                                    onScroll={handleGlobalScroll}
                                    className="flex md:p-4 md:gap-4 overflow-x-auto h-full mobile-no-scrollbar snap-x snap-mandatory md:snap-none touch-pan-x overscroll-x-contain"
                                >
                                    {Object.entries(tasksByProject).map(([groupName, tasks]) => (
                                        <div key={groupName} className="w-full shrink-0 md:w-80 snap-start">
                                            <Column
                                                column={{ id: groupName, name: groupName }}
                                                tasks={tasks}
                                                isEditable={false}
                                                onOpenTask={(task) => setModalTask({ ...task })}
                                                onUpdateTask={(col, taskId, updatedTask) => updateTask(tasks[0]?.projectId, taskId, updatedTask)}
                                                availableLabels={projectLabels}
                                                allTags={allTags}
                                                currentView={currentView}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {Object.keys(tasksByProject || {}).length > 1 && (
                                    <BoardPager
                                        count={Object.keys(tasksByProject || {}).length}
                                        activeIndex={activeGlobalIndex[currentView] || 0}
                                        onDotClick={(index) => goToGlobalPage(index)}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                    ) : (

                        <div className="flex-1 overflow-y-auto">
                            <ListView
                                tasks={allTasksForListView}
                                groupBy={getViewOption(viewKey, 'groupBy', 'project')}
                                projectData={projectData}
                                availableLabels={projectLabels}
                                allTags={allTags}
                                onOpenTask={(task) => setModalTask({ ...task })}
                                onToggleComplete={(task) => updateTask(task.projectId, task.id, { completed: !task.completed })}
                                onToggleSubtask={(taskId, subtaskId) => {
                                    const task = allTasksForListView.find(t => t.id === taskId);
                                    if (task) handleToggleSubtask(task.projectId, taskId, subtaskId);
                                }}
                                isDraggable={false}
                            />
                        </div>
                    )}
                </div>
            );
        }

        case 'inbox':
            const safeInboxTasks = inboxTasks && inboxTasks.columnOrder && inboxTasks.columns ? inboxTasks : { columnOrder: [{ id: 'Inbox', name: 'Inbox' }], columns: { 'Inbox': [] } };
            return (<>
                <div className="relative h-full w-full" {...inboxSwipeHandlers}>
                    <div
                        ref={inboxScrollRef}
                        className="flex md:p-4 md:gap-4 overflow-x-auto h-full mobile-no-scrollbar snap-x snap-mandatory md:snap-none"
                    >
                        {safeInboxTasks.columnOrder.filter(Boolean).map((column) => (
                            <Column
                                key={column.id}
                                column={column}
                                tasks={(safeInboxTasks.columns[column.id] || []).filter(task => showCompletedTasks || !task.completed)}
                                onAddTask={(taskData) => addInboxTask(taskData)}
                                onUpdateTask={handleInboxTaskUpdate}
                                onOpenTask={(task) => setModalTask({ ...task, isInbox: true })}
                                onRenameColumn={renameInboxColumn}
                                onDeleteColumn={deleteInboxColumn}
                                availableLabels={projectLabels}
                                allTags={allTags}
                                currentView={currentView}
                            />
                        ))}
                        {isAddingColumn.inbox ? (
                            <div className="flex flex-col w-full shrink-0 md:w-80 p-3 space-y-2 bg-card rounded-lg border snap-start">
                                <Input
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveNewColumn('inbox');
                                        if (e.key === 'Escape') setIsAddingColumn({ ...isAddingColumn, inbox: false });
                                    }}
                                    placeholder="Enter column name..."
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => handleSaveNewColumn('inbox')}>Add column</Button>
                                    <Button variant="ghost" onClick={() => setIsAddingColumn({ ...isAddingColumn, inbox: false })}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full shrink-0 md:w-80 p-3 snap-start">
                                <Button
                                    variant="outline"
                                    className="w-full border-dashed"
                                    onClick={() => setIsAddingColumn({ ...isAddingColumn, inbox: true })}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Column
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <BoardPager
                    count={safeInboxTasks?.columnOrder?.length || 0}
                    activeIndex={activeColumnIndex.inbox}
                    onDotClick={(index) => handlePagerDotClick(index, 'inbox')}
                    onAddClick={() => handlePagerAddClick('inbox')}
                />
            </>
            );

        default: // This is the 'board' view for a specific project
            if (!currentProjectData) {
                return (
                    <div className="p-6 text-center">
                        <h2 className="text-xl font-semibold">Welcome to Rocket Productivity!</h2>
                        <p className="text-muted-foreground mt-2">Select a project from the sidebar to get started, or create a new one.</p>
                    </div>
                );
            }

            return getViewOption(currentProject, 'mode', 'board') === 'board' ? (
                <>
                    <div className="relative h-full w-full" {...boardSwipeHandlers}>
                        <div ref={boardScrollRef} className="flex md:p-4 md:gap-4 overflow-x-auto h-full mobile-no-scrollbar snap-x snap-mandatory md:snap-none">
                            {currentProjectData?.columnOrder?.filter(Boolean).map((column) => (
                                <Column key={column.id} column={column}
                                    tasks={(currentProjectData.columns[column.id] || []).filter(task => showCompletedTasks || !task.completed)}
                                    onAddTask={(taskData) => addTask(taskData, currentProjectData.id)}
                                    onUpdateTask={(colId, taskId, updatedData) => updateTask(currentProjectData.id, taskId, updatedData)}
                                    onOpenTask={(task) => setModalTask({ ...task, projectId: currentProjectData.id })}
                                    onRenameColumn={renameColumn} onDeleteColumn={deleteColumn}
                                    availableLabels={projectLabels} allTags={allTags}
                                    currentView={currentView}
                                />
                            ))}
                            {isAddingColumn.board ? (
                                <div className="flex flex-col w-full shrink-0 md:w-80 p-3 space-y-2 bg-card rounded-lg border snap-start">
                                    <Input
                                        value={newColumnName}
                                        onChange={(e) => setNewColumnName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNewColumn('board');
                                            if (e.key === 'Escape') setIsAddingColumn({ ...isAddingColumn, board: false });
                                        }}
                                        placeholder="Enter column name..."
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => handleSaveNewColumn('board')}>Add column</Button>
                                        <Button variant="ghost" onClick={() => setIsAddingColumn({ ...isAddingColumn, board: false })}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full shrink-0 md:w-80 p-3 snap-start">
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddingColumn({ ...isAddingColumn, board: true })}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Column
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <BoardPager
                        count={currentProjectData?.columnOrder?.length || 0}
                        activeIndex={activeColumnIndex.board}
                        onDotClick={(index) => handlePagerDotClick(index, 'board')}
                        onAddClick={() => handlePagerAddClick('board')}
                    />
                </>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <ViewControls
                        groupByOptions={[
                            { value: 'manual', label: 'Manual' },
                            { value: 'column', label: 'Column' },
                            { value: 'priority', label: 'Priority' },
                            { value: 'dueDate', label: 'Due Date' },
                        ]}
                        selectedGroupBy={getViewOption(viewKey, 'groupBy', 'manual')}
                        onGroupByChange={(value) => setViewOption(viewKey, 'groupBy', value)}
                    />
                    <ListView
                        tasks={allTasksForListView}
                        groupBy={getViewOption(viewKey, 'groupBy', 'manual')}
                        projectData={projectData}
                        availableLabels={projectLabels}
                        allTags={allTags}
                        onOpenTask={(task) => setModalTask({ ...task, projectId: currentProjectData?.id })}
                        onToggleComplete={(task) => updateTask(currentProjectData.id, task.id, { completed: !task.completed })}
                        onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(currentProjectData.id, taskId, subtaskId)}
                        isDraggable={true}
                    />
                </div>
            );
    }
}

export default MainContent;