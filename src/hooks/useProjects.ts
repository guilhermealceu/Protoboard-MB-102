import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Project } from '../types';
import { ACTIVE_PROJECT_ID_KEY, DEFAULT_PROJECTS, LOCAL_STORAGE_KEY } from '../data/defaultProjects';
import { SharedProject } from '../utils/share';

const HISTORY_LIMIT = 100;

interface History {
  past: Project[];
  future: Project[];
}

/**
 * Owns the list of projects, persistence to localStorage (auto-save on every change)
 * and per-project undo/redo history for circuit edits.
 */
export function useProjects() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const historyRef = useRef<Map<string, History>>(new Map());
  const [historyVersion, setHistoryVersion] = useState(0);

  // Load all projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setAllProjects(parsed);
          const defaultId = parsed.find((p: any) => p.id === savedActiveId)?.id || parsed[0].id;
          setCurrentProjectId(defaultId);
          return;
        }
      } catch (err) {
        console.error('Error parsing projects', err);
      }
    }
    setAllProjects(DEFAULT_PROJECTS);
    setCurrentProjectId(DEFAULT_PROJECTS[0].id);
  }, []);

  const saveAllToStorage = useCallback((updatedProjects: Project[]) => {
    setAllProjects(updatedProjects);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch (err) {
      console.error('Could not persist projects', err);
    }
  }, []);

  const currentProject = useMemo(() => {
    const proj = allProjects.find((p) => p.id === currentProjectId);
    return proj || DEFAULT_PROJECTS[0];
  }, [allProjects, currentProjectId]);

  const getHistory = (id: string): History => {
    let h = historyRef.current.get(id);
    if (!h) {
      h = { past: [], future: [] };
      historyRef.current.set(id, h);
    }
    return h;
  };

  const replaceProject = (proj: Project) => {
    const exists = allProjects.some((p) => p.id === proj.id);
    saveAllToStorage(exists ? allProjects.map((p) => (p.id === proj.id ? proj : p)) : [...allProjects, proj]);
  };

  /** Apply an edit to the current project and record it for undo. */
  const commitCurrent = (updatedProject: Project) => {
    const h = getHistory(currentProject.id);
    h.past.push(currentProject);
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    setHistoryVersion((v) => v + 1);
    replaceProject(updatedProject);
  };

  const undo = () => {
    const h = getHistory(currentProject.id);
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(currentProject);
    setHistoryVersion((v) => v + 1);
    replaceProject({ ...prev, name: currentProject.name, description: currentProject.description, updatedAt: new Date().toISOString() });
  };

  const redo = () => {
    const h = getHistory(currentProject.id);
    const next = h.future.pop();
    if (!next) return;
    h.past.push(currentProject);
    setHistoryVersion((v) => v + 1);
    replaceProject({ ...next, name: currentProject.name, description: currentProject.description, updatedAt: new Date().toISOString() });
  };

  // historyVersion is read so these recompute after every history change
  const canUndo = historyVersion >= 0 && (historyRef.current.get(currentProject.id)?.past.length ?? 0) > 0;
  const canRedo = historyVersion >= 0 && (historyRef.current.get(currentProject.id)?.future.length ?? 0) > 0;

  const selectProject = (projId: string) => {
    setCurrentProjectId(projId);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projId);
  };

  const createProject = (name: string, description: string, content?: Pick<Project, 'wires' | 'devices'>) => {
    const now = new Date().toISOString();
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      wires: content?.wires ?? [],
      devices: content?.devices ?? [],
      createdAt: now,
      updatedAt: now,
    };
    saveAllToStorage([...allProjects, newProj]);
    selectProject(newProj.id);
    return newProj;
  };

  const importShared = (shared: SharedProject) =>
    createProject(shared.name, shared.description, { wires: shared.wires, devices: shared.devices });

  const deleteProject = (projId: string) => {
    const updatedAll = allProjects.filter((p) => p.id !== projId);
    if (updatedAll.length === 0) return; // Prevent deleting last one
    saveAllToStorage(updatedAll);
    historyRef.current.delete(projId);
    if (currentProjectId === projId) selectProject(updatedAll[0].id);
  };

  return {
    allProjects,
    currentProjectId,
    currentProject,
    commitCurrent,
    saveProject: replaceProject,
    selectProject,
    createProject,
    importShared,
    deleteProject,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
