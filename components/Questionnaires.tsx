
import React, { useEffect, useRef, useState } from 'react';
import { QuestionnaireEntry, Book, CharacterEntry, DevelopmentStage, SpecialItem, UniquePower, SpecificLocation } from '../types';
import {
  Plus, Trash2, User, MapPin, Clock, Wand2, Sparkles, Loader2, 
  Save, X, ChevronLeft, ChevronDown, UserRound, UserRoundSearch, FileText, 
  Download, LayoutList, Globe, Home, Eye, PencilLine, ClipboardList,
  Search,
  Zap,
  Users,
  PanelLeftOpen,
  MessageSquarePlus,
  Image as ImageIcon,
  Camera,
  RefreshCw
} from 'lucide-react';
import { isElectron, openDesktopImageDialog } from '../src/platform';
import { compressImageFile } from '../src/image-utils';
import { QUESTIONNAIRE_NAV_ITEMS, type QuestionnaireTabId } from './questionnaireNavigation';
import RelationshipQuestionnaire from './RelationshipQuestionnaire';
import QuestionnaireFields from './questionnaires/QuestionnaireFields';
import { CategoryActions, CategorySidebar, MobileCategorySelect } from './questionnaires/QuestionnaireCategoryNavigation';
import { useScrollToQuestionnaireCategoryTop } from './questionnaires/useScrollToQuestionnaireCategoryTop';
import { isQuestionnaireCategoryChange, usesAccordionNavigation } from './questionnaires/categoryNavigationState';
import {
  BACKGROUND_TYPES,
  CHARACTER_ROLES,
  DEVELOPMENT_STAGE_QUESTIONS,
  FANTASY_WORLD_QUESTIONS,
  FEMALE_QUESTIONS_CONFIG,
  MACRO_PLACE_QUESTIONS,
  MALE_QUESTIONS_CONFIG,
  MICRO_PLACE_QUESTIONS,
  PERIOD_QUESTIONS,
  SPECIAL_ITEM_QUESTIONS,
  SPECIFIC_LOCATION_QUESTIONS,
  TWIST_QUESTIONS,
  UNIQUE_POWER_QUESTIONS,
} from './questionnaires/questionnaireDefinitions';
import PeriodQuestionnaire from './questionnaires/PeriodQuestionnaire';
import CharacterQuestionnaire from './questionnaires/CharacterQuestionnaire';
import PlaceQuestionnaire from './questionnaires/PlaceQuestionnaire';
import FantasyWorldQuestionnaire from './questionnaires/FantasyWorldQuestionnaire';
import BackgroundQuestionnaire from './questionnaires/BackgroundQuestionnaire';
import {
  getEditableQuestionnaireName,
  getQuestionnaireDisplayName,
  resolveQuestionnaireNameOnBlur,
} from './questionnaires/questionnaireNames';
import { createCharacterEntry } from '../src/characters/characterFactory';
import CharacterImportDialog from './questionnaires/CharacterImportDialog';
import CharacterSyncDialog from './questionnaires/CharacterSyncDialog';
import ExistingCharacterQuestionnaireDialog from './questionnaires/ExistingCharacterQuestionnaireDialog';
import CharacterRemovalDialog from './questionnaires/CharacterRemovalDialog';
import { isCharacterVisibleInQuestionnaire } from '../src/characters/characterQuestionnaireVisibility';

interface QuestionnairesProps {
  allBooks: Book[];
  activeBookId: string;
  characters: CharacterEntry[];
  places: QuestionnaireEntry[];
  periods: QuestionnaireEntry[];
  twists: QuestionnaireEntry[];
  fantasyWorlds: QuestionnaireEntry[];
  backgrounds: QuestionnaireEntry[];
  relationships: any[];
  onUpdateCharacters: (entries: CharacterEntry[]) => void;
  onDeleteCharacter: (characterId: string) => void;
  onHideCharacterFromQuestionnaire: (characterId: string) => void;
  onRestoreCharacterToQuestionnaire: (characterId: string) => void;
  onUpdatePlaces: (entries: QuestionnaireEntry[]) => void;
  onUpdatePeriods: (entries: QuestionnaireEntry[]) => void;
  onUpdateTwists: (entries: QuestionnaireEntry[]) => void;
  onUpdateFantasyWorlds: (entries: QuestionnaireEntry[]) => void;
  onUpdateBackgrounds: (entries: QuestionnaireEntry[]) => void;
  onUpdateRelationships: (relationships: any[]) => void;
  onApplyCharacterSyncBooks: (books: Book[]) => void;
  initialTab?: QuestionnaireTabId;
  initialSelectedEntryId?: string | null;
  onTabChange?: (tab: QuestionnaireTabId) => void;
  onEntrySelect?: (id: string | null) => void;
}

const normalizeEntryForTab = (entry: QuestionnaireEntry, tab: QuestionnaireTabId): QuestionnaireEntry => {
  const defaultData: Record<string, string> = {};
  if (tab === 'characters') {
    defaultData.gender = 'female';
  } else if (tab === 'places') {
    defaultData.placeType = 'macro';
  }

  return {
    ...entry,
    name: getEditableQuestionnaireName(entry.name),
    data: {
      ...defaultData,
      ...(entry.data || {})
    },
    customFields: entry.customFields || []
  };
};

const getRelationshipLabel = (relationship: any, characters: QuestionnaireEntry[]) => {
  const char1Name = characters.find(char => char.id === relationship.char1Id)?.name || 'דמות ראשונה';
  const char2Name = characters.find(char => char.id === relationship.char2Id)?.name || 'דמות שנייה';
  return `${char1Name} ו־${char2Name}`;
};

const Questionnaires: React.FC<QuestionnairesProps> = ({ 
  allBooks, activeBookId, characters, places, periods, twists, fantasyWorlds, backgrounds, relationships,
  onUpdateCharacters, onDeleteCharacter, onHideCharacterFromQuestionnaire, onRestoreCharacterToQuestionnaire, onUpdatePlaces, onUpdatePeriods, onUpdateTwists, onUpdateFantasyWorlds, onUpdateBackgrounds, onUpdateRelationships,
  onApplyCharacterSyncBooks,
  initialTab, initialSelectedEntryId, onTabChange, onEntrySelect
}) => {
  const [activeTab, setActiveTab] = useState<QuestionnaireTabId>(initialTab || 'characters');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialSelectedEntryId || null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(false);
  const [mode, setMode] = useState<'edit' | 'view'>('view');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isCharacterAddMenuOpen, setIsCharacterAddMenuOpen] = useState(false);
  const [isCharacterImportOpen, setIsCharacterImportOpen] = useState(false);
  const [isExistingCharacterQuestionnaireOpen, setIsExistingCharacterQuestionnaireOpen] = useState(false);
  const [isCharacterSyncOpen, setIsCharacterSyncOpen] = useState(false);
  const [characterSyncFeedback, setCharacterSyncFeedback] = useState('');
  const [characterRemovalCandidateId, setCharacterRemovalCandidateId] = useState<string | null>(null);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const { categoryTopRef, scrollToCategoryTop } = useScrollToQuestionnaireCategoryTop<HTMLDivElement>();
  const accordionCategoryAnchorsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  
  const [newQuestionLabel, setNewQuestionLabel] = useState('');

  useEffect(() => {
    if (!initialTab || initialTab === activeTab) return;
    setActiveTab(initialTab);
    setSelectedEntryId(null);
    setActiveCategory(null);
    setCurrentCategoryIndex(0);
    setQuestionSearchQuery('');
    setIsSearchActive(false);
    setIsCategoriesVisible(false);
    setMode('view');
    onEntrySelect?.(null);
  }, [initialTab, activeTab, onEntrySelect]);

  const handleTabChange = (tab: QuestionnaireTabId) => {
    setActiveTab(tab);
    setSelectedEntryId(null);
    setActiveCategory(null);
    setCurrentCategoryIndex(0);
    setQuestionSearchQuery('');
    setIsSearchActive(false);
    setIsCategoriesVisible(false);
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
    setIsCategoriesVisible(false);
    onEntrySelect?.(id);
  };

  const isRelationshipsTab = activeTab === 'relationships';
  const questionnaireCharacters = characters.filter(isCharacterVisibleInQuestionnaire);
  const rawEntries = activeTab === 'characters' ? questionnaireCharacters : activeTab === 'places' ? places : activeTab === 'periods' ? periods : activeTab === 'twists' ? twists : activeTab === 'fantasyWorlds' ? fantasyWorlds : backgrounds;
  const entries = rawEntries.map(entry => normalizeEntryForTab(entry, activeTab));
  const updateFn = activeTab === 'characters' ? onUpdateCharacters : activeTab === 'places' ? onUpdatePlaces : activeTab === 'periods' ? onUpdatePeriods : activeTab === 'twists' ? onUpdateTwists : activeTab === 'fantasyWorlds' ? onUpdateFantasyWorlds : onUpdateBackgrounds;
  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  const deleteEntry = (entryId: string, genericConfirmation: string, clearGenericSelectionOnCancel = false) => {
    if (activeTab === 'characters') {
      setCharacterRemovalCandidateId(entryId);
      return;
    }

    if (!confirm(genericConfirmation)) {
      if (clearGenericSelectionOnCancel && selectedEntryId === entryId) {
        handleEntrySelect(null);
      }
      return;
    }

    updateFn(entries.filter(entry => entry.id !== entryId));
    if (selectedEntryId === entryId) handleEntrySelect(null);
  };
  const selectedCharacter = activeTab === 'characters'
    ? characters.find(character => character.id === selectedEntryId)
    : undefined;
  const characterRemovalCandidate = characters.find(character => character.id === characterRemovalCandidateId) || null;

  const finishCharacterRemoval = (characterId: string) => {
    setCharacterRemovalCandidateId(null);
    if (selectedEntryId === characterId) {
      setIsCharacterSyncOpen(false);
      setCharacterSyncFeedback('');
      setMode('view');
      handleEntrySelect(null);
    }
  };

  const hideCharacterFromQuestionnaire = (characterId: string) => {
    onHideCharacterFromQuestionnaire(characterId);
    finishCharacterRemoval(characterId);
  };

  const deleteCharacterFromBookAndMaps = (characterId: string) => {
    onDeleteCharacter(characterId);
    finishCharacterRemoval(characterId);
  };
  const selectedRelationship = isRelationshipsTab ? relationships.find(rel => rel.id === selectedEntryId) : null;
  
  const currentGender = selectedEntry?.data?.gender || 'female';
  const currentPlaceType = selectedEntry?.data?.placeType || 'macro';

  useEffect(() => {
    if (!characterSyncFeedback) return;
    const timeout = window.setTimeout(() => setCharacterSyncFeedback(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [characterSyncFeedback]);

  const questionsConfig = activeTab === 'characters' 
    ? (currentGender === 'male' ? MALE_QUESTIONS_CONFIG : FEMALE_QUESTIONS_CONFIG)
    : activeTab === 'places' 
      ? (currentPlaceType === 'macro' ? MACRO_PLACE_QUESTIONS : MICRO_PLACE_QUESTIONS)
      : activeTab === 'periods' ? PERIOD_QUESTIONS : activeTab === 'twists' ? TWIST_QUESTIONS : activeTab === 'fantasyWorlds' ? FANTASY_WORLD_QUESTIONS : [];

  const categories = Array.from(new Set(questionsConfig.map(q => q.category))).filter(c => c !== "");
  if (activeTab === 'backgrounds' && selectedEntry) {
    categories.push("תוכן");
  }
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
  const usesQuestionnaireAccordion = usesAccordionNavigation(activeTab);

  const handleCategorySelect = (index: number) => {
    if (!isQuestionnaireCategoryChange({
      mode,
      categories,
      currentCategoryIndex,
      activeCategory,
      nextIndex: index,
    })) return;

    setCurrentCategoryIndex(index);
    setActiveCategory(mode === 'edit' ? null : categories[index]);
    scrollToCategoryTop(
      usesQuestionnaireAccordion
        ? accordionCategoryAnchorsRef.current[categories[index]]
        : null,
    );
  };

  const handleShowAllCategories = () => {
    if (activeCategory === null) return;
    setActiveCategory(null);
    scrollToCategoryTop();
  };

  const renderQuestionnaireContent = (content: React.ReactNode) => {
    const accordionProps = {
      categories,
      activeCategoryIndex: currentCategoryIndex,
      onSelectCategory: handleCategorySelect,
      onRegisterCategoryAnchor: (category: string, element: HTMLButtonElement | null) => {
        accordionCategoryAnchorsRef.current[category] = element;
      },
    };

    if (activeTab === 'characters') return <CharacterQuestionnaire {...accordionProps}>{content}</CharacterQuestionnaire>;
    if (activeTab === 'places') return <PlaceQuestionnaire {...accordionProps}>{content}</PlaceQuestionnaire>;
    if (activeTab === 'fantasyWorlds') return <FantasyWorldQuestionnaire {...accordionProps}>{content}</FantasyWorldQuestionnaire>;
    return <BackgroundQuestionnaire>{content}</BackgroundQuestionnaire>;
  };

  const Icon = activeTab === 'characters' ? User : activeTab === 'relationships' ? Users : activeTab === 'places' ? MapPin : activeTab === 'periods' ? Clock : activeTab === 'twists' ? Zap : activeTab === 'fantasyWorlds' ? Wand2 : FileText;
  const addEntryLabel = isRelationshipsTab
    ? 'הוסף מערכת יחסים'
    : activeTab === 'characters'
      ? 'הוסף דמות'
      : activeTab === 'places'
        ? 'הוסף מקום'
        : activeTab === 'periods'
          ? 'הוסף תקופה'
          : activeTab === 'twists'
            ? 'הוסף טוויסט'
            : activeTab === 'fantasyWorlds'
              ? 'הוסף עולם'
              : 'הוסף פריט';
  const entryMenuLabel = isRelationshipsTab
    ? 'מערכות יחסים'
    : activeTab === 'characters'
      ? 'דמויות'
      : activeTab === 'places'
        ? 'מקומות'
        : activeTab === 'periods'
          ? 'תקופות'
          : activeTab === 'twists'
            ? 'טוויסטים'
            : activeTab === 'fantasyWorlds'
              ? 'עולמות'
              : 'רקע';
  const mobileEntrySelectValue = activeTab === 'backgrounds'
    ? (selectedEntry?.role ? `background:${selectedEntry.role}` : '')
    : (selectedEntryId || '');

  const handleMobileEntrySelect = (value: string) => {
    if (!value) {
      handleEntrySelect(null);
      return;
    }

    if (value === '__add__') {
      if (isRelationshipsTab) {
        addRelationship();
      } else if (activeTab !== 'backgrounds') {
        addEntry();
      }
      return;
    }

    if (activeTab === 'backgrounds' && value.startsWith('background:')) {
      const typeId = value.replace('background:', '');
      const type = BACKGROUND_TYPES.find(bgType => bgType.id === typeId);
      if (!type) return;

      let entry = backgrounds.find(e => e.role === type.id);
      if (!entry) {
        entry = {
          id: `bg-${type.id}`,
          name: type.label,
          role: type.id,
          data: {},
          loreItems: [],
          customFields: []
        };
        onUpdateBackgrounds([...backgrounds, entry]);
      }
      handleEntrySelect(entry.id);
      setMode('edit');
      return;
    }

    handleEntrySelect(value);
  };

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
    
    if (isElectron) {
      console.log('Renderer: Electron environment detected, using IPC dialog');
      try {
        const dataUrl = await openDesktopImageDialog();
        
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
      try {
        const { dataUrl } = await compressImageFile(file, 900, 0.76);
        updateEntry({ imageUrl: dataUrl });
      } catch (error) {
        console.error('Renderer: Image compression failed:', error);
      } finally {
        if (e?.target) e.target.value = '';
      }
    } else {
      console.log('Renderer: No file selected in standard input');
    }
  };

  const handleRemoveImage = () => {
    if (!selectedEntry) return;
    updateEntry({ imageUrl: undefined });
  };

  const createNewCharacter = () => {
    const newEntry = createCharacterEntry();
    onUpdateCharacters([...characters, newEntry]);
    handleEntrySelect(newEntry.id);
    setMode('edit');
    setIsCharacterAddMenuOpen(false);
  };

  const addEntry = () => {
    if (activeTab === 'characters') {
      setIsCharacterAddMenuOpen(true);
      return;
    }

    const newEntry: QuestionnaireEntry = {
          id: `q-${Date.now()}`,
          name: activeTab === 'places' ? 'מקום חדש' : activeTab === 'periods' ? 'תקופה חדשה' : activeTab === 'twists' ? 'טוויסט חדש' : 'עולם פנטזיה חדש',
          data: activeTab === 'places'
            ? { placeType: 'macro' }
            : {},
          customFields: []
        };
    updateFn([...entries, newEntry]);
    handleEntrySelect(newEntry.id);
    setMode('edit');
  };

  const addRelationship = () => {
    const newRelationship = {
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

    onUpdateRelationships([newRelationship, ...relationships]);
    handleEntrySelect(newRelationship.id);
    setMode('edit');
  };

  const updateRelationship = (relationshipId: string, updates: Record<string, any>) => {
    onUpdateRelationships(relationships.map(rel => rel.id === relationshipId ? { ...rel, ...updates } : rel));
  };

  const removeRelationship = (relationshipId: string) => {
    onUpdateRelationships(relationships.filter(rel => rel.id !== relationshipId));
    if (selectedEntryId === relationshipId) {
      handleEntrySelect(null);
    }
  };

  const updateEntry = (updates: Partial<QuestionnaireEntry>) => {
    if (!selectedEntryId) return;
    if (activeTab === 'characters') {
      onUpdateCharacters(characters.map(character =>
        character.id === selectedEntryId ? { ...character, ...updates } : character
      ));
      return;
    }
    updateFn(entries.map(entry => entry.id === selectedEntryId ? { ...entry, ...updates } : entry));
  };

  const handleEntryNameBlur = () => {
    if (!selectedEntry) return;
    const resolvedName = resolveQuestionnaireNameOnBlur(selectedEntry.name, activeTab);
    if (resolvedName !== selectedEntry.name) updateEntry({ name: resolvedName });
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

  const addLoreItem = () => {
    if (!selectedEntry) return;
    const newItem = {
      id: `lore-${Date.now()}`,
      title: `פריט חדש ${ (selectedEntry.loreItems?.length || 0) + 1}`,
      content: ''
    };
    const updatedLore = [...(selectedEntry.loreItems || []), newItem];
    updateEntry({ loreItems: updatedLore });
  };

  const updateLoreItem = (loreId: string, updates: Partial<{ title: string; content: string }>) => {
    if (!selectedEntry) return;
    const updatedLore = (selectedEntry.loreItems || []).map(l => 
      l.id === loreId ? { ...l, ...updates } : l
    );
    updateEntry({ loreItems: updatedLore });
  };

  const removeLoreItem = (loreId: string) => {
    if (!selectedEntry) return;
    const updatedLore = (selectedEntry.loreItems || []).filter(l => l.id !== loreId);
    updateEntry({ loreItems: updatedLore });
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

    const blob = new Blob(["\ufeff", text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEntry.name}-${activeTab}-export.txt`;
    a.click();
  };

  const renderCharacterSyncButton = () => activeTab === 'characters' && selectedCharacter ? (
    <button
      type="button"
      onClick={() => setIsCharacterSyncOpen(true)}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] px-3 py-2 text-sm font-bold text-[var(--theme-primary)] shadow-sm transition-all hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20"
      title="סנכרון מידע כללי בין ספרים"
    >
      <RefreshCw size={17} />
      <span>סנכרון מידע</span>
    </button>
  ) : null;

  return (
    <div className="min-h-full lg:h-full flex flex-col p-4 sm:p-6 gap-4 sm:gap-6 max-w-[1600px] mx-auto">
      <div className="hidden justify-center flex-shrink-0 sm:flex">
        <label className="hidden">
          <select
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as QuestionnaireTabId)}
            className="w-full appearance-none rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] py-3.5 pr-12 pl-10 text-sm font-bold text-[var(--theme-primary)] shadow-lg outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/15"
            aria-label="שאלונים"
          >
            <option value={activeTab}>שאלונים</option>
            {QUESTIONNAIRE_NAV_ITEMS.map(tab => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute left-4 text-[var(--theme-primary)]/50" />
        </label>

        <div className="hidden bg-[var(--theme-card)]/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg sm:flex gap-1 border border-[var(--theme-border)]/50 overflow-x-auto max-w-full">
          {QUESTIONNAIRE_NAV_ITEMS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] shadow-md' : 'text-[var(--theme-primary)]/60 hover:bg-[var(--theme-secondary)]'}`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="relative flex w-full items-center lg:hidden">
        <Icon size={18} className="pointer-events-none absolute right-4 text-[var(--theme-primary)]/60" />
        <select
          value={mobileEntrySelectValue}
          onChange={(e) => handleMobileEntrySelect(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] py-3.5 pr-12 pl-10 text-sm font-bold text-[var(--theme-primary)] shadow-sm outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/15"
          aria-label={entryMenuLabel}
        >
          <option value="">{entryMenuLabel}</option>
          {activeTab === 'backgrounds' ? (
            BACKGROUND_TYPES.map(type => (
              <option key={type.id} value={`background:${type.id}`}>{type.label}</option>
            ))
          ) : isRelationshipsTab ? (
            relationships.map(rel => (
              <option key={rel.id} value={rel.id}>{getRelationshipLabel(rel, characters)}</option>
            ))
          ) : (
            entries.map(entry => (
              <option key={entry.id} value={entry.id}>{getQuestionnaireDisplayName(entry.name, activeTab)}</option>
            ))
          )}
          {activeTab !== 'backgrounds' && (
            <option value="__add__">+ {addEntryLabel}</option>
          )}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute left-4 text-[var(--theme-primary)]/50" />
      </label>

      {selectedEntry && categories.length > 0 && !usesQuestionnaireAccordion && (
        <MobileCategorySelect
          categories={categories}
          currentCategoryIndex={currentCategoryIndex}
          activeCategory={activeCategory}
          mode={mode}
          onSelect={handleCategorySelect}
          onShowAll={handleShowAllCategories}
        />
      )}

      <div className="flex-none flex flex-col lg:flex-1 lg:flex-row gap-6 lg:min-h-0">
        <div className="hidden w-64 flex-col gap-4 flex-shrink-0 lg:flex">
          {activeTab === 'backgrounds' ? (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-black text-[var(--theme-accent)]/40 uppercase tracking-widest px-2 mb-1">קטגוריות רקע</div>
              {BACKGROUND_TYPES.map(type => {
                const isSelected = selectedEntry?.role === type.id;
                return (
                  <button 
                    key={type.id}
                    onClick={() => {
                      let entry = backgrounds.find(e => e.role === type.id);
                      if (!entry) {
                        entry = {
                          id: `bg-${type.id}`,
                          name: type.label,
                          role: type.id,
                          data: {},
                          loreItems: [],
                          customFields: []
                        };
                        onUpdateBackgrounds([...backgrounds, entry]);
                      }
                      handleEntrySelect(entry.id);
                      setMode('edit');
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'bg-[var(--theme-secondary)] border-[var(--theme-primary)]/30 shadow-sm' : 'bg-[var(--theme-card)] border-transparent hover:border-[var(--theme-border)]/50'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <type.icon size={16} className={isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/30'} />
                      <span className={`font-bold text-sm truncate ${isSelected ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)]/70'}`}>{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : isRelationshipsTab ? (
            <button 
              onClick={addRelationship}
              className="flex items-center justify-center gap-2 p-4 bg-[var(--theme-card)] border-2 border-dashed border-[var(--theme-border)]/50 rounded-2xl text-[var(--theme-primary)] font-bold hover:bg-[var(--theme-secondary)] hover:border-[var(--theme-primary)]/40 transition-all shadow-sm"
            >
              <Plus size={20} />
              <span>הוסף מערכת יחסים</span>
            </button>
          ) : (
            <button 
              onClick={addEntry}
              className="flex items-center justify-center gap-2 p-4 bg-[var(--theme-card)] border-2 border-dashed border-[var(--theme-border)]/50 rounded-2xl text-[var(--theme-primary)] font-bold hover:bg-[var(--theme-secondary)] hover:border-[var(--theme-primary)]/40 transition-all shadow-sm"
            >
              <Plus size={20} />
              <span>הוסף {activeTab === 'characters' ? 'דמות' : activeTab === 'places' ? 'מקום' : activeTab === 'periods' ? 'תקופה' : activeTab === 'twists' ? 'טוויסט' : 'עולם'}</span>
            </button>
          )}
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {isRelationshipsTab ? (
              relationships.map(rel => (
                <div 
                  key={rel.id}
                  onClick={() => handleEntrySelect(rel.id)}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === rel.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-primary)]/30 shadow-sm' : 'bg-[var(--theme-card)] border-transparent hover:border-[var(--theme-border)]/50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Users size={16} className={selectedEntryId === rel.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/30'} />
                    <span className={`font-bold text-sm truncate ${selectedEntryId === rel.id ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)]/70'}`}>
                      {getRelationshipLabel(rel, characters)}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('למחוק את מערכת היחסים?')) removeRelationship(rel.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : activeTab === 'characters' ? (
              CHARACTER_ROLES.map(role => {
                const roleEntries = entries.filter(e => e.role === role.id || (!e.role && role.id === 'others'));
                if (roleEntries.length === 0) return null;
                
                return (
                  <div key={role.id} className="space-y-2">
                    <h4 className="text-[10px] font-black text-[var(--theme-accent)]/40 uppercase tracking-widest px-2">{role.label}</h4>
                    {roleEntries.map(entry => (
                      <div 
                        key={entry.id}
                        onClick={() => handleEntrySelect(entry.id)}
                        className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-primary)]/30 shadow-sm' : 'bg-[var(--theme-card)] border-transparent hover:border-[var(--theme-border)]/50'}`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {entry.imageUrl ? (
                            <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-[var(--theme-border)]/30" />
                          ) : (
                            <Icon size={16} className={selectedEntryId === entry.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/30'} />
                          )}
                          <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)]/70'}`}>{getQuestionnaireDisplayName(entry.name, activeTab)}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id, 'למחוק?', true); }}
                          className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                          title={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                          aria-label={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : activeTab === 'backgrounds' ? (
              null // Categories are handled above for backgrounds
            ) : activeTab === 'places' ? (
              entries.map(entry => (
                <div 
                  key={entry.id}
                  onClick={() => handleEntrySelect(entry.id)}
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-primary)]/30 shadow-sm' : 'bg-[var(--theme-card)] border-transparent hover:border-[var(--theme-border)]/50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-[var(--theme-border)]/30" />
                    ) : (
                      <Globe size={16} className="text-[var(--theme-primary)]/40" />
                    )}
                    <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)]/70'}`}>{getQuestionnaireDisplayName(entry.name, activeTab)}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id, 'למחוק?', true); }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                    title="מחיקת פריט"
                    aria-label="מחיקת פריט"
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
                  className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedEntryId === entry.id ? 'bg-[var(--theme-secondary)] border-[var(--theme-primary)]/30 shadow-sm' : 'bg-[var(--theme-card)] border-transparent hover:border-[var(--theme-border)]/50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} className="w-6 h-6 rounded-full object-cover border border-[var(--theme-border)]/30" />
                    ) : (
                      <Icon size={16} className={selectedEntryId === entry.id ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-primary)]/30'} />
                    )}
                    <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)]/70'}`}>{getQuestionnaireDisplayName(entry.name, activeTab)}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id, 'למחוק?', true); }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                    title="מחיקת פריט"
                    aria-label="מחיקת פריט"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedEntry && mode === 'edit' && isCategoriesVisible && !usesQuestionnaireAccordion && (
          <CategorySidebar
            categories={categories}
            currentCategoryIndex={currentCategoryIndex}
            activeCategory={activeCategory}
            onClose={() => setIsCategoriesVisible(false)}
            onSelect={handleCategorySelect}
            onShowAll={handleShowAllCategories}
          />
        )}

        <div className="flex-none lg:flex-1 bg-[var(--theme-card)] rounded-[2.5rem] shadow-2xl border border-[var(--theme-border)]/50 overflow-visible lg:overflow-y-auto flex flex-col min-w-0 transition-all duration-300 scroll-smooth">
          {selectedRelationship ? (
            <>
              <div className="p-8 border-b border-[var(--theme-border)]/30 bg-[var(--theme-secondary)]/10 flex-shrink-0">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl shadow-md border-2 border-[var(--theme-border)]/50 bg-[var(--theme-card)] flex items-center justify-center">
                      <Users size={24} className="text-[var(--theme-primary)]/25" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-[var(--theme-accent)] handwritten text-5xl">
                        {getRelationshipLabel(selectedRelationship, characters)}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--theme-primary)]/50">
                        שאלון מערכת היחסים נשמר יחד עם הספר ומופיע גם בתכנון העלילה.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('למחוק את מערכת היחסים?')) removeRelationship(selectedRelationship.id);
                    }}
                    className="self-start p-2.5 bg-[var(--theme-card)] border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                    title="מחיקת מערכת יחסים"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-none overflow-visible p-4 sm:p-8">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-[var(--theme-accent)]/60">דמות ראשונה</span>
                      <select
                        value={selectedRelationship.char1Id || ''}
                        onChange={(e) => updateRelationship(selectedRelationship.id, { char1Id: e.target.value })}
                        className="w-full rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-secondary)]/20 px-4 py-3 text-sm font-bold text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                      >
                        <option value="">בחרו דמות...</option>
                        {characters.map(character => (
                          <option key={character.id} value={character.id}>{character.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-bold text-[var(--theme-accent)]/60">דמות שנייה</span>
                      <select
                        value={selectedRelationship.char2Id || ''}
                        onChange={(e) => updateRelationship(selectedRelationship.id, { char2Id: e.target.value })}
                        className="w-full rounded-2xl border border-[var(--theme-border)]/50 bg-[var(--theme-secondary)]/20 px-4 py-3 text-sm font-bold text-[var(--theme-primary)] outline-none transition-all focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20"
                      >
                        <option value="">בחרו דמות...</option>
                        {characters.map(character => (
                          <option key={character.id} value={character.id}>{character.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <RelationshipQuestionnaire
                    rel={selectedRelationship}
                    relationships={relationships}
                    onUpdateRelationships={onUpdateRelationships}
                    characters={characters}
                  />
                </div>
              </div>
            </>
          ) : selectedEntry ? (
            <>
              <div className="p-8 border-b border-[var(--theme-border)]/30 bg-[var(--theme-secondary)]/10 flex-shrink-0">
                <div className="flex flex-col items-stretch gap-4">
                  {mode === 'edit' && (
                    <div className="flex items-center justify-start gap-2" dir="rtl">
                      <div className="relative group/img shrink-0">
                        <div className="w-20 h-20 rounded-2xl shadow-sm border border-[var(--theme-border)]/50 overflow-hidden bg-[var(--theme-card)] flex items-center justify-center relative">
                          {selectedEntry.imageUrl ? (
                            <img src={selectedEntry.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <Icon size={30} className="text-[var(--theme-primary)]/20" />
                          )}
                          <label
                            className="absolute inset-0 flex items-center justify-center bg-[var(--theme-primary)]/40 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer text-[var(--theme-card)]"
                            onClick={(e) => {
                              if (isElectron) {
                                e.preventDefault();
                                handleImageUpload(null as any);
                              }
                            }}
                            title="תמונה"
                          >
                            <Camera size={26} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                        </div>
                        {selectedEntry.imageUrl && (
                          <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-[var(--theme-card)] text-red-500 p-1 rounded-full shadow-md border border-red-100 hover:bg-red-50 transition-all z-10"
                            title="הסרת תמונה"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setMode('view')}
                        className="p-2.5 bg-[var(--theme-card)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)] rounded-xl hover:bg-[var(--theme-secondary)] transition-all shadow-sm"
                        title="תצוגת תעודת זהות"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={exportCurrentEntry}
                        className="p-2.5 bg-[var(--theme-card)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)] rounded-xl hover:bg-[var(--theme-secondary)] transition-all shadow-sm"
                        title="ייצוא נתונים"
                      >
                        <Download size={18} />
                      </button>
                      {renderCharacterSyncButton()}
                      <div className="flex items-center gap-2">
                        {isSearchActive && (
                          <input
                            type="text"
                            placeholder="חפש שאלה..."
                            value={questionSearchQuery}
                            onChange={(e) => setQuestionSearchQuery(e.target.value)}
                            className="bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none w-32 sm:w-40 animate-in slide-in-from-left-2"
                            autoFocus
                          />
                        )}
                        <button
                          onClick={() => setIsSearchActive(!isSearchActive)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm border ${isSearchActive ? 'bg-[var(--theme-secondary)] text-[var(--theme-primary)] border-[var(--theme-primary)]/30' : 'bg-[var(--theme-card)] text-[var(--theme-primary)] border-[var(--theme-border)]/50 hover:bg-[var(--theme-secondary)]'}`}
                          title="חיפוש שאלה"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                      <button
                        onClick={() => deleteEntry(selectedEntry.id, 'למחוק את כל הפריט?')}
                        className="p-2.5 bg-[var(--theme-card)] border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                        title={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                        aria-label={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  {mode === 'view' && (
                    <div className="flex items-center justify-start gap-2" dir="rtl">
                      <div className="w-20 h-20 rounded-2xl shadow-sm border border-[var(--theme-border)]/50 overflow-hidden bg-[var(--theme-card)] flex items-center justify-center shrink-0">
                        {selectedEntry.imageUrl ? (
                          <img src={selectedEntry.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={30} className="text-[var(--theme-primary)]/20" />
                        )}
                      </div>
                      <button
                        onClick={() => setMode('edit')}
                        className="p-2.5 bg-[var(--theme-primary)] border border-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl hover:opacity-90 transition-all shadow-sm"
                        title="עריכת פרטים"
                      >
                        <PencilLine size={18} />
                      </button>
                      <div className="flex items-center gap-2">
                        {isSearchActive && (
                          <input
                            type="text"
                            placeholder="חפש שאלה..."
                            value={questionSearchQuery}
                            onChange={(e) => setQuestionSearchQuery(e.target.value)}
                            className="bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none w-32 sm:w-40 animate-in slide-in-from-left-2"
                            autoFocus
                          />
                        )}
                        <button
                          onClick={() => setIsSearchActive(!isSearchActive)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm border ${isSearchActive ? 'bg-[var(--theme-secondary)] text-[var(--theme-primary)] border-[var(--theme-primary)]/30' : 'bg-[var(--theme-card)] text-[var(--theme-primary)] border-[var(--theme-border)]/50 hover:bg-[var(--theme-secondary)]'}`}
                          title="חיפוש שאלה"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                      <button
                        onClick={exportCurrentEntry}
                        className="p-2.5 bg-[var(--theme-card)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)] rounded-xl hover:bg-[var(--theme-secondary)] transition-all shadow-sm"
                        title="ייצוא נתונים"
                      >
                        <Download size={18} />
                      </button>
                      {renderCharacterSyncButton()}
                      <button
                        onClick={() => deleteEntry(selectedEntry.id, 'למחוק את כל הפריט?')}
                        className="p-2.5 bg-[var(--theme-card)] border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                        title={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                        aria-label={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  <div className={`flex items-center gap-4 flex-1 ${mode === 'edit' ? 'w-full' : ''}`}>
                      <div className={`relative group/img ${mode === 'edit' || mode === 'view' ? 'hidden' : ''}`}>
                        <div className="w-16 h-16 rounded-2xl shadow-md border-2 border-[var(--theme-border)]/50 overflow-hidden bg-[var(--theme-card)] flex items-center justify-center relative">
                          {selectedEntry.imageUrl ? (
                            <img src={selectedEntry.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <Icon size={24} className="text-[var(--theme-primary)]/20" />
                          )}
                          
                          {mode === 'edit' && (
                            <label 
                              className="absolute inset-0 flex items-center justify-center bg-[var(--theme-primary)]/40 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer text-[var(--theme-card)]"
                              onClick={(e) => {
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
                            className="absolute -top-2 -right-2 bg-[var(--theme-card)] text-red-500 p-1 rounded-full shadow-md border border-red-100 hover:bg-red-50 transition-all z-10"
                            title="הסרת תמונה"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                     <div className="flex-1">
                        {mode === 'edit' ? (
                          <>
                            <div className="flex flex-row-reverse items-center gap-2" dir="rtl">
                            <input
                              value={selectedEntry.name}
                              onChange={(e) => updateEntry({ name: e.target.value })}
                              onBlur={handleEntryNameBlur}
                              className="min-w-0 flex-1 text-2xl font-bold text-[var(--theme-accent)] bg-transparent border-none focus:ring-0 p-0 handwritten text-4xl w-full"
                              placeholder="שם..."
                            />
                              {!isCategoriesVisible && !usesQuestionnaireAccordion && (
                                <button
                                  onClick={() => setIsCategoriesVisible(true)}
                                  className="hidden shrink-0 p-2 text-[var(--theme-primary)] hover:bg-[var(--theme-card)] rounded-xl transition-all shadow-sm border border-[var(--theme-border)]/50 lg:block"
                                  title="הצג קטגוריות"
                                >
                                  <PanelLeftOpen size={20} />
                                </button>
                              )}
                            </div>
                            {activeTab === 'characters' && (
                              <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
                                {CHARACTER_ROLES.map(role => (
                                  <button
                                    key={role.id}
                                    onClick={() => updateEntry({ role: role.id })}
                                    className={`min-w-0 flex-1 whitespace-normal break-words px-1.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold leading-tight transition-all border ${selectedEntry.role === role.id ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] border-[var(--theme-primary)] shadow-sm' : 'bg-[var(--theme-card)] text-[var(--theme-primary)]/60 border-[var(--theme-border)]/50 hover:bg-[var(--theme-secondary)]'}`}
                                  >
                                    {role.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <h2 className="text-3xl font-bold text-[var(--theme-accent)] handwritten text-5xl">{getQuestionnaireDisplayName(selectedEntry.name, activeTab)}</h2>
                            {activeTab === 'characters' && selectedEntry.role && (
                              <div className="mt-2">
                                <span className="px-3 py-1 bg-[var(--theme-secondary)] text-[var(--theme-primary)] rounded-full text-[10px] font-bold">
                                  {CHARACTER_ROLES.find(r => r.id === selectedEntry.role)?.label}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                     </div>
                  </div>
                  
                 <div className={`flex flex-col items-end gap-3 ${mode === 'edit' || mode === 'view' ? 'hidden' : ''}`}>
                  <button 
                    onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
                    className={`flex items-center justify-center gap-2 p-2.5 sm:px-6 sm:py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${mode === 'view' ? 'bg-[var(--theme-primary)] text-[var(--theme-card)] border-[var(--theme-primary)] hover:opacity-90' : 'bg-[var(--theme-card)] text-[var(--theme-primary)] border-[var(--theme-border)]/50 hover:bg-[var(--theme-secondary)]'}`}
                    title={mode === 'edit' ? 'תצוגת תעודת זהות' : 'עריכת פרטים'}
                  >
                    {mode === 'edit' ? <Eye size={18} /> : <PencilLine size={18} />}
                    <span className="hidden sm:inline">{mode === 'edit' ? 'תצוגת תעודת זהות' : 'עריכת פרטים'}</span>
                  </button>
                  <div className="flex items-center gap-2">

                    <button 
                      onClick={() => deleteEntry(selectedEntry.id, 'למחוק את כל הפריט?')}
                      className="p-2.5 bg-[var(--theme-card)] border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                      title={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                      aria-label={activeTab === 'characters' ? 'אפשרויות הסרה ומחיקה' : 'מחיקת פריט'}
                    >
                      <Trash2 size={18} />
                    </button>

                    <button 
                      onClick={exportCurrentEntry}
                      className="p-2.5 bg-[var(--theme-card)] border border-[var(--theme-border)]/50 text-[var(--theme-primary)] rounded-xl hover:bg-[var(--theme-secondary)] transition-all shadow-sm"
                      title="ייצוא נתונים"
                    >
                      <Download size={18} />
                    </button>

                    {mode === 'edit' && (
                      <div className="flex items-center gap-2">
                        {isSearchActive && (
                          <input 
                            type="text"
                            placeholder="חפש שאלה..."
                            value={questionSearchQuery}
                            onChange={(e) => setQuestionSearchQuery(e.target.value)}
                            className="bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none w-40 animate-in slide-in-from-left-2"
                            autoFocus
                          />
                        )}
                        <button 
                          onClick={() => setIsSearchActive(!isSearchActive)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm border ${isSearchActive ? 'bg-[var(--theme-secondary)] text-[var(--theme-primary)] border-[var(--theme-primary)]/30' : 'bg-[var(--theme-card)] text-[var(--theme-primary)] border-[var(--theme-border)]/50 hover:bg-[var(--theme-secondary)]'}`}
                          title="חיפוש שאלה"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            <div ref={categoryTopRef} className="flex-none overflow-visible p-4 sm:p-8 scroll-mt-24">
                {mode === 'edit' ? (
                  activeTab === 'periods' ? (
                      <PeriodQuestionnaire
                        entry={selectedEntry}
                        categories={categories}
                        activeCategoryIndex={currentCategoryIndex}
                        activeCategory={currentCategory}
                        questions={filteredQuestions}
                        customQuestions={customQuestions}
                        newQuestionLabel={newQuestionLabel}
                        onSelectCategory={handleCategorySelect}
                        onRegisterCategoryAnchor={(category, element) => {
                          accordionCategoryAnchorsRef.current[category] = element;
                        }}
                        onUpdateAnswer={(questionId, value) => updateEntry({ data: { ...selectedEntry.data, [questionId]: value } })}
                        onNewQuestionLabelChange={setNewQuestionLabel}
                        onAddCustomQuestion={addCustomQuestion}
                        onRemoveCustomQuestion={removeCustomQuestion}
                      />
                  ) : (
                  renderQuestionnaireContent(<>
                    {currentCategory === "פיתוח דמות" ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">שלבי פיתוח דמות</h3>
                          <button 
                            onClick={addDevelopmentStage}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף שלב פיתוח</span>
                          </button>
                        </div>

                        {(selectedEntry.developmentStages || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-[var(--theme-border)]/50 rounded-[2rem] text-center text-[var(--theme-text)]/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm">עדיין לא הוספת שלבי פיתוח לדמות זו.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.developmentStages || []).map((stage, sIdx) => (
                              <div key={stage.id} className="bg-[var(--theme-card)] p-8 rounded-[2rem] border border-[var(--theme-border)]/50 shadow-sm relative group animate-in slide-in-from-bottom-4 duration-500">
                                <button 
                                  onClick={() => removeDevelopmentStage(stage.id)}
                                  className="absolute -top-3 -left-3 w-8 h-8 bg-[var(--theme-card)] border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                                
                                <div className="flex items-center gap-4 mb-8">
                                  <div className="w-10 h-10 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-xl flex items-center justify-center font-black">
                                    {sIdx + 1}
                                  </div>
                                  <input 
                                    type="text"
                                    value={stage.title}
                                    onChange={(e) => updateDevelopmentStage(stage.id, { title: e.target.value })}
                                    placeholder="שם שלב הפיתוח (למשל: ילדות, המשבר הגדול...)"
                                    className="flex-1 bg-transparent border-b-2 border-[var(--theme-border)]/30 py-2 text-2xl font-bold text-[var(--theme-accent)] handwritten outline-none focus:border-[var(--theme-primary)] transition-all"
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  {DEVELOPMENT_STAGE_QUESTIONS.map(q => (
                                    <div key={q.id} className="space-y-2">
                                      <label className="text-[10px] font-black text-[var(--theme-accent)]/40 uppercase tracking-widest px-1">{q.question}</label>
                                      <textarea 
                                        value={stage.data[q.id] || ''}
                                        onChange={(e) => updateDevelopmentStage(stage.id, { data: { ...stage.data, [q.id]: e.target.value } })}
                                        className="w-full bg-[var(--theme-secondary)]/30 border border-[var(--theme-border)]/50 rounded-2xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none transition-all resize-none"
                                        placeholder="הקלד תשובה..."
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
                          <h3 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">מיקומים ספציפיים</h3>
                          <button 
                            onClick={addSpecificLocation}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף מיקום ספציפי</span>
                          </button>
                        </div>

                        {(selectedEntry.specificLocations || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-[var(--theme-border)]/50 rounded-[2rem] text-center text-[var(--theme-text)]/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו מיקומים ספציפיים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.specificLocations || []).map((loc, lIdx) => (
                              <div key={loc.id} className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/50 space-y-6 relative group/loc">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {lIdx + 1}
                                    </div>
                                    <input 
                                      value={loc.name}
                                      onChange={(e) => updateSpecificLocation(loc.id, { name: e.target.value })}
                                      className="text-xl font-bold text-[var(--theme-accent)] bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
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
                                      <label className="text-xs font-bold text-[var(--theme-accent)]/60">{q.question}</label>
                                      <textarea 
                                        value={loc.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...loc.data, [q.id]: e.target.value };
                                          updateSpecificLocation(loc.id, { data: newData });
                                        }}
                                        className="w-full bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none min-h-[80px] shadow-sm"
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
                          <h3 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">כוחות ייחודיים</h3>
                          <button 
                            onClick={addUniquePower}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף כוח ייחודי</span>
                          </button>
                        </div>

                        {(selectedEntry.uniquePowers || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-[var(--theme-border)]/50 rounded-[2rem] text-center text-[var(--theme-text)]/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו כוחות ייחודיים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.uniquePowers || []).map((power, pIdx) => (
                              <div key={power.id} className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/50 space-y-6 relative group/power">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {pIdx + 1}
                                    </div>
                                    <input 
                                      value={power.name}
                                      onChange={(e) => updateUniquePower(power.id, { name: e.target.value })}
                                      className="text-xl font-bold text-[var(--theme-accent)] bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
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
                                      <label className="text-xs font-bold text-[var(--theme-accent)]/60">{q.question}</label>
                                      <textarea 
                                        value={power.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...power.data, [q.id]: e.target.value };
                                          updateUniquePower(power.id, { data: newData });
                                        }}
                                        className="w-full bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none min-h-[80px] shadow-sm"
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
                          <h3 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">חפצים מיוחדים</h3>
                          <button 
                            onClick={addSpecialItem}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>הוסף חפץ מיוחד</span>
                          </button>
                        </div>

                        {(selectedEntry.specialItems || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-[var(--theme-border)]/50 rounded-[2rem] text-center text-[var(--theme-text)]/30">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">טרם נוספו חפצים מיוחדים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.specialItems || []).map((item, iIdx) => (
                              <div key={item.id} className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/50 space-y-6 relative group/item">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {iIdx + 1}
                                    </div>
                                    <input 
                                      value={item.name}
                                      onChange={(e) => updateSpecialItem(item.id, { name: e.target.value })}
                                      className="text-xl font-bold text-[var(--theme-accent)] bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
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
                                      <label className="text-xs font-bold text-[var(--theme-accent)]/60">{q.question}</label>
                                      <textarea 
                                        value={item.data[q.id] || ''}
                                        onChange={(e) => {
                                          const newData = { ...item.data, [q.id]: e.target.value };
                                          updateSpecialItem(item.id, { data: newData });
                                        }}
                                        className="w-full bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none min-h-[80px] shadow-sm"
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
                    ) : activeTab === 'backgrounds' ? (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">
                            {BACKGROUND_TYPES.find(t => t.id === selectedEntry.role)?.label || 'רקע'}
                          </h3>
                          <button 
                            onClick={addLoreItem}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-md"
                          >
                            <Plus size={16} />
                            <span>{BACKGROUND_TYPES.find(t => t.id === selectedEntry.role)?.addButton || 'הוסף פריט'}</span>
                          </button>
                        </div>

                        {(selectedEntry.loreItems || []).length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-[var(--theme-border)]/50 rounded-[2rem] text-center text-[var(--theme-text)]/30">
                            <Users size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold" >טרם נוספו פריטים. לחץ על הכפתור למעלה כדי להתחיל.</p>
                          </div>
                        ) : (
                          <div className="space-y-12">
                            {(selectedEntry.loreItems || []).map((item, iIdx) => (
                              <div key={item.id} className="bg-[var(--theme-secondary)]/30 p-8 rounded-[2rem] border border-[var(--theme-border)]/50 space-y-6 relative group/item">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[var(--theme-primary)] text-[var(--theme-card)] rounded-xl flex items-center justify-center font-black shadow-lg">
                                      {iIdx + 1}
                                    </div>
                                    <input 
                                      value={item.title}
                                      onChange={(e) => updateLoreItem(item.id, { title: e.target.value })}
                                      className="text-xl font-bold text-[var(--theme-accent)] bg-transparent border-none focus:ring-0 p-0 handwritten text-3xl"
                                      placeholder="כותרת..."
                                    />
                                  </div>
                                  <button 
                                    onClick={() => { if(confirm('למחוק את הפריט?')) removeLoreItem(item.id); }}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-[var(--theme-accent)]/60">תוכן</label>
                                  <textarea 
                                    value={item.content}
                                    onChange={(e) => updateLoreItem(item.id, { content: e.target.value })}
                                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-border)]/50 rounded-xl p-4 text-sm focus:ring-4 focus:ring-[var(--theme-primary)]/20 outline-none min-h-[150px] shadow-sm"
                                    placeholder="כתוב כאן..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {filteredQuestions.length > 0 && (
                          <QuestionnaireFields
                            questions={filteredQuestions}
                            data={selectedEntry.data}
                            promoteMultilineTextValues={activeTab === 'characters'}
                            onChange={(questionId, value) => updateEntry({
                              data: { ...selectedEntry.data, [questionId]: value },
                            })}
                          />
                        )}

                        {currentCategory === "שאלות נוספות" && customQuestions.length > 0 && (
                          customQuestions.map(cf => (
                            <div key={cf.id} className="group space-y-3 animate-in fade-in duration-500 relative">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-[var(--text-accent)]/30 uppercase tracking-[0.2em]">שאלות נוספות</span>
                                  <div className="h-px w-8 bg-[var(--color-secondary)]" />
                                  <label className="text-sm font-bold text-[var(--text-accent)]">{cf.label}</label>
                                </div>
                                <button onClick={() => removeCustomQuestion(cf.id)} className="text-red-200 hover:text-red-500 transition-colors p-1" title="הסר שאלה"><X size={14}/></button>
                              </div>
                              <textarea 
                                value={selectedEntry.data[cf.id] || ''}
                                onChange={(e) => updateEntry({ data: { ...selectedEntry.data, [cf.id]: e.target.value } })}
                                className="w-full bg-[var(--color-secondary)]/20 border-2 border-[var(--color-border)]/50 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/50 transition-all outline-none min-h-[120px] leading-relaxed shadow-inner"
                                placeholder="תשובה לשאלה המותאמת..."
                              />
                            </div>
                          ))
                        )}

                        {currentCategory === "שאלות נוספות" && (
                          <div className="pt-10 border-t border-[var(--theme-border)]/50 mt-10">
                            <div className="text-xs font-black text-[var(--theme-accent)]/40 uppercase tracking-widest mb-4">הוספת שאלה מותאמת אישית</div>
                            <div className="flex gap-3">
                              <input 
                                type="text"
                                value={newQuestionLabel}
                                onChange={(e) => setNewQuestionLabel(e.target.value)}
                                placeholder="מה ברצונך לשאול?"
                                className="flex-1 bg-[var(--theme-card)] border-2 border-[var(--theme-border)]/50 rounded-2xl px-5 py-3 text-sm focus:border-[var(--theme-primary)]/50 outline-none"
                              />
                              <button 
                                onClick={addCustomQuestion}
                                className="bg-[var(--theme-primary)] text-[var(--theme-card)] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
                              >
                                <MessageSquarePlus size={18} />
                                <span>הוסף</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {activeTab === 'fantasyWorlds' && currentCategory === 'יום יום' && (
                          <div className="pt-10 border-t border-[var(--theme-border)]/50 mt-10">
                            <div className="text-xs font-black text-[var(--theme-accent)]/40 uppercase tracking-widest mb-4">כוחות ייחודיים</div>
                            <button 
                              onClick={() => {
                                 const index = categories.indexOf("כוחות ייחודיים");
                                 if (index !== -1) {
                                   handleCategorySelect(index);
                                   addUniquePower();
                                }
                              }}
                              className="bg-[var(--theme-primary)] text-[var(--theme-card)] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
                            >
                              <Plus size={18} />
                              <span>הוסף כוח ייחודי</span>
                            </button>
                          </div>
                        )}

                        {activeTab === 'places' && currentCategory === 'מיקום גיאוגרפי' && (
                          <div className="pt-10 border-t border-[var(--theme-border)]/50 mt-10">
                            <div className="text-xs font-black text-[var(--theme-accent)]/40 uppercase tracking-widest mb-4">מיקומים ספציפיים</div>
                            <button 
                              onClick={() => {
                                 const index = categories.indexOf("מיקום ספציפי");
                                 if (index !== -1) {
                                   handleCategorySelect(index);
                                   addSpecificLocation();
                                }
                              }}
                              className="bg-[var(--theme-primary)] text-[var(--theme-card)] px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
                            >
                              <Plus size={18} />
                              <span>הוסף מיקום ספציפי</span>
                            </button>
                          </div>
                        )}

                        {!usesQuestionnaireAccordion && (
                          <CategoryActions
                            currentCategoryIndex={currentCategoryIndex}
                            categoryCount={categories.length}
                            onSelect={handleCategorySelect}
                          />
                        )}
                      </>
                    )}
                  </>)
                  )
                ) : (
                  <div className="max-w-2xl mx-auto space-y-12 py-8">
                     {categories.map(cat => {
                        let contentToRender: any[] = [];

                        if (cat === "תוכן" && activeTab === 'backgrounds') {
                           if (!selectedEntry.loreItems || selectedEntry.loreItems.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">
                                     {BACKGROUND_TYPES.find(t => t.id === selectedEntry.role)?.label || 'תוכן'}
                                   </h3>
                                   <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                                </div>
                                <div className="space-y-8">
                                  {selectedEntry.loreItems.map((item, idx) => (
                                    <div key={item.id} className="space-y-4 bg-[var(--theme-secondary)]/20 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg flex items-center justify-center text-xs font-black">
                                            {idx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">{item.title}</h4>
                                       </div>
                                       <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap border-r-2 border-[var(--theme-border)]/30 pr-6">
                                          {item.content}
                                       </div>
                                    </div>
                                  ))}
                                </div>
                             </section>
                           );
                        }

                        if (cat === "פיתוח דמות") {
                           if (!selectedEntry.developmentStages || selectedEntry.developmentStages.length === 0) return null;
                           return (
                             <section key={cat} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4">
                                   <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.developmentStages || []).map((stage, sIdx) => (
                                    <div key={stage.id} className="space-y-6 bg-[var(--theme-secondary)]/20 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg flex items-center justify-center text-xs font-black">
                                            {sIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">{stage.title}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-[var(--theme-border)]/30 pr-6">
                                          {DEVELOPMENT_STAGE_QUESTIONS.map(q => {
                                            const val = stage.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-[var(--theme-accent)]/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">{val}</div>
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
                                   <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.specificLocations || []).map((loc, lIdx) => (
                                    <div key={loc.id} className="space-y-6 bg-[var(--theme-secondary)]/20 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg flex items-center justify-center text-xs font-black">
                                            {lIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">{loc.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-[var(--theme-border)]/30 pr-6">
                                          {SPECIFIC_LOCATION_QUESTIONS.map(q => {
                                            const val = loc.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-[var(--theme-accent)]/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">{val}</div>
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
                                   <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.uniquePowers || []).map((power, pIdx) => (
                                    <div key={power.id} className="space-y-6 bg-[var(--theme-secondary)]/20 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg flex items-center justify-center text-xs font-black">
                                            {pIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">{power.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-[var(--theme-border)]/30 pr-6">
                                          {UNIQUE_POWER_QUESTIONS.map(q => {
                                            const val = power.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-[var(--theme-accent)]/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">{val}</div>
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
                                   <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">{cat}</h3>
                                   <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                                </div>
                                <div className="space-y-8">
                                  {(selectedEntry.specialItems || []).map((item, iIdx) => (
                                    <div key={item.id} className="space-y-6 bg-[var(--theme-secondary)]/20 p-8 rounded-[2rem] border border-[var(--theme-border)]/30">
                                       <div className="flex items-center gap-4">
                                          <div className="w-8 h-8 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg flex items-center justify-center text-xs font-black">
                                            {iIdx + 1}
                                          </div>
                                          <h4 className="text-xl font-bold text-[var(--theme-accent)] handwritten text-3xl">{item.name}</h4>
                                       </div>
                                       <div className="grid gap-6 border-r-2 border-[var(--theme-border)]/30 pr-6">
                                          {SPECIAL_ITEM_QUESTIONS.map(q => {
                                            const val = item.data[q.id];
                                            if (!val) return null;
                                            return (
                                              <div key={q.id} className="space-y-1">
                                                 <div className="text-[10px] font-bold text-[var(--theme-accent)]/40 uppercase tracking-tight">{q.question}</div>
                                                 <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">{val}</div>
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
                                <h3 className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest bg-[var(--theme-secondary)]/50 px-3 py-1 rounded-lg">{cat}</h3>
                                <div className="flex-1 h-px bg-[var(--theme-border)]/30" />
                             </div>
                             <div className="grid gap-6">
                                {contentToRender.map(item => {
                                   const isCustom = 'label' in item;
                                   const id = item.id;
                                   const question = isCustom ? item.label : item.question;
                                   const val = selectedEntry.data[id];
                                   return (
                                     <div key={id} className="space-y-1.5 border-r-2 border-[var(--theme-border)]/30 pr-4">
                                        <div className="text-[10px] font-bold text-[var(--theme-accent)]/40 uppercase tracking-tight">{question}</div>
                                        <div className="text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">{val}</div>
                                     </div>
                                   );
                                })}
                             </div>
                          </section>
                        );
                     })}
                     <div className="pt-12 flex flex-col items-center gap-4 opacity-30 border-t border-[var(--theme-border)]/30">
                        <ClipboardList size={32} className="text-[var(--theme-primary)]" />
                        <div className="text-[10px] font-black uppercase tracking-[0.4em]">סוף תעודת זהות</div>
                     </div>
                  </div>
                )}
                <div className="h-20" />
              </div>
              
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--theme-text)]/20 p-12 text-center">
              <div className="bg-[var(--theme-secondary)]/50 p-10 rounded-full mb-8 shadow-inner">
                <Icon size={80} className="opacity-20" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--theme-accent)]/40 handwritten text-4xl mb-3">
                {activeTab === 'relationships' ? 'שאלון מערכות יחסים' : activeTab === 'places' ? 'ניהול מקומות' : activeTab === 'periods' ? 'ניהול תקופות' : activeTab === 'twists' ? 'ניהול טוויסטים' : activeTab === 'fantasyWorlds' ? 'ניהול עולמות פנטזיה' : 'שאלון בניית דמות'}
              </h3>
              <p className="max-w-xs text-sm text-[var(--theme-text)]/30 leading-relaxed">
                {activeTab === 'relationships' ? 'בחרו מערכת יחסים מהרשימה או צרו חדשה כדי להתחיל.' : 'בחר פריט מהרשימה או צור חדש כדי להתחיל.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isCharacterAddMenuOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          dir="rtl"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsCharacterAddMenuOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="character-add-title"
            className="w-full max-w-sm rounded-3xl border border-[var(--theme-border)]/50 bg-[var(--theme-card)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="character-add-title" className="text-lg font-bold text-[var(--theme-primary)]">הוספת דמות</h2>
              <button
                type="button"
                aria-label="סגירת פעולות הוספת דמות"
                onClick={() => setIsCharacterAddMenuOpen(false)}
                className="rounded-xl p-2 hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={createNewCharacter}
                className="min-h-12 rounded-2xl bg-[var(--theme-primary)] px-4 font-bold text-[var(--theme-card)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/25"
              >
                יצירת דמות חדשה
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCharacterAddMenuOpen(false);
                  setIsCharacterImportOpen(true);
                }}
                className="min-h-12 rounded-2xl border border-[var(--theme-border)] px-4 font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20"
              >
                ייבוא דמות מספר אחר
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCharacterAddMenuOpen(false);
                  setIsExistingCharacterQuestionnaireOpen(true);
                }}
                className="min-h-12 rounded-2xl border border-[var(--theme-border)] px-4 py-3 text-right font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/20"
              >
                <span className="block">פתיחת שאלון לדמות קיימת</span>
                <span className="mt-1 block text-xs font-normal leading-relaxed text-[var(--theme-text)]/60">
                  בחירת דמות שכבר קיימת בספר אך אינה מופיעה בשאלון הדמויות.
                </span>
              </button>
            </div>
          </section>
        </div>
      )}

      <CharacterImportDialog
        isOpen={isCharacterImportOpen}
        sourceBooks={allBooks}
        activeBookId={activeBookId}
        targetCharacters={characters}
        onUpdateCharacters={onUpdateCharacters}
        onSelectCharacter={characterId => {
          handleEntrySelect(characterId);
          setMode('edit');
        }}
        onClose={() => setIsCharacterImportOpen(false)}
      />

      <ExistingCharacterQuestionnaireDialog
        isOpen={isExistingCharacterQuestionnaireOpen}
        characters={characters}
        onRestoreCharacter={characterId => {
          onRestoreCharacterToQuestionnaire(characterId);
          handleEntrySelect(characterId);
          setMode('edit');
          setIsExistingCharacterQuestionnaireOpen(false);
          setIsCharacterAddMenuOpen(false);
        }}
        onClose={() => setIsExistingCharacterQuestionnaireOpen(false)}
      />

      <CharacterRemovalDialog
        isOpen={characterRemovalCandidate !== null}
        character={characterRemovalCandidate}
        onHideFromQuestionnaire={hideCharacterFromQuestionnaire}
        onDeleteFromBook={deleteCharacterFromBookAndMaps}
        onClose={() => setCharacterRemovalCandidateId(null)}
      />

      {selectedCharacter && (
        <CharacterSyncDialog
          isOpen={isCharacterSyncOpen}
          books={allBooks}
          activeBookId={activeBookId}
          character={selectedCharacter}
          onApplyBooks={onApplyCharacterSyncBooks}
          onSuccess={() => setCharacterSyncFeedback('המידע הכללי של הדמות סונכרן.')}
          onClose={() => setIsCharacterSyncOpen(false)}
        />
      )}

      {characterSyncFeedback && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[140] -translate-x-1/2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-xl" dir="rtl">
          {characterSyncFeedback}
        </div>
      )}
    </div>
  );
};   


export default Questionnaires;
