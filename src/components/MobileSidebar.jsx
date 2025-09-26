// src/components/MobileSidebar.jsx
import React from 'react';
import {
  Target, BookText, Calendar, Inbox, Sunrise, CalendarDays,
  CalendarPlus, FolderKanban, Settings, LogOut, Pencil, Plus, StickyNote
} from "lucide-react";
import { useFeatures } from "../hooks/useFeatures.jsx";
import { cn } from "@/lib/utils";

export default function MobileSidebar({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  projectData = [],
  onSelectProject,
  onEditProject,
  onAddProject,
  onLogout,
}) {
  const { isOn } = useFeatures();
  const showProjects = isOn('tasks');


  const mainNavItems = [
    { view: 'goals', title: 'Goals', icon: Target },
    { view: 'journal', title: 'Journal', icon: BookText },
    { view: 'notes', title: 'Notes', icon: StickyNote },
    { view: 'today', title: 'Today', icon: Calendar },
    { view: 'inbox', title: 'Inbox', icon: Inbox },
    { view: 'tomorrow', title: 'Tomorrow', icon: Sunrise },
    { view: 'thisWeek', title: 'This Week', icon: CalendarDays },
    { view: 'nextWeek', title: 'Next Week', icon: CalendarPlus },
  ];

  const filteredNavItems = mainNavItems.filter(item => !(
    (item.view === 'goals' && !isOn('goals')) ||
    (item.view === 'journal' && !isOn('journals')) ||
    (item.view === 'notes' && !isOn('notes')) ||
    (item.view === 'inbox' && !isOn('inbox')) ||
    (item.view === 'today' && !isOn('today')) ||
    (item.view === 'tomorrow' && !isOn('tomorrow')) ||
    (item.view === 'thisWeek' && !isOn('thisWeek')) ||
    (item.view === 'nextWeek' && !isOn('nextWeek'))
  ));




  const handleNavigation = (view) => {
    onNavigate(view);
    onClose();
  };

  const handleProjectSelect = (groupName, projectName) => {
    onSelectProject(groupName, projectName);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card text-card-foreground border-r flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {/* Main Navigation */}
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                title={item.title}
                className={cn(
                  "flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  currentView === item.view
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleNavigation(item.view)}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span>{item.title}</span>
              </button>
            );
          })}

          {/* Projects Section */}
          {showProjects && (
            <div className="pt-4">
              <div
                className={cn(
                  "flex items-center justify-between p-2 mx-1 rounded-md cursor-pointer transition-colors",
                  currentView === 'projects'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleNavigation('projects')}
              >
                <div className="flex items-center">
                  <FolderKanban className="h-5 w-5 mr-3" />
                  <h3 className="text-sm font-medium">Projects</h3>
                </div>
                <button
                  className="p-1 rounded-md hover:bg-muted"
                  onClick={(e) => { e.stopPropagation(); onAddProject(); onClose(); }}
                  title="Add New Project"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 mt-2">
                {(showProjects ? projectData : []).map((group) => (
                  <div key={group.name} className="pl-4">
                    <h4 className="px-3 my-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.name}
                    </h4>
                    {(group.projects || []).map(project => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between w-full text-left p-2 rounded-md cursor-pointer transition-colors text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleProjectSelect(group.name, project.name)}
                      >
                        <span className="truncate">{project.name}</span>
                        <button
                          className="p-1 rounded-md hover:bg-muted shrink-0"
                          title="Edit Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(project);
                            onClose();
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            )}
        </nav>

        {/* Footer Navigation */}
        <div className="mt-auto p-2">
          <button
            title="Settings"
            className={cn(
              "flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
              currentView === 'settings'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            onClick={() => handleNavigation('settings')}
          >
            <Settings className="h-5 w-5 mr-3" />
            <span>Settings</span>
          </button>
          <button
            title="Logout"
            className="flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}