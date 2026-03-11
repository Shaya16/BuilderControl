import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT } from '@/constants/controls';
import { ControlImage } from '@/types/project';

import { styles } from './styles';

type Props = {
  images: ControlImage[];
  needed: boolean;
  onChangeImages: (images: ControlImage[]) => void;
  onChangeNeeded: (needed: boolean) => void;
};

export function StepWaterControl({
  images,
  needed,
  onChangeImages,
  onChangeNeeded,
}: Props) {
  const pickImage = () => {
    Alert.alert('Add Image', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled) {
            onChangeImages([...images, { uri: result.assets[0].uri, description: '' }]);
          }
        },
      },
      {
        text: 'Gallery',
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
              ...images,
              ...result.assets.map((a) => ({ uri: a.uri, description: '' })),
            ]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = (index: number) => {
    onChangeImages(images.filter((_, i) => i !== index));
  };

  const updateDescription = (index: number, description: string) => {
    onChangeImages(images.map((img, i) => (i === index ? { ...img, description } : img)));
  };

  return (
    <View style={styles.stepBody}>
      <TouchableOpacity
        style={localStyles.notNeededRow}
        onPress={() => onChangeNeeded(!needed)}
        activeOpacity={0.7}>
        <View style={[styles.checkbox, !needed && styles.checkboxChecked]}>
          {!needed && <IconSymbol name="checkmark" size={12} color="#fff" />}
        </View>
        <Text style={localStyles.notNeededText}>Not needed for this element</Text>
      </TouchableOpacity>

      {needed ? (
        <>
          <Text style={styles.fieldLabel}>
            Water Control Images{images.length > 0 ? `  ·  ${images.length}` : ''}
          </Text>

          {images.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={localStyles.imageCard}>
              <Image source={{ uri: img.uri }} style={localStyles.imageThumb} resizeMode="cover" />
              <TextInput
                style={[styles.input, localStyles.descInput]}
                value={img.description}
                onChangeText={(text) => updateDescription(index, text)}
                placeholder="Description..."
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

          <TouchableOpacity style={localStyles.addBtn} onPress={pickImage} activeOpacity={0.7}>
            <IconSymbol name="plus" size={18} color={ACCENT} />
            <Text style={localStyles.addBtnText}>Add Image</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyHint}>Water control is not needed for this element.</Text>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  notNeededRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  notNeededText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
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
});
