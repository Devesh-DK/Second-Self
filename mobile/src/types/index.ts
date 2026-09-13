export type ParaCategory = 'Projects' | 'Areas' | 'Resources' | 'Archives';

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  summary: string;
  para: ParaCategory;
  tags: string[];
  links: string[];
  created: string;
  source: 'manual' | 'link' | 'file' | 'mobile';
  sourceUrl?: string;
  fileName?: string;
  driveFileId?: string;
  syncedToDrive?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  para: ParaCategory;
  tags: string[];
  summary: string;
  content_preview?: string;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: 'wikilink' | 'frontmatter' | 'similarity';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    generated_at: string;
    node_count: number;
    edge_count: number;
  };
}

export interface AskSource {
  id: string;
  summary: string;
  para: string;
}

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskSource[];
  timestamp: string;
}

export type AIProvider = 'gemini' | 'groq';

export interface AppSettings {
  aiProvider: AIProvider;
  geminiApiKey: string;
  groqApiKey: string;
  googleDriveConnected: boolean;
  googleUserEmail: string;
  googleAccessToken: string;
  googleDriveFolderId: string;
  lastSyncedAt?: string;
}
