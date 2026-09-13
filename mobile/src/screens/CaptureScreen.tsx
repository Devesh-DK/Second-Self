import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { colors, shadows } from '../theme/colors';
import { aiService, ClassificationResult } from '../services/ai';
import { storageService } from '../services/storage';
import { googleDriveService } from '../services/googleDrive';
import { NoteItem, AppSettings, ParaCategory } from '../types';

interface CaptureScreenProps {
  settings: AppSettings;
  onNoteCreated?: (note: NoteItem) => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ settings, onNoteCreated }) => {
  const [activeTab, setActiveTab] = useState<'note' | 'link' | 'file'>('note');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCaptured, setLastCaptured] = useState<NoteItem | null>(null);

  // Paste link from clipboard
  const handlePasteLink = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('www.'))) {
      setUrlInput(text);
    } else {
      Alert.alert('Clipboard', 'No URL detected in clipboard.');
    }
  };

  // Pick document
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name,
          content: `Document: ${file.name} (Type: ${file.mimeType || 'file'})`,
        });
      }
    } catch (e) {
      console.warn('Document picker error:', e);
    }
  };

  // Process capture
  const handleCapture = async () => {
    let contentToClassify = '';
    let source: NoteItem['source'] = 'manual';
    let sourceUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;

    if (activeTab === 'note') {
      if (!textInput.trim()) {
        Alert.alert('Empty Note', 'Please type a note before capturing.');
        return;
      }
      contentToClassify = textInput.trim();
      source = 'manual';
    } else if (activeTab === 'link') {
      if (!urlInput.trim()) {
        Alert.alert('Empty URL', 'Please enter or paste a URL.');
        return;
      }
      contentToClassify = urlTitle.trim() ? `${urlTitle.trim()}\n${urlInput.trim()}` : urlInput.trim();
      source = 'link';
      sourceUrl = urlInput.trim();
    } else if (activeTab === 'file') {
      if (!selectedFile) {
        Alert.alert('No File', 'Please select a document to capture.');
        return;
      }
      contentToClassify = selectedFile.content;
      source = 'file';
      fileName = selectedFile.name;
    }

    setIsProcessing(true);

    try {
      // 1. AI Classification (Gemini 1.5 Flash / Groq)
      const apiKey = settings.aiProvider === 'gemini' ? settings.geminiApiKey : settings.groqApiKey;
      const classification: ClassificationResult = await aiService.classifyNote(
        contentToClassify,
        apiKey,
        settings.aiProvider
      );

      // 2. Build Note Item
      const now = new Date();
      const datePrefix = now.toISOString().split('T')[0];
      const shortId = Math.random().toString(36).substring(2, 8);
      const noteId = `${datePrefix}_${shortId}`;

      const newNote: NoteItem = {
        id: noteId,
        title: classification.summary.slice(0, 50),
        body: contentToClassify,
        summary: classification.summary,
        para: classification.para,
        tags: classification.tags,
        links: [],
        created: now.toISOString(),
        source,
        sourceUrl,
        fileName,
        syncedToDrive: false,
      };

      // 3. Save locally
      await storageService.saveNote(newNote);

      // 4. Sync to Google Drive if connected
      if (settings.googleDriveConnected && settings.googleAccessToken && settings.googleDriveFolderId) {
        try {
          const driveFileId = await googleDriveService.syncNoteToDrive(
            newNote,
            settings.googleDriveFolderId,
            settings.googleAccessToken
          );
          if (driveFileId) {
            newNote.driveFileId = driveFileId;
            newNote.syncedToDrive = true;
            await storageService.saveNote(newNote);
          }
        } catch (syncErr) {
          console.warn('Drive sync error during note creation:', syncErr);
        }
      }

      setLastCaptured(newNote);
      setTextInput('');
      setUrlInput('');
      setUrlTitle('');
      setSelectedFile(null);
      if (onNoteCreated) onNoteCreated(newNote);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not process note.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category Tabs: Note, Bookmark, File */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'note' && styles.tabButtonActive]}
          onPress={() => setActiveTab('note')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'note' ? colors.geminiBlue : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'note' && styles.tabTextActive]}>Quick Note</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'link' && styles.tabButtonActive]}
          onPress={() => setActiveTab('link')}
        >
          <Ionicons
            name="link-outline"
            size={16}
            color={activeTab === 'link' ? colors.geminiBlue : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'link' && styles.tabTextActive]}>Bookmark</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'file' && styles.tabButtonActive]}
          onPress={() => setActiveTab('file')}
        >
          <Ionicons
            name="attach-outline"
            size={16}
            color={activeTab === 'file' ? colors.geminiBlue : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>Document</Text>
        </TouchableOpacity>
      </View>

      {/* Capture Card */}
      <View style={styles.card}>
        {activeTab === 'note' && (
          <TextInput
            style={styles.textArea}
            placeholder="Type or paste any thought, meeting note, or idea..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            value={textInput}
            onChangeText={setTextInput}
            textAlignVertical="top"
          />
        )}

        {activeTab === 'link' && (
          <View style={styles.linkContainer}>
            <View style={styles.urlRow}>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/article"
                placeholderTextColor={colors.textMuted}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity style={styles.pasteButton} onPress={handlePasteLink}>
                <Ionicons name="clipboard-outline" size={16} color={colors.geminiBlue} />
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="Optional title or note..."
              placeholderTextColor={colors.textMuted}
              value={urlTitle}
              onChangeText={setUrlTitle}
            />
          </View>
        )}

        {activeTab === 'file' && (
          <View style={styles.fileContainer}>
            <TouchableOpacity style={styles.filePickerButton} onPress={handlePickDocument}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.geminiIris} />
              <Text style={styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Tap to select PDF, Word or Text document'}
              </Text>
              <Text style={styles.filePickerSub}>Files are extracted and synced to Google Drive</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.captureButtonText}>Analyzing & Organizing...</Text>
            </View>
          ) : (
            <View style={styles.buttonLoadingRow}>
              <Text style={styles.buttonSparkle}>✦</Text>
              <Text style={styles.captureButtonText}>Capture & Organize</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Live Classification Result Card */}
      {lastCaptured && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultBadgeRow}>
              <View
                style={[
                  styles.paraBadge,
                  { backgroundColor: colors.para[lastCaptured.para].background, borderColor: colors.para[lastCaptured.para].border },
                ]}
              >
                <Text style={[styles.paraBadgeText, { color: colors.para[lastCaptured.para].color }]}>
                  {lastCaptured.para}
                </Text>
              </View>
              {lastCaptured.syncedToDrive && (
                <View style={styles.driveSyncedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={styles.driveSyncedText}>Synced to Drive</Text>
                </View>
              )}
            </View>
            <Text style={styles.resultTime}>Just now</Text>
          </View>

          <Text style={styles.resultSummary}>{lastCaptured.summary}</Text>

          <View style={styles.tagRow}>
            {lastCaptured.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.geminiBlue,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  textArea: {
    height: 140,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  linkContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.geminiBlueLight,
  },
  pasteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.geminiBlue,
  },
  titleInput: {
    height: 44,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileContainer: {
    paddingVertical: 12,
  },
  filePickerButton: {
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.geminiIrisLight,
    gap: 6,
  },
  filePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  filePickerSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  captureButton: {
    marginTop: 14,
    backgroundColor: colors.geminiBlue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.geminiPill,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonSparkle: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paraBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  paraBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  driveSyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.successLight,
  },
  driveSyncedText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  resultTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  resultSummary: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
