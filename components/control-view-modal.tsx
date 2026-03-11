import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  DEFAULT_ELEMENT_TYPE_COLOR,
  ELEMENT_TYPE_COLORS,
  ELEMENT_TYPE_LABELS,
} from '@/constants/controls';
import { Control, ControlImage } from '@/types/project';
import { exportControlPDF } from '@/utils/exportControlPDF';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
    + '  '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  visible: boolean;
  control: Control | null;
  onClose: () => void;
  onEdit: () => void;
};

export function ControlViewModal({ visible, control, onClose, onEdit }: Props) {
  const [exporting, setExporting] = useState(false);

  if (!control) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportControlPDF(control);
    } catch {
      Alert.alert('Export failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const typeColor =
    ELEMENT_TYPE_COLORS[control.elementType as keyof typeof ELEMENT_TYPE_COLORS] ??
    DEFAULT_ELEMENT_TYPE_COLOR;

  const typeLabel =
    ELEMENT_TYPE_LABELS[control.elementType as keyof typeof ELEMENT_TYPE_LABELS] ??
    control.elementType;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={viewStyles.overlay} onPress={onClose} />
      <View style={viewStyles.sheet}>
        <View style={viewStyles.dragHandle} />

        {/* ── Header ── */}
        <View style={[viewStyles.header, { borderLeftColor: typeColor }]}>
          <View style={viewStyles.headerTop}>
            <Text style={viewStyles.elementName} numberOfLines={1}>
              {control.elementName}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={12}>
              <IconSymbol name="xmark" size={16} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={viewStyles.badgeRow}>
            <View style={[viewStyles.typeBadge, { borderColor: typeColor }]}>
              <Text style={[viewStyles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={viewStyles.chip}>
              <IconSymbol name="square.2.layers.3d.fill" size={11} color="#888" />
              <Text style={viewStyles.chipText}>{control.Level.name}</Text>
            </View>
            {!!control.elementLocation && (
              <View style={viewStyles.chip}>
                <IconSymbol name="mappin" size={11} color="#888" />
                <Text style={viewStyles.chipLabel}>Location:</Text>
                <Text style={viewStyles.chipText}>{control.elementLocation}</Text>
              </View>
            )}
            {!!(control.createdAt || control.updatedAt) && (
              <View style={viewStyles.chip}>
                <IconSymbol name="clock" size={11} color="#888" />
                <Text style={viewStyles.chipText}>
                  {formatDate(control.updatedAt ?? control.createdAt!)}
                </Text>
              </View>
            )}
            <View style={viewStyles.concreteBadge}>
              <Text style={viewStyles.concreteBadgeLabel}>Concrete:</Text>
              <Text style={viewStyles.concreteBadgeText}>{control.concreateType?.name}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={viewStyles.scroll}
          contentContainerStyle={viewStyles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* ── Programs ── */}
          {control.programs.length > 0 && (
            <Section title="Programs">
              {control.programs.map((p) => (
                <View key={p.id} style={viewStyles.programRow}>
                  <View style={viewStyles.programDot} />
                  <Text style={viewStyles.programName}>{p.name}</Text>
                  <Text style={viewStyles.programMeta}>No. {p.number}  ·  v{p.version}</Text>
                </View>
              ))}
            </Section>
          )}

          {/* ── Iron Control ── */}
          <Section
            title="Iron Control"
            count={control.IronControlImages?.length}>
            <ImageList images={control.IronControlImages} />
          </Section>

          {/* ── Electric Control ── */}
          <Section
            title="Electric Control"
            badge={
              control.electricNeeded === false
                ? { label: 'Not needed', color: '#999' }
                : undefined
            }
            count={control.electricNeeded !== false ? control.ElectricalControlImages?.length : undefined}>
            {control.electricNeeded === false ? (
              <Text style={viewStyles.emptyHint}>Not needed for this element.</Text>
            ) : (
              <ImageList images={control.ElectricalControlImages} />
            )}
          </Section>

          {/* ── Installation Control ── */}
          <Section
            title="Installation Control"
            badge={
              control.installationNeeded === false
                ? { label: 'Not needed', color: '#999' }
                : undefined
            }
            count={control.installationNeeded !== false ? control.InstallationControlImages?.length : undefined}>
            {control.installationNeeded === false ? (
              <Text style={viewStyles.emptyHint}>Not needed for this element.</Text>
            ) : (
              <ImageList images={control.InstallationControlImages} />
            )}
          </Section>

          {/* ── Water Control ── */}
          <Section
            title="Water Control"
            badge={
              control.waterNeeded === false
                ? { label: 'Not needed', color: '#999' }
                : undefined
            }
            count={control.waterNeeded !== false ? control.WaterControlImages?.length : undefined}>
            {control.waterNeeded === false ? (
              <Text style={viewStyles.emptyHint}>Not needed for this element.</Text>
            ) : (
              <ImageList images={control.WaterControlImages} />
            )}
          </Section>

          {/* ── Concrete Control ── */}
          <Section
            title="Concrete Control"
            count={control.ConcreteControlImages?.length}>
            <ImageList images={control.ConcreteControlImages} />
          </Section>

        </ScrollView>

        {/* ── Footer ── */}
        <View style={viewStyles.footer}>
          <TouchableOpacity style={viewStyles.editButton} onPress={onEdit} activeOpacity={0.8}>
            <IconSymbol name="pencil" size={16} color="#fff" />
            <Text style={viewStyles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[viewStyles.exportButton, exporting && viewStyles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}>
            {exporting ? (
              <ActivityIndicator size="small" color="#0a7ea4" />
            ) : (
              <IconSymbol name="arrow.down.doc" size={16} color="#0a7ea4" />
            )}
            <Text style={viewStyles.exportButtonText}>
              {exporting ? 'Generating…' : 'Export PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    </Modal>
  );
}

/* ── Sub-components ─────────────────────────────────── */

type SectionProps = {
  title: string;
  count?: number;
  badge?: { label: string; color: string };
  children: React.ReactNode;
};

function Section({ title, count, badge, children }: SectionProps) {
  return (
    <View style={viewStyles.section}>
      <View style={viewStyles.sectionHeader}>
        <Text style={viewStyles.sectionTitle}>{title}</Text>
        {badge && (
          <View style={[viewStyles.sectionBadge, { borderColor: badge.color }]}>
            <Text style={[viewStyles.sectionBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        )}
        {count !== undefined && count > 0 && (
          <View style={viewStyles.countBadge}>
            <Text style={viewStyles.countBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function ImageList({ images }: { images?: ControlImage[] }) {
  if (!images || images.length === 0) {
    return <Text style={viewStyles.emptyHint}>No images.</Text>;
  }
  return (
    <View style={viewStyles.imageList}>
      {images.map((img, index) => (
        <View key={`${img.uri}-${index}`} style={viewStyles.imageCard}>
          <Image source={{ uri: img.uri }} style={viewStyles.imageThumb} resizeMode="cover" />
          {!!img.description && (
            <Text style={viewStyles.imageDesc}>{img.description}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────── */

const viewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    borderLeftWidth: 4,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elementName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipText: {
    fontSize: 12,
    color: '#555',
  },
  chipLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  concreteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  concreteBadgeLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  concreteBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  emptyHint: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  programDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0a7ea4',
  },
  programName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    flex: 1,
  },
  programMeta: {
    fontSize: 12,
    color: '#888',
  },
  imageList: {
    gap: 8,
  },
  imageCard: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  imageThumb: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageDesc: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    paddingTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0a7ea4',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0a7ea4',
    backgroundColor: '#fff',
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
});
