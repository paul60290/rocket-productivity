import React from 'react';
import { Card } from "@/components/ui/card";

export default function ProjectsPage({ projectData, onSelectProject }) {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
      {projectData.map((group) => (
        <div key={group.name}>
          <h2 className="text-xl font-semibold tracking-tight border-b pb-2 mb-4">{group.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.projects.map((project) => (
              <Card
                key={project.id}
                className="p-4 hover:bg-accent cursor-pointer"
                onClick={() => onSelectProject(group.name, project.name)}
              >
                <div className="font-semibold">{project.name}</div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}