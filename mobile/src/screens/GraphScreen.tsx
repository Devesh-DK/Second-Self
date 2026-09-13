import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { storageService } from '../services/storage';
import { GraphData, GraphNode, ParaCategory } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_HEIGHT = 420;

export const GraphScreen: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<ParaCategory | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getGraph();
      setGraphData(data);
    } catch (e) {
      console.warn('Failed to load graph:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  // Filter nodes according to selected PARA category
  const filteredNodes = (graphData?.nodes || []).filter(
    (n) => activeFilter === 'All' || n.para === activeFilter
  );

  // Position nodes in a clean organic radial layout
  const positionedNodes = filteredNodes.map((node, i) => {
    const total = filteredNodes.length || 1;
    const angle = (i / total) * 2 * Math.PI;
    const radius = Math.min(SCREEN_WIDTH * 0.35, 140);
    const centerX = SCREEN_WIDTH / 2;
    const centerY = GRAPH_HEIGHT / 2;

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return { ...node, x, y };
  });

  const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

  // Calculate filtered edges
  const visibleEdges = (graphData?.edges || []).filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  return (
    <View style={styles.container}>
      {/* Top Controls & Legend */}
      <View style={styles.controlsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', 'Projects', 'Areas', 'Resources', 'Archives'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
              onPress={() => {
                setActiveFilter(cat);
                setSelectedNode(null);
              }}
            >
              <Text style={[styles.filterChipText, activeFilter === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.refreshButton} onPress={loadGraph}>
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Graph Area */}
      <View style={styles.graphContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.geminiBlue} />
            <Text style={styles.loadingText}>Synthesizing knowledge graph...</Text>
          </View>
        ) : positionedNodes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="git-network-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Nodes in Graph</Text>
            <Text style={styles.emptySub}>Capture notes to visualize connections between ideas.</Text>
          </View>
        ) : (
          <Svg width={SCREEN_WIDTH} height={GRAPH_HEIGHT}>
            {/* Draw Edges */}
            {visibleEdges.map((edge, idx) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;
              return (
                <Line
                  key={`edge-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={colors.border}
                  strokeWidth="1.5"
                  strokeDasharray={edge.type === 'similarity' ? '3,3' : undefined}
                />
              );
            })}

            {/* Draw Nodes */}
            {positionedNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const paraStyle = colors.para[node.para] || colors.para.Archives;
              return (
                <G key={node.id} onPress={() => setSelectedNode(node)}>
                  {/* Outer selection ring */}
                  {isSelected && (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={24}
                      fill="none"
                      stroke={colors.geminiBlue}
                      strokeWidth="2"
                    />
                  )}
                  {/* Node Body */}
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 16 : 14}
                    fill={paraStyle.color}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />
                  {/* Label */}
                  <SvgText
                    x={node.x}
                    y={node.y + 26}
                    fontSize="10"
                    fill={colors.textPrimary}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {node.label.length > 14 ? `${node.label.slice(0, 12)}..` : node.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
      </View>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <View style={styles.inspectorCard}>
          <View style={styles.inspectorHeader}>
            <View
              style={[
                styles.paraBadge,
                {
                  backgroundColor: colors.para[selectedNode.para].background,
                  borderColor: colors.para[selectedNode.para].border,
                },
              ]}
            >
              <Text style={[styles.paraBadgeText, { color: colors.para[selectedNode.para].color }]}>
                {selectedNode.para}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNode(null)}>
              <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inspectorTitle}>{selectedNode.label}</Text>
          {selectedNode.summary ? (
            <Text style={styles.inspectorSummary}>{selectedNode.summary}</Text>
          ) : null}

          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <View style={styles.tagRow}>
              {selectedNode.tags.map((t, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Footer Stats */}
      <View style={styles.footerBar}>
        <Text style={styles.footerStats}>
          {graphData?.nodes.length || 0} Nodes • {graphData?.edges.length || 0} Connections
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.geminiBlueLight,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.geminiBlue,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
    marginLeft: 6,
  },
  graphContainer: {
    height: GRAPH_HEIGHT,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
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
    textAlign: 'center',
    marginTop: 4,
  },
  inspectorCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  inspectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  inspectorSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerBar: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerStats: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
