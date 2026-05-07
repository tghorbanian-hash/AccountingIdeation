// reports.js

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    CalendarDays, BarChart2, ZoomIn, ZoomOut, Expand, 
    ChevronLeft, ChevronRight, PanelLeftOpen, PanelLeftClose, ChevronDown 
} from 'lucide-react';

const ReportsView = ({ ideas, settings, langView, workspaces, activeWorkspaceId, onUpdateIdea, onOpenIdea, utils }) => {
  const { formatDateToISO, getEffectiveDates, parseSafeDate, getDaysDifference, COLOR_OPTIONS, IconButton } = utils;
  
  const node = null;
  const [subView, setSubView] = useState('calendar');
  const [selectedWSIds, setSelectedWSIds] = useState(new Set(activeWorkspaceId ? [activeWorkspaceId] : workspaces.map(w => w.id)));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedInGantt, setExpandedInGantt] = useState(new Set());
  const [timeScale, setTimeScale] = useState('daily');
  const [isFitToScreen, setIsFitToScreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);

  const ganttScrollRef = useRef(null);
  const [isDraggingGantt, setIsDraggingGantt] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  useEffect(() => {
     const updateWidth = () => {
         if (ganttScrollRef.current) {
            setContainerWidth(ganttScrollRef.current.offsetWidth);
         }
     };
     window.addEventListener('resize', updateWidth);
     updateWidth();
     return () => window.removeEventListener('resize', updateWidth);
  }, [subView, isSidebarCollapsed]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter(i => selectedWSIds.has(i.workspaceId) || (!i.workspaceId && selectedWSIds.has(workspaces[0]?.id)));
  }, [ideas, selectedWSIds, workspaces]);

  const toggleWS = (id) => {
     const next = new Set(selectedWSIds);
     if (next.has(id)) next.delete(id); else next.add(id);
     setSelectedWSIds(next);
  };

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const offset = firstDay.getDay(); 
    const grid = [];
    for (let i = 0; i < offset; i++) grid.push(null);
    for (let i = 1; i <= totalDays; i++) grid.push(new Date(year, month, i));
    return grid;
  }, [currentMonth]);

  const getIdeasForDate = (date) => {
    if (!date) return { starts: [], ends: [], ongoingCount: 0 };
    const dateStr = formatDateToISO(date);
    const starts = filteredIdeas.filter(i => i.startDate === dateStr);
    const ends = filteredIdeas.filter(i => i.endDate === dateStr);
    const ongoingCount = filteredIdeas.filter(i => {
        if(!i.startDate || !i.endDate) return false;
        return i.startDate <= dateStr && i.endDate >= dateStr;
    }).length;
    return { starts, ends, ongoingCount };
  };

  const handlePrevMonth = () => {
      const next = new Date(currentMonth);
      next.setMonth(next.getMonth() - 1);
      setCurrentMonth(next);
  };
  const handleNextMonth = () => {
      const next = new Date(currentMonth);
      next.setMonth(next.getMonth() + 1);
      setCurrentMonth(next);
  };

  const handleDropOnDate = async (e, date) => {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData("id");
    if (!ideaId || !date) return;
    const dateStr = formatDateToISO(date);
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    let updates = { startDate: dateStr };
    if (idea.duration) {
       const d = parseSafeDate(dateStr);
       d.setDate(d.getDate() + (parseInt(idea.duration) - 1));
       updates.endDate = formatDateToISO(d);
    }
    onUpdateIdea({ ...idea, ...updates });
  };

  const buildGanttTree = useCallback((parentId = null, visited = new Set()) => {
     return filteredIdeas
        .filter(i => i.parentId === parentId)
        .map(i => {
           if (visited.has(i.id)) return { ...i, children: [] };
           const newVisited = new Set(visited).add(i.id);
           return { ...i, children: buildGanttTree(i.id, newVisited) };
        });
  }, [filteredIdeas]);

  const ganttData = useMemo(() => buildGanttTree(null), [buildGanttTree]);

  const flatGanttList = useMemo(() => {
      const list = [];
      const walk = (nodes, level = 0) => {
          if (!nodes) return;
          nodes.forEach(idea => {
              list.push({ ...idea, level });
              if (expandedInGantt.has(idea.id)) {
                  walk(idea.children || [], level + 1);
              }
          });
      };
      walk(ganttData);
      return list;
  }, [ganttData, expandedInGantt]);

  const ganttRange = useMemo(() => {
      const dates = filteredIdeas.flatMap(i => {
          const effective = getEffectiveDates(i, ideas);
          return [effective.start, effective.end];
      }).filter(Boolean);
      
      if (dates.length === 0) {
          const s = new Date();
          s.setHours(0,0,0,0);
          const e = new Date(s);
          e.setDate(e.getDate() + 30);
          return { start: s, end: e };
      }
      
      const minTimestamp = Math.min(...dates.map(d => d.getTime()));
      const maxTimestamp = Math.max(...dates.map(d => d.getTime()));
      
      let s = new Date(minTimestamp);
      let e = new Date(maxTimestamp);

      s = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      e = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);

      if (!isFitToScreen) {
          if (timeScale === 'daily') {
              s.setDate(s.getDate() - 7);
              e.setDate(e.getDate() + 21);
          } else if (timeScale === 'weekly') {
              s.setDate(s.getDate() - 14);
              e.setDate(e.getDate() + 60);
          } else {
              s.setDate(1);
              s.setMonth(s.getMonth() - 1);
              e.setMonth(e.getMonth() + 6);
          }
      }
      
      return { start: s, end: e };
  }, [filteredIdeas, ideas, timeScale, isFitToScreen]);

  const ganttIntervals = useMemo(() => {
      const res = [];
      if (!ganttRange.start) return res;
      let curr = new Date(ganttRange.start);
      const limit = new Date(ganttRange.end);
      
      while (curr <= limit) {
          const date = new Date(curr);
          let label = "";
          let subLabel = "";

          if (timeScale === 'daily') {
              label = date.getDate().toString();
              subLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
              res.push({ date, label, subLabel });
              curr.setDate(curr.getDate() + 1);
          } else if (timeScale === 'weekly') {
              label = "W" + Math.ceil(date.getDate() / 7);
              subLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              res.push({ date, label, subLabel });
              curr.setDate(curr.getDate() + 7);
          } else {
              label = date.toLocaleDateString('en-US', { month: 'long' });
              subLabel = date.getFullYear().toString();
              res.push({ date, label, subLabel });
              curr.setMonth(curr.getMonth() + 1);
          }
      }
      return res;
  }, [ganttRange, timeScale]);

  const UNIT_WIDTH = useMemo(() => {
     let base = 0;
     if (isFitToScreen && containerWidth > 0 && ganttIntervals.length > 0) {
        base = Math.floor(containerWidth / ganttIntervals.length);
     } else {
        base = timeScale === 'daily' ? 40 : timeScale === 'weekly' ? 120 : 250;
     }
     return Math.max(20, Math.floor(base * zoomFactor));
  }, [timeScale, isFitToScreen, containerWidth, ganttIntervals, zoomFactor]);

  const getGanttPos = (date) => {
      if (!date || !ganttRange.start) return 0;
      const start = ganttRange.start.getTime();
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
      const diffMs = target - start;
      const msPerDay = 1000 * 60 * 60 * 24;

      if (timeScale === 'daily') {
          const diffDays = diffMs / msPerDay;
          return diffDays * UNIT_WIDTH;
      } else if (timeScale === 'weekly') {
          const diffWeeks = diffMs / (msPerDay * 7);
          return diffWeeks * UNIT_WIDTH;
      } else {
          const startYear = ganttRange.start.getFullYear();
          const startMonth = ganttRange.start.getMonth();
          const targetYear = date.getFullYear();
          const targetMonth = date.getMonth();
          const diffMonths = (targetYear - startYear) * 12 + (targetMonth - startMonth);
          const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
          const fraction = (date.getDate() - 1) / daysInMonth;
          return (diffMonths + fraction) * UNIT_WIDTH;
      }
  };

  const handleGanttInteraction = (e, idea, type) => {
      const rect = ganttScrollRef.current.querySelector('.gantt-grid-inner').getBoundingClientRect();
      const offsetX = (e.clientX - rect.left) + ganttScrollRef.current.scrollLeft;
      
      const startTimestamp = ganttRange.start.getTime();
      const msPerDay = 1000 * 60 * 60 * 24;
      let targetDate;

      if (timeScale === 'daily') {
          const daysOffset = Math.round(offsetX / UNIT_WIDTH);
          targetDate = new Date(startTimestamp + daysOffset * msPerDay);
      } else if (timeScale === 'weekly') {
          const weeksOffset = (offsetX / UNIT_WIDTH);
          targetDate = new Date(startTimestamp + weeksOffset * 7 * msPerDay);
      } else {
          const monthsOffset = Math.floor(offsetX / UNIT_WIDTH);
          const fraction = (offsetX % UNIT_WIDTH) / UNIT_WIDTH;
          targetDate = new Date(ganttRange.start);
          targetDate.setMonth(targetDate.getMonth() + monthsOffset);
          const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
          targetDate.setDate(Math.max(1, Math.round(fraction * daysInMonth)));
      }

      targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0,0,0,0);
      const targetISO = formatDateToISO(targetDate);

      if (type === 'move') {
          let updates = { startDate: targetISO };
          const oldStart = parseSafeDate(idea.startDate);
          const oldEnd = parseSafeDate(idea.endDate);
          if (oldStart && oldEnd) {
              const diffDays = getDaysDifference(oldEnd, oldStart);
              const newEnd = new Date(targetDate);
              newEnd.setDate(newEnd.getDate() + diffDays);
              updates.endDate = formatDateToISO(newEnd);
              updates.duration = (diffDays + 1).toString();
          }
          onUpdateIdea({ ...idea, ...updates });
      } else if (type === 'resizeStart') {
          const end = parseSafeDate(idea.endDate);
          if (end && targetDate <= end) {
              const diff = getDaysDifference(end, targetDate);
              onUpdateIdea({ ...idea, startDate: targetISO, duration: (diff + 1).toString() });
          }
      } else if (type === 'resize') {
          const start = parseSafeDate(idea.startDate);
          if (start && targetDate >= start) {
              const diff = getDaysDifference(targetDate, start);
              onUpdateIdea({ ...idea, endDate: targetISO, duration: (diff + 1).toString() });
          }
      }
  };

  const handleMouseDown = (e) => {
      if (e.target.closest('.gantt-bar')) return;
      setIsDraggingGantt(true);
      setDragStartX(e.pageX - ganttScrollRef.current.offsetLeft);
      setDragScrollLeft(ganttScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => setIsDraggingGantt(false);
  const handleMouseMove = (e) => {
      if (!isDraggingGantt) return;
      e.preventDefault();
      const x = e.pageX - ganttScrollRef.current.offsetLeft;
      const walk = (x - dragStartX) * 1.5;
      ganttScrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const calendarDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden w-full">
       <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10 shadow-sm w-full">
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setSubView('calendar')} className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 ${subView === 'calendar' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                   <CalendarDays size={14} /> تقویم اجرایی
                </button>
                <button onClick={() => setSubView('gantt')} className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 ${subView === 'gantt' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                   <BarChart2 size={14} /> گانت چارت
                </button>
             </div>

             {subView === 'gantt' && (
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 px-2 uppercase"><ZoomIn size={12}/></span>
                      {['daily', 'weekly', 'monthly'].map(scale => (
                         <button 
                            key={scale}
                            onClick={() => { setTimeScale(scale); setIsFitToScreen(false); setZoomFactor(1); }}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${!isFitToScreen && timeScale === scale ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white'}`}
                         >
                            {scale === 'daily' ? 'روزانه' : scale === 'weekly' ? 'هفتگی' : 'ماهانه'}
                         </button>
                      ))}
                   </div>
                   <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                      <IconButton icon={ZoomOut} onClick={() => setZoomFactor(prev => Math.max(0.2, prev / 1.2))} title="Zoom Out" size={14} />
                      <span className="text-[9px] font-black text-slate-400 w-8 text-center">{Math.round(zoomFactor * 100)}%</span>
                      <IconButton icon={ZoomIn} onClick={() => setZoomFactor(prev => Math.min(3, prev * 1.2))} title="Zoom In" size={14} />
                   </div>
                   <button 
                      onClick={() => setIsFitToScreen(!isFitToScreen)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black border transition-all ${isFitToScreen ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                   >
                      <Expand size={12} /> فیت کردن در صفحه
                   </button>
                </div>
             )}
          </div>

          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase">فیلتر فضاها:</span>
             <div className="flex flex-wrap gap-1">
                {workspaces.map(ws => {
                   const active = selectedWSIds.has(ws.id);
                   return (
                      <button 
                         key={ws.id} 
                         onClick={() => toggleWS(ws.id)}
                         className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                      >
                         {langView === 'fa' ? ws.title : ws.titleEn}
                      </button>
                   );
                })}
             </div>
          </div>
       </div>

       <div className="flex-1 overflow-auto p-6 custom-scrollbar w-full">
          {subView === 'calendar' ? (
             <div className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full min-h-[700px] w-full">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 w-full">
                   <div className="flex items-center gap-4">
                      <h3 className="text-lg font-black text-slate-800">
                         {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <div className="flex gap-1">
                         <IconButton icon={ChevronLeft} onClick={handlePrevMonth} className="bg-white border" />
                         <IconButton icon={ChevronRight} onClick={handleNextMonth} className="bg-white border" />
                      </div>
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> شروع ایده</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> پایان ایده</div>
                   </div>
                </div>

                <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
                   <div className="grid grid-cols-7 w-full border-b border-slate-100 bg-slate-50/30">
                      {calendarDayNames.map(d => (
                         <div key={d} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase border-l border-slate-100">{d}</div>
                      ))}
                   </div>
                   <div className="flex-1 grid grid-cols-7 grid-rows-6 w-full">
                      {calendarGrid.map((date, idx) => {
                         const { starts, ends, ongoingCount } = getIdeasForDate(date);
                         const isToday = date && formatDateToISO(date) === formatDateToISO(new Date());
                         return (
                            <div 
                               key={idx} 
                               className={`min-h-0 p-2 border-b border-l border-slate-100 transition-colors flex flex-col gap-1 overflow-hidden relative ${date ? 'bg-white' : 'bg-slate-50/20'} ${isToday ? 'bg-indigo-50/30' : ''}`}
                               onDragOver={e => e.preventDefault()}
                               onDrop={e => handleDropOnDate(e, date)}
                            >
                               {date && (
                                  <>
                                     <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                                           {date.getDate()}
                                        </span>
                                        {ongoingCount > 0 && (
                                           <div className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shadow-sm">
                                              {ongoingCount} ایده
                                           </div>
                                        )}
                                     </div>
                                     <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                                        {starts.map(i => (
                                           <div key={i.id} onClick={() => onOpenIdea(i)} className="text-[9px] font-bold p-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 truncate cursor-pointer hover:shadow-md transition-all flex items-center gap-1">
                                              <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                              {langView === 'fa' ? i.title : i.titleEn}
                                           </div>
                                        ))}
                                        {ends.map(i => (
                                           <div key={i.id} onClick={() => onOpenIdea(i)} className="text-[9px] font-bold p-1 rounded-md bg-rose-50 border border-rose-100 text-rose-700 truncate cursor-pointer hover:shadow-md transition-all flex items-center gap-1">
                                              <div className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                                              {langView === 'fa' ? i.title : i.titleEn}
                                           </div>
                                        ))}
                                     </div>
                                  </>
                               )}
                            </div>
                         );
                      })}
                   </div>
                </div>
             </div>
          ) : (
             <div className="bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[700px] w-full relative">
                 <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <BarChart2 size={18} className="text-indigo-600" /> نمای گانت (Gregorian)
                    </h3>
                 </div>
                 <div className="flex-1 flex overflow-hidden w-full">
                    <button 
                       onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                       className="absolute bottom-6 left-6 z-[100] w-10 h-10 bg-white border border-slate-200 rounded-full shadow-2xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all active:scale-95"
                       title={isSidebarCollapsed ? "نمایش لیست" : "جمع کردن لیست"}
                    >
                       {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    {!isSidebarCollapsed && (
                        <div className="w-72 bg-white border-l border-slate-200 flex flex-col z-20 shadow-lg shrink-0 animate-in slide-in-from-right-2 duration-300">
                           <div className="h-16 border-b border-slate-100 flex items-center px-4 bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest">لیست ایده‌ها</div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar">
                              {flatGanttList.map(idea => (
                                 <div 
                                    key={idea.id} 
                                    className={`h-10 flex items-center gap-2 px-3 border-b border-slate-50 transition-colors hover:bg-slate-50 cursor-pointer ${idea.level > 0 ? 'bg-slate-50/10' : ''}`}
                                    style={{ [langView === 'fa' ? 'paddingRight' : 'paddingLeft']: `${idea.level * 16 + 12}px` }}
                                    onClick={() => onOpenIdea(idea)}
                                 >
                                    <button 
                                       onClick={(e) => { 
                                           e.stopPropagation(); 
                                           setExpandedInGantt(prev => {
                                               const next = new Set(prev); 
                                               if(next.has(idea.id)) next.delete(idea.id); 
                                               else next.add(idea.id); 
                                               return next;
                                           }); 
                                       }}
                                       className={`p-0.5 rounded transition-transform ${expandedInGantt.has(idea.id) ? 'rotate-0' : '-rotate-90'}`}
                                    >
                                       {idea.children?.length > 0 ? <ChevronDown size={12} className="text-slate-400" /> : <div className="w-3 h-3" />}
                                    </button>
                                    <span className="text-[10px] font-bold text-slate-700 truncate">
                                        {langView === 'fa' ? idea.title : idea.titleEn}
                                        {idea.duration && parseInt(idea.duration) > 0 && (
                                            <span className="text-slate-400 font-normal mr-1 ml-1 text-[9px]">
                                                ({idea.duration} {langView === 'fa' ? 'روز' : 'days'})
                                            </span>
                                        )}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        </div>
                    )}
                    <div 
                       ref={ganttScrollRef}
                       onMouseDown={handleMouseDown}
                       onMouseLeave={handleMouseLeaveOrUp}
                       onMouseUp={handleMouseLeaveOrUp}
                       onMouseMove={handleMouseMove}
                       className="flex-1 overflow-auto custom-scrollbar relative bg-white gantt-container"
                       dir="ltr"
                    >
                       <div className="sticky top-0 h-16 bg-slate-50 border-b border-slate-200 flex z-30 shadow-sm" style={{ width: ganttIntervals.length * UNIT_WIDTH }}>
                          {ganttIntervals.map((it, i) => {
                             const isToday = timeScale === 'daily' && formatDateToISO(it.date) === formatDateToISO(new Date());
                             return (
                                <div key={i} className={`shrink-0 h-full border-l border-slate-200/50 flex flex-col items-center justify-center relative ${isToday ? 'bg-indigo-50' : ''}`} style={{ width: UNIT_WIDTH }}>
                                   <span className="text-[10px] font-black text-indigo-600 uppercase mb-0.5">{it.label}</span>
                                   <span className="text-[9px] font-bold text-slate-400">{it.subLabel}</span>
                                </div>
                             );
                          })}
                       </div>
                       <div className="relative gantt-grid-inner min-h-full" style={{ width: ganttIntervals.length * UNIT_WIDTH, backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px)`, backgroundSize: `${UNIT_WIDTH}px 100%` }}>
                          {flatGanttList.map(idea => {
                             const effective = getEffectiveDates(idea, ideas);
                             const startPos = getGanttPos(effective.start);
                             
                             let width = 0;
                             if (effective.start && effective.end) {
                                 const endPos = getGanttPos(effective.end);
                                 width = endPos - startPos + (timeScale === 'daily' ? UNIT_WIDTH : 0);
                                 if (width < 10) width = 10;
                             }

                             const colorData = COLOR_OPTIONS.find(c => c.name === idea.color) || COLOR_OPTIONS[0];
                             const isParent = ideas.some(i => i.parentId === idea.id);
                             
                             let barBgClass = "";
                             if (isParent) {
                                 barBgClass = "bg-slate-200 border-slate-300 text-slate-600";
                             } else {
                                 barBgClass = idea.color === 'Default' ? 'bg-slate-200 border-slate-300 text-slate-600' : `${colorData.bg} ${colorData.border} ${colorData.text}`;
                             }
                             
                             return (
                                <div key={idea.id} className="h-10 border-b border-slate-100 flex items-center relative group">
                                   {effective.start && effective.end ? (
                                      <div 
                                         className={`gantt-bar absolute h-6 rounded shadow-sm border flex items-center transition-all cursor-move z-10 group-hover:shadow-indigo-100 group-hover:z-[40] ${barBgClass}`}
                                         style={{ left: startPos, width: Math.max(width, 20) }}
                                         draggable
                                         onDragEnd={(e) => handleGanttInteraction(e, idea, 'move')}
                                         onClick={(e) => { e.stopPropagation(); onOpenIdea(idea); }}
                                      >
                                         <div className={`absolute bottom-full mb-2 hidden group-hover:block z-[2000] bg-white border border-slate-200 shadow-2xl p-2 rounded text-[10px] font-bold text-slate-700 pointer-events-none whitespace-nowrap min-w-[150px] ${langView === 'fa' ? 'text-right' : 'text-left'}`} dir={langView === 'fa' ? 'rtl' : 'ltr'}>
                                            <div className="text-indigo-600 mb-1 border-b border-slate-100 pb-1 font-black">{langView === 'fa' ? idea.title : idea.titleEn}</div>
                                            <div className="flex justify-between gap-4 font-sans text-[9px]">
                                               <span>{formatDateToISO(effective.start)}</span>
                                               <span className="text-slate-300">|</span>
                                               <span>{formatDateToISO(effective.end)}</span>
                                            </div>
                                         </div>

                                         <div 
                                            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/10 rounded-l z-20"
                                            onDragEnd={(e) => { e.stopPropagation(); handleGanttInteraction(e, idea, 'resizeStart'); }}
                                         />
                                         <div 
                                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/10 rounded-r z-20"
                                            onDragEnd={(e) => { e.stopPropagation(); handleGanttInteraction(e, idea, 'resize'); }}
                                         />

                                         <span className="px-2 text-[8px] font-black truncate w-full text-center pointer-events-none">
                                            {langView === 'fa' ? idea.title : idea.titleEn}
                                         </span>
                                      </div>
                                   ) : (
                                      <div className="absolute left-4 text-[8px] font-bold text-slate-300 italic">No Timing</div>
                                   )}
                                </div>
                             );
                          })}
                          <div 
                             className="absolute top-0 bottom-0 w-px bg-indigo-500 z-10 pointer-events-none shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                             style={{ left: getGanttPos(new Date()) }}
                          >
                             <div className="w-2 h-2 bg-indigo-500 rounded-full -ml-1 mt-[-1px]" />
                          </div>
                       </div>
                    </div>
                 </div>
             </div>
          )}
       </div>
    </div>
  );
};

window.ReportsViewComponent = ReportsView;