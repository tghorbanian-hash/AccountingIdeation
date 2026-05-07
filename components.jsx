
import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  AlertTriangle, ChevronDown, Trash2, Plus, AlertCircle, 
  Calendar, Clock, X, Sliders, CheckCircle, Box, Settings, Save 
} from 'lucide-react';
import { COLOR_OPTIONS, STATUS_COLORS, DEFAULT_SETTINGS, getTimeStatus } from './utils.js';

export const IconButton = ({ icon: Icon, onClick, className = "", title = "", size = 14 }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-500 transition-all active:scale-90 flex items-center justify-center ${className}`}
  >
    <Icon size={size} />
  </button>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button" }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold text-xs active:scale-95 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl p-6 w-full max-w-[400px] shadow-2xl animate-in zoom-in-95 border-2 border-red-100">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-2">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-black text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-bold">{message}</p>
          <div className="flex gap-2 w-full mt-2">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg text-xs font-black hover:bg-slate-200 transition-colors">انصراف</button>
            <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-red-500 text-white rounded-lg text-xs font-black hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">بله، حذف شود</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SidebarItem = memo(({ idea, level = 0, langView, selectedId, onSelect, onExpand, expandedIds, onAddChild, onDragStart, onDrop, onRequestDelete }) => {
  const isSelected = selectedId === idea.id;
  const isExpanded = expandedIds.has(idea.id);
  const title = langView === 'fa' ? (idea.title || 'بدون عنوان') : (idea.titleEn || 'No Title');
  const colorData = COLOR_OPTIONS.find(c => c.name === idea.color) || COLOR_OPTIONS[0];
  const [isOver, setIsOver] = useState(false);
  const timeStatus = getTimeStatus(idea);

  return (
    <div 
      className={`flex flex-col transition-all ${isOver ? 'bg-indigo-50/50 scale-[1.02] rounded-lg ring-1 ring-indigo-300' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(false); onDrop(e, idea.id, 'CARD'); }}
    >
      <div 
        onClick={() => onSelect(idea)}
        draggable
        onDragStart={(e) => onDragStart(e, idea.id, 'CARD')}
        className={`group flex items-center py-2 px-3 cursor-pointer rounded-lg mb-1 transition-all border-r-4 ${
          isSelected ? 'bg-indigo-600 text-white shadow-md border-indigo-400' : `${colorData.bg} ${colorData.border} hover:opacity-80 text-slate-700 border-transparent shadow-sm`
        }`}
        style={{ [langView === 'fa' ? 'marginRight' : 'marginLeft']: `${level * 12}px` }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onExpand(idea.id); }}
          className={`p-1 rounded-lg transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        >
          {idea.children?.length > 0 ? <ChevronDown size={14} /> : <div className="w-3.5 h-3.5" />}
        </button>
        
        <div className="flex-1 flex flex-col min-w-0 mx-2">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black px-1.5 rounded flex items-center justify-center min-w-[20px] h-4 shadow-sm ${isSelected ? 'bg-white text-indigo-600' : 'bg-slate-800 text-white'}`}>
              {idea.priority || 0}
            </span>
            <span className="flex-1 truncate text-xs font-bold flex items-center gap-1.5">
                {title}
                {timeStatus === 'overdue' && <AlertCircle size={10} className="text-red-500" />}
                {timeStatus === 'ready' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton icon={Trash2} size={12} onClick={(e) => { e.stopPropagation(); onRequestDelete(idea.id); }} className={isSelected ? "text-white/70 hover:bg-white/20" : "text-red-400 hover:bg-red-50"} />
          <IconButton icon={Plus} size={12} onClick={(e) => { e.stopPropagation(); onAddChild(idea.id); }} className={isSelected ? "text-white hover:bg-white/20" : ""} />
        </div>
      </div>
      {isExpanded && idea.children?.map(child => (
        <SidebarItem 
          key={child.id} idea={child} level={level + 1} langView={langView} selectedId={selectedId} 
          onSelect={node => onSelect(node)} onExpand={onExpand} expandedIds={expandedIds} 
          onAddChild={onAddChild} onDragStart={onDragStart} onDrop={onDrop} onRequestDelete={onRequestDelete}
        />
      ))}
    </div>
  );
});

export const BoardCard = memo(({ idea, level = 0, langView, onOpen, onStatusChange, settings, allIdeas, onDragStart, onDrop }) => {
  const title = langView === 'fa' ? idea.title : idea.titleEn;
  const children = allIdeas.filter(i => i.parentId === idea.id);
  const colorData = COLOR_OPTIONS.find(c => c.name === idea.color) || COLOR_OPTIONS[0];
  const [isOver, setIsOver] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const timeStatus = getTimeStatus(idea);
  const status = settings?.statuses?.find(s => s.id === idea.statusId) || settings?.statuses?.find(s => s.isDefault) || { title: 'No Status', color: 'gray' };
  const statusColor = STATUS_COLORS.find(c => c.id === status.color) || STATUS_COLORS[0];
  const statusLabel = langView === 'fa' ? status.title : status.titleEn;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };
    if (isStatusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStatusMenuOpen]);

  return (
    <div 
      className={`flex flex-col gap-1.5 p-3 rounded-lg border-l-[3px] transition-all cursor-pointer group shadow-sm relative hover:shadow-md hover:-translate-y-0.5 hover:z-50 ${colorData.bg} ${colorData.border} ${isOver ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border-l-slate-300'} ${timeStatus === 'overdue' ? 'ring-2 ring-red-500 bg-red-50/30' : ''}`}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, idea.id, 'CARD'); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(true); }}
      onDragLeave={(e) => { e.stopPropagation(); setIsOver(false); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(false); onDrop(e, idea.id, 'CARD'); }}
      onClick={(e) => { e.stopPropagation(); onOpen(idea); }}
      style={{ borderLeftColor: colorData.name !== 'Default' ? undefined : '#cbd5e1' }} 
    >
      <div className="flex items-start gap-2 relative">
        <span className={`flex-shrink-0 text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-md ${colorData.badge}`}>
          {idea.priority || 0}
        </span>
        
        <h4 className="flex-1 text-[11px] font-bold text-slate-800 leading-snug break-words flex items-center gap-1.5">
           {title}
           {timeStatus === 'ready' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-200" title="زمان اجرا فرا رسیده" />}
           {timeStatus === 'overdue' && <AlertCircle size={12} className="text-red-500 animate-bounce" title="تاخیر در تحویل" />}
        </h4>

        <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setIsStatusMenuOpen(!isStatusMenuOpen); }}
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${statusColor.bg} ${statusColor.text}`}
            >
               {statusLabel} <ChevronDown size={10} />
            </button>
            
            {isStatusMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-36 bg-white rounded-lg shadow-2xl border border-slate-100 p-1.5 z-[200] animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()} 
              >
                 {settings?.statuses?.map(s => {
                    const sc = STATUS_COLORS.find(c => c.id === s.color);
                    return (
                      <div 
                         key={s.id}
                         onClick={() => { onStatusChange(idea, s.id); setIsStatusMenuOpen(false); }}
                         className={`flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-[10px] font-bold transition-colors ${idea.statusId === s.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
                      >
                         <div className={`w-2 h-2 rounded-full ${sc?.bg.replace('bg-', 'bg-') || 'bg-slate-300'} ring-1 ring-black/5`} />
                         {langView === 'fa' ? s.title : s.titleEn}
                      </div>
                    )
                 })}
              </div>
            )}
        </div>
      </div>

      {(idea.startDate || idea.endDate) && (
          <div className="flex items-center gap-2 mt-0.5 opacity-60">
              {idea.startDate && <div className="flex items-center gap-1 text-[8px] font-bold text-slate-500 bg-white/40 px-1 rounded"><Calendar size={8}/> {idea.startDate}</div>}
              {idea.endDate && <div className={`flex items-center gap-1 text-[8px] font-bold px-1 rounded ${timeStatus === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-white/40 text-slate-500'}`}><Clock size={8}/> {idea.endDate}</div>}
          </div>
      )}
      
      {idea.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {idea.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0 rounded bg-white/50 text-slate-500 border border-black/5">
              {tag}
            </span>
          ))}
          {idea.tags.length > 3 && <span className="text-[8px] text-slate-400">+{idea.tags.length - 3}</span>}
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-1 pl-2 space-y-2 border-l border-black/5 ml-1">
          {children.map(child => (
            <BoardCard 
              key={child.id} idea={child} level={level + 1} langView={langView} onOpen={onOpen} 
              onStatusChange={onStatusChange} settings={settings} allIdeas={allIdeas} onDragStart={onDragStart} onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const SettingsModal = ({ isOpen, onClose, settings, onSaveSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings || DEFAULT_SETTINGS);
  useEffect(() => { if(settings) setLocalSettings(settings); }, [settings]);
  if (!isOpen) return null;
  const handleStatusChangeLocal = (index, field, value) => {
    const newStatuses = [...localSettings.statuses];
    newStatuses[index] = { ...newStatuses[index], [field]: value };
    setLocalSettings({ ...localSettings, statuses: newStatuses });
  };
  const addStatus = () => {
    const newStatus = { id: `status_${Date.now()}`, title: 'جدید', titleEn: 'New', color: 'gray', isDefault: false };
    setLocalSettings({ ...localSettings, statuses: [...localSettings.statuses, newStatus] });
  };
  const removeStatus = (index) => {
    const newStatuses = localSettings.statuses.filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, statuses: newStatuses });
  };
  const setDefaultStatus = (id) => {
    const newStatuses = localSettings.statuses.map(s => ({ ...s, isDefault: s.id === id }));
    setLocalSettings({ ...localSettings, statuses: newStatuses });
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
       <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Sliders className="text-indigo-600" /> تنظیمات پروژه</h2>
             <IconButton icon={X} onClick={onClose} size={24} />
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             <div className="mb-6">
                <h3 className="text-sm font-black text-slate-700 mb-4 border-b border-slate-100 pb-2">وضعیت‌های ایده</h3>
                <div className="space-y-3">
                   {localSettings.statuses.map((status, index) => (
                      <div key={status.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 group">
                         <div className="relative">
                            <div className={`w-8 h-8 rounded-full ${STATUS_COLORS.find(c => c.id === status.color)?.bg} flex items-center justify-center border border-black/5`}>
                               <div className={`w-3 h-3 rounded-full ${STATUS_COLORS.find(c => c.id === status.color)?.text.replace('text-', 'bg-')}`} />
                            </div>
                            <select className="absolute inset-0 opacity-0 cursor-pointer" value={status.color} onChange={(e) => handleStatusChangeLocal(index, 'color', e.target.value)}>
                               {STATUS_COLORS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                            </select>
                         </div>
                         <div className="flex-1 grid grid-cols-2 gap-3">
                            <input value={status.title} onChange={(e) => handleStatusChangeLocal(index, 'title', e.target.value)} className="p-2 text-xs font-bold rounded-lg border border-slate-200 outline-none" placeholder="عنوان فارسی" />
                            <input value={status.titleEn} onChange={(e) => handleStatusChangeLocal(index, 'titleEn', e.target.value)} dir="ltr" className="p-2 text-xs font-bold rounded-lg border border-slate-200 outline-none" placeholder="English Title" />
                         </div>
                         <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                            <button onClick={() => setDefaultStatus(status.id)} className={`p-2 rounded-lg ${status.isDefault ? 'bg-emerald-100 text-emerald-700' : 'text-slate-300 hover:text-emerald-600'}`}><CheckCircle size={18} /></button>
                            <button onClick={() => removeStatus(index)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg" disabled={localSettings.statuses.length <= 1}><Trash2 size={18} /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button onClick={addStatus} className="mt-4 flex items-center gap-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all border border-transparent hover:border-indigo-100"><Plus size={16} /> افزودن وضعیت جدید</button>
             </div>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
             <Button variant="secondary" onClick={onClose}>انصراف</Button>
             <Button onClick={() => onSaveSettings(localSettings)} icon={Save}>ذخیره تغییرات</Button>
          </div>
       </div>
    </div>
  );
};

export const WorkspaceRail = ({ workspaces, activeId, onSelect, onAdd, onEdit, langView }) => {
  const [tooltip, setTooltip] = useState({ show: false, id: null, top: 0, title: '' });
  return (
    <div className="w-20 bg-slate-100 border-l border-slate-200 flex flex-col items-center py-6 gap-4 z-40 shadow-xl shrink-0 relative">
      <div className="mb-4">
         <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-indigo-600 shadow-lg shadow-indigo-100"><Box size={24} /></div>
      </div>
      <div className="flex-1 w-full flex flex-col items-center gap-3 overflow-y-auto custom-scrollbar px-2">
        {workspaces.map((ws, index) => {
           const isActive = activeId === ws.id;
           const title = langView === 'fa' ? ws.title : ws.titleEn;
           const initial = (ws.titleEn || ws.title || "?").charAt(0).toUpperCase();
           const colorData = COLOR_OPTIONS.find(c => c.name === ws.color) || COLOR_OPTIONS[0];

           return (
             <div key={ws.id} className="relative group w-full flex justify-center">
                <button 
                  onClick={() => onSelect(ws.id)} 
                  onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ show: true, id: ws.id, top: rect.top + rect.height / 2, title: title }); }} 
                  onMouseLeave={() => setTooltip({ ...tooltip, show: false })} 
                  className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg transition-all shadow-sm relative active:scale-95 ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-200' : `${colorData.bg} ${colorData.text} border ${colorData.border}`}`}
                >
                  {initial}
                </button>
                {isActive && <button onClick={(e) => { e.stopPropagation(); onEdit(ws); }} className="absolute -bottom-1 -right-1 bg-white border border-slate-200 text-slate-400 p-1 rounded-full shadow-sm hover:text-indigo-600 z-10"><Settings size={10} /></button>}
             </div>
           );
        })}
        <button onClick={onAdd} className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 mt-2"><Plus size={20} /></button>
      </div>
      {tooltip.show && (
        <div className="fixed z-[9999] bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap" style={{ top: tooltip.top, [langView === 'fa' ? 'right' : 'left']: '5.5rem', transform: 'translateY(-50%)' }}>
          {tooltip.title}
        </div>
      )}
    </div>
  );
};