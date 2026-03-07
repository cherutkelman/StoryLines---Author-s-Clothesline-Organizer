
import React, { useState } from 'react';
import { QuestionnaireEntry, DevelopmentStage, SpecialItem, UniquePower, SpecificLocation } from '../types';
import { 
  Plus, Trash2, User, MapPin, Clock, Wand2, Sparkles, Loader2, 
  Save, X, ChevronLeft, UserRound, UserRoundSearch, FileText, 
  Download, LayoutList, Globe, Home, Eye, PencilLine, ClipboardList,
  Search,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquarePlus,
  Image as ImageIcon,
  Camera
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
  initialTab?: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds';
  initialSelectedEntryId?: string | null;
  onTabChange?: (tab: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds') => void;
  onEntrySelect?: (id: string | null) => void;
}

const FEMALE_QUESTIONS_CONFIG = [
  { id: "name", category: "זהות בסיסית", question: "שם מלא וכינוי (אם יש)", type: "text" },
  { id: "age", category: "זהות בסיסית", question: "גיל", type: "text" },
  { id: "residence", category: "זהות בסיסית", question: "מקום מגורים", type: "text" },
  { id: "daily_life", category: "זהות בסיסית", question: "מה היא עושה ביום יום", type: "textarea" },
  { id: "favorite_food", category: "זהות בסיסית", question: "מאכלים אהובים", type: "text" },
  { id: "favorite_color", category: "זהות בסיסית", question: "צבע אהוב", type: "text" },
  { id: "general_appearance", category: "זהות בסיסית", question: "תיאור חיצוני כללי", type: "textarea" },
  { id: "unique_features", category: "זהות בסיסית", question: "פרטים ייחודיים במראה", type: "textarea" },
  { id: "gestures", category: "זהות בסיסית", question: "תנועות שהיא רגילה לעשות", type: "textarea" },
  { id: "common_phrases", category: "זהות בסיסית", question: "ביטויים שגורים", type: "textarea" },
  { id: "traits", category: "זהות בסיסית", question: "תכונות אופי בולטות", type: "textarea" },
  { id: "abilities", category: "עיצוב דמות", question: "אילו יכולות יש לה באופן כללי?", type: "textarea" },
  { id: "special_powers", category: "עיצוב דמות", question: "כוחות מיוחדים שיש לה", type: "textarea" },
  { id: "values", category: "עיצוב דמות", question: "ערכים שמובילים אותה", type: "textarea" },
  { id: "hobbies", category: "עיצוב דמות", question: "מה היא אוהבת לעשות", type: "textarea" },
  { id: "favorite_place", category: "עיצוב דמות", question: "איפה היא אוהבת להיות", type: "text" },
  { id: "strengths", category: "עיצוב דמות", question: "אילו חוזקות יש לה", type: "textarea" },
  { id: "difficulties", category: "עיצוב דמות", question: "אילו קשיים יש לה", type: "textarea" },
  { id: "life_motto", category: "עיצוב דמות", question: "מוטו לחיים", type: "text" },
  { id: "goal", category: "עיצוב דמות", question: "מה היא רוצה להשיג", type: "textarea" },
  { id: "obstacles", category: "עיצוב דמות", question: "מה מפריע לה להשיג את זה", type: "textarea" },
  { id: "avoidance", category: "עיצוב דמות", question: "מה היא לא רוצה לעשות", type: "textarea" },
  { id: "sweet_memories", category: "עיצוב דמות", question: "מה הזכרונות המתוקים ביותר שלה", type: "textarea" },
  { id: "bad_memories", category: "עיצוב דמות", question: "מה הזכרונות הגרועים ביותר שלה", type: "textarea" },
  { id: "traumas", category: "עיצוב דמות", question: "טראומות עבר", type: "textarea" },
  { id: "central_dilemma", category: "מניע עלילתי", question: "מהי הדילמה המרכזית שלה בסיפור?", type: "textarea" },
  { id: "choice_between", category: "מניע עלילתי", question: "בין אילו שני ערכים/פחדים היא נדרשת לבחור?", type: "textarea" },
  { id: "first_choice_revelation", category: "מניע עלילתי", question: "מה הבחירה הראשונה שלה חושפת עליה?", type: "textarea" },
  { id: "choice_price", category: "מניע עלילתי", question: "איזה מחיר היא משלמת בעקבות הבחירה?", type: "textarea" },
  { id: "belief_impact", category: "מניע עלילתי", question: "האם המחיר מערער אמונה פנימית שלה או מחזק אותה?", type: "textarea" },
  { id: "similar_dilemma_later", category: "מניע עלילתי", question: "האם בהמשך היא ניצבת בפני דילמה דומה?", type: "textarea" },
  { id: "later_choice_diff", category: "מניע עלילתי", question: "האם הבחירה המאוחרת שלה שונה מהראשונה?", type: "textarea" },
  { id: "social_start_end", category: "מערכות יחסים", question: "קשרים חברתיים בתחילת ובסוף הספר", type: "textarea" },
  { id: "family_start_end", category: "מערכות יחסים", question: "קשרים משפחתיים בתחילת ובסוף הספר", type: "textarea" },
  { id: "romantic_start_end", category: "מערכות יחסים", question: "קשר זוגי בתחילת ובסוף הספר", type: "textarea" },
  { id: "enemy_start_end", category: "מערכות יחסים", question: "קשר עם אויב/ אנטי הירו בתחילת ובסוף הספר", type: "textarea" },
  { id: "changing_connections", category: "מערכות יחסים", question: "קשרים שמשתנים במהלך הספר ולמה", type: "textarea" },
  { id: "other_connections", category: "מערכות יחסים", question: "קשרים נוספים", type: "textarea" }
];

const MALE_QUESTIONS_CONFIG = [
  { id: "name", category: "זהות בסיסית", question: "שם מלא וכינוי (אם יש)", type: "text" },
  { id: "age", category: "זהות בסיסית", question: "גיל", type: "text" },
  { id: "residence", category: "זהות בסיסית", question: "מקום מגורים", type: "text" },
  { id: "daily_life", category: "זהות בסיסית", question: "מה הוא עושה ביום יום", type: "textarea" },
  { id: "favorite_food", category: "זהות בסיסית", question: "מאכלים אהובים", type: "text" },
  { id: "favorite_color", category: "זהות בסיסית", question: "צבע אהוב", type: "text" },
  { id: "general_appearance", category: "זהות בסיסית", question: "תיאור חיצוני כללי", type: "textarea" },
  { id: "unique_features", category: "זהות בסיסית", question: "פרטים ייחודיים במראה", type: "textarea" },
  { id: "gestures", category: "זהות בסיסית", question: "תנועות שהוא רגיל לעשות", type: "textarea" },
  { id: "common_phrases", category: "זהות בסיסית", question: "ביטויים שגורים", type: "textarea" },
  { id: "traits", category: "זהות בסיסית", question: "תכונות אופי בולטות", type: "textarea" },
  { id: "abilities", category: "עיצוב דמות", question: "אילו יכולות יש לו באופן כללי?", type: "textarea" },
  { id: "special_powers", category: "עיצוב דמות", question: "כוחות מיוחדים שיש לו", type: "textarea" },
  { id: "values", category: "עיצוב דמות", question: "ערכים שמובילים אותו", type: "textarea" },
  { id: "hobbies", category: "עיצוב דמות", question: "מה הוא אוהב לעשות", type: "textarea" },
  { id: "favorite_place", category: "עיצוב דמות", question: "איפה הוא אוהב להיות", type: "text" },
  { id: "strengths", category: "עיצוב דמות", question: "אילו חוזקות יש לו", type: "textarea" },
  { id: "difficulties", category: "עיצוב דמות", question: "אילו קשיים יש לו", type: "textarea" },
  { id: "life_motto", category: "עיצוב דמות", question: "מוטו לחיים", type: "text" },
  { id: "goal", category: "עיצוב דמות", question: "מה הוא רוצה להשיג", type: "textarea" },
  { id: "obstacles", category: "עיצוב דמות", question: "מה מפריע לו להשיג את זה", type: "textarea" },
  { id: "avoidance", category: "עיצוב דמות", question: "מה הוא לא רוצה לעשות", type: "textarea" },
  { id: "sweet_memories", category: "עיצוב דמות", question: "מה הזכרונות המתוקים ביותר שלו", type: "textarea" },
  { id: "bad_memories", category: "עיצוב דמות", question: "מה הזכרונות הגרועים ביותר שלו", type: "textarea" },
  { id: "traumas", category: "עיצוב דמות", question: "טראומות עבר", type: "textarea" },
  { id: "central_dilemma", category: "מניע עלילתי", question: "מהי הדילמה המרכזית שלו בסיפור?", type: "textarea" },
  { id: "choice_between", category: "מניע עלילתי", question: "בין אילו שני ערכים/פחדים הוא נדרש לבחור?", type: "textarea" },
  { id: "first_choice_revelation", category: "מניע עלילתי", question: "מה הבחירה הראשונה שלו חושפת עליו?", type: "textarea" },
  { id: "choice_price", category: "מניע עלילתי", question: "איזה מחיר הוא משלם בעקבות הבחירה?", type: "textarea" },
  { id: "belief_impact", category: "מניע עלילתי", question: "האם המחיר מערער אמונה פנימית שלו או מחזק אותה?", type: "textarea" },
  { id: "similar_dilemma_later", category: "מניע עלילתי", question: "האם בהמשך הוא ניצב בפני דילמה דומה?", type: "textarea" },
  { id: "later_choice_diff", category: "מניע עלילתי", question: "האם הבחירה המאוחרת שלו שונה מהראשונה?", type: "textarea" },
  { id: "social_start_end", category: "מערכות יחסים", question: "קשרים חברתיים בתחילת ובסוף הספר", type: "textarea" },
  { id: "family_start_end", category: "מערכות יחסים", question: "קשרים משפחתיים בתחילת ובסוף הספר", type: "textarea" },
  { id: "romantic_start_end", category: "מערכות יחסים", question: "קשר זוגי בתחילת ובסוף הספר", type: "textarea" },
  { id: "enemy_start_end", category: "מערכות יחסים", question: "קשר עם אויב/ אנטי הירו בתחילת ובסוף הספר", type: "textarea" },
  { id: "changing_connections", category: "מערכות יחסים", question: "קשרים שמשתנים במהלך הספר ולמה", type: "textarea" },
  { id: "other_connections", category: "מערכות יחסים", question: "קשרים נוספים", type: "textarea" }
];

const MACRO_PLACE_QUESTIONS = [
  { id: "city_country", category: "מיקום גיאוגרפי", question: "שם עיר / כפר ובאיזה ארץ", type: "text" },
  { id: "population_type", category: "מיקום גיאוגרפי", question: "סוג אוכלוסיה מקומית", type: "textarea" },
  { id: "living_conditions", category: "מיקום גיאוגרפי", question: "תנאי מחיה של האוכלוסיה", type: "textarea" },
  { id: "common_foods", category: "מיקום גיאוגרפי", question: "מאכלים נפוצים", type: "textarea" },
  { id: "flora_fauna", category: "מיקום גיאוגרפי", question: "צמחים וחיות נפוצות באזור", type: "textarea" },
  { id: "ruler", category: "מיקום גיאוגרפי", question: "מי שולט בשטח", type: "textarea" },
  { id: "landscape", category: "מיקום גיאוגרפי", question: "נוף מצוי", type: "textarea" },
  { id: "arrival_ways", category: "מיקום גיאוגרפי", question: "דרכי הגעה", type: "textarea" },
  { id: "comm_ways", category: "מיקום גיאוגרפי", question: "דרכי תקשורת", type: "textarea" },
  { id: "more_details", category: "מיקום גיאוגרפי", question: "פרטים נוספים", type: "textarea" }
];

const MICRO_PLACE_QUESTIONS: any[] = [];

const SPECIFIC_LOCATION_QUESTIONS = [
  { id: "street", question: "רחוב" },
  { id: "neighborhood", question: "שכונה" },
  { id: "building_type", question: "סוג המבנה" },
  { id: "place_role", question: "תפקיד של המקום" },
  { id: "description", question: "תיאור" },
  { id: "more_details", question: "פרטים נוספים" },
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
  { id: "pre_state", category: "טוויסט", question: "תיאור מצב קודם:", type: "textarea" },
  { id: "expectations", category: "טוויסט", question: "מה הקורא חושב שעומד לקרות:", type: "textarea" },
  { id: "facts", category: "טוויסט", question: "מה העובדות שהובילו אותו לחשוב כך:", type: "textarea" },
  { id: "ideal_path", category: "טוויסט", question: "מה היה קורה אילו הסיפור היה ממשיך כמו שהקורא חושב:", type: "textarea" },
  { id: "truth_moment", category: "טוויסט", question: "מה קורה ברגע האמת:", type: "textarea" },
  { id: "clues", category: "טוויסט", question: "אילו רמזים מקדימים נמצאים בטקסט:", type: "textarea" },
  { id: "immediate_impact", category: "טוויסט", question: "איך השינוי משפיע באופן מיידי על הסיפור:", type: "textarea" },
  { id: "long_term_impact", category: "טוויסט", question: "אילו השלכות יש לטוויסט בטווח הארוך:", type: "textarea" },
  { id: "next_twist", category: "טוויסט", question: "האם ואיך זה מוביל לטוויסט הבא:", type: "textarea" },
  { id: "mention_for_end", category: "טוויסט", question: "מה צריך להיות מוזכר במהלך הטוויסט כדי לוודא הגעה לסוף הרצוי:", type: "textarea" }
];

const FANTASY_WORLD_QUESTIONS = [
  { id: "pre_state", category: "יום יום", question: "תיאור מצב קודם:", type: "textarea" },
  { id: "expectations", category: "יום יום", question: "מה הקורא חושב שעומד לקרות:", type: "textarea" },
  { id: "facts", category: "יום יום", question: "מה העובדות שהובילו אותו לחשוב כך:", type: "textarea" },
  { id: "ideal_path", category: "יום יום", question: "מה היה קורה אילו הסיפור היה ממשיך כמו שהקורא חושב:", type: "textarea" },
  { id: "truth_moment", category: "יום יום", question: "מה קורה ברגע האמת:", type: "textarea" },
  { id: "clues", category: "יום יום", question: "אילו רמזים מקדימים נמצאים בטקסט:", type: "textarea" },
  { id: "immediate_impact", category: "יום יום", question: "איך השינוי משפיע באופן מיידי על הסיפור:", type: "textarea" },
  { id: "long_term_impact", category: "יום יום", question: "אילו השלכות יש לטוויסט בטווח הארוך:", type: "textarea" },
  { id: "next_twist", category: "יום יום", question: "האם ואיך זה מוביל לטוויסט הבא:", type: "textarea" },
  { id: "mention_for_end", category: "יום יום", question: "מה צריך להיות מוזכר במהלך הטוויסט כדי לוודא הגעה לסוף הרצוי:", type: "textarea" },
  
  { id: "good_guys", category: "מלחמות", question: "מי הטובים:", type: "textarea" },
  { id: "bad_guys", category: "מלחמות", question: "מי הרעים:", type: "textarea" },
  { id: "neutral_guys", category: "מלחמות", question: "מי אלו שקיימים אבל לא נמצאים בשום צד:", type: "textarea" },
  { id: "conflict_expression", category: "מלחמות", question: "איך מתבטאת הלחימה בין הצדדים:", type: "textarea" },
  { id: "affected_guys", category: "מלחמות", question: "מי אלו שמושפעים מהלחימה אבל לא מעורבים:", type: "textarea" },
  { id: "hero_journey", category: "מלחמות", question: "איזה מסע עוברים הגיבורים. פיזי, נפשי, התפתחותי:", type: "textarea" },
  { id: "bad_ending", category: "מלחמות", question: "מהו הסוף הרע שאליו לא רוצים להגיע:", type: "textarea" },
  { id: "good_ending", category: "מלחמות", question: "מהו הסוף הטוב:", type: "textarea" }
];

const DEVELOPMENT_STAGE_QUESTIONS = [
  { id: "hero_choices_impact", question: "אילו בחירות של הגיבור השפיעו על המצב." },
  { id: "external_events", question: "מה קורה בשלב הזה, שלא תלוי בגיבור." },
  { id: "current_choices", question: "אילו בחירות הוא מבצע." },
  { id: "change_impact", question: "מה משתנה בעקבות הבחירה שלו?" },
  { id: "emotions_impact", question: "איך משפיע השינוי על הרגשות שלו ושל אחרים?" },
  { id: "life_consequences", question: "מהן ההשלכות של השינוי על חייו ועל חיי האחרים סביבו?" },
  { id: "regrets", question: "האם יש לו חרטות?" },
  { id: "future_choice", question: "האם הוא יבחר אחרת פעם הבאה? למה?" },
];

const SPECIAL_ITEM_QUESTIONS = [
  { id: "description", question: "תיאור חיצוני" },
  { id: "start_state", question: "מצב בתחילת הספר" },
  { id: "state_change", question: "שינוי במצב" },
  { id: "end_state", question: "מצב בסוף הספר" },
  { id: "powers", question: "מהם הכוחות שלו" },
  { id: "impact", question: "על מה הוא משפיע" },
  { id: "who_wants_it", question: "מי רוצה להשיג אותו" },
  { id: "location_flow", question: "אצל מי הוא נמצא ולמי הוא מגיע" },
  { id: "history", question: "מה ההיסטוריה שלו" },
];

const UNIQUE_POWER_QUESTIONS = [
  { id: "powers", question: "אילו כוחות יש לדמות:" },
  { id: "add_power", question: "מה יכול להוסיף כוח לדמות:" },
  { id: "limits", question: "מה מגביל אותה:" },
  { id: "needs", question: "למה היא זקוקה בשביל לממש את הכוח שלה:" },
];

const CHARACTER_ROLES = [
  { id: 'main', label: 'דמויות ראשיות' },
  { id: 'family', label: 'משפחה' },
  { id: 'friends', label: 'חברים' },
  { id: 'staff', label: 'צוות' },
  { id: 'antagonist', label: 'אנטי גיבור' },
  { id: 'others', label: 'נוספים' },
];

const Questionnaires: React.FC<QuestionnairesProps> = ({ 
  characters, places, periods, twists, fantasyWorlds,
  onUpdateCharacters, onUpdatePlaces, onUpdatePeriods, onUpdateTwists, onUpdateFantasyWorlds,
  initialTab, initialSelectedEntryId, onTabChange, onEntrySelect
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds'>(initialTab || 'characters');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelectedEntryId || null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const [mode, setMode] = useState<'edit' | 'view'>('view');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  
  const [newQuestionLabel, setNewQuestionLabel] = useState('');

  const handleTabChange = (tab: 'characters' | 'places' | 'periods' | 'twists' | 'fantasyWorlds') => {
    setActiveTab(tab);
    setSelectedEntryId(null);
    setActiveCategory(null);
    setCurrentCategoryIndex(0);
    setQuestionSearchQuery('');
    setIsSearchActive(false);
    setMode('view');
    onTabChange?.(tab);
    onEntrySelect?.(null);
  };

  const handleEntrySelect = (id: string | null) => {
    setSelectedEntryId(id);
    setActiveCategory(null);
    setCurrentCategoryIndex(0);
    setQuestionSearchQuery('');
    setIsSearchActive(false);
    onEntrySelect?.(id);
  };

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

  const categories = Array.from(new Set(questionsConfig.map(q => q.category))).filter(c => c !== "");
  if (activeTab === 'characters') {
    categories.push("פיתוח דמות");
  }
  if (activeTab === 'places') {
    categories.push("מיקום ספציפי");
  }
  if (activeTab === 'fantasyWorlds') {
    categories.push("כוחות ייחודיים");
    categories.push("חפצים מיוחדים");
  }
  if (selectedEntry?.customFields && selectedEntry.customFields.length > 0) {
    categories.push("שאלות נוספות");
  }

  const currentCategory = activeCategory || categories[currentCategoryIndex] || categories[0];

  const Icon = activeTab === 'characters' ? User : activeTab === 'places' ? MapPin : activeTab === 'periods' ? Clock : activeTab === 'twists' ? Zap : Wand2;

  const filteredQuestions = questionsConfig.filter(q => {
    const matchesCategory = mode === 'edit' ? q.category === currentCategory : (activeCategory ? q.category === activeCategory : true);
    const matchesSearch = q.question.toLowerCase().includes(questionSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const customQuestions = (selectedEntry?.customFields || []).filter(cf => {
    const matchesCategory = mode === 'edit' ? currentCategory === "שאלות נוספות" : (activeCategory ? activeCategory === "שאלות נוספות" : true);
    const matchesSearch = cf.label.toLowerCase().includes(questionSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEntry) return;
    console.log('Renderer: handleImageUpload triggered for entry:', selectedEntry.id);
    
    // Safer check for Electron
    let isElectron = false;
    try {
      isElectron = !!((window as any).require && (window as any).require('electron'));
    } catch (err) {
      isElectron = false;
    }
    
    if (isElectron) {
      console.log('Renderer: Electron environment detected, using IPC dialog');
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const dataUrl = await ipcRenderer.invoke('open-image-dialog');
        
        console.log('Renderer: IPC dialog returned result');
        if (dataUrl) {
          console.log('Renderer: Received dataUrl, updating entry');
          updateEntry({ imageUrl: dataUrl });
        } else {
          console.log('Renderer: Dialog was canceled or no file selected');
        }
      } catch (error) {
        console.error('Renderer: Error in Electron image upload:', error);
      }
      return;
    }

    console.log('Renderer: Standard web environment detected, using FileReader');
    const file = e?.target?.files?.[0];
    if (file) {
      console.log('Renderer: File selected:', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Renderer: FileReader finished reading');
        updateEntry({ imageUrl: reader.result as string });
      };
      reader.onerror = (err) => {
        console.error('Renderer: FileReader error:', err);
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Renderer: No file selected in standard input');
    }
  };

  const handleRemoveImage = () => {
    if (!selectedEntry) return;
    updateEntry({ imageUrl: undefined });
  };

  const addEntry = () => {
    const newEntry: QuestionnaireEntry = {
      id: `q-${Date.now()}`,
      name: activeTab === 'characters' ? 'דמות חדשה' : activeTab === 'places' ? 'מקום חדש' : activeTab === 'periods' ? 'תקופה חדשה' : activeTab === 'twists' ? 'טוויסט חדש' : 'עולם פנטזיה חדש',
      x: activeTab === 'characters' ? 200 : undefined,
      y: activeTab === 'characters' ? 200 : undefined,
      data: activeTab === 'characters' 
        ? { gender: 'female' } 
        : activeTab === 'places' 
          ? { placeType: 'macro' } 
          : {},
      customFields: []
    };
    updateFn([...entries, newEntry]);
    handleEntrySelect(newEntry.id);
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

  const addDevelopmentStage = () => {
    if (!selectedEntry) return;
    const newStage: DevelopmentStage = {
      id: `stage-${Date.now()}`,
      title: `שלב פיתוח ${ (selectedEntry.developmentStages?.length || 0) + 1}`,
      data: {}
    };
    const updatedStages = [...(selectedEntry.developmentStages || []), newStage];
    updateEntry({ developmentStages: updatedStages });
  };

  const updateDevelopmentStage = (stageId: string, updates: Partial<DevelopmentStage>) => {
    if (!selectedEntry) return;
    const updatedStages = (selectedEntry.developmentStages || []).map(s => 
      s.id === stageId ? { ...s, ...updates } : s
    );
    updateEntry({ developmentStages: updatedStages });
  };

  const removeDevelopmentStage = (stageId: string) => {
    if (!selectedEntry) return;
    const updatedStages = (selectedEntry.developmentStages || []).filter(s => s.id !== stageId);
    updateEntry({ developmentStages: updatedStages });
  };

  const addSpecialItem = () => {
    if (!selectedEntry) return;
    const newItem: SpecialItem = {
      id: `item-${Date.now()}`,
      name: `חפץ מיוחד ${ (selectedEntry.specialItems?.length || 0) + 1}`,
      data: {}
    };
    const updatedItems = [...(selectedEntry.specialItems || []), newItem];
    updateEntry({ specialItems: updatedItems });
  };

  const updateSpecialItem = (itemId: string, updates: Partial<SpecialItem>) => {
    if (!selectedEntry) return;
    const updatedItems = (selectedEntry.specialItems || []).map(i => 
      i.id === itemId ? { ...i, ...updates } : i
    );
    updateEntry({ specialItems: updatedItems });
  };

  const removeSpecialItem = (itemId: string) => {
    if (!selectedEntry) return;
    const updatedItems = (selectedEntry.specialItems || []).filter(i => i.id !== itemId);
    updateEntry({ specialItems: updatedItems });
  };

  const addUniquePower = () => {
    if (!selectedEntry) return;
    const newPower: UniquePower = {
      id: `power-${Date.now()}`,
      name: `כוח ייחודי ${ (selectedEntry.uniquePowers?.length || 0) + 1}`,
      data: {}
    };
    const updatedPowers = [...(selectedEntry.uniquePowers || []), newPower];
    updateEntry({ uniquePowers: updatedPowers });
  };

  const updateUniquePower = (powerId: string, updates: Partial<UniquePower>) => {
    if (!selectedEntry) return;
    const updatedPowers = (selectedEntry.uniquePowers || []).map(p => 
      p.id === powerId ? { ...p, ...updates } : p
    );
    updateEntry({ uniquePowers: updatedPowers });
  };

  const removeUniquePower = (powerId: string) => {
    if (!selectedEntry) return;
    const updatedPowers = (selectedEntry.uniquePowers || []).filter(p => p.id !== powerId);
    updateEntry({ uniquePowers: updatedPowers });
  };

  const addSpecificLocation = () => {
    if (!selectedEntry) return;
    const newLoc: SpecificLocation = {
      id: `loc-${Date.now()}`,
      name: `מיקום ספציפי ${ (selectedEntry.specificLocations?.length || 0) + 1}`,
      data: {}
    };
    const updatedLocs = [...(selectedEntry.specificLocations || []), newLoc];
    updateEntry({ specificLocations: updatedLocs });
  };

  const updateSpecificLocation = (locId: string, updates: Partial<SpecificLocation>) => {
    if (!selectedEntry) return;
    const updatedLocs = (selectedEntry.specificLocations || []).map(l => 
      l.id === locId ? { ...l, ...updates } : l
    );
    updateEntry({ specificLocations: updatedLocs });
  };

  const removeSpecificLocation = (locId: string) => {
    if (!selectedEntry) return;
    const updatedLocs = (selectedEntry.specificLocations || []).filter(l => l.id !== locId);
    updateEntry({ specificLocations: updatedLocs });
  };

  const exportCurrentEntry = () => {
    if (!selectedEntry) return;
    let text = `שאלון: ${selectedEntry.name}\n`;
    text += `סוג: ${activeTab === 'characters' ? (currentGender === 'male' ? 'זכר' : 'נקבה') : activeTab === 'places' ? (currentPlaceType === 'macro' ? 'מיקום גאוגרפי' : 'מקום ספציפי') : activeTab === 'periods' ? 'תקופה' : activeTab === 'twists' ? 'טוויסט' : 'עולם פנטזיה'}\n`;
    text += `-----------------------------------\n\n`;
    
    questionsConfig.forEach(q => {
      text += `[${q.category || 'כללי'}] ${q.question}\n`;
      text += `${selectedEntry.data[q.id] || '---'}\n\n`;
    });

    if (selectedEntry.customFields && selectedEntry.customFields.length > 0) {
        text += `\nשאלות נוספות:\n-----------------------------------\n`;
        selectedEntry.customFields.forEach(cf => {
            text += `${cf.label}\n`;
            text += `${selectedEntry.data[cf.id] || '---'}\n\n`;
        });
    }

    if (selectedEntry.developmentStages && selectedEntry.developmentStages.length > 0) {
        text += `\nפיתוח דמות:\n-----------------------------------\n`;
        selectedEntry.developmentStages.forEach((stage, idx) => {
            text += `${idx + 1}. ${stage.title}\n`;
            DEVELOPMENT_STAGE_QUESTIONS.forEach(q => {
                text += `   - ${q.question}: ${stage.data[q.id] || '---'}\n`;
            });
            text += `\n`;
        });
    }

    if (selectedEntry.specialItems && selectedEntry.specialItems.length > 0) {
        text += `\nחפצים מיוחדים:\n-----------------------------------\n`;
        selectedEntry.specialItems.forEach((item, idx) => {
            text += `${idx + 1}. ${item.name}\n`;
            SPECIAL_ITEM_QUESTIONS.forEach(q => {
                text += `   - ${q.question}: ${item.data[q.id] || '---'}\n`;
            });
            text += `\n`;
        });
    }

    if (selectedEntry.uniquePowers && selectedEntry.uniquePowers.length > 0) {
        text += `\nכוחות ייחודיים:\n-----------------------------------\n`;
        selectedEntry.uniquePowers.forEach((power, idx) => {
            text += `${idx + 1}. ${power.name}\n`;
            UNIQUE_POWER_QUESTIONS.forEach(q => {
                text += `   - ${q.question}: ${power.data[q.id] || '---'}\n`;
            });
            text += `\n`;
        });
    }

    if (selectedEntry.specificLocations && selectedEntry.specificLocations.length > 0) {
        text += `\nמיקומים ספציפיים:\n-----------------------------------\n`;
        selectedEntry.specificLocations.forEach((loc, idx) => {
            text += `${idx + 1}. ${loc.name}\n`;
            SPECIFIC_LOCATION_QUESTIONS.forEach(q => {
                text += `   - ${q.question}: ${loc.data[q.id] || '---'}\n`;
            });
            text += `\n`;
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
              onClick={() => handleTabChange(tab.id as any)}
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
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeTab === 'characters' ? (
              CHARACTER_ROLES.map(role => {
                const roleEntries = entries.filter(e => e.role === role.id || (!e.role && role.id === 'others'));
                if (roleEntries.length === 0) return null;
                
                return (
                  <div key={role.id} className="space-y-2">
                    <h4 className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest px-2">{role.label}</h4>
                    {roleEntries.map(entry => (
                      <div 
                        key={entry.id}
                        onClick={() => handleEntrySelect(entry.id)}
                        className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:border-amber-100'}`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {entry.imageUrl ? (
                            <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-amber-200" />
                          ) : (
                            <Icon size={16} className={selectedEntryId === entry.id ? 'text-amber-800' : 'text-amber-300'} />
                          )}
                          <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-amber-900' : 'text-amber-700'}`}>{entry.name}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); if(confirm('למחוק?')) updateFn(entries.filter(ent => ent.id !== entry.id)); if(selectedEntryId === entry.id) handleEntrySelect(null); }}
                          className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : activeTab === 'places' ? (
              entries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => handleEntrySelect(entry.id)}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:border-amber-100'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-amber-200" />
                    ) : (
                      <Globe size={16} className="text-blue-400" />
                    )}
                    <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-amber-900' : 'text-amber-700'}`}>{entry.name}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('למחוק?')) updateFn(entries.filter(ent => ent.id !== entry.id)); if(selectedEntryId === entry.id) handleEntrySelect(null); }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              entries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => handleEntrySelect(entry.id)}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-transparent hover:border-amber-100'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-amber-200" />
                    ) : (
                      <Icon size={16} className={selectedEntryId === entry.id ? 'text-amber-800' : 'text-amber-300'} />
                    )}
                    <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-amber-900' : 'text-amber-700'}`}>{entry.name}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm('למחוק?')) updateFn(entries.filter(ent => ent.id !== entry.id)); if(selectedEntryId === entry.id) handleEntrySelect(null); }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
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
             {categories.map((cat, index) => (
               <button 
                  key={cat}
                  onClick={() => {
                    if (mode === 'edit') {
                      setCurrentCategoryIndex(index);
                    } else {
                      setActiveCategory(cat);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-right transition-all ${currentCategoryIndex === index ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-amber-800/60 hover:bg-amber-50'}`}
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
                     
                      <div className="relative group/img">
                        <div className="w-16 h-16 rounded-2xl shadow-md border-2 border-white overflow-hidden bg-white flex items-center justify-center relative">
                          {selectedEntry.imageUrl ? (
                            <img src={selectedEntry.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <Icon size={24} className="text-amber-800/20" />
                          )}
                          
                          {mode === 'edit' && (
                            <label 
                              className="absolute inset-0 flex items-center justify-center bg-amber-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer text-white"
                              onClick={(e) => {
                                let isElectron = false;
                                try {
                                  isElectron = !!((window as any).require && (window as any).require('electron'));
                                } catch (err) {
                                  isElectron = false;
                                }
                                
                                if (isElectron) {
                                  e.preventDefault();
                                  handleImageUpload(null as any);
                                }
                              }}
                            >
                              <Camera size={20} />
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          )}
                        </div>
                        
                        {mode === 'edit' && selectedEntry.imageUrl && (
                          <button 
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-md border border-red-100 hover:bg-red-50 transition-all z-10"
                            title="הסרת תמונה"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                     <div className="flex-1">
                        {mode === 'edit' ? (
                          <>
                            <input 
                              value={selectedEntry.name}
                              onChange={(e) => updateEntry({ name: e.target.value })}
                              className="text-2xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-4xl w-full"
                              placeholder="שם..."
                            />
                            {activeTab === 'characters' && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {CHARACTER_ROLES.map(role => (
                                  <button
                                    key={role.id}
                                    onClick={() => updateEntry({ role: role.id })}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedEntry.role === role.id ? 'bg-amber-800 text-white border-amber-800 shadow-sm' : 'bg-white text-amber-800/60 border-amber-100 hover:bg-amber-50'}`}
                                  >
                                    {role.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <h2 className="text-3xl font-bold text-amber-900 handwritten text-5xl">{selectedEntry.name}</h2>
                            {activeTab === 'characters' && selectedEntry.role && (
                              <div className="mt-2">
                                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                                  {CHARACTER_ROLES.find(r => r.id === selectedEntry.role)?.label}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                     </div>
                  </div>
                  
                 <div className="flex items-center gap-3">
                    {mode === 'edit' && (
                      <div className="flex items-center gap-2">
                        {isSearchActive && (
                          <input 
                            type="text"
                            placeholder="חפש שאלה..."
                            value={questionSearchQuery}
                            onChange={(e) => setQuestionSearchQuery(e.target.value)}
                            className="bg-white border border-amber-100 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none w-40 animate-in slide-in-from-left-2"
                            autoFocus
                          />
                        )}
                        <button 
                          onClick={() => setIsSearchActive(!isSearchActive)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm border ${isSearchActive ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-amber-800 border-amber-100 hover:bg-amber-50'}`}
                          title="חיפוש שאלה"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    )}

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

                    <button 
                      onClick={() => { if(confirm('למחוק את כל הפריט?')) { updateFn(entries.filter(e => e.id !== selectedEntry.id)); handleEntrySelect(null); } }}
                      className="p-2.5 bg-white border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                      title="מחיקת פריט"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth">
                {mode === 'edit' ? (
                  <>
                    {currentCategory === "פיתוח דמות" ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-amber-900 handwritten text-3xl">שלבי פיתוח דמות</h3>
                          <button 
                            onClick={addDevelopmentStage}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-xl font-bold text-xs hover:bg-amber-900 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף שלב פיתוח</span>
                          </button>
                        </div>

                        {(selectedEntry.developmentStages || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-amber-100 rounded-[2rem] text-center text-amber-800/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו שלבי פיתוח. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.developmentStages || []).map((stage, sIdx) => (
                              <div key={stage.id} className="bg-amber-50/30 p-8 rounded-[2rem] border border-amber-100 space-y-6 relative group/stage">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-800 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {sIdx + 1}
                                    </div>
                                    <input 
                                      value={stage.title}
                                      onChange={(e) => updateDevelopmentStage(stage.id, { title: e.target.value })}
                                      className="text-xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
                                      placeholder="כותרת השלב..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('למחוק את שלב הפיתוח?')) removeDevelopmentStage(stage.id); }}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/stage:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="grid gap-6">
                                  {DEVELOPMENT_STAGE_QUESTIONS.map(q => (
                                    <div key={q.id} className="space-y-2">
                                      <label className="text-xs font-bold text-amber-900/60">{q.question}</label>
                                      <textarea 
                                        value={stage.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...stage.data, [q.id]: e.target.value };
                                          updateDevelopmentStage(stage.id, { data: newData });
                                        }}
                                        className="w-full bg-white border border-amber-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-amber-200/20 outline-none min-h-[80px] shadow-sm"
                                        placeholder="תשובה..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentCategory === "מיקום ספציפי" ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-amber-900 handwritten text-3xl">מיקומים ספציפיים</h3>
                          <button 
                            onClick={addSpecificLocation}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-xl font-bold text-xs hover:bg-amber-900 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף מיקום ספציפי</span>
                          </button>
                        </div>

                        {(selectedEntry.specificLocations || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-amber-100 rounded-[2rem] text-center text-amber-800/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו מיקומים ספציפיים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.specificLocations || []).map((loc, lIdx) => (
                              <div key={loc.id} className="bg-amber-50/30 p-8 rounded-[2rem] border border-amber-100 space-y-6 relative group/loc">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-800 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {lIdx + 1}
                                    </div>
                                    <input 
                                      value={loc.name}
                                      onChange={(e) => updateSpecificLocation(loc.id, { name: e.target.value })}
                                      className="text-xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
                                      placeholder="שם המיקום..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('למחוק את המיקום הספציפי?')) removeSpecificLocation(loc.id); }}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/loc:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="grid gap-6">
                                  {SPECIFIC_LOCATION_QUESTIONS.map(q => (
                                    <div key={q.id} className="space-y-2">
                                      <label className="text-xs font-bold text-amber-900/60">{q.question}</label>
                                      <textarea 
                                        value={loc.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...loc.data, [q.id]: e.target.value };
                                          updateSpecificLocation(loc.id, { data: newData });
                                        }}
                                        className="w-full bg-white border border-amber-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-amber-200/20 outline-none min-h-[80px] shadow-sm"
                                        placeholder="תשובה..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentCategory === "כוחות ייחודיים" ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-amber-900 handwritten text-3xl">כוחות ייחודיים</h3>
                          <button 
                            onClick={addUniquePower}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-xl font-bold text-xs hover:bg-amber-900 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף כוח ייחודי</span>
                          </button>
                        </div>

                        {(selectedEntry.uniquePowers || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-amber-100 rounded-[2rem] text-center text-amber-800/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו כוחות ייחודיים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.uniquePowers || []).map((power, pIdx) => (
                              <div key={power.id} className="bg-amber-50/30 p-8 rounded-[2rem] border border-amber-100 space-y-6 relative group/power">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-800 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {pIdx + 1}
                                    </div>
                                    <input 
                                      value={power.name}
                                      onChange={(e) => updateUniquePower(power.id, { name: e.target.value })}
                                      className="text-xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
                                      placeholder="שם הכוח..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('למחוק את הכוח הייחודי?')) removeUniquePower(power.id); }}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/power:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="grid gap-6">
                                  {UNIQUE_POWER_QUESTIONS.map(q => (
                                    <div key={q.id} className="space-y-2">
                                      <label className="text-xs font-bold text-amber-900/60">{q.question}</label>
                                      <textarea 
                                        value={power.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...power.data, [q.id]: e.target.value };
                                          updateUniquePower(power.id, { data: newData });
                                        }}
                                        className="w-full bg-white border border-amber-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-amber-200/20 outline-none min-h-[80px] shadow-sm"
                                        placeholder="תשובה..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : currentCategory === "חפצים מיוחדים" ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-amber-900 handwritten text-3xl">חפצים מיוחדים</h3>
                          <button 
                            onClick={addSpecialItem}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-xl font-bold text-xs hover:bg-amber-900 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף חפץ מיוחד</span>
                          </button>
                        </div>

                        {(selectedEntry.specialItems || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-amber-100 rounded-[2rem] text-center text-amber-800/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו חפצים מיוחדים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.specialItems || []).map((item, iIdx) => (
                              <div key={item.id} className="bg-amber-50/30 p-8 rounded-[2rem] border border-amber-100 space-y-6 relative group/item">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-800 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {iIdx + 1}
                                    </div>
                                    <input 
                                      value={item.name}
                                      onChange={(e) => updateSpecialItem(item.id, { name: e.target.value })}
                                      className="text-xl font-bold text-amber-900 bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
                                      placeholder="שם החפץ..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('למחוק את החפץ המיוחד?')) removeSpecialItem(item.id); }}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="grid gap-6">
                                  {SPECIAL_ITEM_QUESTIONS.map(q => (
                                    <div key={q.id} className="space-y-2">
                                      <label className="text-xs font-bold text-amber-900/60">{q.question}</label>
                                      <textarea 
                                        value={item.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...item.data, [q.id]: e.target.value };
                                          updateSpecialItem(item.id, { data: newData });
                                        }}
                                        className="w-full bg-white border border-amber-100 rounded-xl p-4 text-sm focus:ring-4 focus:ring-amber-200/20 outline-none min-h-[80px] shadow-sm"
                                        placeholder="תשובה..."
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
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

                        {currentCategory === "שאלות נוספות" && customQuestions.length > 0 && (
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
                        )}

                        {currentCategory === "שאלות נוספות" && (
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
                        )}

                        {activeTab === 'fantasyWorlds' && currentCategory === 'יום יום' && (
                          <div className="pt-10 border-t border-amber-50 mt-10">
                            <div className="text-xs font-black text-amber-900/40 uppercase tracking-widest mb-4">כוחות ייחודיים</div>
                            <button 
                              onClick={() => {
                                const index = categories.indexOf("כוחות ייחודיים");
                                if (index !== -1) {
                                  setCurrentCategoryIndex(index);
                                  addUniquePower();
                                }
                              }}
                              className="bg-amber-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-900 transition-all shadow-md"
                            >
                              <Plus size={18} />
                              <span>הוסף כוח ייחודי</span>
                            </button>
                          </div>
                        )}

                        {activeTab === 'places' && currentCategory === 'מיקום גיאוגרפי' && (
                          <div className="pt-10 border-t border-amber-50 mt-10">
                            <div className="text-xs font-black text-amber-900/40 uppercase tracking-widest mb-4">מיקומים ספציפיים</div>
                            <button 
                              onClick={() => {
                                const index = categories.indexOf("מיקום ספציפי");
                                if (index !== -1) {
                                  setCurrentCategoryIndex(index);
                                  addSpecificLocation();
                                }
                              }}
                              className="bg-amber-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-900 transition-all shadow-md"
                            >
                              <Plus size={18} />
                              <span>הוסף מיקום ספציפי</span>
                            </button>
                          </div>
                        )}

                        {/* Navigation Buttons at bottom */}
                        <div className="flex items-center justify-between pt-10 border-t border-amber-50 mt-10">
                          <button 
                            disabled={currentCategoryIndex === 0}
                            onClick={(e) => { 
                              setCurrentCategoryIndex(prev => prev - 1); 
                              e.currentTarget.closest('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-amber-100 rounded-xl text-amber-800 font-bold hover:bg-amber-50 transition-all disabled:opacity-30 shadow-sm"
                          >
                            <ChevronLeft size={18} className="rotate-180" />
                            <span>קטגוריה קודמת</span>
                          </button>
                          <button 
                            disabled={currentCategoryIndex === categories.length - 1}
                            onClick={(e) => { 
                              setCurrentCategoryIndex(prev => prev + 1); 
                              e.currentTarget.closest('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-800 text-white rounded-xl font-bold hover:bg-amber-900 transition-all disabled:opacity-30 shadow-md"
                          >
                            <span>קטגוריה הבאה</span>
                            <ChevronLeft size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-12 py-8">
                     {categories.map(cat => {
                        let contentToRender: any[] = [];

                        if (cat === "פיתוח דמות") {
                           if (!selectedEntry.developmentStages || selectedEntry.developmentStages.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-amber-100" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.developmentStages || []).map((stage, sIdx) => (
                                    <div key={stage.id} className="space-y-6 bg-amber-50/20 p-8 rounded-[2rem] border border-amber-100/50">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-amber-800/10 text-amber-800 rounded-lg flex items-center justify-center text-xs font-black">
                                            {sIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-amber-900 handwritten text-3xl">{stage.title}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-amber-100 pr-6">
                                          {DEVELOPMENT_STAGE_QUESTIONS.map(q => {
                                            const val = stage.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">{val}</div>
                                              </div>
                                            );
                                          })}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                             </section>
                           );
                        }

                        if (cat === "מיקום ספציפי") {
                           if (!selectedEntry.specificLocations || selectedEntry.specificLocations.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-amber-100" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.specificLocations || []).map((loc, lIdx) => (
                                    <div key={loc.id} className="space-y-6 bg-amber-50/20 p-8 rounded-[2rem] border border-amber-100/50">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-amber-800/10 text-amber-800 rounded-lg flex items-center justify-center text-xs font-black">
                                            {lIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-amber-900 handwritten text-3xl">{loc.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-amber-100 pr-6">
                                          {SPECIFIC_LOCATION_QUESTIONS.map(q => {
                                            const val = loc.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">{val}</div>
                                              </div>
                                            );
                                          })}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                             </section>
                           );
                        }

                        if (cat === "כוחות ייחודיים") {
                           if (!selectedEntry.uniquePowers || selectedEntry.uniquePowers.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-amber-100" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.uniquePowers || []).map((power, pIdx) => (
                                    <div key={power.id} className="space-y-6 bg-amber-50/20 p-8 rounded-[2rem] border border-amber-100/50">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-amber-800/10 text-amber-800 rounded-lg flex items-center justify-center text-xs font-black">
                                            {pIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-amber-900 handwritten text-3xl">{power.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-amber-100 pr-6">
                                          {UNIQUE_POWER_QUESTIONS.map(q => {
                                            const val = power.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">{val}</div>
                                              </div>
                                            );
                                          })}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                             </section>
                           );
                        }

                        if (cat === "חפצים מיוחדים") {
                           if (!selectedEntry.specialItems || selectedEntry.specialItems.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-amber-100" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.specialItems || []).map((item, iIdx) => (
                                    <div key={item.id} className="space-y-6 bg-amber-50/20 p-8 rounded-[2rem] border border-amber-100/50">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-amber-800/10 text-amber-800 rounded-lg flex items-center justify-center text-xs font-black">
                                            {iIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-amber-900 handwritten text-3xl">{item.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-amber-100 pr-6">
                                          {SPECIAL_ITEM_QUESTIONS.map(q => {
                                            const val = item.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-amber-900/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-amber-900 leading-relaxed whitespace-pre-wrap">{val}</div>
                                              </div>
                                            );
                                          })}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                             </section>
                           );
                        }

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
