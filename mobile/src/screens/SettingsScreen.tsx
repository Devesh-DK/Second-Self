import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { storageService } from '../services/storage';
import { googleDriveService } from '../services/googleDrive';
import { AppSettings, AIProvider } from '../types';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [provider, setProvider] = useState<AIProvider>(settings.aiProvider);
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey);
  const [driveToken, setDriveToken] = useState(settings.googleAccessToken);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    storageService.getNotes().then((notes) => setNoteCount(notes.length));
  }, []);

  const handleSave = async () => {
    try {
      const updated = await storageService.saveSettings({
        aiProvider: provider,
        geminiApiKey: geminiKey.trim(),
        groqApiKey: groqKey.trim(),
        googleAccessToken: driveToken.trim(),
        googleDriveConnected: !!driveToken.trim(),
      });
      onUpdateSettings(updated);
      Alert.alert('Settings Saved', 'Your preferences and keys are saved securely on device.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings.');
    }
  };

  const handleSyncAllToDrive = async () => {
    if (!driveToken.trim()) {
      Alert.alert('Drive Token Required', 'Please provide a Google Drive Access Token to sync.');
      return;
    }

    setIsSyncing(true);
    try {
      // Initialize or locate SecondSelf root folder
      const rootFolderId = await googleDriveService.initializeDriveRoot(driveToken.trim());
      if (!rootFolderId) {
        throw new Error('Could not access or create SecondSelf folder in Google Drive. Check your token.');
      }

      const notes = await storageService.getNotes();
      let syncedCount = 0;

      for (const note of notes) {
        const fileId = await googleDriveService.syncNoteToDrive(note, rootFolderId, driveToken.trim());
        if (fileId) {
          note.driveFileId = fileId;
          note.syncedToDrive = true;
          await storageService.saveNote(note);
          syncedCount++;
        }
      }

      const graph = await storageService.getGraph();
      await googleDriveService.syncGraphAndMetadata(notes, graph, rootFolderId, driveToken.trim());

      const updated = await storageService.saveSettings({
        googleDriveFolderId: rootFolderId,
        googleDriveConnected: true,
        lastSyncedAt: new Date().toISOString(),
      });
      onUpdateSettings(updated);

      Alert.alert('Sync Complete', `Successfully synced ${syncedCount} notes and graph to your Google Drive!`);
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'Error communicating with Google Drive API.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Settings & Privacy</Text>
          <Text style={styles.headerSub}>Control storage and AI configurations</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Zero Secrets Guarantee Box */}
      <View style={styles.securityBox}>
        <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        <View style={styles.securityTextBox}>
          <Text style={styles.securityTitle}>Strict Zero-Secret Guarantee</Text>
          <Text style={styles.securityDesc}>
            All API keys and cloud tokens are stored encrypted in your phone's hardware storage. They are never
            committed to git or exposed to third-party servers.
          </Text>
        </View>
      </View>

      {/* AI Provider Config */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Brain Provider</Text>
        <Text style={styles.cardSub}>Select the engine for note classification and smart querying</Text>

        <View style={styles.providerRow}>
          <TouchableOpacity
            style={[styles.providerPill, provider === 'gemini' && styles.providerPillActive]}
            onPress={() => setProvider('gemini')}
          >
            <Text style={styles.providerSparkle}>✦</Text>
            <Text style={[styles.providerPillText, provider === 'gemini' && styles.providerPillTextActive]}>
              Gemini 1.5 Flash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.providerPill, provider === 'groq' && styles.providerPillActive]}
            onPress={() => setProvider('groq')}
          >
            <Text style={[styles.providerPillText, provider === 'groq' && styles.providerPillTextActive]}>
              Groq (Llama 3.1)
            </Text>
          </TouchableOpacity>
        </View>

        {provider === 'gemini' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Google Gemini API Key</Text>
            <View style={styles.keyInputRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="AIzaSy..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showGeminiKey}
                value={geminiKey}
                onChangeText={setGeminiKey}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowGeminiKey(!showGeminiKey)}
              >
                <Ionicons
                  name={showGeminiKey ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Used for instant on-device classification & answers</Text>
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Groq API Key</Text>
            <View style={styles.keyInputRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="gsk_..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showGroqKey}
                value={groqKey}
                onChangeText={setGroqKey}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowGroqKey(!showGroqKey)}
              >
                <Ionicons
                  name={showGroqKey ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Used for Llama 3.1 8B instant inference</Text>
          </View>
        )}
      </View>

      {/* Google Drive Storage Config */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="logo-google" size={18} color={colors.geminiBlue} />
          <Text style={styles.cardTitle}>Google Drive Storage</Text>
        </View>
        <Text style={styles.cardSub}>
          Uses your personal Google Drive storage (Gemini Pro / Google One 2TB) to save your notes, PARA folders,
          and knowledge graphs.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Google Drive OAuth Token</Text>
          <TextInput
            style={styles.keyInput}
            placeholder="ya29.a0..."
            placeholderTextColor={colors.textMuted}
            value={driveToken}
            onChangeText={setDriveToken}
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>
            Folder: {settings.googleDriveFolderId ? `SecondSelf/ (${settings.googleDriveFolderId})` : 'SecondSelf/'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncAllToDrive}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <View style={styles.syncRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.syncButtonText}>Syncing to Google Drive...</Text>
            </View>
          ) : (
            <View style={styles.syncRow}>
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>Sync All Notes to Drive</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Storage Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Local Knowledge Base</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{noteCount}</Text>
            <Text style={styles.statLabel}>Total Notes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{settings.googleDriveConnected ? 'Connected' : 'Offline'}</Text>
            <Text style={styles.statLabel}>Drive Sync</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{provider === 'gemini' ? 'Gemini' : 'Groq'}</Text>
            <Text style={styles.statLabel}>AI Brain</Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Preferences</Text>
      </TouchableOpacity>
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
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityTextBox: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  securityDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  providerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  providerPillActive: {
    backgroundColor: colors.geminiBlueLight,
    borderColor: colors.geminiBlue,
  },
  providerSparkle: {
    fontSize: 12,
    color: colors.geminiIris,
  },
  providerPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  providerPillTextActive: {
    color: colors.geminiBlue,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  keyInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  syncButton: {
    marginTop: 12,
    backgroundColor: colors.geminiBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.geminiBlue,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
