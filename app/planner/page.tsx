"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- TYPES ---
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  globalPercentage: number;
}

interface SaveCell {
  id: string;
  title: string;
  startingCountry: string;
}

type ItemsMap = Record<string, Achievement[]>;

// --- MOCK DATA (To be replaced by actual Steam API data) ---
const INITIAL_POOL: Achievement[] = [
  { id: "ach_1", name: "True Heir of Timur", description: "Form the Mughal Empire and conquer all of India by 1550.", icon: "https://via.placeholder.com/64/1e293b/CFB53B?text=T", globalPercentage: 0.8 },
  { id: "ach_2", name: "Mehmed's Ambition", description: "Starting as Ottomans, own or have subjects own all of the core provinces of the Roman Empire before 1500.", icon: "https://via.placeholder.com/64/1e293b/CFB53B?text=M", globalPercentage: 1.2 },
  { id: "ach_3", name: "Basileus", description: "Restore the Roman Empire.", icon: "https://via.placeholder.com/64/1e293b/CFB53B?text=B", globalPercentage: 4.5 },
  { id: "ach_4", name: "Mare Nostrum", description: "Restore the Roman Empire and own the entire Mediterranean and Black Sea coastlines.", icon: "https://via.placeholder.com/64/1e293b/CFB53B?text=MN", globalPercentage: 3.1 },
  { id: "ach_5", name: "A Tale of Two Families", description: "Start as Vijayanagar or Bahmanis and conquer the other's capital.", icon: "https://via.placeholder.com/64/1e293b/CFB53B?text=V", globalPercentage: 12.4 },
];

const POOL_ID = "pool-container";

// --- DRAGGABLE ITEM COMPONENT ---
function SortableAchievement({ achievement }: { achievement: Achievement }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: achievement.id,
    data: { type: "Achievement", achievement },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-slate-900 border border-slate-700/60 rounded-md p-3 mb-2 shadow-md cursor-grab active:cursor-grabbing hover:border-[#CFB53B]/50 transition-colors flex gap-3"
    >
      <img src={achievement.icon} alt={achievement.name} className="w-12 h-12 rounded shadow-sm border border-slate-800" />
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-sm font-bold text-[#CFB53B] leading-tight">{achievement.name}</h4>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-950 text-slate-400 rounded border border-slate-700/50 shrink-0">
            {achievement.globalPercentage}%
          </span>
        </div>
        <p className="text-xs text-slate-400 line-clamp-2">{achievement.description}</p>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function PlannerPage() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Default true for dev, change to logic check later
  const [saveCells, setSaveCells] = useState<SaveCell[]>([]);
  const [items, setItems] = useState<ItemsMap>({ [POOL_ID]: [] });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- INITIALIZATION ---
  useEffect(() => {
    setIsClient(true);
    
    // TODO: Add real Steam Auth check here. E.g., const user = localStorage.getItem('steam_user');
    // if (!user) setIsAuthenticated(false);
    
    const savedPlan = localStorage.getItem("eu4_save_planner");
    
    if (savedPlan) {
      try {
        const { savedCells, savedItems } = JSON.parse(savedPlan);
        setSaveCells(savedCells || []);
        setItems(savedItems || { [POOL_ID]: INITIAL_POOL });
        return;
      } catch (e) {
        console.error("Failed to parse saved plan", e);
      }
    }

    setItems({ [POOL_ID]: INITIAL_POOL });
    setSaveCells([]); // Start with no saves
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("eu4_save_planner", JSON.stringify({ savedCells: saveCells, savedItems: items }));
    }
  }, [items, saveCells, isClient]);

  // --- ACTIONS ---
  const handleCreateSave = () => {
    const newSaveId = `save_${Date.now()}`;
    setSaveCells([...saveCells, { id: newSaveId, title: "New Save", startingCountry: "Unknown" }]);
    setItems((prev) => ({ ...prev, [newSaveId]: [] }));
  };

  const handleUpdateSave = (id: string, field: keyof SaveCell, value: string) => {
    setSaveCells(saveCells.map(cell => cell.id === id ? { ...cell, [field]: value } : cell));
  };

  const handleDeleteSave = (id: string) => {
    if (confirm("Delete this save cell and return its achievements to the pool?")) {
      const returnedItems = items[id] || [];
      setItems(prev => {
        const newItems = { ...prev };
        newItems[POOL_ID] = [...newItems[POOL_ID], ...returnedItems];
        delete newItems[id];
        return newItems;
      });
      setSaveCells(saveCells.filter(cell => cell.id !== id));
    }
  };

  // --- DRAG & DROP LOGIC ---
  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) return id;
    return Object.keys(items).find((key) => items[key].find((item) => item.id === id));
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === active.id);
      const overIndex = overItems.findIndex((item) => item.id === overId);
      
      let newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;
      
      return {
        ...prev,
        [activeContainer]: [...prev[activeContainer].filter((item) => item.id !== active.id)],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ],
      };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id);
    const overContainer = over?.id ? findContainer(over.id) : null;

    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      setActiveId(null);
      return;
    }

    const activeIndex = items[activeContainer].findIndex((item) => item.id === active.id);
    const overIndex = items[overContainer].findIndex((item) => item.id === over?.id);

    if (activeIndex !== overIndex) {
      setItems((prev) => ({
        ...prev,
        [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex),
      }));
    }

    setActiveId(null);
  };

  if (!isClient) return null;

  // Render auth guard
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl max-w-md text-center shadow-2xl">
          <h2 className="text-xl font-bold text-[#CFB53B] mb-4">Authentication Required</h2>
          <p className="text-sm text-slate-400 mb-6">You must link your Steam profile to access the Campaign Planner and view your uncompleted achievements.</p>
          <Link href="/" className="px-6 py-2 bg-[#CFB53B]/10 text-[#CFB53B] border border-[#CFB53B]/40 rounded hover:bg-[#CFB53B]/20 transition-colors uppercase text-xs font-bold tracking-widest">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Filter pool items: Search in both NAME and DESCRIPTION
  const displayPoolItems = items[POOL_ID]?.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="min-h-screen bg-[#070b14] p-6 text-slate-200 selection:bg-[#CFB53B]/30">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex flex-col gap-4 mb-8 border-b border-slate-800 pb-4">
        <Link href="/" className="text-[#CFB53B] hover:text-[#FFF3A3] text-xs font-bold uppercase tracking-widest transition-colors w-fit">
          ← Back to Roulette
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#CFB53B] uppercase tracking-widest mb-1">
              Save Planner
            </h1>
            <p className="text-sm text-slate-400">Manage your future runs. Achievements shown are currently locked on your Steam account.</p>
          </div>
          <button 
            onClick={handleCreateSave}
            className="px-6 py-3 bg-[#CFB53B]/10 text-[#CFB53B] border border-[#CFB53B]/40 rounded-md hover:bg-[#CFB53B]/20 transition-colors shadow-[0_0_15px_rgba(207,181,59,0.15)] text-sm font-bold uppercase tracking-wide flex items-center gap-2"
          >
            <span>💾</span> Create Save
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT PANEL: ACHIEVEMENT POOL */}
          <div className="lg:col-span-1 flex flex-col h-[calc(100vh-160px)]">
            <div className="bg-slate-950/80 border border-slate-800 rounded-t-xl p-4 border-b-0">
              <h2 className="text-lg font-bold text-[#CFB53B] mb-3 uppercase tracking-wider">Locked Achievements</h2>
              <input 
                type="text"
                placeholder="Search by name or content (e.g. 'otto')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#CFB53B]/60 transition-colors"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50 border border-slate-800 rounded-b-xl scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              <SortableContext id={POOL_ID} items={displayPoolItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="min-h-[200px]">
                  {displayPoolItems.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 italic mt-8">No matching achievements found.</p>
                  ) : (
                    displayPoolItems.map((ach) => (
                      <SortableAchievement key={ach.id} achievement={ach} />
                    ))
                  )}
                </div>
              </SortableContext>
            </div>
          </div>

          {/* RIGHT PANEL: SAVE CELLS */}
          <div className="lg:col-span-3 flex overflow-x-auto gap-6 pb-6 h-[calc(100vh-160px)] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {saveCells.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                <p className="text-slate-500 mb-4">No active saves found.</p>
                <button onClick={handleCreateSave} className="text-[#CFB53B] hover:underline text-sm font-bold uppercase tracking-widest">
                  Create your first save
                </button>
              </div>
            )}

            {saveCells.map((cell) => (
              <div key={cell.id} className="min-w-[360px] max-w-[360px] flex flex-col bg-slate-900/40 border border-slate-800 rounded-xl h-full shadow-lg backdrop-blur-sm">
                
                {/* EDITABLE CELL HEADER */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 rounded-t-xl relative group">
                  <button onClick={() => handleDeleteSave(cell.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Save">
                    ✖
                  </button>
                  <input 
                    type="text" 
                    value={cell.title} 
                    onChange={(e) => handleUpdateSave(cell.id, "title", e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-[#CFB53B] focus:outline-none font-bold text-slate-200 text-lg mb-2 pb-1 transition-colors"
                    placeholder="Save Name"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Start:</span>
                    <input 
                      type="text" 
                      value={cell.startingCountry} 
                      onChange={(e) => handleUpdateSave(cell.id, "startingCountry", e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-[#CFB53B] focus:outline-none text-sm text-[#CFB53B] pb-1 transition-colors"
                      placeholder="e.g. Brandenburg"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                  <SortableContext id={cell.id} items={items[cell.id]?.map((i) => i.id) || []} strategy={verticalListSortingStrategy}>
                    <div className="min-h-[150px] h-full rounded-lg border-2 border-dashed border-slate-800/60 p-2">
                      {(!items[cell.id] || items[cell.id].length === 0) && (
                        <div className="h-full flex items-center justify-center text-slate-600/70 text-sm italic pointer-events-none text-center px-4">
                          Drag uncompleted achievements here
                        </div>
                      )}
                      {items[cell.id]?.map((ach) => (
                        <SortableAchievement key={ach.id} achievement={ach} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* DRAG OVERLAY */}
        <DragOverlay>
          {activeId ? (
            <div className="opacity-90 scale-105 rotate-2 cursor-grabbing shadow-2xl">
              <SortableAchievement 
                achievement={
                  Object.values(items).flat().find(i => i.id === activeId) as Achievement
                } 
              />
            </div>
          ) : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
}