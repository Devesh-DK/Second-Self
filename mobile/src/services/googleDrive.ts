import { NoteItem, GraphData } from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Google Drive API configuration
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export interface DriveSyncResult {
  success: boolean;
  message: string;
  folderId?: string;
}

export const googleDriveService = {
  // --- Folder Management ---
  async getOrCreateFolder(folderName: string, parentId?: string, accessToken?: string): Promise<string | null> {
    if (!accessToken) return null;
    try {
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const searchRes = await fetch(
        `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return searchData.files[0].id;
        }
      }

      // Create folder if not found
      const metadata: Record<string, any> = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        metadata.parents = [parentId];
      }

      const createRes = await fetch(`${GOOGLE_DRIVE_API}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        return createData.id;
      }
    } catch (e) {
      console.error('Error in getOrCreateFolder:', e);
    }
    return null;
  },

  // --- Upload or Update a File in Google Drive ---
  async uploadFile(
    fileName: string,
    content: string,
    mimeType: string,
    parentFolderId: string,
    accessToken: string
  ): Promise<string | null> {
    try {
      // Check if file already exists in parent
      const q = `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`;
      const searchRes = await fetch(
        `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      let existingId: string | null = null;
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          existingId = searchData.files[0].id;
        }
      }

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const fileMetadata = {
        name: fileName,
        mimeType,
        ...(!existingId && parentFolderId ? { parents: [parentFolderId] } : {}),
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

      const url = existingId
        ? `${GOOGLE_UPLOAD_API}/files/${existingId}?uploadType=multipart`
        : `${GOOGLE_UPLOAD_API}/files?uploadType=multipart`;

      const res = await fetch(url, {
        method: existingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error uploading file to Google Drive:', err);
    }
    return null;
  },

  // --- Sync a Note to SecondSelf/wiki/{PARA}/ in Drive ---
  async syncNoteToDrive(note: NoteItem, rootFolderId: string, accessToken: string): Promise<string | null> {
    try {
      const paraFolderId = await this.getOrCreateFolder(note.para, rootFolderId, accessToken);
      if (!paraFolderId) return null;

      const frontmatter = [
        '---',
        `id: "${note.id}"`,
        `para: "${note.para}"`,
        `tags: ${JSON.stringify(note.tags || [])}`,
        `summary: ${JSON.stringify(note.summary || '')}`,
        `created: "${note.created}"`,
        `links: ${JSON.stringify(note.links || [])}`,
        `source: "${note.source}"`,
        note.sourceUrl ? `sourceUrl: "${note.sourceUrl}"` : '',
        '---',
        '',
        note.body || '',
      ].filter(Boolean).join('\n');

      const fileName = `${note.id}.md`;
      const fileId = await this.uploadFile(fileName, frontmatter, 'text/markdown', paraFolderId, accessToken);
      return fileId;
    } catch (e) {
      console.error('Failed to sync note to drive:', e);
      return null;
    }
  },

  // --- Sync Metadata and Graph to Drive ---
  async syncGraphAndMetadata(
    notes: NoteItem[],
    graph: GraphData,
    rootFolderId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const metadataPayload = JSON.stringify(
        notes.map((n) => ({
          uuid: n.id,
          timestamp: n.created,
          para: n.para,
          tags: n.tags,
          summary: n.summary,
          source: n.source,
          sourceUrl: n.sourceUrl,
        })),
        null,
        2
      );

      const graphPayload = JSON.stringify(graph, null, 2);

      await Promise.all([
        this.uploadFile('metadata.json', metadataPayload, 'application/json', rootFolderId, accessToken),
        this.uploadFile('graph.json', graphPayload, 'application/json', rootFolderId, accessToken),
      ]);

      return true;
    } catch (e) {
      console.error('Error syncing metadata to Drive:', e);
      return false;
    }
  },

  // --- Verify or Create SecondSelf Root in User's 2TB Drive ---
  async initializeDriveRoot(accessToken: string): Promise<string | null> {
    try {
      const rootId = await this.getOrCreateFolder('SecondSelf', undefined, accessToken);
      if (rootId) {
        // Create the 4 PARA subfolders in Drive
        await Promise.all([
          this.getOrCreateFolder('Projects', rootId, accessToken),
          this.getOrCreateFolder('Areas', rootId, accessToken),
          this.getOrCreateFolder('Resources', rootId, accessToken),
          this.getOrCreateFolder('Archives', rootId, accessToken),
        ]);
        return rootId;
      }
    } catch (e) {
      console.error('Failed to initialize Drive root:', e);
    }
    return null;
  },
};
