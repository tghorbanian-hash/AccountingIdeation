import React, { useState } from 'react';
import { MapPin, ChevronLeft, Clock, Sliders, Tag, Plus, Trash2, FileText, Image as ImageIcon, Maximize2, ArrowUp, ArrowDown } from 'lucide-react';
import { parseSafeDate, formatDateToISO, getDaysDifference, getIdeaPath, COLOR_OPTIONS } from './utils.js';
import { IconButton } from './components.jsx';

export const IdeaDetailsContent = ({ idea, onUpdate, onPriorityChange, settings, langView, onRequestDelete, allIdeas = [], workspaces = [] }) => {
  const [activeTab, setActiveTab] = useState('docs');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);

  if (!idea) return null;

  const handleAddLink = () => {
    if (newLinkUrl) {
      onUpdate({...idea, links: [...(idea.links || []), { url: newLinkUrl, label: newLinkLabel || 'Link' }]});
      setNewLinkUrl('');
      setNewLinkLabel('');
      setIsAddingLink(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const currentImages = idea.images || (idea.imageUrl ? [idea.imageUrl] : []);
        onUpdate({...idea, images: [...currentImages, reader.result], imageUrl: null});
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    const currentImages = idea.images || (idea.imageUrl ? [idea.imageUrl] : []);
    onUpdate({...idea, images: currentImages.filter((_, i) => i !== index)});
  };

  const path = getIdeaPath(allIdeas, idea.id);
  const workspace = workspaces.find(w => w.id === idea.workspaceId);

  const handleStartDateChange = (val) => {
      let updates = { startDate: val };
      if (val && idea.duration) {
          const d = parseSafeDate(val);
          d.setDate(d.getDate() + (parseInt(idea.duration) - 1));
          updates.endDate = formatDateToISO(d);
      } else if (val && idea.endDate) {
          const start = parseSafeDate(val);
          const end = parseSafeDate(idea.endDate);
          updates.duration = (getDaysDifference(end, start) + 1).toString();
      }
      onUpdate({...idea, ...updates});
  };

  const handleDurationChange = (val) => {
      let updates = { duration: val };
      if (val) {
          if (idea.startDate) {
              const d = parseSafeDate(idea.startDate);
              d.setDate(d.getDate() + (parseInt(val) - 1));
              updates.endDate = formatDateToISO(d);
          } else if (idea.endDate) {
              const d = parseSafeDate(idea.endDate);
              d.setDate(d.getDate() - (parseInt(val) - 1));
              updates.startDate = formatDateToISO(d);
          }
      }
      onUpdate({...idea, ...updates});
  };

  const handleEndDateChange = (val) => {
      let updates = { endDate: val };
      if (val && idea.duration) {
          const d = parseSafeDate(val);
          d.setDate(d.getDate() - (parseInt(idea.duration) - 1));
          updates.startDate = formatDateToISO(d);
      } else if (val && idea.startDate) {
          const end = parseSafeDate(val);
          const start = parseSafeDate(idea.startDate);
          updates.duration = (getDaysDifference(end, start) + 1).toString();
      }
      onUpdate({...idea, ...updates});
  };

  const imagesToShow = idea.images || (idea.imageUrl ? [idea.imageUrl] : []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
         <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-slate-50/80 rounded-lg border border-slate-100">
            <MapPin size={12} className="text-indigo-400" />
            {workspace && (
               <span className="text-[9px] font-black text-indigo-500 uppercase">
                 {langView === 'fa' ? workspace.title : workspace.titleEn}
               </span>
            )}
            {path.map((p, idx) => (
              <React.Fragment key={p.id}>
                 <ChevronLeft size={10} className="text-slate-300" />
                 <span className={`text-[9px] font-bold ${idx === path.length - 1 ? 'text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md' : 'text-slate-500'}`}>
                    {langView === 'fa' ? p.title : p.titleEn}
                 </span>
              </React.Fragment>
            ))}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="w-full text-base font-black text-slate-800 bg-white border border-slate-200 rounded-lg px-4 py-2 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
              placeholder="عنوان فارسی کانسپت"
              value={idea.title || ''}
              onChange={(e) => onUpdate({...idea, title: e.target.value})}
            />
            <input 
              className="w-full text-base font-bold text-indigo-600 bg-white border border-slate-200 rounded-lg px-4 py-2 outline-none font-sans shadow-sm"
              dir="ltr"
              placeholder="English Concept Title"
              value={idea.titleEn || ''}
              onChange={(e) => onUpdate({...idea, titleEn: e.target.value})}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 flex flex-col gap-2.5">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-1 border-b border-slate-100 pb-1">
               <Clock size={12} /> زمان‌بندی
            </h4>
            <div className="flex items-center justify-between gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 whitespace-nowrap">شروع:</label>
                <input type="date" className="text-[11px] font-bold text-slate-700 bg-transparent outline-none cursor-pointer w-full text-left" value={idea.startDate || ''} onChange={(e) => handleStartDateChange(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 whitespace-nowrap">مدت (روز):</label>
                <input type="number" className="text-[11px] font-bold text-slate-700 bg-transparent outline-none w-full text-left" placeholder="5" value={idea.duration || ''} onChange={(e) => handleDurationChange(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 whitespace-nowrap">پایان:</label>
                <input type="date" className="text-[11px] font-bold text-slate-700 bg-transparent outline-none cursor-pointer w-full text-left" value={idea.endDate || ''} onChange={(e) => handleEndDateChange(e.target.value)} />
            </div>
         </div>

         <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 flex flex-col gap-2.5">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-1 border-b border-slate-100 pb-1">
               <Sliders size={12} /> ویژگی‌ها
            </h4>
            <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-black text-slate-400">وضعیت:</span>
              <select value={idea.statusId || settings?.statuses?.find(s => s.isDefault)?.id || ''} onChange={(e) => onUpdate({...idea, statusId: e.target.value})} className="text-[11px] font-bold text-indigo-600 outline-none bg-transparent cursor-pointer">
                  {settings?.statuses?.map(s => (<option key={s.id} value={s.id}>{langView === 'fa' ? s.title : s.titleEn}</option>))}
              </select>
            </div>
            <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-black text-slate-400">رنگ:</span>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((opt) => (
                  <button key={opt.name} onClick={() => onUpdate({...idea, color: opt.name})} className={`w-4 h-4 rounded-full border shadow-sm transition-all ${opt.bg} ${idea.color === opt.name ? 'ring-2 ring-indigo-500 scale-110' : 'border-slate-300'}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between bg-white px-3 py-1 rounded-lg border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">اولویت:</span>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-indigo-600 w-5 text-center">{idea.priority || 0}</span>
                <div className="flex gap-1">
                  <IconButton icon={ArrowUp} onClick={() => onPriorityChange(idea, -1)} className="bg-slate-50 p-1" size={10} />
                  <IconButton icon={ArrowDown} onClick={() => onPriorityChange(idea, 1)} className="bg-slate-50 p-1" size={10} />
                </div>
              </div>
            </div>
         </div>

         <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100 flex flex-col gap-3">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 mb-1 border-b border-slate-100 pb-1">
               <Tag size={12} /> تگ‌ها و پیوندها
            </h4>
            
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
                  {idea.tags?.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px] font-bold text-indigo-700">
                      {tag}
                      <button onClick={() => onUpdate({...idea, tags: idea.tags.filter((_, idx) => idx !== i)})} className="text-red-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
                <input className="w-full text-[10px] px-2 py-1.5 border border-slate-200 rounded-md outline-none focus:border-indigo-400" placeholder="افزودن تگ..." onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value) { onUpdate({...idea, tags: [...(idea.tags || []), e.target.value]}); e.target.value = ''; } }} />
            </div>

            <div className="mt-1 border-t border-slate-200 pt-2 flex flex-col gap-2">
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">لینک‌های مرتبط:</span>
                  <button onClick={() => setIsAddingLink(!isAddingLink)} className="text-[9px] font-black text-indigo-600 hover:underline">{isAddingLink ? 'بستن' : '+ لینک جدید'}</button>
               </div>
               
               <div className="flex flex-col gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                  {idea.links?.map((link, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-white border border-slate-100 rounded-md text-[9px] font-bold text-indigo-600 shadow-sm group">
                      <a href={link.url} target="_blank" rel="noreferrer" className="truncate flex-1 hover:underline">{link.label || 'Link'}</a>
                      <button onClick={() => onUpdate({...idea, links: idea.links.filter((_, idx) => idx !== i)})} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                    </div>
                  ))}
               </div>

               {isAddingLink && (
                  <div className="flex flex-col gap-2 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-1">
                     <input className="text-[9px] p-1.5 border border-slate-200 rounded-md outline-none focus:border-indigo-400" placeholder="عنوان لینک..." value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} />
                     <div className="flex gap-1">
                        <input className="flex-1 text-[9px] p-1.5 border border-slate-200 rounded-md outline-none focus:border-indigo-400" placeholder="URL..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} />
                        <button onClick={handleAddLink} className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all"><Plus size={12}/></button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex bg-slate-50 border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('docs')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black transition-all relative ${activeTab === 'docs' ? 'bg-white text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <FileText size={16} /> مستندات و توضیحات
             {activeTab === 'docs' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-indigo-600" />}
           </button>
           <button 
             onClick={() => setActiveTab('visuals')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black transition-all relative ${activeTab === 'visuals' ? 'bg-white text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
           >
             <ImageIcon size={16} /> طرح‌های بصری و تصاویر
             {activeTab === 'visuals' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-indigo-600" />}
           </button>
        </div>

        <div className="p-4 animate-in fade-in duration-300">
           {activeTab === 'docs' ? (
              <textarea 
                className="w-full h-[220px] p-4 bg-slate-50/20 border-none rounded-lg text-sm leading-relaxed outline-none shadow-inner resize-none focus:bg-white transition-all"
                placeholder="توضیحات و مستندات مربوط به این ایده را اینجا وارد کنید..."
                value={idea.description || ''}
                onChange={(e) => onUpdate({...idea, description: e.target.value})}
              />
           ) : (
              <div className="flex flex-col gap-3 h-[220px]">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">گالری طرح‌ها</span>
                    <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md text-[9px] font-black hover:bg-indigo-100 transition-colors border border-indigo-100">
                       + افزودن تصویر
                       <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                    </label>
                 </div>
                 
                 <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/30 overflow-y-auto p-4 custom-scrollbar">
                    {imagesToShow.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                         {imagesToShow.map((img, idx) => (
                            <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden shadow-sm border border-slate-200 bg-white">
                               <img src={img} alt={`Concept ${idx}`} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button onClick={() => { const win = window.open(""); win.document.write("<img src='" + img + "' style='max-width:100%'>"); }} className="p-1.5 bg-white text-slate-800 rounded-lg shadow-xl hover:scale-110 transition-transform"><Maximize2 size={12}/></button>
                                  <button onClick={() => removeImage(idx)} className="p-1.5 bg-red-500 text-white rounded-lg shadow-xl hover:scale-110 transition-transform"><Trash2 size={12}/></button>
                               </div>
                            </div>
                         ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60">
                         <ImageIcon size={32} strokeWidth={1} />
                         <span className="text-[10px] font-bold">هنوز تصویری برای این ایده بارگذاری نشده است</span>
                      </div>
                    )}
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};