import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, query
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Search, Filter, Sliders, Plus, Download, Globe, List, Trello, BarChart2, Edit3, Trash2, Save, X, FolderPlus, Layers, GripHorizontal
} from 'lucide-react';

import { db, auth, FIXED_APP_ID, DEFAULT_SETTINGS, COLOR_OPTIONS, exportWorkspaceToExcel } from './utils.js';
import { Button, IconButton, ConfirmDialog, SidebarItem, BoardCard, SettingsModal, WorkspaceRail } from './components.jsx';
import { IdeaDetailsContent } from './IdeaDetails.jsx';
import { ReportsView } from './ReportsView.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [searchFilters, setSearchFilters] = useState({ 
    text: '', 
    priority: '', 
    color: '', 
    tag: '',
    hasImage: false,
    hasLink: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const filterModalRef = useRef(null);

  const isFilterActive = useMemo(() => {
     return searchFilters.priority !== '' || searchFilters.color !== '' || searchFilters.tag !== '' || searchFilters.hasImage || searchFilters.hasLink;
  }, [searchFilters]);

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [langView, setLangView] = useState('fa'); 
  const [viewMode, setViewMode] = useState('board'); 

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
     const handleClickOutside = (event) => {
       if (filterModalRef.current && !filterModalRef.current.contains(event.target) && !event.target.closest('.filter-toggle-btn')) {
         setShowFilters(false);
       }
     };
     if (showFilters) {
       document.addEventListener("mousedown", handleClickOutside);
     }
     return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    if (!user) return;
    const wsRef = collection(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'workspaces');
    return onSnapshot(query(wsRef), async (snapshot) => {
      let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setWorkspaces(list);
      if (list.length === 0) {
         const defaultWs = { title: "فضای اصلی", titleEn: "Main Board", color: "Indigo", createdAt: Date.now() };
         const ref = await addDoc(wsRef, defaultWs);
         setActiveWorkspaceId(ref.id);
      } else if (!activeWorkspaceId || !list.find(w => w.id === activeWorkspaceId)) {
        setActiveWorkspaceId(list[0].id);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ideasRef = collection(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas');
    return onSnapshot(query(ideasRef), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      setIdeas(list);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'settings', 'global');
    return onSnapshot(settingsRef, (docSnap) => { if (docSnap.exists()) setSettings(docSnap.data()); });
  }, [user]);

  const currentIdeas = useMemo(() => {
    if (!activeWorkspaceId) return [];
    return ideas.filter(idea => idea.workspaceId === activeWorkspaceId || (!idea.workspaceId && workspaces[0]?.id === activeWorkspaceId));
  }, [ideas, activeWorkspaceId, workspaces]);

  const buildTreeData = useCallback((data, parentId = null, visited = new Set()) => {
    return data.filter(item => item.parentId === parentId).map(item => {
      if (visited.has(item.id)) return { ...item, children: [] };
      const newVisited = new Set(visited).add(item.id);
      return { ...item, children: buildTreeData(data, item.id, newVisited) };
    });
  }, []);

  const filteredTreeData = useMemo(() => {
    const lowerSearch = searchFilters.text.toLowerCase();
    const tree = buildTreeData(currentIdeas);
    
    const isFiltering = searchFilters.text || searchFilters.priority !== '' || searchFilters.color || searchFilters.tag || searchFilters.hasImage || searchFilters.hasLink;
    if (!isFiltering) return tree;

    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        const matchText = !lowerSearch || node.title?.toLowerCase().includes(lowerSearch) || node.titleEn?.toLowerCase().includes(lowerSearch);
        const matchPriority = searchFilters.priority === '' || node.priority === parseInt(searchFilters.priority);
        const matchColor = !searchFilters.color || node.color === searchFilters.color;
        const matchTag = !searchFilters.tag || node.tags?.some(t => t.toLowerCase().includes(searchFilters.tag.toLowerCase()));
        const matchImage = !searchFilters.hasImage || (node.images && node.images.length > 0) || !!node.imageUrl;
        const matchLink = !searchFilters.hasLink || (node.links && node.links.length > 0);

        const matchesAll = matchText && matchPriority && matchColor && matchTag && matchImage && matchLink;
        
        const children = filterNodes(node.children || []);
        if (matchesAll || children.length > 0) {
           acc.push({ ...node, children });
        }
        return acc;
      }, []);
    };
    return filterNodes(tree);
  }, [currentIdeas, searchFilters, buildTreeData]);

  const flatFilteredIdeas = useMemo(() => {
     const flatten = (nodes) => {
       let flat = [];
       nodes.forEach(node => { flat.push(node); if(node.children?.length > 0) flat = flat.concat(flatten(node.children)); });
       return flat;
     };
     return flatten(filteredTreeData);
  }, [filteredTreeData]);

  const handleUpdate = async (updatedIdea) => {
    if (!user) return;
    setSelectedIdea(updatedIdea);
    await updateDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas', updatedIdea.id), updatedIdea);
  };

  const addIdea = async (parentId = null) => {
    if (!user || !activeWorkspaceId) return;
    const newIdea = {
      title: "ایده جدید", titleEn: "New Idea", parentId: parentId, workspaceId: activeWorkspaceId,
      priority: 5, tags: [], links: [], color: 'Default', statusId: settings?.statuses?.find(s => s.isDefault)?.id || 'todo',
      startDate: "", endDate: "", createdAt: Date.now(), images: []
    };
    const docRef = await addDoc(collection(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas'), newIdea);
    setSelectedIdea({ id: docRef.id, ...newIdea });
    if (viewMode === 'board') setIsModalOpen(true);
    if (parentId) setExpandedIds(prev => new Set(prev).add(parentId));
  };

  const requestDeleteIdea = (idOrObj) => {
    const id = (typeof idOrObj === 'object' && idOrObj !== null) ? idOrObj.id : idOrObj;
    setConfirmDialog({ isOpen: true, title: 'حذف ایده', message: 'آیا از حذف این ایده و تمام زیرمجموعه‌های آن اطمینان دارید؟', onConfirm: async () => {
      const toDelete = new Set([id]);
      const findChildren = (pid) => ideas.forEach(i => { if (i.parentId === pid && !toDelete.has(i.id)) { toDelete.add(i.id); findChildren(i.id); } });
      findChildren(id);
      await Promise.all(Array.from(toDelete).map(delId => deleteDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas', delId))));
      if (selectedIdea && toDelete.has(selectedIdea.id)) { setSelectedIdea(null); setIsModalOpen(false); }
    }});
  };

  const handlePriorityChange = async (idea, delta) => {
    const newPriority = Math.max(0, (idea.priority || 0) + delta);
    if (selectedIdea?.id === idea.id) setSelectedIdea({...idea, priority: newPriority});
    await updateDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas', idea.id), { priority: newPriority });
  };

  const handleStatusChange = async (idea, statusId) => {
     if (selectedIdea?.id === idea.id) setSelectedIdea({ ...idea, statusId });
     await updateDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas', idea.id), { statusId });
  };

  const handleDragStart = (e, id, type = 'CARD') => { e.dataTransfer.setData("id", id); e.dataTransfer.setData("type", type); };
  const handleDrop = async (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    const type = e.dataTransfer.getData("type");
    const sourceId = e.dataTransfer.getData("id");
    if (!user || !sourceId || sourceId === targetId) return;
    if (type === 'CARD') {
        await updateDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'ideas', sourceId), { parentId: targetId });
        if (targetId) setExpandedIds(prev => new Set(prev).add(targetId));
    }
  };

  const handleSaveWorkspace = async () => {
    if (!user || !editingWorkspace) return;
    const collectionRef = collection(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'workspaces');
    try {
      if (editingWorkspace.id) {
        await updateDoc(doc(collectionRef, editingWorkspace.id), editingWorkspace);
      } else {
        const ref = await addDoc(collectionRef, { ...editingWorkspace, createdAt: Date.now() });
        setActiveWorkspaceId(ref.id);
      }
      setIsWorkspaceModalOpen(false);
      setEditingWorkspace(null);
    } catch (error) {
      console.error("Error saving workspace:", error);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans" dir={langView === 'fa' ? 'rtl' : 'ltr'}>
      <WorkspaceRail workspaces={workspaces} activeId={activeWorkspaceId} onSelect={setActiveWorkspaceId} onAdd={() => { setEditingWorkspace({ title: "", titleEn: "", color: "Indigo" }); setIsWorkspaceModalOpen(true); }} onEdit={(ws) => { setEditingWorkspace(ws); setIsWorkspaceModalOpen(true); }} langView={langView} />
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <header className="bg-white border-b border-slate-200 flex flex-col px-6 z-30 shadow-sm relative w-full">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-sm font-black text-slate-800 uppercase">
                 {workspaces.find(w => w.id === activeWorkspaceId) ? (langView === 'fa' ? workspaces.find(w => w.id === activeWorkspaceId).title : workspaces.find(w => w.id === activeWorkspaceId).titleEn) : 'Idea Hub'}
              </h1>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button onClick={() => setViewMode('tree')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${viewMode === 'tree' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}><List size={14} /> درختی</button>
                  <button onClick={() => setViewMode('board')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${viewMode === 'board' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}><Trello size={14} /> بورد</button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button onClick={() => setViewMode('reports')} className={`px-5 py-1.5 rounded-lg text-[11px] font-black transition-all ${viewMode === 'reports' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}><BarChart2 size={14} /> گزارش‌ها</button>
                </div>
              </div>
            </div>
            
            {viewMode !== 'reports' && (
              <div className="flex items-center gap-4 flex-1 max-w-2xl mx-12 relative">
                <div className="relative w-full flex items-center group">
                  <Search className={`absolute ${langView === 'fa' ? 'right-4' : 'left-4'} text-slate-400`} size={18} />
                  <input 
                    type="text" 
                    placeholder="جستجو در ایده‌ها..." 
                    className={`w-full ${langView === 'fa' ? 'pr-11 pl-12' : 'pl-11 pr-12'} py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all`} 
                    value={searchFilters.text} 
                    onChange={(e) => setSearchFilters({...searchFilters, text: e.target.value})} 
                  />
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`filter-toggle-btn absolute ${langView === 'fa' ? 'left-2' : 'right-2'} p-1.5 rounded-lg transition-all relative ${showFilters ? 'bg-indigo-600 text-white' : isFilterActive ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'text-slate-400 hover:bg-slate-200'}`}
                    title="فیلترهای پیشرفته"
                  >
                    <Filter size={16} />
                    {isFilterActive && <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>}
                  </button>
                </div>
                
                {showFilters && (
                  <div ref={filterModalRef} className={`absolute top-full mt-2 ${langView === 'fa' ? 'left-0' : 'right-0'} bg-white border border-slate-200 rounded-lg shadow-2xl p-6 z-[200] w-96 animate-in fade-in zoom-in-95`}>
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2"><Sliders size={14} /> فیلترهای پیشرفته</h3>
                        <button onClick={() => setSearchFilters({ text: searchFilters.text, priority: '', color: '', tag: '', hasImage: false, hasLink: false })} className="text-[10px] font-bold text-indigo-600 hover:underline">پاک کردن فیلترها</button>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-wider">اولویت</label>
                              <input 
                                 type="number"
                                 className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-black outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                 placeholder="عدد اولویت..."
                                 value={searchFilters.priority}
                                 onChange={e => setSearchFilters({...searchFilters, priority: e.target.value})}
                              />
                           </div>

                           <div>
                              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-wider">رنگ (Theme)</label>
                              <div className="flex gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100">
                                 {COLOR_OPTIONS.map(opt => (
                                    <button 
                                       key={opt.name} 
                                       onClick={() => setSearchFilters(f => ({ ...f, color: f.color === opt.name ? '' : opt.name }))}
                                       className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${opt.bg} ${searchFilters.color === opt.name ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border-slate-200'}`}
                                    />
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div>
                           <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-wider">تگ</label>
                           <div className="relative">
                              <Tag size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                              <input 
                                 className="w-full bg-slate-50 border border-slate-100 rounded-lg pr-9 pl-4 py-2 text-xs font-bold outline-none focus:bg-white"
                                 placeholder="نام تگ را وارد کنید..."
                                 value={searchFilters.tag}
                                 onChange={e => setSearchFilters({...searchFilters, tag: e.target.value})}
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                           <button 
                              onClick={() => setSearchFilters(f => ({ ...f, hasImage: !f.hasImage }))}
                              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${searchFilters.hasImage ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}
                           >
                              <ImageIcon size={14} /> پیوست تصویر
                           </button>
                           <button 
                              onClick={() => setSearchFilters(f => ({ ...f, hasLink: !f.hasLink }))}
                              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${searchFilters.hasLink ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}
                           >
                              <Link size={14} /> پیوست لینک
                           </button>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={() => exportWorkspaceToExcel(activeWorkspaceId, workspaces, ideas, settings)} icon={Download} variant="secondary" className="h-10">
                خروجی اکسل
              </Button>
              <IconButton icon={Sliders} onClick={() => setIsSettingsModalOpen(true)} className="bg-slate-100 h-10 w-10" size={18} />
              <Button onClick={() => addIdea(null)} icon={Plus} className="h-10">ایده ریشه</Button>
              <button onClick={() => setLangView(langView === 'fa' ? 'en' : 'fa')} className="flex items-center gap-2 px-4 py-2 text-[11px] font-black text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-100 h-10"><Globe size={16} /> {langView === 'fa' ? 'EN' : 'FA'}</button>
            </div>
          </div>
        </header>
        <div className="flex-1 flex overflow-hidden w-full">
          {viewMode === 'reports' ? (
             <ReportsView 
                 ideas={ideas} 
                 settings={settings} 
                 langView={langView} 
                 workspaces={workspaces} 
                 activeWorkspaceId={activeWorkspaceId} 
                 onUpdateIdea={handleUpdate} 
                 onOpenIdea={(i) => { setSelectedIdea(i); setIsModalOpen(true); }} 
             />
          ) : (
            <>
              {viewMode === 'tree' && (
                <>
                  <aside className="w-80 bg-white border-l border-r border-slate-200 flex flex-col h-full" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, null)}>
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">سلسله‌مراتب</span><IconButton icon={Layers} size={16} onClick={() => setExpandedIds(new Set())} /></div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                      {filteredTreeData.map(idea => (<SidebarItem key={idea.id} idea={idea} langView={langView} selectedId={selectedIdea?.id} onSelect={setSelectedIdea} onExpand={(id) => setExpandedIds(prev => {const next = new Set(prev); if(next.has(id)) next.delete(id); else next.add(id); return next;})} expandedIds={expandedIds} onAddChild={addIdea} onDragStart={handleDragStart} onDrop={handleDrop} onRequestDelete={requestDeleteIdea} />))}
                    </div>
                  </aside>
                  <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                    {selectedIdea ? (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-2xl p-10 max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-8 border-b pb-6">
                          <h2 className="text-lg font-black text-slate-800">جزئیات ایده</h2>
                          <Button onClick={() => requestDeleteIdea(selectedIdea.id)} variant="danger" icon={Trash2}>حذف</Button>
                        </div>
                        <IdeaDetailsContent idea={selectedIdea} onUpdate={handleUpdate} onPriorityChange={handlePriorityChange} settings={settings} langView={langView} allIdeas={ideas} workspaces={workspaces} onRequestDelete={requestDeleteIdea} />
                      </div>
                    ) : (<div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-60"><List size={80} strokeWidth={0.5} /><h3 className="text-xl font-black">یک ایده را انتخاب کنید</h3></div>)}
                  </main>
                </>
              )}
              {viewMode === 'board' && (
                <main className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50">
                  <div className="flex items-start gap-6 p-6 pb-20">
                    {flatFilteredIdeas.filter(i => !i.parentId).map(root => (
                      <div key={root.id} className="min-w-[320px] w-[320px] flex flex-col h-auto bg-slate-200/40 rounded-lg border border-slate-200/50 shadow-inner relative" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, root.id)}>
                        <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between rounded-t-lg sticky top-0 z-20 shadow-md">
                          <h3 className="text-[13px] font-black text-slate-900 truncate flex items-center gap-2"><GripHorizontal size={14} className="text-slate-400" /> {langView === 'fa' ? root.title : root.titleEn}</h3>
                          <div className="flex gap-1.5 items-center">
                             <IconButton icon={Edit3} size={16} onClick={() => { setSelectedIdea(root); setIsModalOpen(true); }} className="bg-white/80 border" />
                             <IconButton icon={Plus} size={16} onClick={() => addIdea(root.id)} className="bg-indigo-600 text-white shadow-lg" />
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {flatFilteredIdeas.filter(i => i.parentId === root.id).map(card => (
                            <BoardCard key={card.id} idea={card} langView={langView} onOpen={(i) => { setSelectedIdea(i); setIsModalOpen(true); }} onStatusChange={handleStatusChange} settings={settings} allIdeas={flatFilteredIdeas} onDragStart={handleDragStart} onDrop={handleDrop} />
                          ))}
                          <button onClick={() => addIdea(root.id)} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-[11px] font-black hover:bg-white transition-all">+ افزودن ایده</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addIdea(null)} className="min-w-[220px] h-[100px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-white bg-slate-100/50 transition-all"><Plus size={32} /><span className="text-[12px] font-black mt-3">تم جدید</span></button>
                  </div>
                </main>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && selectedIdea && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-7xl max-h-[96vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-white/20">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl">
              <div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-lg shadow-xl"><Edit3 size={24} /></div><h2 className="text-base font-black text-slate-800 uppercase">ویرایش ایده</h2></div>
              <IconButton icon={X} size={32} onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2" />
            </header>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/20">
              <IdeaDetailsContent idea={selectedIdea} onUpdate={handleUpdate} onPriorityChange={handlePriorityChange} settings={settings} langView={langView} allIdeas={ideas} workspaces={workspaces} onRequestDelete={requestDeleteIdea} />
            </div>
            <footer className="p-6 border-t border-slate-100 bg-white flex justify-end items-center gap-4">
                <button 
                  onClick={() => requestDeleteIdea(selectedIdea.id)} 
                  className="mr-auto text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2"
                >
                    <Trash2 size={16} /> {langView === 'fa' ? 'حذف ایده' : 'Delete Idea'}
                </button>
                <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="px-8">بستن</Button>
                <Button onClick={() => setIsModalOpen(false)} icon={Save} className="px-14">ذخیره</Button>
            </footer>
          </div>
        </div>
      )}

      {isWorkspaceModalOpen && editingWorkspace && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsWorkspaceModalOpen(false)}></div>
           <div className="relative bg-white rounded-xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800"><FolderPlus className="text-indigo-600"/>{editingWorkspace.id ? 'ویرایش فضا' : 'فضا جدید'}</h3>
             <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">عنوان فارسی</label>
                  <input className="w-full p-3 bg-slate-50 border rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" value={editingWorkspace.title} onChange={e => setEditingWorkspace({...editingWorkspace, title: e.target.value})} placeholder="مثلاً: بورد اصلی" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">English Title</label>
                  <input className="w-full p-3 bg-slate-50 border rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" dir="ltr" value={editingWorkspace.titleEn} onChange={e => setEditingWorkspace({...editingWorkspace, titleEn: e.target.value})} placeholder="e.g. Main Board" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">رنگ فضا (Theme Color)</label>
                  <div className="flex gap-2 flex-wrap p-2 bg-slate-50 rounded-lg border border-slate-100">
                     {COLOR_OPTIONS.map((opt) => (
                       <button 
                         key={opt.name} 
                         onClick={() => setEditingWorkspace({...editingWorkspace, color: opt.name})} 
                         className={`w-8 h-8 rounded-full border shadow-sm transition-all hover:scale-110 active:scale-95 ${opt.bg} ${editingWorkspace.color === opt.name ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400 scale-110' : 'border-slate-300'}`} 
                       />
                     ))}
                  </div>
               </div>
             </div>
             <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                {editingWorkspace.id ? (
                   <button 
                     onClick={() => { setConfirmDialog({ isOpen: true, title: 'حذف فضا', message: 'آیا از حذف این فضا اطمینان دارید؟ تمام ایده‌های مرتبط نیز حذف خواهند شد.', onConfirm: async () => { await deleteDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'workspaces', editingWorkspace.id)); setIsWorkspaceModalOpen(false); if(workspaces.length > 1) setActiveWorkspaceId(workspaces[0].id); } }); }} 
                     className="text-red-500 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                   >
                     حذف فضا
                   </button>
                ) : <div/>}
                <div className="flex gap-3">
                   <Button onClick={() => setIsWorkspaceModalOpen(false)} variant="secondary">انصراف</Button>
                   <Button onClick={handleSaveWorkspace} icon={Save}>ذخیره فضا</Button>
                </div>
             </div>
           </div>
         </div>
      )}

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSaveSettings={async (newSettings) => { setSettings(newSettings); setIsSettingsModalOpen(false); await setDoc(doc(db, 'artifacts', FIXED_APP_ID, 'public', 'data', 'settings', 'global'), newSettings); }} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onClose={() => setConfirmDialog({...confirmDialog, isOpen: false})} />

    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);