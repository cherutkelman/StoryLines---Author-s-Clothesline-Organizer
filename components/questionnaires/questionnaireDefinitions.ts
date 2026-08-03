import { Eye, FileText, MessageSquarePlus, Sparkles, Users } from 'lucide-react';

export const FEMALE_QUESTIONS_CONFIG = [
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

export const MALE_QUESTIONS_CONFIG = [
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

export const MACRO_PLACE_QUESTIONS = [
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

export const MICRO_PLACE_QUESTIONS: any[] = [];

export const SPECIFIC_LOCATION_QUESTIONS = [
  { id: "street", question: "רחוב" },
  { id: "neighborhood", question: "שכונה" },
  { id: "building_type", question: "סוג המבנה" },
  { id: "place_role", question: "תפקיד של המקום" },
  { id: "description", question: "תיאור" },
  { id: "more_details", question: "פרטים נוספים" },
];

export const PERIOD_QUESTIONS = [
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

export const TWIST_QUESTIONS = [
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

export const FANTASY_WORLD_QUESTIONS = [
  { id: "common_daily_life", category: "יום יום", question: "איך מתנהלים חיי היום יום של האדם הפשוט:", type: "textarea" },
  { id: "other_creatures", category: "יום יום", question: "אילו יצורים נוספים קיימים בעולם:", type: "textarea" },
  { id: "magic_nature", category: "יום יום", question: "טבע ייחודי הנובע מהקסם:", type: "textarea" },
  { id: "magic_source", category: "יום יום", question: "מאיפה נובעת אנרגיית הקסם:", type: "textarea" },
  { id: "magic_limits", category: "יום יום", question: "מה מגביל את כוח הקסם:", type: "textarea" },
  { id: "world_laws", category: "יום יום", question: "אילו חוקים יש בעולם הזה:", type: "textarea" },
  
  { id: "good_guys", category: "מלחמות", question: "מי הטובים:", type: "textarea" },
  { id: "bad_guys", category: "מלחמות", question: "מי הרעים:", type: "textarea" },
  { id: "neutral_guys", category: "מלחמות", question: "מי אלו שקיימים אבל לא נמצאים בשום צד:", type: "textarea" },
  { id: "conflict_expression", category: "מלחמות", question: "איך מתבטאת הלחימה בין הצדדים:", type: "textarea" },
  { id: "affected_guys", category: "מלחמות", question: "מי אלו שמושפעים מהלחימה אבל לא מעורבים:", type: "textarea" },
  { id: "hero_journey", category: "מלחמות", question: "איזה מסע עוברים הגיבורים. פיזי, נפשי, התפתחותי:", type: "textarea" },
  { id: "bad_ending", category: "מלחמות", question: "מהו הסוף הרע שאליו לא רוצים להגיע:", type: "textarea" },
  { id: "good_ending", category: "מלחמות", question: "מהו הסוף הטוב:", type: "textarea" }
];

export const DEVELOPMENT_STAGE_QUESTIONS = [
  { id: "hero_choices_impact", question: "אילו בחירות של הגיבור השפיעו על המצב." },
  { id: "external_events", question: "מה קורה בשלב הזה, שלא תלוי בגיבור." },
  { id: "current_choices", question: "אילו בחירות הוא מבצע." },
  { id: "change_impact", question: "מה משתנה בעקבות הבחירה שלו?" },
  { id: "emotions_impact", question: "איך משפיע השינוי על הרגשות שלו ושל אחרים?" },
  { id: "life_consequences", question: "מהן ההשלכות של השינוי על חייו ועל חיי האחרים סביבו?" },
  { id: "regrets", question: "האם יש לו חרטות?" },
  { id: "future_choice", question: "האם הוא יבחר אחרת פעם הבאה? למה?" },
];

export const SPECIAL_ITEM_QUESTIONS = [
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

export const UNIQUE_POWER_QUESTIONS = [
  { id: "powers", question: "אילו כוחות יש לדמות:" },
  { id: "add_power", question: "מה יכול להוסיף כוח לדמות:" },
  { id: "limits", question: "מה מגביל אותה:" },
  { id: "needs", question: "למה היא זקוקה בשביל לממש את הכוח שלה:" },
];

export const CHARACTER_ROLES = [
  { id: 'main', label: 'דמויות ראשיות' },
  { id: 'family', label: 'משפחה' },
  { id: 'friends', label: 'חברים' },
  { id: 'staff', label: 'צוות' },
  { id: 'antagonist', label: 'אנטי גיבור' },
  { id: 'others', label: 'נוספים' },
];

export const BACKGROUND_TYPES = [
  { id: 'framework', label: 'סיפור מסגרת', icon: FileText, addButton: 'הוסף סיפור מסגרת' },
  { id: 'legends', label: 'אגדות', icon: Sparkles, addButton: 'הוסף אגדה' },
  { id: 'prophecies', label: 'נבואות', icon: Eye, addButton: 'הוסף נבואה' },
  { id: 'folklore', label: 'סיפורי עם ומסורת', icon: Users, addButton: 'הוסף סיפור עם' },
  { id: 'children', label: 'שירים וסיפורי ילדים', icon: MessageSquarePlus, addButton: 'הוסף סיפור ילדים או שיר' },
];

