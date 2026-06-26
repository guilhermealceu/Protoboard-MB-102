import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../types';
import { 
  FolderOpen, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Printer, 
  Check, 
  Copy, 
  Calendar, 
  Search, 
  FileText, 
  Database,
  X,
  Info,
  Clock,
  Layers,
  ChevronRight,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectActionsProps {
  currentProject: Project;
  onSaveProject: (project: Project) => void;
  onLoadProject: (projectId: string) => void;
  onCreateNewProject: (name: string, description: string) => void;
  onDeleteProject: (projectId: string) => void;
  allProjects: Project[];
}

export const ProjectActions: React.FC<ProjectActionsProps> = ({
  currentProject,
  onSaveProject,
  onLoadProject,
  onCreateNewProject,
  onDeleteProject,
  allProjects,
}) => {
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const [editNameValue, setEditNameValue] = useState(currentProject.name);
  const [editDescValue, setEditDescValue] = useState(currentProject.description);

  // States for manager modal editing inline
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [managerEditName, setManagerEditName] = useState('');
  const [managerEditDesc, setManagerEditDesc] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Deletion and Error UI Modals
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    onCreateNewProject(newProjName.trim(), newProjDesc.trim());
    setNewProjName('');
    setNewProjDesc('');
    setShowCreateModal(false);
  };

  const handleExportJson = (projectToExport: Project = currentProject) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download", 
      `${projectToExport.name.toLowerCase().replace(/\s+/g, '_')}_protoboard.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsedProject = JSON.parse(event.target?.result as string);
          if (parsedProject && parsedProject.name && Array.isArray(parsedProject.wires) && Array.isArray(parsedProject.devices)) {
            const imported: Project = {
              ...parsedProject,
              id: `proj-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            onSaveProject(imported);
            onLoadProject(imported.id);
          } else {
            setActionError('O arquivo fornecido não possui um formato de circuito JSON válido.');
          }
        } catch (err) {
          setActionError('Ocorreu um erro ao processar e ler o arquivo JSON de circuito.');
        }
      };
    }
  };

  const handleUpdateDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameValue.trim()) return;
    onSaveProject({
      ...currentProject,
      name: editNameValue.trim(),
      description: editDescValue.trim(),
      updatedAt: new Date().toISOString(),
    });
    setShowEditModal(false);
  };

  const handleSaveInlineEdit = (proj: Project) => {
    if (!managerEditName.trim()) return;
    onSaveProject({
      ...proj,
      name: managerEditName.trim(),
      description: managerEditDesc.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingProjectId(null);
  };

  const handleDuplicateProject = (proj: Project) => {
    const duplicated: Project = {
      ...proj,
      id: `proj-dup-${Date.now()}`,
      name: `${proj.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveProject(duplicated);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter projects by search query
  const filteredProjects = allProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* 1. PROJECT DROPDOWN SELECTOR */}
      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 rounded-xl px-2.5 py-1.5 shadow-xs transition-all focus-within:border-indigo-500/50">
        <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <select
          value={currentProject.id}
          onChange={(e) => onLoadProject(e.target.value)}
          className="bg-transparent text-xs font-bold text-slate-200 outline-hidden cursor-pointer pr-1 border-none focus:ring-0 max-w-[125px] sm:max-w-[180px] truncate"
          title="Alternar entre projetos salvos"
        >
          {allProjects.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-950 text-slate-100">
              {p.name}
            </option>
          ))}
        </select>
        
        {/* Quick edit active project */}
        <button
          onClick={() => {
            setEditNameValue(currentProject.name);
            setEditDescValue(currentProject.description);
            setShowEditModal(true);
          }}
          className="p-1 hover:bg-slate-800/60 rounded-md text-slate-450 hover:text-slate-100 transition-colors cursor-pointer"
          title="Editar nome/descrição rápida"
        >
          <Edit className="w-3 h-3" />
        </button>
      </div>

      {/* 2. ICON-ONLY ACTION BAR */}
      <div className="flex items-center gap-1 bg-slate-900/40 p-1 border border-slate-800/40 rounded-xl">
        {/* NEW PROJECT BUTTON */}
        <button
          onClick={() => {
            setNewProjName('');
            setNewProjDesc('');
            setShowCreateModal(true);
          }}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 flex items-center justify-center transition-all cursor-pointer"
          title="Novo Projeto"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* COMPREHENSIVE PROJECT MANAGER BUTTON (Requested) */}
        <button
          onClick={() => {
            setSearchQuery('');
            setEditingProjectId(null);
            setShowManagerModal(true);
          }}
          className="w-8 h-8 rounded-lg text-amber-455 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/10 flex items-center justify-center transition-all cursor-pointer"
          title="Gerenciar Projetos (Excluir, Editar, Duplicar, Exportar)"
        >
          <Database className="w-4 h-4" />
        </button>

        {/* PRINT BUTTON */}
        <button
          onClick={handlePrint}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800/80 flex items-center justify-center transition-all cursor-pointer"
          title="Imprimir / Gerar PDF do Circuito"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* QUICK DELETE (only if multiple exist) */}
        {allProjects.length > 1 && (
          <button
            onClick={() => {
              setProjectToDelete(currentProject);
            }}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800/80 flex items-center justify-center transition-all cursor-pointer"
            title="Excluir este projeto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {createPortal(
        <>
          {/* MODAL: COMPREHENSIVE PROJECT MANAGER */}
          <AnimatePresence>
            {showManagerModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl"
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-450 flex items-center justify-center">
                        <Database className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">Gerenciador de Projetos</h3>
                        <p className="text-[10px] text-slate-400">Organize, edite, duplique e faça backup de seus circuitos salvos.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowManagerModal(false)}
                      className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toolbar */}
                  <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-slate-550 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar projeto por nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 pl-9 pr-3 py-2 focus:border-indigo-500 outline-hidden transition-all"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Import/Create Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <label
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                        title="Importar projeto via JSON"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importar JSON</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            handleImportJson(e);
                            // refresh list behavior
                          }}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => {
                          setNewProjName('');
                          setNewProjDesc('');
                          setShowCreateModal(true);
                        }}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Projeto</span>
                      </button>
                    </div>
                  </div>

                  {/* Projects List Container */}
                  <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-950/20">
                    {filteredProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold text-slate-400">Nenhum projeto encontrado</span>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          {searchQuery ? "Tente buscar usando outro termo ou limpe o filtro atual." : "Crie um novo projeto ou importe um backup de arquivo para começar."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5">
                        {filteredProjects.map((p) => {
                          const isActive = p.id === currentProject.id;
                          const isEditing = editingProjectId === p.id;

                          return (
                            <div
                              key={p.id}
                              className={`p-4 rounded-xl border transition-all flex flex-col gap-3.5 relative ${isActive ? 'bg-slate-900/90 border-indigo-500/55 shadow-md shadow-indigo-500/2' : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-750'}`}
                            >
                              {/* Top row Info */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2 mt-1">
                                      <input
                                        type="text"
                                        value={managerEditName}
                                        onChange={(e) => setManagerEditName(e.target.value)}
                                        placeholder="Nome do Projeto"
                                        className="w-full text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 focus:border-indigo-500 outline-hidden font-bold"
                                      />
                                      <textarea
                                        value={managerEditDesc}
                                        onChange={(e) => setManagerEditDesc(e.target.value)}
                                        placeholder="Descrição rápida do circuito"
                                        rows={2}
                                        className="w-full text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-slate-350 px-3 py-1.5 focus:border-indigo-500 outline-hidden resize-none"
                                      />
                                      <div className="flex gap-2 justify-end mt-1">
                                        <button
                                          onClick={() => setEditingProjectId(null)}
                                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-semibold transition-all cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleSaveInlineEdit(p)}
                                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold transition-all cursor-pointer"
                                        >
                                          Salvar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h4 className="font-bold text-slate-200 text-xs sm:text-sm truncate max-w-[280px] sm:max-w-[400px]">
                                          {p.name}
                                        </h4>
                                        {isActive && (
                                          <span className="text-[8px] tracking-wider uppercase font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-xs shadow-emerald-500/5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Ativo no Canvas
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                        {p.description || <span className="text-slate-550 italic">Sem descrição disponível para este laboratório.</span>}
                                      </p>
                                    </>
                                  )}
                                </div>

                                {/* Stats summary (Compact) */}
                                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-900 px-2 py-1 rounded-md flex items-center gap-1.5">
                                    <Layers className="w-3 h-3 text-indigo-400" />
                                    <span>{p.wires?.length || 0} fios</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-900 px-2 py-1 rounded-md flex items-center gap-1.5">
                                    <Cpu className="w-3 h-3 text-cyan-400" />
                                    <span>{p.devices?.length || 0} disp.</span>
                                  </span>
                                </div>
                              </div>

                              {/* Footer details row */}
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-950/50 pt-3">
                                {/* Dates details */}
                                <div className="flex items-center gap-3.5 text-[9px] text-slate-500 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-slate-600" />
                                    <span>Criado: {new Date(p.createdAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5 text-slate-600" />
                                    <span>Atualizado: {new Date(p.updatedAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                                  </span>
                                </div>

                                {/* Operations Toolbar */}
                                {!isEditing && (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    {/* Load/Switch */}
                                    {!isActive && (
                                      <button
                                        onClick={() => {
                                          onLoadProject(p.id);
                                          setShowManagerModal(false);
                                        }}
                                        className="px-2.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                        title="Carregar este circuito na tela de montagem"
                                      >
                                        <span>Abrir</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    )}

                                    {/* Edit Name/Desc details */}
                                    <button
                                      onClick={() => {
                                        setEditingProjectId(p.id);
                                        setManagerEditName(p.name);
                                        setManagerEditDesc(p.description);
                                      }}
                                      className="w-7.5 h-7.5 rounded-lg bg-slate-950/55 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-900/60"
                                      title="Editar detalhes do projeto"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Duplicate Project */}
                                    <button
                                      onClick={() => handleDuplicateProject(p)}
                                      className="w-7.5 h-7.5 rounded-lg bg-slate-950/55 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer border border-slate-900/60"
                                      title="Duplicar projeto / Criar versão backup"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Export Project backup */}
                                    <button
                                      onClick={() => handleExportJson(p)}
                                      className="w-7.5 h-7.5 rounded-lg bg-slate-950/55 hover:bg-slate-800 text-slate-400 hover:text-sky-400 flex items-center justify-center transition-colors cursor-pointer border border-slate-900/60"
                                      title="Exportar projeto para backup local (.json)"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete specific project */}
                                    {allProjects.length > 1 && (
                                      <button
                                        onClick={() => {
                                          setProjectToDelete(p);
                                        }}
                                        className="w-7.5 h-7.5 rounded-lg bg-red-950/15 hover:bg-red-950 text-slate-455 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer border border-red-950/20"
                                        title="Excluir projeto permanentemente"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom Quick Help notice info */}
                  <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/50 flex items-center gap-2 text-slate-500 text-[10px]">
                    <Info className="w-3.5 h-3.5 text-slate-550 shrink-0" />
                    <span>Dica: Duplicar projetos é uma ótima maneira de testar novos esquemas elétricos sem estragar sua versão principal que já está funcionando.</span>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: CREATE PROJECT */}
          <AnimatePresence>
            {showCreateModal && (
              <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.form 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onSubmit={handleCreate} 
                  className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-500" />
                      Criar Novo Projeto
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Nome do Projeto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Sensor de Umidade com Arduino"
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        className="text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 p-3 focus:border-indigo-500 outline-hidden transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Descrição / Notas</label>
                      <textarea
                        placeholder="Ex: Sensor DHT22 conectado na porta analógica."
                        value={newProjDesc}
                        onChange={(e) => setNewProjDesc(e.target.value)}
                        rows={3}
                        className="text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-350 p-3 focus:border-indigo-500 outline-hidden transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-indigo-600/25"
                    >
                      Criar Projeto
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: EDIT ACTIVE PROJECT DETAILS */}
          <AnimatePresence>
            {showEditModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.form 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onSubmit={handleUpdateDetails} 
                  className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Edit className="w-4 h-4 text-indigo-500" />
                      Editar Detalhes do Projeto
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Nome do Projeto</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome do projeto"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 p-3 focus:border-indigo-500 outline-hidden transition-all font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase">Descrição / Notas</label>
                      <textarea
                        placeholder="Descrição do laboratório ou do circuito..."
                        value={editDescValue}
                        onChange={(e) => setEditDescValue(e.target.value)}
                        rows={3}
                        className="text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-350 p-3 focus:border-indigo-500 outline-hidden transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-indigo-600/25"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: EXCLUDE CONFIRMATION */}
          <AnimatePresence>
            {projectToDelete && (
              <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
                >
                  <div className="flex items-center gap-3 text-red-500">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">Excluir Projeto Permanentemente?</h3>
                      <p className="text-[10px] text-slate-400">Esta ação não pode ser desfeita.</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                    Tem certeza de que deseja excluir o projeto <strong className="text-white font-bold">"{projectToDelete.name}"</strong>? 
                    Isso removerá permanentemente todos os fios, componentes e configurações associados a este laboratório.
                  </p>

                  <div className="flex gap-2.5 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(null)}
                      className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer transition-all border border-slate-800/60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProject(projectToDelete.id);
                        setProjectToDelete(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-red-600/20"
                    >
                      Excluir permanentemente
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: ERROR MESSAGE */}
          <AnimatePresence>
            {actionError && (
              <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
                >
                  <div className="flex items-center gap-3 text-amber-500">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">Aviso do Sistema</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                    {actionError}
                  </p>

                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setActionError(null)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Entendi
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
};
