import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from './src/theme/colors';
import { Header } from './src/components/Header';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { AskScreen } from './src/screens/AskScreen';
import { GraphScreen } from './src/screens/GraphScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { storageService } from './src/services/storage';
import { AppSettings, NoteItem } from './src/types';

type TabType = 'capture' | 'ask' | 'graph' | 'library';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('capture');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    aiProvider: 'gemini',
    geminiApiKey: '',
    groqApiKey: '',
    googleDriveConnected: false,
    googleUserEmail: '',
    googleAccessToken: '',
    googleDriveFolderId: '',
  });

  useEffect(() => {
    storageService.getSettings().then((s) => setSettings(s));
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleNoteCreated = (_note: NoteItem) => {
    // Optional callback when note created
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* Top Gemini Header */}
        <Header
          onOpenSettings={() => setShowSettings(true)}
          isDriveConnected={settings.googleDriveConnected}
        />

        {/* Screen Content */}
        <View style={styles.content}>
          {activeTab === 'capture' && (
            <CaptureScreen settings={settings} onNoteCreated={handleNoteCreated} />
          )}
          {activeTab === 'ask' && <AskScreen settings={settings} />}
          {activeTab === 'graph' && <GraphScreen />}
          {activeTab === 'library' && <LibraryScreen />}
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'capture' && styles.navItemActive]}
            onPress={() => setActiveTab('capture')}
          >
            <Ionicons
              name={activeTab === 'capture' ? 'create' : 'create-outline'}
              size={20}
              color={activeTab === 'capture' ? colors.geminiBlue : colors.textSecondary}
            />
            <Text style={[styles.navLabel, activeTab === 'capture' && styles.navLabelActive]}>
              Capture
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'ask' && styles.navItemActive]}
            onPress={() => setActiveTab('ask')}
          >
            <View style={styles.askIconWrapper}>
              <Ionicons
                name={activeTab === 'ask' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={20}
                color={activeTab === 'ask' ? colors.geminiIris : colors.textSecondary}
              />
              <Text style={styles.tabSparkle}>✦</Text>
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === 'ask' && { color: colors.geminiIris, fontWeight: '700' },
              ]}
            >
              Ask AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'graph' && styles.navItemActive]}
            onPress={() => setActiveTab('graph')}
          >
            <Ionicons
              name={activeTab === 'graph' ? 'git-network' : 'git-network-outline'}
              size={20}
              color={activeTab === 'graph' ? colors.geminiBlue : colors.textSecondary}
            />
            <Text style={[styles.navLabel, activeTab === 'graph' && styles.navLabelActive]}>
              Graph
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'library' && styles.navItemActive]}
            onPress={() => setActiveTab('library')}
          >
            <Ionicons
              name={activeTab === 'library' ? 'albums' : 'albums-outline'}
              size={20}
              color={activeTab === 'library' ? colors.geminiBlue : colors.textSecondary}
            />
            <Text style={[styles.navLabel, activeTab === 'library' && styles.navLabelActive]}>
              Library
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings Modal */}
        <Modal
          visible={showSettings}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSettings(false)}
        >
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
            <SettingsScreen
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClose={() => setShowSettings(false)}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 62,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadows.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 3,
  },
  navItemActive: {
    transform: [{ scale: 1.02 }],
  },
  askIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSparkle: {
    position: 'absolute',
    top: -5,
    right: -7,
    fontSize: 9,
    color: colors.geminiIris,
    fontWeight: 'bold',
  },
  navLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  navLabelActive: {
    color: colors.geminiBlue,
    fontWeight: '700',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
