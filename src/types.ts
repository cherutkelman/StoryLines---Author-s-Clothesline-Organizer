export type SegmentStatus = 'accepted' | 'suggested_addition' | 'suggested_deletion';

export interface Segment {
  id: string;
  text: string;
  status: SegmentStatus;
  userId: string;
  userName: string;
  timestamp: any; // Firestore Timestamp
}

export interface DocumentData {
  id: string;
  title: string;
  authorId: string;
  segments: Segment[];
  lastUpdated: any; // Firestore Timestamp
}

export type EditorMode = 'edit' | 'suggest';
