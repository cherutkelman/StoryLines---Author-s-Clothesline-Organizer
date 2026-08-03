import React, { useEffect, useState } from 'react';
import { CopyPlus, X } from 'lucide-react';
import { Book, MindMap, WorldMap } from '../../types';
import { ImportMapCategory } from './mapsDefinitions';

interface MapsImportDialogProps {
  isOpen: boolean;
  category: ImportMapCategory;
  allBooks: Book[];
  activeBookId: string;
  maps: WorldMap[];
  mindMaps: MindMap[];
  onUpdateMaps: (maps: WorldMap[]) => void;
  onUpdateMindMaps: (maps: MindMap[]) => void;
  onClose: () => void;
}

const MapsImportDialog: React.FC<MapsImportDialogProps> = ({
  isOpen,
  category,
  allBooks,
  activeBookId,
  maps,
  mindMaps,
  onUpdateMaps,
  onUpdateMindMaps,
  onClose,
}) => {
  const [importSourceBookId, setImportSourceBookId] = useState('');
  const [importCategory, setImportCategory] = useState<ImportMapCategory>(category);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) setImportCategory(category);
  }, [category, isOpen]);

  const handleImport = () => {
    if (!importSourceBookId) return;
    const sourceBook = allBooks.find(book => book.id === importSourceBookId);
    if (!sourceBook) return;
    const sourceField = importCategory === 'worldMaps' ? 'maps' : 'mindMaps';
    const sourceItems = (sourceBook as any)[sourceField] || [];
    const itemsToImport = selectedImportIds.length === 0 ? sourceItems : sourceItems.filter((item: any) => selectedImportIds.includes(item.id));
    if (itemsToImport.length === 0) return;
    const clonedItems = itemsToImport.map((item: any) => {
      const newId = `${importCategory === 'worldMaps' ? 'map' : 'mind'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (importCategory === 'worldMaps') {
        return { ...item, id: newId, elements: item.elements.map((element: any) => ({ ...element, id: `el-${Date.now()}-${Math.random()}` })) };
      }
      const idMap: Record<string, string> = {};
      const newNodes = item.nodes.map((node: any) => {
        const newNodeId = `node-${Date.now()}-${Math.random()}`;
        idMap[node.id] = newNodeId;
        return { ...node, id: newNodeId };
      });
      const newEdges = item.edges.map((edge: any) => ({
        ...edge,
        id: `edge-${Date.now()}-${Math.random()}`,
        fromId: idMap[edge.fromId] || edge.fromId,
        toId: idMap[edge.toId] || edge.toId,
      }));
      return { ...item, id: newId, nodes: newNodes, edges: newEdges };
    });
    if (importCategory === 'worldMaps') onUpdateMaps([...maps, ...clonedItems]);
    else onUpdateMindMaps([...mindMaps, ...clonedItems]);
    onClose();
    setSelectedImportIds([]);
    alert(`יובאו ${clonedItems.length} מפות בהצלחה`);
  };

  return isOpen ? (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-[var(--theme-card)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)]/50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
      <div className="p-8 border-b border-[var(--theme-border)]/30 flex items-center justify-between bg-[var(--theme-secondary)]/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-2xl shadow-lg">
            <CopyPlus size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[var(--theme-primary)] handwritten text-3xl">ייבוא מפות מספר אחר</h3>
            <p className="text-xs text-[var(--theme-primary)]/40 font-bold uppercase tracking-widest mt-1">בחר את המקור והמפות שברצונך להוסיף</p>
          </div>
        </div>
        <button 
          onClick={() => onClose()}
          className="p-2 hover:bg-[var(--theme-secondary)] rounded-xl transition-colors text-[var(--theme-primary)]/40 hover:text-[var(--theme-primary)]"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-8 overflow-y-auto space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--theme-primary)]/40 uppercase tracking-widest px-1">ספר מקור</label>
            <select 
              value={importSourceBookId}
              onChange={(e) => {
                setImportSourceBookId(e.target.value);
                setSelectedImportIds([]);
              }}
              className="w-full bg-[var(--theme-secondary)]/50 border border-[var(--theme-border)]/50 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-[var(--theme-primary)]/10 outline-none transition-all"
            >
              <option value="">בחר ספר...</option>
              {allBooks.filter(b => b.id !== activeBookId).map(book => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--theme-primary)]/40 uppercase tracking-widest px-1">סוג מפה</label>
            <select 
              value={importCategory}
              onChange={(e) => {
                setImportCategory(e.target.value as any);
                setSelectedImportIds([]);
              }}
              className="w-full bg-[var(--theme-secondary)]/50 border border-[var(--theme-border)]/50 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-[var(--theme-primary)]/10 outline-none transition-all"
            >
              <option value="worldMaps">מפות עולם</option>
              <option value="mindMaps">מפות חשיבה</option>
            </select>
          </div>
        </div>

        {importSourceBookId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-[var(--theme-primary)]/40 uppercase tracking-widest">בחר מפות (השאר ריק לייבוא הכל)</label>
              <button 
                onClick={() => setSelectedImportIds([])}
                className="text-[10px] font-bold text-[var(--theme-accent)] hover:underline"
              >
                נקה בחירה
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-hide">
              {(allBooks.find(b => b.id === importSourceBookId) as any)?.[importCategory === 'worldMaps' ? 'maps' : 'mindMaps']?.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedImportIds(prev => 
                      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                    );
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-right ${selectedImportIds.includes(item.id) ? 'bg-[var(--theme-primary)]/5 border-[var(--theme-primary)] text-[var(--theme-primary)] shadow-sm' : 'bg-[var(--theme-card)] border-[var(--theme-border)]/30 text-[var(--theme-primary)]/60 hover:border-[var(--theme-border)]'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedImportIds.includes(item.id) ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]' : 'border-[var(--theme-border)]'}`}>
                    {selectedImportIds.includes(item.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm font-bold truncate">{item.name || 'ללא שם'}</span>
                </button>
              ))}
              {((allBooks.find(b => b.id === importSourceBookId) as any)?.[importCategory === 'worldMaps' ? 'maps' : 'mindMaps'] || []).length === 0 && (
                <div className="col-span-2 py-8 text-center text-[var(--theme-text)]/30 text-sm font-bold bg-[var(--theme-secondary)]/20 rounded-3xl border-2 border-dashed border-[var(--theme-border)]/30">
                  אין מפות מסוג זה בספר הנבחר
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-[var(--theme-border)]/30 bg-[var(--theme-secondary)]/30 flex gap-4">
        <button 
          onClick={handleImport}
          disabled={!importSourceBookId || ((allBooks.find(b => b.id === importSourceBookId) as any)?.[importCategory === 'worldMaps' ? 'maps' : 'mindMaps'] || []).length === 0}
          className="flex-1 bg-[var(--theme-primary)] text-[var(--theme-card)] py-4 rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CopyPlus size={18} />
          <span>ייבא {selectedImportIds.length > 0 ? `${selectedImportIds.length} מפות` : 'את כל המפות'}</span>
        </button>
        <button 
          onClick={() => onClose()}
          className="px-8 bg-[var(--theme-card)] text-[var(--theme-primary)] border border-[var(--theme-border)]/50 rounded-2xl font-bold text-sm hover:bg-[var(--theme-secondary)] transition-all"
        >
          ביטול
        </button>
      </div>
    </div>
  </div>
  ) : null;
};

export default MapsImportDialog;
