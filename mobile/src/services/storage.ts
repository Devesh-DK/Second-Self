import AsyncStorage from '@react-native-async-storage/async-storage';
import { NoteItem, GraphData, AppSettings, ParaCategory } from '../types';

const STORAGE_KEYS = {
  NOTES: '@secondself_notes',
  SETTINGS: '@secondself_settings',
  GRAPH: '@secondself_graph',
  DRAFTS: '@secondself_drafts',
};

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'gemini',
  geminiApiKey: '',
  groqApiKey: '',
  googleDriveConnected: false,
  googleUserEmail: '',
  googleAccessToken: '',
  googleDriveFolderId: '',
  lastSyncedAt: undefined,
};

export const storageService = {
  // --- Settings ---
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving settings to storage', e);
      throw e;
    }
  },

  // --- Notes ---
  async getNotes(): Promise<NoteItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading notes from storage', e);
    }
    return [];
  },

  async saveNote(note: NoteItem): Promise<NoteItem[]> {
    try {
      const notes = await this.getNotes();
      const existingIndex = notes.findIndex((n) => n.id === note.id);
      let updated: NoteItem[];
      if (existingIndex >= 0) {
        updated = [...notes];
        updated[existingIndex] = note;
      } else {
        updated = [note, ...notes];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      // Automatically refresh local graph
      await this.rebuildGraphFromNotes(updated);
      return updated;
    } catch (e) {
      console.error('Error saving note to storage', e);
      throw e;
    }
  },

  async deleteNote(id: string): Promise<NoteItem[]> {
    try {
      const notes = await this.getNotes();
      const updated = notes.filter((n) => n.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
      await this.rebuildGraphFromNotes(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting note from storage', e);
      throw e;
    }
  },

  // --- Knowledge Graph ---
  async getGraph(): Promise<GraphData> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GRAPH);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading graph from storage', e);
    }
    const notes = await this.getNotes();
    return this.rebuildGraphFromNotes(notes);
  },

  async rebuildGraphFromNotes(notes: NoteItem[]): Promise<GraphData> {
    const nodes = notes.map((note) => ({
      id: note.id,
      label: note.summary || note.title || note.id,
      para: note.para,
      tags: note.tags || [],
      summary: note.summary,
      content_preview: note.body.slice(0, 100),
      group: note.para,
    }));

    const nodeIds = new Set(notes.map((n) => n.id));
    const edges: GraphData['edges'] = [];

    for (const note of notes) {
      // 1. Explicit wikilinks in body
      const wikilinkMatches = note.body.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g);
      for (const match of wikilinkMatches) {
        const target = match[1].trim();
        if (target && nodeIds.has(target) && target !== note.id) {
          edges.push({
            source: note.id,
            target,
            weight: 1.0,
            type: 'wikilink',
          });
        }
      }

      // 2. Frontmatter links
      if (note.links && Array.isArray(note.links)) {
        for (const target of note.links) {
          if (target && nodeIds.has(target) && target !== note.id) {
            edges.push({
              source: note.id,
              target,
              weight: 1.0,
              type: 'frontmatter',
            });
          }
        }
      }

      // 3. Shared tag similarity links (if >= 2 tags shared)
      for (const other of notes) {
        if (other.id !== note.id) {
          const commonTags = (note.tags || []).filter((t) => (other.tags || []).includes(t));
          if (commonTags.length >= 2) {
            const edgeExists = edges.some(
              (e) => (e.source === note.id && e.target === other.id) || (e.source === other.id && e.target === note.id)
            );
            if (!edgeExists) {
              edges.push({
                source: note.id,
                target: other.id,
                weight: 0.8,
                type: 'similarity',
              });
            }
          }
        }
      }
    }

    const graphData: GraphData = {
      nodes,
      edges,
      metadata: {
        generated_at: new Date().toISOString(),
        node_count: nodes.length,
        edge_count: edges.length,
      },
    };

    await AsyncStorage.setItem(STORAGE_KEYS.GRAPH, JSON.stringify(graphData));
    return graphData;
  },
};
