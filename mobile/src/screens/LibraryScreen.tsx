import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { storageService } from '../services/storage';
import { NoteItem, ParaCategory } from '../types';

interface LibraryScreenProps {
  onSelectNote?: (note: NoteItem) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectNote }) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ParaCategory | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const items = await storageService.getNotes();
      setNotes(items);
    } catch (e) {
      console.warn('Failed to fetch notes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = (note: NoteItem) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.summary || note.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = await storageService.deleteNote(note.id);
            setNotes(updated);
          },
        },
      ]
    );
  };

  const filteredNotes = notes.filter((n) => {
    const matchesCat = selectedCategory === 'All' || n.para === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, tags, ideas..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* PARA Category Chips */}
      <View style={styles.categoriesBar}>
        {(['All', 'Projects', 'Areas', 'Resources', 'Archives'] as const).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchNotes}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Notes Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'Try another search query' : 'Capture your first note using the Capture tab'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const paraConfig = colors.para[item.para] || colors.para.Archives;
          return (
            <TouchableOpacity
              style={styles.noteCard}
              activeOpacity={0.7}
              onPress={() => onSelectNote && onSelectNote(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.paraBadge,
                      { backgroundColor: paraConfig.background, borderColor: paraConfig.border },
                    ]}
                  >
                    <Text style={[styles.paraBadgeText, { color: paraConfig.color }]}>{item.para}</Text>
                  </View>
                  {item.syncedToDrive ? (
                    <View style={styles.driveStatus}>
                      <Ionicons name="cloud-done" size={13} color={colors.success} />
                    </View>
                  ) : (
                    <View style={styles.driveStatus}>
                      <Ionicons name="cloud-offline-outline" size={13} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.noteTitle} numberOfLines={2}>
                {item.summary || item.title}
              </Text>

              <Text style={styles.noteBodySnippet} numberOfLines={2}>
                {item.body}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.tagRow}>
                  {item.tags.slice(0, 3).map((t, idx) => (
                    <View key={idx} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{t}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.dateText}>{item.created.split('T')[0]}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoriesBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
  },
  categoryChipActive: {
    backgroundColor: colors.geminiBlueLight,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: colors.geminiBlue,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paraBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  paraBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driveStatus: {
    marginLeft: 2,
  },
  deleteButton: {
    padding: 4,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  noteBodySnippet: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
