import { CharacterGender } from '../types';

export interface RelationshipQuestionTextContext {
  characterA: string;
  characterB: string;
  genderA: CharacterGender;
  genderB: CharacterGender;
}

export interface SharedRelationshipQuestion {
  id: string;
  getText: (context: RelationshipQuestionTextContext) => string;
}

export interface PersonalRelationshipQuestion {
  id: string;
  getText: (context: RelationshipQuestionTextContext) => string;
}

export type RelationshipQuestionBlock =
  | {
      type: 'shared';
      label?: string;
      questions: SharedRelationshipQuestion[];
    }
  | {
      type: 'personal';
      label?: string;
      questions: PersonalRelationshipQuestion[];
    };

export interface RelationshipQuestionSection {
  id: string;
  title: string;
  blocks: RelationshipQuestionBlock[];
}

const isFemale = (gender: CharacterGender) => gender === 'female';
const allFemale = (context: RelationshipQuestionTextContext) => isFemale(context.genderA) && isFemale(context.genderB);

const l = (name: string) => `ל־${name}`;
const m = (name: string) => `מ־${name}`;
const b = (name: string) => `ב${name}`;

const shared = (id: string, getText: (context: RelationshipQuestionTextContext) => string): SharedRelationshipQuestion => ({
  id,
  getText,
});

const personal = (id: string, getText: (context: RelationshipQuestionTextContext) => string): PersonalRelationshipQuestion => ({
  id,
  getText,
});

const agreeVerb = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'מסכימות' : 'מסכימים';
const disagreePronoun = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'אינן' : 'אינם';
const doHabitually = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'נוהגות' : 'נוהגים';
const argueNow = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'מתווכחות' : 'מתווכחים';
const betweenThem = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'ביניהן' : 'ביניהם';
const they = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'הן' : 'הם';
const their = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'שלהן' : 'שלהם';
const behaveMutually = (context: RelationshipQuestionTextContext) => allFemale(context) ? 'מתנהגות זו כלפי זו' : 'מתנהגים זה כלפי זה';

export const relationshipQuestionSections: RelationshipQuestionSection[] = [
  {
    id: 'foundation',
    title: 'בסיס והיסטוריה משותפת',
    blocks: [
      {
        type: 'shared',
        questions: [
          shared('foundation.relationship-type', ({ characterA, characterB }) => `מה הקשר בין ${characterA} ${l(characterB)}?`),
          shared('foundation.first-meeting', ({ characterA, characterB }) => `איך ${characterA} ו־${characterB} הכירו?`),
          shared('foundation.shared-experiences', ({ characterA, characterB }) => `אילו חוויות משמעותיות עברו ${characterA} ו־${characterB} יחד?`),
          shared('foundation.connection', ({ characterA, characterB }) => `מה מחבר בין ${characterA} ${l(characterB)}?`),
          shared('foundation.distance', ({ characterA, characterB }) => `מה מרחיק בין ${characterA} ${l(characterB)}?`),
          shared('foundation.agreement', (context) => `על מה ${context.characterA} ו־${context.characterB} ${agreeVerb(context)}, ועל מה ${they(context)} ${disagreePronoun(context)} ${agreeVerb(context)}?`),
          shared('foundation.shared-actions', (context) => `מה ${context.characterA} ו־${context.characterB} ${doHabitually(context)} לעשות יחד, מרצון או מכורח?`),
          shared('foundation.arguments', (context) => `על מה ${context.characterA} ו־${context.characterB} ${argueNow(context)} כיום, או התווכחו בעבר?`),
          shared('foundation.common-ground', ({ characterA, characterB }) => `מה משותף ${l(characterA)} ו${l(characterB)}?`),
          shared('foundation.central-difference', (context) => `מה ההבדל המרכזי ${betweenThem(context)}?`),
        ],
      },
    ],
  },
  {
    id: 'experience',
    title: 'החוויה של כל דמות בתוך הקשר',
    blocks: [
      {
        type: 'personal',
        questions: [
          personal('experience.feelings', ({ characterA, characterB, genderA }) => `איך ${characterA} ${isFemale(genderA) ? 'מרגישה' : 'מרגיש'} כלפי ${characterB}?`),
          personal('experience.binds', ({ characterA, characterB }) => `מה קושר את ${characterA} ${l(characterB)}?`),
          personal('experience.easier', ({ characterA, characterB, genderB }) => `מה יש ${b(characterB)} שמקל על ${characterA} להיות ${isFemale(genderB) ? 'איתה' : 'איתו'} בקשר?`),
          personal('experience.harder', ({ characterA, characterB, genderB }) => `מה יש ${b(characterB)} שמקשה על ${characterA} להיות ${isFemale(genderB) ? 'איתה' : 'איתו'} בקשר?`),
          personal('experience.need-met', ({ characterA, characterB }) => `איזה צורך אצל ${characterA} מקבל מענה בקשר עם ${characterB}?`),
          personal('experience.sensitive-points', ({ characterA, characterB }) => `אילו נקודות רגישות אצל ${characterA} נפגעות בידי ${characterB}?`),
          personal('experience.before-after', ({ characterA, characterB, genderA }) => `מי ${isFemale(genderA) ? 'הייתה' : 'היה'} ${characterA} לפני המפגש עם ${characterB}, ומי ${isFemale(genderA) ? 'היא' : 'הוא'} אחריו?`),
          personal('experience.unique-influence', ({ characterA, characterB }) => `איזו השפעה יש ${l(characterB)} על ${characterA} שאין לדמויות אחרות?`),
          personal('experience.evokes', ({ characterA, characterB, genderB }) => `מה ${characterB} ${isFemale(genderB) ? 'מעוררת' : 'מעורר'} ב־${characterA} שאחרים אינם מעוררים?`),
          personal('experience.looked-for', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'חיפשה' : 'חיפש'} בדמויות אחרות ולא ${isFemale(genderA) ? 'מצאה' : 'מצא'}?`),
          personal('experience.self-thought', ({ characterA, characterB, genderA }) => `מה הקשר עם ${characterB} גורם ${l(characterA)} לחשוב על ${isFemale(genderA) ? 'עצמה' : 'עצמו'}?`),
          personal('experience.self-learning', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'לומדת' : 'לומד'} על ${isFemale(genderA) ? 'עצמה' : 'עצמו'} דרך הקשר עם ${characterB}?`),
          personal('experience.unique-contribution', ({ characterA, characterB, genderA }) => `איזו תרומה ייחודית ${characterA} ${isFemale(genderA) ? 'יכולה' : 'יכול'} להביא לקשר עם ${characterB}?`),
          personal('experience.receives-uniquely', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מקבלת' : 'מקבל'} מהקשר ${isFemale(genderA) ? 'שאינה מקבלת' : 'שאינו מקבל'} במקום אחר?`),
          personal('experience.wants-change', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'הייתה רוצה' : 'היה רוצה'} לשנות ב־${characterB}?`),
        ],
      },
    ],
  },
  {
    id: 'needs',
    title: 'צרכים, מניעים ותלות',
    blocks: [
      {
        type: 'personal',
        questions: [
          personal('needs.goal', ({ characterA }) => `מה המטרה של ${characterA} במערכת היחסים הזו?`),
          personal('needs.receive', ({ characterA, characterB }) => `מה ${characterA} רוצה לקבל ${m(characterB)}?`),
          personal('needs.wants-feeling', ({ characterA, characterB, genderB, genderA }) => `מה ${characterA} רוצה ש־${characterB} ${isFemale(genderB) ? 'תרגיש' : 'ירגיש'} ${isFemale(genderA) ? 'כלפיה' : 'כלפיו'}?`),
          personal('needs.unspoken-need', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'צריכה' : 'צריך'} ${m(characterB)}, גם אם ${isFemale(genderA) ? 'אינה מודה' : 'אינו מודה'} בכך?`),
          personal('needs.attachment-reason', ({ characterA, characterB }) => `מה קושר את ${characterA} דווקא ${l(characterB)}: צורך, אינטרס, פחד, מחויבות או פצע?`),
          personal('needs.dependence', ({ characterA, characterB, genderA }) => `באילו דרכים ${characterA} ${isFemale(genderA) ? 'תלויה' : 'תלוי'} ב־${characterB}?`),
          personal('needs.fear-ending', ({ characterA, genderA }) => `ממה ${characterA} ${isFemale(genderA) ? 'חוששת' : 'חושש'} אם הקשר יסתיים?`),
          personal('needs.gain', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מרוויחה' : 'מרוויח'} מעצם קיומו של הקשר?`),
          personal('needs.price', ({ characterA, genderA }) => `מה המחיר ש־${characterA} ${isFemale(genderA) ? 'משלמת' : 'משלם'} על המשך הקשר?`),
          personal('needs.stays-why', ({ characterA, genderA }) => `האם ${characterA} ${isFemale(genderA) ? 'נשארת' : 'נשאר'} בקשר מבחירה, מחובה, מפחד או מחוסר ברירה?`),
        ],
      },
    ],
  },
  {
    id: 'trust',
    title: 'אמון, הבנה וסודות',
    blocks: [
      {
        type: 'personal',
        questions: [
          personal('trust.trust-level', ({ characterA, characterB, genderA }) => `עד כמה ${characterA} ${isFemale(genderA) ? 'סומכת' : 'סומך'} על ${characterB}, ומדוע?`),
          personal('trust.b-earns-a-trust', ({ characterA, characterB, genderA, genderB }) => `מה ${characterA} ${isFemale(genderA) ? 'חושבת' : 'חושב'} ש־${characterB} ${isFemale(genderB) ? 'צריכה' : 'צריך'} לעשות כדי לזכות באמון ${isFemale(genderA) ? 'שלה' : 'שלו'}?`),
          personal('trust.a-earns-b-trust', ({ characterA, characterB, genderA, genderB }) => `מה ${characterA} ${isFemale(genderA) ? 'צריכה' : 'צריך'} לעשות כדי לזכות באמון ${isFemale(genderB) ? 'שלה' : 'שלו'}?`),
          personal('trust.hidden-secret', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מסתירה' : 'מסתיר'} מ־${characterB}?`),
          personal('trust.unknown-about-self', ({ characterA, characterB, genderA, genderB }) => `מה ${characterA} ${isFemale(genderA) ? 'חושבת' : 'חושב'} ש־${characterB} עדיין ${isFemale(genderB) ? 'אינה יודעת' : 'אינו יודע'} ${isFemale(genderA) ? 'עליה' : 'עליו'}?`),
          personal('trust.fear-discovery', ({ characterA, characterB, genderA, genderB }) => `מה ${characterA} ${isFemale(genderA) ? 'חוששת' : 'חושש'} ש־${characterB} ${isFemale(genderB) ? 'תגלה' : 'יגלה'} ${isFemale(genderA) ? 'עליה' : 'עליו'}?`),
          personal('trust.understands-best', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מבינה' : 'מבין'} על ${characterB} טוב יותר מכולם?`),
          personal('trust.mistaken-about', ({ characterA, characterB }) => `במה ${characterA} טועה לחלוטין לגבי ${characterB}?`),
          personal('trust.misreads', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מפרשת' : 'מפרש'} לא נכון בהתנהגות של ${characterB}?`),
          personal('trust.cannot-say', ({ characterA, characterB, genderA }) => `איזה דבר ${characterA} רוצה לומר ${l(characterB)} אך ${isFemale(genderA) ? 'אינה מסוגלת' : 'אינו מסוגל'}?`),
          personal('trust.refuses-truth', ({ characterA, genderA }) => `איזו אמת על הקשר ${characterA} ${isFemale(genderA) ? 'מסרבת' : 'מסרב'} לראות?`),
          personal('trust.b-knows-secret', ({ characterA, characterB, genderB }) => `מה ${characterB} ${isFemale(genderB) ? 'יודעת' : 'יודע'} על ${characterA} שאיש אחר אינו יודע?`),
        ],
      },
    ],
  },
  {
    id: 'power',
    title: 'כוח, שליטה ותלות הדדית',
    blocks: [
      {
        type: 'shared',
        questions: [
          shared('power.more-power', () => 'למי יש יותר כוח במערכת היחסים, ומדוע?'),
          shared('power.power-source', () => 'על מה מבוסס הכוח הזה: סמכות, ידע, כסף, אהבה, פחד, מעמד, סוד או תלות?'),
          shared('power.balance-change', () => 'האם מאזן הכוחות משתנה במהלך הסיפור?'),
          shared('power.balance-turning-point', () => 'באיזה שלב מתרחש השינוי המשמעותי ביותר במאזן הכוחות?'),
        ],
      },
      {
        type: 'personal',
        questions: [
          personal('power.influence', ({ characterA, characterB, genderA }) => `באילו דרכים ${characterA} ${isFemale(genderA) ? 'משפיעה' : 'משפיע'} על ${characterB}?`),
          personal('power.control-attempt', ({ characterA, characterB }) => `באילו דרכים ${characterA} מנסה לשלוט ב־${characterB}?`),
          personal('power.b-power-over-a', ({ characterA, characterB }) => `איזה כוח יש ${l(characterB)} על ${characterA}?`),
          personal('power.powerless-action', ({ characterA, genderA }) => `מה ${characterA} עושה כאשר ${isFemale(genderA) ? 'היא מרגישה חסרת' : 'הוא מרגיש חסר'} כוח בקשר?`),
          personal('power.regain-power', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'עלולה' : 'עלול'} לעשות כדי להשיב ${isFemale(genderA) ? 'לעצמה' : 'לעצמו'} כוח?`),
          personal('power.a-advantage', ({ characterA, characterB }) => `איזה יתרון יש ל־${characterA} על ${characterB}?`),
          personal('power.b-advantage', ({ characterA, characterB }) => `איזה יתרון יש ל־${characterB} על ${characterA}?`),
        ],
      },
    ],
  },
  {
    id: 'boundaries',
    title: 'גבולות וקווים אדומים',
    blocks: [
      {
        type: 'personal',
        questions: [
          personal('boundaries.sets-boundary', ({ characterA, characterB, genderA }) => `איזה גבול ${characterA} ${isFemale(genderA) ? 'מציבה' : 'מציב'} ${l(characterB)}?`),
          personal('boundaries.violated-boundary', ({ characterA, characterB }) => `איזה גבול של ${characterA} נפרץ שוב ושוב בידי ${characterB}?`),
          personal('boundaries.never-allow', ({ characterA, characterB }) => `מה ${characterA} לעולם לא ירשה ${l(characterB)} לעשות?`),
          personal('boundaries.never-give-up', ({ characterA, genderA }) => `על מה ${characterA} לעולם לא ${isFemale(genderA) ? 'תוותר' : 'יוותר'} במערכת היחסים הזו?`),
          personal('boundaries.willing-endure', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מוכנה' : 'מוכן'} לסבול כדי לשמור על הקשר?`),
          personal('boundaries.not-willing-endure', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'אינה מוכנה' : 'אינו מוכן'} לסבול?`),
          personal('boundaries.red-line', ({ characterA, genderA }) => `מהו הקו האדום שאחריו ${characterA} ${isFemale(genderA) ? 'תתרחק או תנתק' : 'יתרחק או ינתק'} את הקשר?`),
          personal('boundaries.respects-b', ({ characterA, characterB, genderA }) => `האם ${characterA} ${isFemale(genderA) ? 'מכבדת' : 'מכבד'} את הגבולות של ${characterB}?`),
          personal('boundaries.wanted-boundary', ({ characterA, genderA }) => `איזה גבול ${characterA} ${isFemale(genderA) ? 'הייתה רוצה' : 'היה רוצה'} להציב אך ${isFemale(genderA) ? 'אינה מצליחה' : 'אינו מצליח'}?`),
        ],
      },
    ],
  },
  {
    id: 'conflict',
    title: 'רצונות וחיכוך',
    blocks: [
      {
        type: 'personal',
        label: 'רצון אישי',
        questions: [
          personal('conflict.character-goal', ({ characterA }) => `מה המטרה של ${characterA} במערכת היחסים הזו?`),
          personal('conflict.wants-to-happen', ({ characterA }) => `מה ${characterA} רוצה שיקרה בקשר?`),
          personal('conflict.avoidance', ({ characterA }) => `ממה ${characterA} רוצה להימנע?`),
        ],
      },
      {
        type: 'shared',
        questions: [
          shared('conflict.shared-friction', ({ characterA, characterB }) => `מהו החיכוך בין הרצונות של ${characterA} ושל ${characterB}?`),
          shared('conflict.incompatible-wants', (context) => `מדוע הרצונות ${their(context)} אינם יכולים להתקיים יחד במצב הנוכחי?`),
          shared('conflict.stakes', () => 'מה מונח על הכף עבור כל אחת מהדמויות?'),
        ],
      },
      {
        type: 'personal',
        label: 'פעולה ומחיר',
        questions: [
          personal('conflict.solving-action', ({ characterA }) => `מה ${characterA} עושה כדי לפתור את החיכוך?`),
          personal('conflict.worsening-action', ({ characterA }) => `מה ${characterA} עושה שמחריף את החיכוך?`),
          personal('conflict.concession', ({ characterA, genderA }) => `על מה ${characterA} ${isFemale(genderA) ? 'מוותרת' : 'מוותר'} כדי לפתור את החיכוך?`),
          personal('conflict.willing-give', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מוכנה' : 'מוכן'} לתת כדי לפתור את החיכוך?`),
          personal('conflict.willing-receive', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מוכנה' : 'מוכן'} לקבל ${m(characterB)} כדי לפתור את החיכוך?`),
          personal('conflict.demands', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'דורשת' : 'דורש'} ${m(characterB)}?`),
          personal('conflict.refuses-give', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'מסרבת' : 'מסרב'} לתת ${l(characterB)}?`),
          personal('conflict.gain-from-resolution', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'תרוויח' : 'ירוויח'} מפתרון החיכוך?`),
          personal('conflict.loss-from-resolution', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'תפסיד' : 'יפסיד'} בעקבות פתרון החיכוך?`),
          personal('conflict.if-unresolved', ({ characterA }) => `מה יקרה ${l(characterA)} אם החיכוך לא ייפתר?`),
          personal('conflict.ideal-resolution', ({ characterA }) => `מהו הפתרון האידיאלי מבחינת ${characterA}?`),
          personal('conflict.worst-resolution', ({ characterA }) => `מהו הפתרון הגרוע ביותר מבחינת ${characterA}?`),
        ],
      },
      {
        type: 'shared',
        label: 'סיכום החיכוך',
        questions: [
          shared('conflict.resolution', ({ characterA, characterB }) => `איך נפתר החיכוך בין ${characterA} ${l(characterB)}?`),
          shared('conflict.price-payer', () => 'מי משלם את המחיר העיקרי של הפתרון?'),
          shared('conflict.resolution-type', () => 'האם הפתרון אמיתי, זמני או מדומה?'),
          shared('conflict.unresolved-remains', () => 'מה נשאר בלתי פתור גם לאחר הפתרון?'),
        ],
      },
    ],
  },
  {
    id: 'patterns',
    title: 'דפוסים חוזרים',
    blocks: [
      {
        type: 'shared',
        questions: [
          shared('patterns.repeating-pattern', ({ characterA, characterB }) => `איזה דפוס חוזר מתקיים בין ${characterA} ${l(characterB)}?`),
          shared('patterns.trigger', (context) => `מה בדרך כלל מתחיל את העימות ${betweenThem(context)}?`),
          shared('patterns.reactions', () => 'כיצד כל אחת מהדמויות מגיבה, וכיצד התגובה שלה משפיעה על הדמות האחרת?'),
          shared('patterns.maintains', () => 'מה משמר את הדפוס גם כאשר שתי הדמויות נפגעות ממנו?'),
          shared('patterns.after-crisis', () => 'מה קורה בדרך כלל לאחר ריב או משבר?'),
          shared('patterns.usual-role', (context) => `מי בדרך כלל ${allFemale(context) ? 'מתקרבת ראשונה, מתנצלת, תוקפת, נסוגה או מתעלמת' : 'מתקרב ראשון, מתנצל, תוקף, נסוג או מתעלם'}?`),
          shared('patterns.goal-through-pattern', () => 'מה כל אחת מהדמויות מנסה להשיג באמצעות הדפוס הזה?'),
          shared('patterns.breaking-change', () => 'מה צריך להשתנות כדי שהדפוס יישבר?'),
        ],
      },
      {
        type: 'personal',
        questions: [
          personal('patterns.a-repetition', ({ characterA }) => `מה ${characterA} עושה שוב ושוב שמחזק את הדפוס?`),
          personal('patterns.a-reaction', ({ characterA, characterB, genderA }) => `כיצד ${characterA} ${isFemale(genderA) ? 'מגיבה' : 'מגיב'} להתנהגות של ${characterB}?`),
          personal('patterns.a-change', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'יכולה' : 'יכול'} לעשות אחרת כדי לשבור את הדפוס?`),
          personal('patterns.blind-spot', ({ characterA, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'אינה מבינה לגבי חלקה' : 'אינו מבין לגבי חלקו'} בדפוס?`),
        ],
      },
    ],
  },
  {
    id: 'external-view',
    title: 'המראה החיצוני של הקשר',
    blocks: [
      {
        type: 'shared',
        questions: [
          shared('external.perception', ({ characterA, characterB }) => `כיצד אנשים אחרים תופסים את הקשר בין ${characterA} ${l(characterB)}?`),
          shared('external.perception-gap', () => 'במה התפיסה החיצונית שונה מהמציאות?'),
          shared('external.public-behavior', (context) => `כיצד ${context.characterA} ו־${context.characterB} ${behaveMutually(context)} בנוכחות אחרים?`),
          shared('external.private-public-gap', (context) => `במה ההתנהגות ${their(context)} בפרטיות שונה מההתנהגות ${their(context)} בפומבי?`),
          shared('external.supporters', () => 'מי תומך בקשר?'),
          shared('external.opponents', () => 'מי מתנגד לקשר?'),
          shared('external.supporting-circumstances', () => 'אילו נסיבות חיצוניות מחזקות את הקשר?'),
          shared('external.threatening-circumstances', () => 'אילו נסיבות חיצוניות מאיימות על הקשר?'),
          shared('external.third-person', () => 'האם קיים אדם שלישי שמשפיע על מערכת היחסים?'),
          shared('external.environment-effect', () => 'כיצד החברה, המשפחה, מקום העבודה או הסביבה משפיעים על הקשר?'),
        ],
      },
    ],
  },
  {
    id: 'breaking-point',
    title: 'נקודת שבירה ובחירה',
    blocks: [
      {
        type: 'personal',
        questions: [
          personal('breaking.distance-trigger', ({ characterA, characterB }) => `מה עלול לגרום ${l(characterA)} להתרחק מ־${characterB} או לנתק את הקשר?`),
          personal('breaking.worst-b-action', ({ characterA, characterB, genderB }) => `מהו הדבר הגרוע ביותר ש־${characterB} ${isFemale(genderB) ? 'יכולה' : 'יכול'} לעשות ${l(characterA)}?`),
          personal('breaking.unforgivable', ({ characterA, characterB, genderA }) => `על מה ${characterA} לא ${isFemale(genderA) ? 'תהיה מסוגלת' : 'יהיה מסוגל'} לסלוח ${l(characterB)}?`),
          personal('breaking.choose-anyway', ({ characterA, characterB }) => `מה יגרום ${l(characterA)} לבחור ב־${characterB} למרות הכול?`),
          personal('breaking.act-against', ({ characterA, characterB }) => `מה יגרום ${l(characterA)} לפעול נגד ${characterB}?`),
          personal('breaking.risk-for-b', ({ characterA, characterB, genderA }) => `מה ${characterA} ${isFemale(genderA) ? 'תהיה מוכנה' : 'יהיה מוכן'} לסכן למען ${characterB}?`),
          personal('breaking.not-risk', ({ characterA, genderA }) => `מה ${characterA} לא ${isFemale(genderA) ? 'תהיה מוכנה' : 'יהיה מוכן'} לסכן?`),
          personal('breaking.self-over-relationship', ({ characterA, genderA }) => `באיזה מצב ${characterA} ${isFemale(genderA) ? 'תעדיף את עצמה' : 'יעדיף את עצמו'} על פני הקשר?`),
          personal('breaking.relationship-over-self', ({ characterA, genderA }) => `באיזה מצב ${characterA} ${isFemale(genderA) ? 'תעדיף את הקשר על פני עצמה' : 'יעדיף את הקשר על פני עצמו'}?`),
          personal('breaking.hardest-test', () => 'מהו המבחן הקשה ביותר שהקשר יכול לעבור?'),
        ],
      },
    ],
  },
  {
    id: 'development',
    title: 'התפתחות מערכת היחסים לאורך העלילה',
    blocks: [
      {
        type: 'shared',
        questions: [
          shared('development.opening-state', () => 'איך מערכת היחסים נראית בתחילת הסיפור?'),
          shared('development.initial-opinions', () => 'מה כל אחת מהדמויות חושבת על האחרת בתחילת הסיפור?'),
          shared('development.first-change-event', () => 'מהו האירוע הראשון שמשנה את מערכת היחסים?'),
          shared('development.closer', ({ characterA, characterB }) => `מה מקרב בין ${characterA} ${l(characterB)}?`),
          shared('development.farther', (context) => `מה מרחיק ${betweenThem(context)}?`),
          shared('development.low-point', () => 'מהי נקודת השפל של מערכת היחסים?'),
          shared('development.strongest-point', () => 'מהי נקודת הקרבה, ההבנה, השותפות או העימות החזקה ביותר?'),
          shared('development.new-view', () => 'מתי אחת הדמויות רואה לראשונה את האחרת בצורה חדשה?'),
          shared('development.learning', () => 'מה כל אחת מהדמויות לומדת מהקשר?'),
          shared('development.change-effect', () => 'כיצד הקשר משנה כל אחת מהדמויות?'),
          shared('development.ending-state', () => 'איך מערכת היחסים נראית בסיום הסיפור?'),
          shared('development.final-shape', () => 'האם הקשר התחזק, נחלש, השתנה, הסתיים או קיבל צורה חדשה?'),
          shared('development.after-ending', ({ characterA, characterB }) => `מה נשאר בין ${characterA} ${l(characterB)} לאחר סיום העלילה?`),
        ],
      },
    ],
  },
];
