import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Scene } from '../../types';
import RelationshipDynamicsTable, { createPlanningCharacter } from './RelationshipDynamicsTable';

interface RelationshipArcEditorProps {
  relationships: any[];
  characters: any[];
  scenes: Scene[];
  onUpdateRelationships: (relationships: any[]) => void;
  onUpdateCharacters: (characters: any[]) => void;
}

const RelationshipArcEditor: React.FC<RelationshipArcEditorProps> = ({
  relationships,
  characters,
  scenes,
  onUpdateRelationships,
  onUpdateCharacters,
}) => (
<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  {/* Explanation Space */}
  <div className="bg-[var(--theme-accent)]/5 p-8 rounded-[2rem] border border-[var(--theme-accent)]/20">
    <div className="flex items-center gap-3 mb-4 text-[var(--theme-accent)]">
      <Users size={20} />
      <h3 className="text-xl font-bold handwritten text-3xl">מערכות יחסים ודינמיקה</h3>
    </div>
    <div className="text-[var(--theme-primary)]/70 leading-relaxed italic">
      כשנרצה לבנות מערכת יחסים, 
      נצטרך לזכור שכל אחד מהצדדים מתנהל באופן יומיומי מלא. 
      <br />
      כל צד במערכת היחסים עסוק בחיים שלו, עד שהם משתלבים בחייו של הצד השני.
      <br />
      גם אחרי השילוב, יש זמנים נפרדים וזמנים משותפים. פה נוכל לכתוב את השלבים האלו.
      <br />
      בנוסף, נוכל לתאר את ההתפתחות הרגשית בקשר. 
      <br />
      אם צד אחד מרגיש נלהב וסקרן, והצד השני, אדיש ומרוחק, זה המקום לכתוב, ולוודא שהתפתחות מערכת היחסים מתנהלת באופן אמין, ודו צדדי.
      <br />
      גם אם הספר שלנו כתוב רק על צד אחד, נוכל להשלים את הצד השני כדי לוודא שהכל מתנהל בצורה הגיונית.
    </div>
  </div>

  <div className="flex justify-center">
    <button
      onClick={() => {
        const newRel = {
          id: `rel-${Date.now()}`,
          char1Id: '',
          char2Id: '',
          steps: [{ id: `step-${Date.now()}`, track1Text: 'התחלה', track2Text: 'התחלה', isMerged: false }],
          questionnaire: {
            sharedAnswers: {},
            personalAnswers: {},
            participantGenders: {}
          }
        };
        onUpdateRelationships([newRel, ...relationships]);
      }}
      className="flex items-center gap-2 px-8 py-4 bg-[var(--theme-accent)] text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all"
    >
      <Plus size={20} />
      הוספת מערכת יחסים חדשה
    </button>
  </div>

  <div className="space-y-12">
    {(relationships || []).map((rel, relIndex) => (
      <div key={rel.id} className="bg-[var(--theme-card)] rounded-[2rem] p-8 border border-[var(--theme-border)]/50 shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--theme-border)]/30 pb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col gap-1 w-[200px]">
              <input 
                value={characters.find(c => c.id === rel.char1Id)?.name || ''} 
                onChange={(e) => {
                  const newName = e.target.value;
                  if (!rel.char1Id) {
                      const newCharId = `char-${Date.now()}-1`;
                      const newChar = createPlanningCharacter(newCharId, newName);
                      onUpdateCharacters([...characters, newChar]);
                      const newRels = [...relationships];
                      newRels[relIndex].char1Id = newCharId;
                      onUpdateRelationships(newRels);
                  } else {
                      const newChars = characters.map(c => c.id === rel.char1Id ? { ...c, name: newName } : c);
                      onUpdateCharacters(newChars);
                  }
                }}
                placeholder="שם דמות 1..."
                className="bg-[var(--theme-secondary)]/20 border-b-2 border-transparent focus:border-[var(--theme-accent)] focus:ring-0 text-[var(--theme-primary)] font-bold text-lg px-2 py-1 rounded-t-lg transition-all"
              />
              <select
                value={rel.char1Id}
                onChange={(e) => {
                  const newRels = [...relationships];
                  newRels[relIndex].char1Id = e.target.value;
                  onUpdateRelationships(newRels);
                }}
                className="bg-[var(--theme-secondary)]/30 border-none rounded-lg px-2 py-1 text-[10px] focus:ring-1 focus:ring-[var(--theme-accent)]"
              >
                <option value="">החלפת דמות...</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="text-[var(--theme-accent)]">
              <Users size={20} />
            </div>

            <div className="flex flex-col gap-1 w-[200px]">
              <input 
                value={characters.find(c => c.id === rel.char2Id)?.name || ''} 
                onChange={(e) => {
                  const newName = e.target.value;
                  if (!rel.char2Id) {
                      const newCharId = `char-${Date.now()}-2`;
                      const newChar = createPlanningCharacter(newCharId, newName);
                      onUpdateCharacters([...characters, newChar]);
                      const newRels = [...relationships];
                      newRels[relIndex].char2Id = newCharId;
                      onUpdateRelationships(newRels);
                  } else {
                      const newChars = characters.map(c => c.id === rel.char2Id ? { ...c, name: newName } : c);
                      onUpdateCharacters(newChars);
                  }
                }}
                placeholder="שם דמות 2..."
                className="bg-[var(--theme-secondary)]/20 border-b-2 border-transparent focus:border-[var(--theme-accent)] focus:ring-0 text-[var(--theme-primary)] font-bold text-lg px-2 py-1 rounded-t-lg transition-all"
              />
              <select
                value={rel.char2Id}
                onChange={(e) => {
                  const newRels = [...relationships];
                  newRels[relIndex].char2Id = e.target.value;
                  onUpdateRelationships(newRels);
                }}
                className="bg-[var(--theme-secondary)]/30 border-none rounded-lg px-2 py-1 text-[10px] focus:ring-1 focus:ring-[var(--theme-accent)]"
              >
                <option value="">החלפת דמות...</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newRels = relationships.filter(r => r.id !== rel.id);
                onUpdateRelationships(newRels);
              }}
              className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="handwritten text-3xl font-bold text-[var(--theme-primary)]">
            דינמיקת מערכת היחסים לאורך העלילה
          </h4>
          <RelationshipDynamicsTable 
            rel={rel} 
            relIndex={relIndex} 
            relationships={relationships} 
            onUpdateRelationships={onUpdateRelationships} 
            characters={characters}
            onUpdateCharacters={onUpdateCharacters}
            scenes={scenes}
          />
        </div>
      </div>
    ))}

    {relationships.length === 0 && (
      <div className="text-center py-20 opacity-40">
        <p className="handwritten text-3xl">עדיין לא נוספו מערכות יחסים</p>
      </div>
    )}
  </div>
</div>
);

export default RelationshipArcEditor;

