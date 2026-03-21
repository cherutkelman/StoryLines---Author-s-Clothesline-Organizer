import React, { useState, useEffect, useMemo } from 'react';
import { 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, logOut } from './firebase';
import { Segment, DocumentData, EditorMode, SegmentStatus } from './types';
import { 
  Check, 
  X, 
  Plus, 
  Trash2, 
  User as UserIcon, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Edit3,
  Eye,
  MessageSquare,
  Save,
  LogOut,
  LogIn,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_DOC_ID = "main-document";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [mode, setMode] = useState<EditorMode>('suggest');
  const [loading, setLoading] = useState(true);
  const [newAddition, setNewAddition] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'documents', INITIAL_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setDocData({ id: snapshot.id, ...snapshot.data() } as DocumentData);
      } else {
        // Create initial document if it doesn't exist
        const initialDoc: Partial<DocumentData> = {
          title: "מסמך עבודה שיתופי",
          authorId: user.uid,
          segments: [
            {
              id: "initial-1",
              text: "זהו טקסט המקור של המסמך. כאן תוכלו להוסיף הצעות עריכה, למחוק טקסט או לאשר שינויים.",
              status: 'accepted',
              userId: user.uid,
              userName: user.displayName || "מחבר",
              timestamp: new Date()
            }
          ],
          lastUpdated: serverTimestamp()
        };
        setDoc(docRef, initialDoc);
      }
    });

    return unsubscribe;
  }, [user]);

  const handleAccept = async (segmentId: string) => {
    if (!docData) return;
    const segment = docData.segments.find(s => s.id === segmentId);
    if (!segment) return;

    let newSegments: Segment[] = [];
    
    if (segment.status === 'suggested_addition') {
      // Convert to accepted
      newSegments = docData.segments.map(s => 
        s.id === segmentId ? { ...s, status: 'accepted' as SegmentStatus } : s
      );
    } else if (segment.status === 'suggested_deletion') {
      // Remove segment
      newSegments = docData.segments.filter(s => s.id !== segmentId);
    }

    // Merge adjacent accepted segments
    const mergedSegments: Segment[] = [];
    newSegments.forEach(s => {
      const last = mergedSegments[mergedSegments.length - 1];
      if (last && last.status === 'accepted' && s.status === 'accepted') {
        last.text += s.text;
      } else {
        mergedSegments.push(s);
      }
    });

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: mergedSegments,
      lastUpdated: serverTimestamp()
    });
  };

  const handleReject = async (segmentId: string) => {
    if (!docData) return;
    const segment = docData.segments.find(s => s.id === segmentId);
    if (!segment) return;

    let newSegments: Segment[] = [];

    if (segment.status === 'suggested_addition') {
      // Remove addition
      newSegments = docData.segments.filter(s => s.id !== segmentId);
    } else if (segment.status === 'suggested_deletion') {
      // Restore to accepted
      newSegments = docData.segments.map(s => 
        s.id === segmentId ? { ...s, status: 'accepted' as SegmentStatus } : s
      );
    }

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: newSegments,
      lastUpdated: serverTimestamp()
    });
  };

  const handleSuggestDeletion = async (segmentId: string) => {
    if (!docData || mode !== 'suggest') return;
    
    const newSegments = docData.segments.map(s => 
      s.id === segmentId && s.status === 'accepted' 
        ? { ...s, status: 'suggested_deletion' as SegmentStatus, userId: user?.uid || "", userName: user?.displayName || "עורך", timestamp: new Date() } 
        : s
    );

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: newSegments,
      lastUpdated: serverTimestamp()
    });
  };

  const handleAddSuggestion = async (index: number) => {
    if (!docData || !newAddition.trim() || !user) return;

    const newSegment: Segment = {
      id: Math.random().toString(36).substr(2, 9),
      text: newAddition,
      status: 'suggested_addition',
      userId: user.uid,
      userName: user.displayName || "עורך",
      timestamp: new Date()
    };

    const newSegments = [...docData.segments];
    newSegments.splice(index + 1, 0, newSegment);

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: newSegments,
      lastUpdated: serverTimestamp()
    });
    setNewAddition("");
  };

  const handleAcceptAll = async () => {
    if (!docData) return;
    let newSegments = docData.segments.filter(s => s.status !== 'suggested_deletion');
    newSegments = newSegments.map(s => ({ ...s, status: 'accepted' as SegmentStatus }));
    
    // Merge
    const merged: Segment[] = [];
    newSegments.forEach(s => {
      const last = merged[merged.length - 1];
      if (last && last.status === 'accepted' && s.status === 'accepted') {
        last.text += s.text;
      } else {
        merged.push(s);
      }
    });

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: merged,
      lastUpdated: serverTimestamp()
    });
  };

  const handleRejectAll = async () => {
    if (!docData) return;
    let newSegments = docData.segments.filter(s => s.status !== 'suggested_addition');
    newSegments = newSegments.map(s => ({ ...s, status: 'accepted' as SegmentStatus }));
    
    // Merge
    const merged: Segment[] = [];
    newSegments.forEach(s => {
      const last = merged[merged.length - 1];
      if (last && last.status === 'accepted' && s.status === 'accepted') {
        last.text += s.text;
      } else {
        merged.push(s);
      }
    });

    await updateDoc(doc(db, 'documents', INITIAL_DOC_ID), {
      segments: merged,
      lastUpdated: serverTimestamp()
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-stone-200 rounded-full" />
          <div className="h-4 w-32 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 shadow-sm text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-stone-400" />
          <h1 className="text-2xl font-serif italic mb-2">עורך Google Studio</h1>
          <p className="text-stone-500 mb-8">התחבר כדי להתחיל לערוך ולעקוב אחר שינויים</p>
          <button 
            onClick={signIn}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            התחברות עם Google
          </button>
        </div>
      </div>
    );
  }

  const suggestionsCount = docData?.segments.filter(s => s.status !== 'accepted').length || 0;

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-stone-900 font-sans selection:bg-stone-200" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl leading-none">{docData?.title || "טוען..."}</h1>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">מצב עריכה שיתופי</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button 
              onClick={() => setMode('edit')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                mode === 'edit' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <Edit3 className="w-4 h-4" />
              עריכה ישירה
            </button>
            <button 
              onClick={() => setMode('suggest')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                mode === 'suggest' ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <Eye className="w-4 h-4" />
              הצעות עריכה
            </button>
          </div>

          <div className="h-8 w-px bg-stone-200 mx-2" />

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-xs font-semibold">{user.displayName}</p>
              <p className="text-[10px] text-stone-400">{user.email}</p>
            </div>
            <button 
              onClick={logOut}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 p-8">
        {/* Editor Area */}
        <div className="bg-white border border-stone-200 rounded-3xl p-12 shadow-sm min-h-[600px] relative">
          <div className="prose prose-stone max-w-none">
            <div className="text-xl leading-relaxed font-serif text-stone-800 whitespace-pre-wrap">
              {docData?.segments.map((segment, idx) => (
                <span key={segment.id} className="relative group">
                  <motion.span
                    layout
                    onClick={() => {
                      if (mode === 'suggest' && segment.status === 'accepted') {
                        handleSuggestDeletion(segment.id);
                      }
                      setSelectedSegmentId(segment.id);
                    }}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      segment.status === 'suggested_addition' && "text-emerald-600 bg-emerald-50/50 px-0.5 rounded",
                      segment.status === 'suggested_deletion' && "text-rose-600 line-through decoration-rose-400 bg-rose-50/50 px-0.5 rounded",
                      segment.status === 'accepted' && "hover:bg-stone-50",
                      selectedSegmentId === segment.id && "ring-2 ring-stone-900/10 bg-stone-50"
                    )}
                    title={`${segment.userName} | ${new Date(segment.timestamp?.seconds * 1000).toLocaleString()}`}
                  >
                    {segment.text}
                  </motion.span>
                  
                  {/* Metadata Hover (Simplified) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-stone-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                      {segment.userName} • {segment.status === 'accepted' ? 'מקורי' : segment.status === 'suggested_addition' ? 'תוספת' : 'מחיקה'}
                    </div>
                  </div>

                  {/* Insertion Point */}
                  {mode === 'suggest' && (
                    <button
                      onClick={() => {
                        const text = prompt("הכנס הצעה לתוספת טקסט:");
                        if (text) {
                          setNewAddition(text);
                          handleAddSuggestion(idx);
                        }
                      }}
                      className="inline-flex items-center justify-center w-4 h-4 -mx-1 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white rounded-full scale-75 hover:scale-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif italic text-lg">הצעות עריכה</h2>
              <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {suggestionsCount} פעולות
              </span>
            </div>

            {suggestionsCount > 0 ? (
              <>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {docData?.segments.filter(s => s.status !== 'accepted').map(s => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={s.id}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        selectedSegmentId === s.id ? "border-stone-900 bg-stone-50 shadow-sm" : "border-stone-100 bg-white"
                      )}
                      onClick={() => setSelectedSegmentId(s.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold">
                          {s.userName[0]}
                        </div>
                        <span className="text-xs font-semibold">{s.userName}</span>
                        <span className="text-[10px] text-stone-400 mr-auto">
                          {s.timestamp?.seconds ? new Date(s.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'עכשיו'}
                        </span>
                      </div>
                      
                      <p className={cn(
                        "text-sm mb-4 line-clamp-3",
                        s.status === 'suggested_addition' ? "text-emerald-700" : "text-rose-700 line-through"
                      )}>
                        {s.text}
                      </p>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAccept(s.id); }}
                          className="flex-1 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          אישור
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleReject(s.id); }}
                          className="flex-1 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          דחייה
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleAcceptAll}
                    className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    אשר הכל
                  </button>
                  <button 
                    onClick={handleRejectAll}
                    className="py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors"
                  >
                    דחה הכל
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-stone-200" />
                <p className="text-sm text-stone-400">אין הצעות עריכה כרגע</p>
              </div>
            )}
          </div>

          <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              מידע על המסמך
            </h3>
            <div className="space-y-3 mt-4">
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-400">מחבר:</span>
                <span>{docData?.authorId === user.uid ? "אתה" : "משתמש אחר"}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-400">עודכן לאחרונה:</span>
                <span>{docData?.lastUpdated?.seconds ? new Date(docData.lastUpdated.seconds * 1000).toLocaleDateString() : 'עכשיו'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-400">מילים:</span>
                <span>{docData?.segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0)}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Navigation Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-stone-200 rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 z-50">
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="text-xs font-bold tracking-widest uppercase text-stone-500">
          ניווט בין הצעות
        </div>
        <button className="text-stone-400 hover:text-stone-900 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
