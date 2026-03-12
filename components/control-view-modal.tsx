import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Sharing from 'expo-sharing';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ACCENT,
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
  const insets = useSafeAreaInsets();

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
      <View style={[viewStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
                <Text style={viewStyles.chipLabel}>מיקום:</Text>
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
              <Text style={viewStyles.concreteBadgeLabel}>בטון:</Text>
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
            <Section title="תוכניות">
              {control.programs.map((p) => (
                <View key={p.id} style={viewStyles.programCard}>
                  <View style={viewStyles.programRow}>
                    <View style={viewStyles.programNameWrap}>
                      <Text style={viewStyles.programName}>{p.name}</Text>
                      <View style={viewStyles.programDot} />
                    </View>
                    <Text style={viewStyles.programMeta}>מס׳ -  {p.number}  ·  v{p.version}  ·  {p.date}</Text>
                  </View>
                  {p.imageUri && (
                    <View style={viewStyles.programImageWrap}>
                      <Image source={{ uri: p.imageUri }} style={viewStyles.programImage} resizeMode="contain" />
                      <TouchableOpacity
                        style={viewStyles.downloadBtn}
                        onPress={async () => {
                          const available = await Sharing.isAvailableAsync();
                          if (available) await Sharing.shareAsync(p.imageUri!);
                        }}
                        activeOpacity={0.8}>
                        <IconSymbol name="square.and.arrow.down" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </Section>
          )}

          {/* ── Iron Control ── */}
          <Section
            title="בקרת ברזל"
            count={control.IronControlImages?.length}>
            <ImageList images={control.IronControlImages} />
          </Section>

          {/* ── Electric Control ── */}
          <Section
            title="בקרת חשמל"
            badge={
              control.electricNeeded === false
                ? { label: 'לא נדרש', color: '#999' }
                : undefined
            }
            count={control.electricNeeded !== false ? control.ElectricalControlImages?.length : undefined}>
            {control.electricNeeded === false ? (
              <View style={viewStyles.emptyHintWrap}>
                <Text style={viewStyles.emptyHint}>לא נדרש עבור אלמנט זה.</Text>
              </View>
            ) : (
              <ImageList images={control.ElectricalControlImages} />
            )}
          </Section>

          {/* ── Installation Control ── */}
          <Section
            title="בקרת אינסטלציה"
            badge={
              control.installationNeeded === false
                ? { label: 'לא נדרש', color: '#999' }
                : undefined
            }
            count={control.installationNeeded !== false ? control.InstallationControlImages?.length : undefined}>
            {control.installationNeeded === false ? (
              <View style={viewStyles.emptyHintWrap}>
                <Text style={viewStyles.emptyHint}>לא נדרש עבור אלמנט זה.</Text>
              </View>
            ) : (
              <ImageList images={control.InstallationControlImages} />
            )}
          </Section>

          {/* ── Water Control ── */}
          <Section
            title="בקרת מיזוג אוויר"
            badge={
              control.waterNeeded === false
                ? { label: 'לא נדרש', color: '#999' }
                : undefined
            }
            count={control.waterNeeded !== false ? control.WaterControlImages?.length : undefined}>
            {control.waterNeeded === false ? (
              <View style={viewStyles.emptyHintWrap}>
                <Text style={viewStyles.emptyHint}>לא נדרש עבור אלמנט זה.</Text>
              </View>
            ) : (
              <ImageList images={control.WaterControlImages} />
            )}
          </Section>

          {/* ── Other Control ── */}
          <Section
            title="בקרת שונות"
            count={control.otherControlImages?.length}>
            <ImageList images={control.otherControlImages} />
          </Section>

          {/* ── Concrete Control ── */}
          <Section
            title="בקרת יציקה"
            count={control.ConcreteControlImages?.length}>
            <ImageList images={control.ConcreteControlImages} />
          </Section>

        </ScrollView>

        {/* ── Footer ── */}
        <View style={viewStyles.footer}>
          <TouchableOpacity style={viewStyles.editButton} onPress={onEdit} activeOpacity={0.8}>
            <IconSymbol name="pencil" size={16} color="#fff" />
            <Text style={viewStyles.editButtonText}>עריכה</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[viewStyles.exportButton, exporting && viewStyles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}>
            {exporting ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <IconSymbol name="arrow.down.doc" size={16} color={ACCENT} />
            )}
            <Text style={viewStyles.exportButtonText}>
              {exporting ? 'טוען...' : 'ייצא PDF'}
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
  style?: StyleProp<ViewStyle>;
};

function Section({ title, count, badge, children, style }: SectionProps) {
  return (
    <View style={[viewStyles.section, style]}>
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
    return <Text style={viewStyles.emptyHint}>אין תמונות</Text>;
  }

  const handleDownload = async (uri: string) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing not available', 'Cannot share on this device.');
      return;
    }
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={viewStyles.imageList}>
      {images.map((img, index) => (
        <View key={`${img.uri}-${index}`} style={viewStyles.imageCard}>
          <View style={viewStyles.imageWrapper}>
            <Image source={{ uri: img.uri }} style={viewStyles.imageThumb} resizeMode="cover" />
            <TouchableOpacity
              style={viewStyles.downloadBtn}
              onPress={() => handleDownload(img.uri)}
              activeOpacity={0.8}>
              <IconSymbol name="square.and.arrow.down" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
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
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    writingDirection: 'rtl',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    writingDirection: 'rtl',
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
    color: ACCENT,
  },
  emptyHintWrap: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  emptyHint: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  programCard: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  programRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    direction: 'ltr',
  },
  programImageWrap: {
    width: '100%',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  programImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  programDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  programNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  programName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  programMeta: {
    fontSize: 12,
    color: '#888',
    writingDirection: 'rtl',
    textAlign: 'right',
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
  imageWrapper: {
    width: '100%',
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  downloadBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 7,
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
    backgroundColor: ACCENT,
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
    borderColor: ACCENT,
    backgroundColor: '#fff',
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT,
  },
});
