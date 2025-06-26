import React from 'react';

export default function ProjectsPage({ projectData, onSelectProject }) {
  return (
    <div className="projects-page-container">
      <h1>Projects</h1>
      {projectData.map((group) => (
        <div key={group.name} className="project-group-section">
          <h2 className="project-group-title">{group.name}</h2>
          <div className="project-grid">
            {group.projects.map((project) => (
              <div 
  key={project.id} 
  className="project-card"
  onClick={() => onSelectProject(group.name, project.name)}
>
  {project.name}
</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}