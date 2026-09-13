import React, { useState, useRef } from 'react';
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
import { colors, shadows } from '../theme/colors';
import { aiService, AskResult } from '../services/ai';
import { storageService } from '../services/storage';
import { AskMessage, AppSettings, NoteItem } from '../types';

interface AskScreenProps {
  settings: AppSettings;
}

export const AskScreen: React.FC<AskScreenProps> = ({ settings }) => {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const SUGGESTIONS = [
    'Summarize my current active projects',
    'What key resources did I save recently?',
    'What tasks or areas require attention?',
  ];

  const handleAsk = async (textToAsk?: string) => {
    const q = (textToAsk || questionInput).trim();
    if (!q) return;

    const userMessage: AskMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestionInput('');
    setIsAsking(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 1. Fetch current notes from local storage (or Drive cache)
      const notes = await storageService.getNotes();

      // 2. Synthesize answer with Gemini / Groq
      const apiKey = settings.aiProvider === 'gemini' ? settings.geminiApiKey : settings.groqApiKey;
      const result: AskResult = await aiService.askSecondSelf(
        q,
        notes,
        apiKey,
        settings.aiProvider
      );

      const assistantMessage: AskMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate answer.');
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Answer copied to clipboard.');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptySparkleBadge}>
              <Text style={styles.emptySparkleText}>✦</Text>
            </View>
            <Text style={styles.emptyTitle}>Ask your Second Brain</Text>
            <Text style={styles.emptySub}>
              Retrieve answers synthesized across your notes, links, and documents using Gemini AI.
            </Text>

            <View style={styles.suggestionList}>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => handleAsk(sug)}
                >
                  <Text style={styles.suggestionSparkle}>✦</Text>
                  <Text style={styles.suggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.messageWrapper, msg.role === 'user' ? styles.userWrapper : styles.assistantWrapper]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.assistantBadge}>
                <Text style={styles.assistantBadgeSparkle}>✦</Text>
              </View>
            )}

            <View style={[styles.messageCard, msg.role === 'user' ? styles.userCard : styles.assistantCard]}>
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
                {msg.content}
              </Text>

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <View style={styles.sourcesContainer}>
                  <Text style={styles.sourcesLabel}>Sources</Text>
                  <View style={styles.sourcesRow}>
                    {msg.sources.map((src, idx) => (
                      <View key={idx} style={styles.sourceChip}>
                        <Text style={styles.sourcePara}>{src.para}</Text>
                        <Text style={styles.sourceSummary} numberOfLines={1}>
                          {src.summary}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Assistant Footer: Copy & Time */}
              {msg.role === 'assistant' && (
                <View style={styles.assistantFooter}>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(msg.content)}
                  >
                    <Ionicons name="copy-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.copyText}>Copy</Text>
                  </TouchableOpacity>
                  <Text style={styles.messageTime}>{msg.timestamp}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {isAsking && (
          <View style={[styles.messageWrapper, styles.assistantWrapper]}>
            <View style={styles.assistantBadge}>
              <Text style={styles.assistantBadgeSparkle}>✦</Text>
            </View>
            <View style={[styles.messageCard, styles.assistantCard, styles.thinkingCard]}>
              <ActivityIndicator size="small" color={colors.geminiIris} />
              <Text style={styles.thinkingText}>Gemini is reasoning through your notes...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Prompt Bar */}
      <View style={styles.promptBarWrapper}>
        <View style={styles.promptBar}>
          <TextInput
            style={styles.promptInput}
            placeholder="Ask anything about your notes..."
            placeholderTextColor={colors.textMuted}
            value={questionInput}
            onChangeText={setQuestionInput}
            onSubmitEditing={() => handleAsk()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !questionInput.trim() && styles.sendButtonDisabled]}
            onPress={() => handleAsk()}
            disabled={!questionInput.trim() || isAsking}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={questionInput.trim() ? '#FFFFFF' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptySparkleBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.geminiIrisLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  emptySparkleText: {
    fontSize: 24,
    color: colors.geminiIris,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  suggestionList: {
    width: '100%',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  suggestionSparkle: {
    fontSize: 12,
    color: colors.geminiIris,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  assistantBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.geminiIrisLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  assistantBadgeSparkle: {
    fontSize: 14,
    color: colors.geminiIris,
    fontWeight: 'bold',
  },
  messageCard: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
  },
  userCard: {
    backgroundColor: colors.geminiBlue,
    borderBottomRightRadius: 4,
    ...shadows.sm,
  },
  assistantCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: colors.textPrimary,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sourcesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sourcesRow: {
    gap: 6,
  },
  sourceChip: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourcePara: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.geminiBlue,
  },
  sourceSummary: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  assistantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  thinkingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thinkingText: {
    fontSize: 13,
    color: colors.geminiIris,
    fontStyle: 'italic',
  },
  promptBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  promptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.geminiBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
