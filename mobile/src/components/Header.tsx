import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';

interface HeaderProps {
  onOpenSettings: () => void;
  isDriveConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, isDriveConnected = false }) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        {/* Gemini Sparkle Icon Badge */}
        <View style={styles.sparkleBadge}>
          <Text style={styles.sparkleIcon}>✦</Text>
        </View>
        <View>
          <Text style={styles.title}>SecondSelf</Text>
          <Text style={styles.subtitle}>Personal Knowledge Assistant</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        {/* Drive Status Pill */}
        <View style={[styles.drivePill, isDriveConnected ? styles.driveConnected : styles.driveOffline]}>
          <Ionicons
            name={isDriveConnected ? 'cloud-done' : 'cloud-offline-outline'}
            size={13}
            color={isDriveConnected ? colors.success : colors.textMuted}
          />
          <Text style={[styles.driveText, isDriveConnected ? styles.driveTextConnected : styles.driveTextOffline]}>
            {isDriveConnected ? 'Drive' : 'Local'}
          </Text>
        </View>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenSettings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.geminiIrisLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  sparkleIcon: {
    fontSize: 18,
    color: colors.geminiIris,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  driveConnected: {
    backgroundColor: colors.successLight,
    borderColor: '#A7F3D0',
  },
  driveOffline: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  driveText: {
    fontSize: 11,
    fontWeight: '600',
  },
  driveTextConnected: {
    color: '#065F46',
  },
  driveTextOffline: {
    color: colors.textSecondary,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
