/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Users, Play, RotateCcw, Trash2, UserPlus, CheckCircle2, History, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";

interface Player {
  id: string;
  name: string;
  playCount: number;
}

interface Match {
  id: string;
  players: string[];
  timestamp: number;
}

interface Session {
  id: string;
  date: string;
  players: Player[];
  matches: Match[];
}

const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'A', playCount: 0 },
  { id: '2', name: 'B', playCount: 0 },
  { id: '3', name: 'C', playCount: 0 },
  { id: '4', name: 'D', playCount: 0 },
  { id: '5', name: 'E', playCount: 0 },
  { id: '6', name: 'F', playCount: 0 },
  { id: '7', name: 'G', playCount: 0 },
  { id: '8', name: 'H', playCount: 0 },
];

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sessionsData: Session[] = [];
      querySnapshot.forEach((doc) => {
        sessionsData.push({ id: doc.id, ...doc.data() } as Session);
      });
      setSessions(sessionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    const newSession: Session = {
      id,
      date: newSessionDate,
      players: [...DEFAULT_PLAYERS],
      matches: [],
    };
    
    try {
      await setDoc(doc(db, "sessions", id), newSession);
      setCurrentSessionId(id);
    } catch (error) {
      console.error("Error creating session:", error);
      alert("เกิดข้อผิดพลาดในการสร้างเซสชัน");
    }
  };

  const deleteSession = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของวันนี้ทั้งหมด?')) {
      try {
        await deleteDoc(doc(db, "sessions", id));
        if (currentSessionId === id) setCurrentSessionId(null);
      } catch (error) {
        console.error("Error deleting session:", error);
        alert("เกิดข้อผิดพลาดในการลบเซสชัน");
      }
    }
  };

  const updateCurrentSession = async (updatedSession: Session) => {
    try {
      await setDoc(doc(db, "sessions", updatedSession.id), updatedSession);
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !currentSession) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      playCount: 0,
    };
    await updateCurrentSession({
      ...currentSession,
      players: [...currentSession.players, newPlayer]
    });
    setNewPlayerName('');
  };

  const togglePlayerSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      }
      if (prev.length < 4) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const startMatch = async () => {
    if (selectedIds.length !== 4 || !currentSession) return;

    const updatedPlayers = currentSession.players.map(p => 
      selectedIds.includes(p.id) ? { ...p, playCount: p.playCount + 1 } : p
    );

    const newMatch: Match = {
      id: Date.now().toString(),
      players: selectedIds.map(id => currentSession.players.find(p => p.id === id)?.name || ''),
      timestamp: Date.now(),
    };

    await updateCurrentSession({
      ...currentSession,
      players: updatedPlayers,
      matches: [newMatch, ...currentSession.matches].slice(0, 20)
    });

    setSelectedIds([]);
  };

  const resetCounts = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    if (currentSession) {
      await updateCurrentSession({
        ...currentSession,
        players: currentSession.players.map(p => ({ ...p, playCount: 0 })),
        matches: []
      });
    }
    setShowResetModal(false);
  };

  const removePlayer = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้เล่นนี้?') && currentSession) {
      await updateCurrentSession({
        ...currentSession,
        players: currentSession.players.filter(p => p.id !== id)
      });
      setSelectedIds(prev => prev.filter(pId => pId !== id));
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแมตช์นี้? (จำนวนครั้งที่เล่นจะถูกหักออกด้วย)') && currentSession) {
      const matchToDelete = currentSession.matches.find(m => m.id === matchId);
      if (!matchToDelete) return;

      const updatedPlayers = currentSession.players.map(p => 
        matchToDelete.players.includes(p.name) ? { ...p, playCount: Math.max(0, p.playCount - 1) } : p
      );

      await updateCurrentSession({
        ...currentSession,
        players: updatedPlayers,
        matches: currentSession.matches.filter(m => m.id !== matchId)
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลจาก Firebase...</p>
        </div>
      </div>
    );
  }

  if (!currentSessionId || !currentSession) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <header className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-sm border border-black/5 mb-4 overflow-hidden">
              <svg viewBox="0 0 24 24" fill="none" stroke="#CF202E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
                <path d="M12 2L8 10h8L12 2z" fill="#CF202E" fillOpacity="0.1"/>
                <path d="M8 10l-2 10h8l-2-10" />
                <path d="M6 20c0 1.1.9 2 2 2h8a2 2 0 002-2" />
                <circle cx="12" cy="10" r="1" fill="#CF202E"/>
                <path d="M10 14h4M9 17h6" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#CF202E]">THE TOP BADMINTON</h1>
          </header>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 space-y-8">
            <form onSubmit={createSession} className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">สร้างวันใหม่</label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  สร้าง
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">ประวัติวันที่ผ่านมา</h2>
              {sessions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-slate-400">ยังไม่มีข้อมูลวันที่บันทึกไว้</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {sessions.map((session) => (
                    <div 
                      key={session.id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setCurrentSessionId(session.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold uppercase leading-none">
                            {new Date(session.date).toLocaleDateString('th-TH', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {new Date(session.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-lg">
                            {new Date(session.date).toLocaleDateString('th-TH', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {session.players.length} ผู้เล่น • {session.matches.length} แมตช์
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedPlayers = [...currentSession.players].sort((a, b) => {
    const aSelected = selectedIds.includes(a.id);
    const bSelected = selectedIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    if (a.playCount !== b.playCount) return a.playCount - b.playCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentSessionId(null)}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-black/5"
              title="กลับไปหน้าเลือกวันที่"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-black/5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#CF202E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M12 2L8 10h8L12 2z" />
                  <path d="M8 10l-2 10h8l-2-10M6 20c0 1.1.9 2 2 2h8a2 2 0 002-2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  {new Date(currentSession.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h1>
                <p className="text-muted-foreground text-sm">THE TOP BADMINTON</p>
              </div>
            </div>
          </div>
          <button 
            onClick={resetCounts}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors self-start"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตข้อมูลวันนี้
          </button>
        </header>

        <AnimatePresence>
          {showResetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">ยืนยันการรีเซ็ต?</h3>
                  <p className="text-slate-500 text-sm">
                    จำนวนครั้งที่เล่นของทุกคนในวันนี้จะถูกตั้งค่าเป็น 0 และประวัติแมตช์จะถูกลบออก
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={confirmReset}
                    className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    ยืนยันรีเซ็ต
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Selection Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Selection Status */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600" />
                  แมตช์ปัจจุบัน
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedIds.length === 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  เลือกแล้ว {selectedIds.length} / 4 คน
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[0, 1, 2, 3].map((index) => {
                  const playerId = selectedIds[index];
                  const player = currentSession.players.find(p => p.id === playerId);
                  return (
                    <div 
                      key={index}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center transition-all ${
                        player 
                          ? 'border-emerald-500 bg-emerald-50 shadow-inner' 
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {player ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-2">
                            {player.name[0].toUpperCase()}
                          </div>
                          <span className="font-semibold truncate w-full">{player.name}</span>
                          <button 
                            onClick={() => togglePlayerSelection(player.id)}
                            className="mt-2 text-[10px] text-emerald-700 hover:underline"
                          >
                            เปลี่ยนออก
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-2">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs">ว่าง</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                disabled={selectedIds.length !== 4}
                onClick={startMatch}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  selectedIds.length === 4
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                เริ่มแมตช์และบันทึกสถิติ
              </button>
            </div>

            {/* Player List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">รายชื่อผู้เล่น</h2>
                <p className="text-xs text-slate-500 italic">* เรียงตามจำนวนครั้งที่เล่น (น้อยไปมาก)</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <AnimatePresence>
                  {sortedPlayers.map((player) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={player.id}
                      onClick={() => togglePlayerSelection(player.id)}
                      className={`relative p-4 rounded-xl border text-left transition-all group cursor-pointer ${
                        selectedIds.includes(player.id)
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-white border-black/5 hover:border-emerald-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg truncate pr-2">{player.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          selectedIds.includes(player.id) ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                        }`}>
                          เล่นไป {player.playCount}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className={`text-[10px] uppercase font-bold tracking-wider ${
                          selectedIds.includes(player.id) ? 'text-white/70' : 'text-slate-400'
                        }`}>
                          {selectedIds.includes(player.id) ? 'เลือกแล้ว' : 'กดเพื่อเลือก'}
                        </div>
                        {!selectedIds.includes(player.id) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlayer(player.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Add Player Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                เพิ่มผู้เล่นใหม่
              </h2>
              <form onSubmit={addPlayer} className="space-y-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="ชื่อผู้เล่น..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มรายชื่อ
                </button>
              </form>
            </div>

            {/* Match History */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                ประวัติแมตช์ล่าสุด
              </h2>
              <div className="space-y-3">
                {currentSession.matches.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 italic">ยังไม่มีประวัติการเล่น</p>
                ) : (
                  currentSession.matches.map((match, index) => (
                    <div key={match.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 group relative">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                          <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded min-w-[20px] text-center">
                            {currentSession.matches.length - index})
                          </span>
                          {new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button 
                          onClick={() => deleteMatch(match.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          title="ลบแมตช์นี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {match.players.map((name, i) => (
                          <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-slate-200">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-emerald-900 text-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4">สรุปภาพรวมวันนี้</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-emerald-300 text-xs uppercase font-bold">ผู้เล่นทั้งหมด</p>
                  <p className="text-2xl font-bold">{currentSession.players.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-emerald-300 text-xs uppercase font-bold">แมตช์ที่เล่นไป</p>
                  <p className="text-2xl font-bold">{currentSession.matches.length}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
