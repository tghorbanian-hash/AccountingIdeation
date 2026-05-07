// utils.js
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as XLSX from 'xlsx';

export const parseSafeDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

export const formatDateToISO = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getDaysDifference = (d1, d2) => {
    if (!d1 || !d2) return 0;
    const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
    const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
    return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
};

export const firebaseConfig = {
    apiKey: "AIzaSyBcVbacN57Mv3e-1iTtCMjjbQKU_GhENSM",
    authDomain: "ideamanagement-99372.firebaseapp.com",
    projectId: "ideamanagement-99372",
    storageBucket: "ideamanagement-99372.firebasestorage.app",
    messagingSenderId: "356445134444",
    appId: "1:356445134444:web:fa73f9fd0a2b7ea1020249",
    measurementId: "G-RVVPCQFX3G"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export const FIXED_APP_ID = 'discovery-hub-main-v1';

export const COLOR_OPTIONS = [
    { name: 'Default', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-600' },
    { name: 'Indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', badge: 'bg-indigo-600 text-white' },
    { name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-600 text-white' },
    { name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-600 text-white' },
    { name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-600 text-white' },
    { name: 'Sky', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', badge: 'bg-sky-600 text-white' },
];

export const STATUS_COLORS = [
    { id: 'gray', bg: 'bg-slate-100', text: 'text-slate-600' },
    { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
    { id: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { id: 'yellow', bg: 'bg-amber-100', text: 'text-amber-700' },
    { id: 'red', bg: 'bg-rose-100', text: 'text-rose-700' },
    { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
];

export const DEFAULT_SETTINGS = {
    statuses: [
        { id: 'todo', title: 'انجام نشده', titleEn: 'To Do', color: 'gray', isDefault: true },
        { id: 'inprogress', title: 'در حال انجام', titleEn: 'In Progress', color: 'blue', isDefault: false },
        { id: 'done', title: 'تکمیل شده', titleEn: 'Done', color: 'green', isDefault: false },
    ]
};

export const getTimeStatus = (idea) => {
    if (!idea || idea.statusId === 'done') return null;
    const today = formatDateToISO(new Date());
    let status = null;
    if (idea.endDate && today > idea.endDate) {
        status = 'overdue';
    } else if (idea.startDate && today >= idea.startDate) {
        status = 'ready';
    }
    return status;
};

export const getIdeaPath = (allIdeas, ideaId) => {
    let path = [];
    let current = allIdeas.find(i => i.id === ideaId);
    let visited = new Set();
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        path.unshift(current);
        current = allIdeas.find(i => i.id === current.parentId);
    }
    return path;
};

export const getEffectiveDates = (idea, allIdeas, visited = new Set()) => {
    if (!idea || visited.has(idea.id)) return { start: null, end: null };
    visited.add(idea.id);

    let start = idea.startDate ? parseSafeDate(idea.startDate) : null;
    let end = idea.endDate ? parseSafeDate(idea.endDate) : null;

    const children = allIdeas.filter(i => i.parentId === idea.id);
    if (children.length > 0) {
        children.forEach(child => {
            const childDates = getEffectiveDates(child, allIdeas, visited);
            if (childDates.start) {
                if (!start || childDates.start < start) start = childDates.start;
            }
            if (childDates.end) {
                if (!end || childDates.end > end) end = childDates.end;
            }
        });
    }

    return { start, end };
};

export const exportWorkspaceToExcel = (workspaceId, workspaces, allIdeas, settings) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    const wsIdeas = allIdeas.filter(i => i.workspaceId === workspaceId || (!i.workspaceId && workspaces[0]?.id === workspaceId));
    const ideaMap = new Map(wsIdeas.map(i => [i.id, i]));
    
    const getPath = (idea) => {
        let path = [];
        let current = ideaMap.get(idea.parentId);
        while (current) {
            path.unshift(current.title || current.titleEn || 'بدون عنوان');
            current = ideaMap.get(current.parentId);
        }
        return path.join(' > ');
    };

    const getStatusTitle = (statusId) => {
        const s = settings?.statuses?.find(st => st.id === statusId) || settings?.statuses?.find(st => st.isDefault);
        return s ? s.title : 'نامشخص';
    };

    const data = wsIdeas.map(idea => ({
        'شناسه سیستم': idea.id,
        'عنوان (فارسی)': idea.title || '',
        'عنوان (انگلیسی)': idea.titleEn || '',
        'مسیر پدر': getPath(idea),
        'وضعیت': getStatusTitle(idea.statusId),
        'اولویت': idea.priority || 0,
        'تاریخ شروع': idea.startDate || '',
        'تاریخ پایان': idea.endDate || '',
        'مدت (روز)': idea.duration || '',
        'رنگ': idea.color || 'Default',
        'تگ‌ها': idea.tags ? idea.tags.join(', ') : '',
        'توضیحات': idea.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ideas_Data");
    
    const fileName = `${workspace.title || 'Workspace'}_Ideas.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
