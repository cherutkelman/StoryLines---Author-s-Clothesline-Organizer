
import React, { useState } from 'react';
import { QuestionnaireEntry } from '../types';
import { 
  Plus, Trash2, User, MapPin, Clock, Wand2, Sparkles, Loader2, 
  Save, X, ChevronLeft, UserRound, UserRoundSearch, FileText, 
  Download, LayoutList, Globe, Home, Eye, PencilLine, ClipboardList,
  Search,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface QuestionnairesProps {
  characters: QuestionnaireEntry[];
  places: QuestionnaireEntry[];
  periods: QuestionnaireEntry[];
  twists: QuestionnaireEntry[];
  fantasyWorlds: QuestionnaireEntry[];
  onUpdateCharacters: (entries: QuestionnaireEntry[]) => void;
  onUpdatePlaces: (entries: QuestionnaireEntry[]) => void;
  onUpdatePeriods: (entries: QuestionnaireEntry[]) => void;
  onUpdateTwists: (entries: QuestionnaireEntry[]) => void;
  onUpdateFantasyWorlds: (entries: QuestionnaireEntry[]) => void;
}

const FEMALE_QUESTIONS_CONFIG = [
  { id: "name", category: "זהות בסיסית", question: "שם הדמות", type: "text" },
  { id: "age", category: "זהות בסיסית", question: "גיל", type: "text" },
  { id: "residence", category: "זהות בסיסית", question: "מקום מגורים", type: "text" },
  { id: "daily_life", category: "שגרה", question: "מה היא עושה ביום יום", type: "textarea" },
  { id: "goal", category: "מטרות וקונפליקט", question: "מה היא רוצה להשיג", type: "textarea" },
  { id: "obstacles", category: "מטרות וקונפליקט", question: "מה מפריע לה להשיג את זה", type: "textarea" },
  { id: "abilities", category: "יכולות", question: "אילו יכולות יש לה", type: "textarea" },
  { id: "special_powers", category: "יכולות", question: "כוחות מיוחדים (פנטזיה)", type: "textarea" },
  { id: "avoidance", category: "גבולות פנימיים", question: "מה היא לא רוצה לעשות", type: "textarea" },
  { id: "difficulties", category: "קשיים", question: "מה הקשיים שלה", type: "textarea" },
  { id: "values", category: "עולם ערכים", question: "ערכים שמובילים אותה", type: "textarea" },
  { id: "hobbies", category: "העדפות", question: "מה היא אוהבת לעשות", type: "textarea" },
  { id: "favorite_place", category: "העדפות", question: "איפה היא אוהבת להיות", type: "text" },
  { id: "sweet_memories", category: "זיכרונות", question: "מה הזכרונות המתוקים ביותר שלה", type: "textarea" },
  { id: "fear_memories", category: "זיכרונות", question: "מה הזכרונות המפחידים ביותר שלה", type: "textarea" },
  { id: "strengths", category: "חוזקות", question: "איזה חוזקות יש לה", type: "textarea" },
  { id: "traumas", category: "עבר רגשי", question: "איזה טראומות קרו לה", type: "textarea" },
  { id: "favorite_food", category: "העדפות", question: "מאכלים אהובים", type: "text" },
  { id: "favorite_color", category: "העדפות", question: "צבע אהוב", type: "text" },
  { id: "gestures", category: "מאפיינים חיצוניים", question: "תנועות שהיא רגילה לעשות", type: "textarea" },
  { id: "life_motto", category: "זהות פנימית", question: "מוטו לחיים", type: "text" },
  { id: "common_phrases", category: "דיבור", question: "ביטויים שגורים", type: "textarea" },
  { id: "social_connections", category: "מערכות יחסים", question: "קשרים חברתיים שיש לה", type: "textarea" },
  { id: "family_connections", category: "מערכות יחסים", question: "קשרים משפחתיים שיש לה", type: "textarea" },
  { id: "initial_state", category: "קשת התפתחותית", question: "מצב התחלתי", type: "textarea" },
  { id: "final_state", category: "קשת התפתחותית", question: "מצב סופי", type: "textarea" },
  { id: "dev_stages", category: "קשת התפתחותית", question: "שלבים בהתפתחות", type: "textarea" },
  { id: "influences", category: "קשת התפתחותית", question: "מה משפיע על ההתפתחות", type: "textarea" },
  { id: "choices_affecting_dev", category: "קשת התפתחותית", question: "אילו בחירות מבצעת הדמות המשפיעות על ההתפתחות שלה", type: "textarea" },
  { id: "choices_post_dev", category: "קשת התפתחותית", question: "אילו בחירות היא מבצעת בעקבות ההתפתחות שלה", type: "textarea" },
  { id: "twists_impact", category: "קשת התפתחותית", question: "איך משפיעים הטוויסטים בסיפור על חייה, רגשותיה, ובחירותיה", type: "textarea" }
];

const MALE_QUESTIONS_CONFIG = [
  { id: "name", category: "זהות בסיסית", question: "שם הדמות", type: "text" },
  { id: "age", category: "זהות בסיסית", question: "גיל", type: "text" },
  { id: "residence", category: "זהות בסיסית", question: "מקום מגורים", type: "text" },
  { id: "daily_life", category: "שגרה", question: "מה הוא עושה ביום יום", type: "textarea" },
  { id: "goal", category: "מטרות וקונפליקט", question: "מה הוא רוצה להשיג", type: "textarea" },
  { id: "obstacles", category: "מטרות וקונפליקט", question: "מה מפריע לו להשיג את זה", type: "textarea" },
  { id: "abilities", category: "יכולות", question: "אילו יכולות יש לו", type: "textarea" },
  { id: "special_powers", category: "יכולות", question: "כוחות מיוחדים (פנטזיה)", type: "textarea" },
  { id: "avoidance", category: "גבולות פנימיים", question: "מה הוא לא רוצה לעשות", type: "textarea" },
  { id: "difficulties", category: "קשיים", question: "מה הקשיים שלו", type: "textarea" },
  { id: "values", category: "עולם ערכים", question: "ערכים שמובילים אותו", type: "textarea" },
  { id: "hobbies", category: "העדפות", question: "מה הוא אוהבת לעשות", type: "textarea" },
  { id: "favorite_place", category: "העדפות", question: "איפה הוא אוהב להיות", type: "text" },
  { id: "sweet_memories", category: "זיכרונות", question: "מה הזכרונות המתוקים ביותר שלו", type: "textarea" },
  { id: "fear_memories", category: "זיכרונות", question: "מה הזכרונות המפחידים ביותר שלו", type: "textarea" },
  { id: "strengths", category: "חוזקות", question: "איזה חוזקות יש לו", type: "textarea" },
  { id: "traumas", category: "עבר רגשי", question: "איזה טראומות קרו לו", type: "textarea" },
  { id: "favorite_food", category: "העדפות", question: "מאכלים אהובים", type: "text" },
  { id: "favorite_color", category: "העדפות", question: "צבע אהוב", type: "text" },
  { id: "gestures", category: "מאפיינים חיצוניים", question: "תנועות שהוא רגיל לעשות", type: "textarea" },
  { id: "life_motto", category: "זהות פנימית", question: "מוטו לחיים", type: "text" },
  { id: "common_phrases", category: "דיבור", question: "ביטויים שגורים", type: "textarea" },
  { id: "social_connections", category: "מערכות יחסים", question: "קשרים חברתיים שיש לו", type: "textarea" },
  { id: "family_connections", category: "מערכות יחסים", question: "קשרים משפחתיים שיש לו", type: "textarea" },
  { id: "initial_state", category: "קשת התפתחותית", question: "מצב התחלתי", type: "textarea" },
  { id: "final_state", category: "קשת התפתחותית", question: "מצב סופי", type: "textarea" },
  { id: "dev_stages", category: "קשת התפתחותית", question: "שלבים בהתפתחות", type: "textarea" },
  { id: "influences", category: "קשת התפתחותית", question: "מה משפיע על ההתפתחות", type: "textarea" },
  { id: "choices_affecting_dev", category: "קשת התפתחותית", question: "אילו בחירות מבצעת הדמות המשפיעות על ההתפתחות שלה", type: "textarea" },
  { id: "choices_post_dev", category: "קשת התפתחותית", question: "אילו בחירות היא מבצעת בעקבות ההתפתחות שלה", type: "textarea" },
  { id: "twists_impact", category: "קשת התפתחותית", question: "איך משפיעים הטוויסטים בסיפור על חייה, רגשותיה, ובחירותיה", type: "textarea" }
];

const MACRO_PLACE_QUESTIONS = [
  { id: "street", category: "פרטי מיקום", question: "רחוב", type: "text" },
  { id: "neighborhood", category: "פרטי מיקום", question: "שכונה", type: "text" },
  { id: "city_or_village", category: "פרטי מיקום", question: "שם עיר / כפר", type: "text" },
  { id: "country", category: "פרטי מיקום", question: "ארץ", type: "text" },
  { id: "continent", category: "פרטי מיקום", question: "יבשת", type: "text" },
  { id: "planet", category: "פרטי מיקום", question: "פלנטה", type: "text" },
  { id: "other_location_definition", category: "פרטי מיקום", question: "הגדרה אחרת למיקום", type: "textarea" },
  { id: "common_landscape", category: "מאפייני סביבה", question: "נוף מצוי", type: "textarea" },
  { id: "access_routes", category: "מאפייני סביבה", question: "דרכי הגעה", type: "textarea" },
  { id: "local_population", category: "חברה ותרבות", question: "אוכלוסיה מקומית", type: "textarea" },
  { id: "who_rules", category: "חברה ותרבות", question: "מי שולט בשטח?", type: "textarea" },
  { id: "common_foods", category: "חברה ותרבות", question: "מאכלים נפוצים", type: "textarea" },
  { id: "plants", category: "טבע", question: "צמחים", type: "textarea" },
  { id: "animals", category: "טבע", question: "אילו חיות נפוצות באזור?", type: "textarea" },
  { id: "more_details", category: "כללי", question: "פרטים נוספים", type: "textarea" }
];

const MICRO_PLACE_QUESTIONS = [
  { id: "building_type", category: "זהות המקום", question: "סוג המבנה", type: "text" },
  { id: "room", category: "זהות המקום", question: "חדר", type: "text" },
  { id: "place_role", category: "זהות המקום", question: "תפקיד של המקום", type: "textarea" },
  { id: "description", category: "תיאור", question: "תיאור", type: "textarea" },
  { id: "living_conditions", category: "תנאים", question: "תנאי מחיה", type: "textarea" },
  { id: "more_details", category: "כללי", question: "פרטים נוספים", type: "textarea" }
];

const PERIOD_QUESTIONS = [
  { id: "period_name", category: "הגדרה בסיסית", question: "תקופה", type: "text" },
  { id: "history_or_present", category: "הגדרה בסיסית", question: "היסטוריה או הווה?", type: "text" },
  { id: "our_world_or_other", category: "הגדרה בסיסית", question: "העולם שלנו או עולם אחר?", type: "text" },
  { id: "technology_capabilities", category: "טכנולוגיה ויכולת", question: "אילו יכולות טכנולוגיות יש בתקופה?", type: "textarea" },
  { id: "human_capabilities", category: "טכנולוגיה ויכולת", question: "אילו יכולות אנושיות יש בתקופה?", type: "textarea" },
  { id: "clothing_style", category: "חיי יום-יום", question: "מה סגנון הלבוש בתקופה?", type: "textarea" },
  { id: "food_preparation", category: "חיי יום-יום", question: "איך מכינים אוכל?", type: "textarea" },
  { id: "building_and_furniture", category: "חיי יום-יום", question: "איך בונים רהיטים ובתים?", type: "textarea" },
  { id: "transportation", category: "חיי יום-יום", question: "איך נעים ממקום למקום?", type: "textarea" },
  { id: "communication", category: "חיי יום-יום", question: "איך מתקשרים עם אחרים?", type: "textarea" }
];

const TWIST_QUESTIONS = [
  { id: "pre_state", category: "לפני השינוי", question: "מה היה המצב לפני:", type: "textarea" },
  { id: "expectations", category: "לפני השינוי", question: "מה חשבו וקיוו הדמויות שיקרה:", type: "textarea" },
  { id: "ideal_path", category: "המסלול הרצוי", question: "מה היה קורה אילו המצב היה ממשיך כפי הרצוי:", type: "textarea" },
  { id: "truth_moment", category: "הטוויסט", question: "מה קורה ברגע האמת:", type: "textarea" },
  { id: "immediate_impact", category: "השלכות", question: "איך זה משפיע באופן מיידי:", type: "textarea" },
  { id: "long_term_impact", category: "השלכות", question: "איך זה משפיע לטווח הארוך:", type: "textarea" }
];

const FANTASY_WORLD_QUESTIONS = [
  { id: "ruling_powers", category: "ניהול העולם", question: "אילו כוחות מנהלים את העולם:", type: "textarea" },
  { id: "daily_life_simple", category: "חברה וחיי יום-יום", question: "איך מתנהלים חיי היום יום של האדם הפשוט:", type: "textarea" },
  { id: "character_powers", category: "דמויות וכוחות", question: "אילו כוחות יש לדמויות בספר:", type: "textarea" },
  { id: "magic_source", category: "קסם ואנרגיה", question: "מאיפה נובעת אנרגיית הקסם:", type: "textarea" },
  { id: "magic_limits", category: "קסם ואנרגיה", question: "מה מגביל את כוח הקסם:", type: "textarea" },
  { id: "world_laws", category: "ניהול העולם", question: "אילו חוקים יש בעולם הזה:", type: "textarea" },
  { id: "magic_nature", category: "קסם ואנרגיה", question: "טבע ייחודי הנובע מהקסם:", type: "textarea" },
  { id: "good_guys", category: "קונפליקט", question: "מי הטובים:", type: "textarea" },
  { id: "bad_guys", category: "קונפליקט", question: "מי הרעים:", type: "textarea" },
  { id: "conflict_expression", category: "קונפליקט", question: "איך מתבטאת הלחימה ביניהם:", type: "textarea" },
  { id: "hero_journey", category: "מסע וסוף", question: "איזה מסע עוברים הגיבורים. פיזי, נפשי, התפתחותי:", type: "textarea" },
  { id: "good_ending", category: "מסע וסוף", question: "מהו הסוף הטוב:", type: "textarea" },
  { id: "bad_ending", category: "מסע וסוף", question: "מהו הסוף הרע:", type: "textarea" },
  { id: "other_creatures", category: "חברה וחיי יום-יום", question: "אילו יצורים נוספים קיימים בעולם:", type: "textarea" }
];

const Questionnaires: React.FC<QuestionnairesProps> = ({ 
  characters, places, periods, twists, fantasyWorlds,
  onUpdateCharacters, onUpdatePlaces, onUpdatePeriods, onUpdateTwists, onUpdateFantasyWorlds
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds'>('characters');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const [mode, setMode] = useState<'edit' | 'view'>('view');
  
  const [newQuestionLabel, setNewQuestionLabel] = useState('');

  const entries = activeTab === 'characters' ? characters : activeTab === 'places' ? places : activeTab === 'periods' ? periods : activeTab === 'twists' ? twists : fantasyWorlds;
  const updateFn = activeTab === 'characters' ? onUpdateCharacters : activeTab === 'places' ? onUpdatePlaces : activeTab === 'periods' ? onUpdatePeriods : activeTab === 'twists' ? onUpdateTwists : onUpdateFantasyWorlds;
  const selectedEntry = entries.find(e => e.id === selectedEntryId);
  
  const currentGender = selectedEntry?.data.gender || 'female';
  const currentPlaceType = selectedEntry?.data.placeType || 'macro';

  const questionsConfig = activeTab === 'characters' 
    ? (currentGender === 'male' ? MALE_QUESTIONS_CONFIG : FEMALE_QUESTIONS_CONFIG)
    : activeTab === 'places' 
      ? (currentPlaceType === 'macro' ? MACRO_PLACE_QUESTIONS : MICRO_PLACE_QUESTIONS)
      : activeTab === 'periods' ? PERIOD_QUESTIONS : activeTab === 'twists' ? TWIST_QUESTIONS : FANTASY_WORLD_QUESTIONS;

  const categories = Array.from(new Set(questionsConfig.map(q => q.category)));
  if (selectedEntry?.customFields && selectedEntry.customFields.length > 0) {
    categories.push("שאלות נוספות");
  }

  const Icon = activeTab === 'characters' ? User : activeTab === 'places' ? MapPin : activeTab === 'periods' ? Clock : activeTab === 'twists' ? Zap : Wand2;

  const filteredQuestions = questionsConfig.filter(q => {
    const matchesCategory = activeCategory ? q.category === activeCategory : true;
    const matchesSearch = q.question.toLowerCase().includes(questionSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const customQuestions = (selectedEntry?.customFields || []).filter(cf => {
    const matchesCategory = activeCategory ? activeCategory === "שאלות נוספות" : true;
    const matchesSearch = cf.label.toLowerCase().includes(questionSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addEntry = () => {
    const newEntry: QuestionnaireEntry = {
      id: `q-${Date.now()}`,
      name: activeTab === 'characters' ? 'דמות חדשה' : activeTab === 'places' ? 'מקום חדש' : activeTab === 'periods' ? 'תקופה חדשה' : activeTab === 'twists' ? 'טוויסט חדש' : 'עולם פנטזיה חדש',
      data: activeTab === 'characters' 
        ? { gender: 'female' } 
        : activeTab === 'places' 
          ? { placeType: 'macro' } 
          : {},
      customFields: []
    };
    updateFn([...entries, newEntry]);
    setSelectedEntryId(newEntry.id);
    setActiveCategory(null);
    setQuestionSearchQuery('');
    setMode('edit');
  };

  const updateEntry = (updates: Partial<QuestionnaireEntry>) => {
    if (!selectedEntryId) return;
    updateFn(entries.map(e => e.id === selectedEntryId ? { ...e, ...updates } : e));
  };

  const addCustomQuestion = () => {
    if (!newQuestionLabel.trim() || !selectedEntry) return;
    const newFieldId = `custom-${Date.now()}`;
    const updatedCustomFields = [...(selectedEntry.customFields || []), { id: newFieldId, label: newQuestionLabel.trim() }];
    updateEntry({ customFields: updatedCustomFields });
    setNewQuestionLabel('');
  };

  const removeCustomQuestion = (fieldId: string) => {
    if (!selectedEntry) return;
    const updatedCustomFields = (selectedEntry.customFields || []).filter(cf => cf.id !== fieldId);
    const updatedData = { ...selectedEntry.data };
    delete updatedData[fieldId];
    updateEntry({ customFields: updatedCustomFields, data: updatedData });
  };

  const exportCurrentEntry = () => {
    if (!selectedEntry) return;
    let text = `שאלון: ${selectedEntry.name}\n`;
    text += `סוג: ${activeTab === 'characters' ? (currentGender === 'male' ? 'זכר' : 'נקבה') : activeTab === 'places' ? (currentPlaceType === 'macro' ? 'מיקום גאוגרפי' : 'מקום ספציפי') : activeTab === 'periods' ? 'תקופה' : activeTab === 'twists' ? 'טוויסט' : 'עולם פנטזיה'}\n`;
    text += `-----------------------------------\n\n`;
    
    questionsConfig.forEach(q => {
      text += `[${q.category}] ${q.question}\n`;
      text += `${selectedEntry.data[q.id] || '---'}\n\n`;
    });

    if (selectedEntry.customFields && selectedEntry.customFields.length > 0) {
        text += `\nשאלות נוספות:\n-----------------------------------\n`;
        selectedEntry.customFields.forEach(cf => {
            text += `${cf.label}\n`;
            text += `${selectedEntry.data[cf.id] || '---'}\n\n`;
        });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntry.name}-${activeTab}-export.txt`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex justify-center flex-shrink-0">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg flex gap-1 border border-amber-100 overflow-x-auto max-w-full">
          {[
            { id: 'characters', label: 'דמויות', icon: User },
            { id: 'places', label: 'מקומות', icon: MapPin },
            { id: 'periods', label: 'תקופות', icon: Clock },
            { id: 'twists', label: 'טוויסטים', icon: Zap },
            { id: 'fantasyWorlds', label: 'עולם פנטזיה', icon: Wand2 },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSelectedEntryId(null); setActiveCategory(null); setQuestionSearchQuery(''); setMode('view'); }}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-amber-800 text-white shadow-md' : 'text-amber-800/60 hover:bg-amber-50'}`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-64 flex flex-col gap-4 flex-shrink-0">
          <button 
            onClick={addEntry}
            className="flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-amber-200 rounded-2xl text-amber-600 font-bold hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>הוסף {activeTab === 'characters' ? 'דמות' : activeTab === 'places' ? 'מקום' : activeTab === 'periods' ? 'תקופה' : activeTab === 'twists' ? 'טוויסט' : 'עולם'}</span>
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {entries.map(entry => (
              <div 
                key={entry.id}
                onClick={() => { setSelectedEntryId(entry.id); setActiveCategory(null); setQuestionSearchQuery(''); }}
                className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:border-amber-100'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {activeTab === 'places' ? (
                    entry.data.placeType === 'macro' ? <Globe size={16} className="text-blue-400" /> : <Home size={16} className="text-amber-400" />
                  ) : (
                    <Icon size={16} className={selectedEntryId === entry.id ? 'text-amber-800' : 'text-amber-300'} />
                  )}
                  <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-amber-900' : 'text-amber-700'}`}>{entry.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('למחוק?')) updateFn(entries.filter(ent => ent.id !== entry.id)); if(selectedEntryId === entry.id) setSelectedEntryId(null); }}
                  className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedEntry && mode === 'edit' && isCategoriesVisible && (
          <div className="w-56 flex flex-col gap-2 flex-shrink-0 animate-in slide-in-from-right-4 duration-300">
             <div className="p-2 text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-2 px-4 flex items-center justify-between">
                <span>קטגוריות שאלון</span>
                <button onClick={() => setIsCategoriesVisible(false)} className="text-amber-800/40 hover:text-amber-800"><X size={14} /></button>
             </div>
             <button 
                onClick={() => setActiveCategory(null)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all ${activeCategory === null ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-amber-800/60 hover:bg-amber-50'}`}
             >
                <LayoutList size={14} />
                <span>הכל</span>
             </button>
             {categories.map(cat => (
               <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-right transition-all ${activeCategory === cat ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-amber-800/60 hover:bg-amber-50'}`}
               >
                  <span>{cat}</span>
               </button>
             ))}
          </div>
        )}

        <div className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border border-amber-100 overflow-hidden flex flex-col min-w-0 transition-all duration-300">
          {selectedEntry ? (
            <>
              <div className="p-8 border-b border-amber-50 bg-amber-50/20 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                     {!isCategoriesVisible && mode === 'edit' && (
                       <button 
                        onClick={() => setIsCategoriesVisible(true)}
                        className="p-2 text-amber-800 hover:bg-white rounded-xl transition-all shadow-sm border border-amber-100"
                        title="הצג קטגוריות"
                       >
                         <LayoutList size={20} />
                       </button>
                     )}
                     <div className="bg-white p-3 rounded-2xl shadow-sm border border-amber-100">
                        <Icon size={24} className="text-amber-800" />
                     </div>
                     <div className="flex-1">
                        {mode === 'edit' ? (
                          <input 
                            value={selectedEntry.name}
                            onChange={(e) => updateEntry({ name: e.target.value })}
                            className="text-2xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-4xl w-full"
                            placeholder="שם..."
                          />
                        ) : (
                          <h2 className="text-3xl font-bold text-amber-900 handwritten text-5xl">{selectedEntry.name}</h2>
                        )}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${mode === 'view' ? 'bg-amber-800 text-white border-amber-900 hover:bg-amber-900' : 'bg-white text-amber-800 border-amber-100 hover:bg-amber-50'}`}
                    >
                      {mode === 'edit' ? <Eye size={18} /> : <PencilLine size={18} />}
                      <span>{mode === 'edit' ? 'תצוגת תעודת זהות' : 'עריכת פרטים'}</span>
                    </button>
                    
                    <button 
                      onClick={exportCurrentEntry}
                      className="p-2.5 bg-white border border-amber-100 text-amber-800 rounded-xl hover:bg-amber-50 transition-all shadow-sm"
                      title="ייצוא נתונים"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                {mode === 'edit' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {activeTab === 'characters' && (
                          <div className="flex bg-white/80 p-1 rounded-xl border border-amber-100 shadow-sm">
                            <button 
                              onClick={() => updateEntry({ data: { ...selectedEntry.data, gender: 'male' } })}
                              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${currentGender === 'male' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-900/40 hover:text-amber-900'}`}
                            >
                              <UserRound size={14} />
                              <span>זכר</span>
                            </button>
                            <button 
                              onClick={() => updateEntry({ data: { ...selectedEntry.data, gender: 'female' } })}
                              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${currentGender === 'female' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-900/40 hover:text-amber-900'}`}
                            >
                              <UserRoundSearch size={14} />
                              <span>נקבה</span>
                            </button>
                          </div>
                        )}

                        {activeTab === 'places' && (
                          <div className="flex bg-white/80 p-1 rounded-xl border border-amber-100 shadow-sm">
                            <button 
                              onClick={() => updateEntry({ data: { ...selectedEntry.data, placeType: 'macro' } })}
                              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${currentPlaceType === 'macro' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-900/40 hover:text-amber-900'}`}
                            >
                              <Globe size={14} />
                              <span>מיקום גאוגרפי</span>
                            </button>
                            <button 
                              onClick={() => updateEntry({ data: { ...selectedEntry.data, placeType: 'micro' } })}
                              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${currentPlaceType === 'micro' ? 'bg-amber-800 text-white shadow-md' : 'text-amber-900/40 hover:text-amber-900'}`}
                            >
                              <Home size={14} />
                              <span>מקום ספציפי</span>
                            </button>
                          </div>
                        )}
                    </div>
                    
                    <div className="relative group">
                      <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-amber-700 transition-colors" />
                      <input 
                        type="text"
                        placeholder="חפש שאלה בשאלון..."
                        value={questionSearchQuery}
                        onChange={(e) => setQuestionSearchQuery(e.target.value)}
                        className="w-full bg-white border border-amber-100 rounded-2xl pr-12 pl-6 py-3 text-sm focus:ring-4 focus:ring-amber-200/20 focus:border-amber-300 transition-all outline-none shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth">
                {mode === 'edit' ? (
                  <>
                    {filteredQuestions.length > 0 ? (
                      filteredQuestions.map(q => (
                        <div key={q.id} className="group space-y-3 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-amber-900/30 uppercase tracking-[0.2em]">{q.category}</span>
                              <div className="h-px w-8 bg-amber-100" />
                              <label className="text-sm font-bold text-amber-900">{q.question}</label>
                            </div>
                          </div>
                          {q.type === 'textarea' ? (
                            <textarea 
                              value={selectedEntry.data[q.id] || ''}
                              onChange={(e) => updateEntry({ data: { ...selectedEntry.data, [q.id]: e.target.value } })}
                              className="w-full bg-amber-50/20 border-2 border-amber-100 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-amber-200/20 focus:border-amber-300 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner"
                              placeholder="כתוב כאן..."
                            />
                          ) : (
                            <input 
                              type="text"
                              value={selectedEntry.data[q.id] || ''}
                              onChange={(e) => updateEntry({ data: { ...selectedEntry.data, [q.id]: e.target.value } })}
                              className="w-full bg-amber-50/20 border-2 border-amber-100 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-amber-200/20 focus:border-amber-300 transition-all outline-none shadow-inner"
                              placeholder="כתוב כאן..."
                            />
                          )}
                        </div>
                      ))
                    ) : null}

                    {customQuestions.length > 0 ? (
                      customQuestions.map(cf => (
                        <div key={cf.id} className="group space-y-3 animate-in fade-in duration-500 relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-amber-900/30 uppercase tracking-[0.2em]">שאלות נוספות</span>
                              <div className="h-px w-8 bg-amber-100" />
                              <label className="text-sm font-bold text-amber-900">{cf.label}</label>
                            </div>
                            <button onClick={() => removeCustomQuestion(cf.id)} className="text-red-200 hover:text-red-500 transition-colors p-1" title="הסר שאלה"><X size={14}/></button>
                          </div>
                          <textarea 
                            value={selectedEntry.data[cf.id] || ''}
                            onChange={(e) => updateEntry({ data: { ...selectedEntry.data, [cf.id]: e.target.value } })}
                            className="w-full bg-amber-50/20 border-2 border-amber-100 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-amber-200/20 focus:border-amber-300 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner"
                            placeholder="תשובה לשאלה המותאמת..."
                          />
                        </div>
                      ))
                    ) : null}

                    {/* Add Custom Question Form */}
                    <div className="pt-10 border-t border-amber-50 mt-10">
                      <div className="text-xs font-black text-amber-900/40 uppercase tracking-widest mb-4">הוספת שאלה מותאמת אישית</div>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={newQuestionLabel}
                          onChange={(e) => setNewQuestionLabel(e.target.value)}
                          placeholder="מה ברצונך לשאול?"
                          className="flex-1 bg-white border-2 border-amber-100 rounded-2xl px-5 py-3 text-sm focus:border-amber-300 outline-none"
                        />
                        <button 
                          onClick={addCustomQuestion}
                          className="bg-amber-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-900 transition-all shadow-md"
                        >
                          <MessageSquarePlus size={18} />
                          <span>הוסף</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-12 py-8">
                     {categories.map(cat => {
                        let contentToRender: any[] = [];

                        if (cat === "שאלות נוספות") {
                            contentToRender = (selectedEntry.customFields || []).filter(cf => selectedEntry.data[cf.id]);
                        } else {
                            const catQuestions = questionsConfig.filter(q => q.category === cat);
                            contentToRender = catQuestions.filter(q => selectedEntry.data[q.id]);
                        }
                        
                        if (contentToRender.length === 0) return null;

                        return (
                          <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                             <div className="flex items-center gap-4">
                                <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-lg">{cat}</h3>
                                <div className="flex-1 h-px bg-amber-100" />
                             </div>
                             <div className="grid gap-6">
                                {contentToRender.map(item => {
                                   const isCustom = 'label' in item;
                                   const id = item.id;
                                   const question = isCustom ? item.label : item.question;
                                   const val = selectedEntry.data[id];
                                   return (
                                     <div key={id} className="space-y-1.5 border-r-2 border-amber-50 pr-4">
                                        <div className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tight">{question}</div>
                                        <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">{val}</div>
                                     </div>
                                   );
                                })}
                             </div>
                          </section>
                        );
                     })}
                     <div className="pt-12 flex flex-col items-center gap-4 opacity-30 border-t border-amber-50">
                        <ClipboardList size={32} className="text-amber-800" />
                        <div className="text-[10px] font-black uppercase tracking-[0.4em]">סוף תעודת זהות</div>
                     </div>
                  </div>
                )}
                <div className="h-20" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-amber-800/20 p-12 text-center">
              <div className="bg-amber-50 p-10 rounded-full mb-8 shadow-inner">
                <Icon size={80} className="opacity-20" />
              </div>
              <h3 className="text-2xl font-bold text-amber-900/40 handwritten text-4xl mb-3">
                {activeTab === 'places' ? 'ניהול מקומות' : activeTab === 'periods' ? 'ניהול תקופות' : activeTab === 'twists' ? 'ניהול טוויסטים' : activeTab === 'fantasyWorlds' ? 'ניהול עולמות פנטזיה' : 'שאלון בניית דמות'}
              </h3>
              <p className="max-w-xs text-sm text-amber-800/30 leading-relaxed">
                בחר פריט מהרשימה או צור חדש כדי להתחיל.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Questionnaires;
