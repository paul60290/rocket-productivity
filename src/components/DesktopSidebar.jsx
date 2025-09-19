// src/components/DesktopSidebar.jsx
import React from 'react'
import RocketIcon from '@/assets/logo.svg?react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableProjectItem from './SortableProjectItem'
import { FolderKanban, Plus, Pencil, Settings, LogOut } from 'lucide-react'

export default function DesktopSidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  currentView,
  setCurrentView,
  mainNavItems,
  projectData,
  currentGroup,
  currentProject,
  onSelectProject,
  onEditProject,
  onAddProject,
  onLogout,
}) {
  return (
    <div className={`hidden md:flex bg-card text-card-foreground border-r flex-col h-full transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <RocketIcon
          className={`h-8 w-auto text-foreground transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}
        />
        <button
          className="p-1 rounded-md hover:bg-muted"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title="Toggle Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`h-6 w-6 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 p-2">
        {mainNavItems.map(item => {
          const Icon = item.icon
          const active = currentView === item.view
          return (
            <button
              key={item.view}
              title={item.title}
              className={`flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              onClick={() => setCurrentView(item.view)}
            >
              <Icon className="h-5 w-5" />
              <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>{item.title}</span>
            </button>
          )
        })}
      </nav>

      {/* Projects row */}
      <div
        className={`flex items-center justify-between p-2 mx-1 rounded-md cursor-pointer transition-colors ${currentView === 'projects' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        onClick={() => setCurrentView('projects')}
      >
        <div className="flex items-center">
          <FolderKanban className="h-5 w-5" />
          <h3 className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
            Projects
          </h3>
        </div>
        <button
          className={`p-1 rounded-md hover:bg-muted transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => {
            e.stopPropagation()
            onAddProject()
          }}
          title="Add New Project"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Project groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {!isSidebarCollapsed && (projectData || []).map(group => (
          <div key={group.name}>
            <h4 className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.name}
            </h4>
            <SortableContext items={group.projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {group.projects.map(project => (
                <SortableProjectItem key={project.id} id={project.id}>
                  <div
                    className={`flex items-center justify-between w-full text-left p-2 rounded-md cursor-pointer transition-colors text-sm ${(currentView === 'board' && currentProject === project.name && currentGroup === group.name)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    onClick={() => onSelectProject(group.name, project.name)}
                  >
                    <span className="whitespace-nowrap">{project.name}</span>
                    <button
                      className="p-1 rounded-md hover:bg-muted"
                      title="Edit Project"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditProject(project)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </SortableProjectItem>
              ))}
            </SortableContext>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="mt-auto p-2">
        <button
          title="Settings"
          className={`flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          onClick={() => setCurrentView('settings')}
        >
          <Settings className="h-5 w-5" />
          <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Settings</span>
        </button>
        <button
          title="Logout"
          className="flex items-center w-full rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className={`ml-3 whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>Logout</span>
        </button>
      </div>
    </div>
  )
}
