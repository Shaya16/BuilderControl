import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT } from '@/constants/controls';
import { ConcreteType, ControlImage } from '@/types/project';

import { styles } from './styles';

type Props = {
  concreteTypes: ConcreteType[];
  value: ConcreteType | null;
  images: ControlImage[];
  validatedConcrete: boolean;
  validatedConcreteAt?: string;
  onChange: (type: ConcreteType) => void;
  onChangeImages: (images: ControlImage[]) => void;
  onChangeValidatedConcrete: (validated: boolean) => void;
};

export function StepConcreteType({ concreteTypes, value, images, validatedConcrete, validatedConcreteAt, onChange, onChangeImages, onChangeValidatedConcrete }: Props) {
  const pickImage = () => {
    Alert.alert('הוסף תמונה', 'בחר מקור', [
      {
        text: 'מצלמה',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled) {
            onChangeImages([{ uri: result.assets[0].uri, description: '' }, ...images]);
          }
        },
      },
      {
        text: 'גלריה',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
          });
          if (!result.canceled) {
            onChangeImages([
              ...result.assets.map((a) => ({ uri: a.uri, description: '' })),
              ...images,
            ]);
          }
        },
      },
      { text: 'ביטול', style: 'cancel' },
    ]);
  };

  const removeImage = (index: number) => {
    onChangeImages(images.filter((_, i) => i !== index));
  };

  const updateDescription = (index: number, description: string) => {
    onChangeImages(images.map((img, i) => (i === index ? { ...img, description } : img)));
  };

  const isSelected = (ct: ConcreteType) => value?.id === ct.id;

  return (
    <View style={styles.stepBody}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>סוג בטון</Text>
        {concreteTypes.length === 0 ? (
          <Text style={styles.emptyHint}>הוסף סוגי בטון </Text>
        ) : (
          <View style={styles.chipGrid}>
            {concreteTypes.map((ct) => (
              <TouchableOpacity
                key={ct.id}
                style={[styles.chip, styles.chipWide, isSelected(ct) && styles.chipSelected]}
                onPress={() => onChange(ct)}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, isSelected(ct) && styles.chipTextSelected]}>
                  {ct.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <TouchableOpacity
          style={localStyles.checkboxRow}
          onPress={() => onChangeValidatedConcrete(!validatedConcrete)}
          activeOpacity={0.7}>
          <View style={[localStyles.checkbox, validatedConcrete && localStyles.checkboxChecked]}>
            {validatedConcrete && <IconSymbol name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={localStyles.checkboxLabel}>אישור יציקה </Text>
        </TouchableOpacity>
        {validatedConcrete && validatedConcreteAt && (
          <Text style={localStyles.validatedAtText}>
            אושר ב: {new Date(validatedConcreteAt).toLocaleDateString('he-IL')} {new Date(validatedConcreteAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>

      <Text style={styles.fieldLabel}>
        תמונות בקרת בטון{images.length > 0 ? `  ·  ${images.length}` : ''}
      </Text>
      <TouchableOpacity style={localStyles.addBtn} onPress={pickImage} activeOpacity={0.7}>
        <IconSymbol name="plus" size={18} color={ACCENT} />
        <Text style={localStyles.addBtnText}>הוסף תמונה</Text>
      </TouchableOpacity>
      {images.map((img, index) => (
        <View key={`${img.uri}-${index}`} style={localStyles.imageCard}>
          <Image source={{ uri: img.uri }} style={localStyles.imageThumb} resizeMode="cover" />
          <TextInput
            style={[styles.input, localStyles.descInput]}
            value={img.description}
            onChangeText={(text) => updateDescription(index, text)}
            placeholder="תיאור..."
            placeholderTextColor="#aaa"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={localStyles.removeBtn}
            onPress={() => removeImage(index)}
            activeOpacity={0.8}>
            <IconSymbol name="xmark" size={10} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      
    </View>
  );
}

const localStyles = StyleSheet.create({
  imageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  descInput: {
    flex: 1,
    height: 80,
    paddingTop: 8,
    paddingBottom: 8,
  },
  removeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    backgroundColor: '#f0f9ff',
  },
  addBtnText: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  validatedAtText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
});
