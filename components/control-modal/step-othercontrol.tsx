import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { ACCENT } from '@/constants/controls';
import { ControlImage } from '@/types/project';

import { styles } from './styles';
import PlusIcon from '@/assets/icons/plus.svg';
import XmarkIcon from '@/assets/icons/xmark.svg';

type Props = {
  images: ControlImage[];
  onChangeImages: (images: ControlImage[]) => void;
};

export function StepOtherControl({ images, onChangeImages }: Props) {
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

  return (
    <View style={styles.stepBody}>
      <Text style={styles.fieldLabel}>
        תמונות בקרת שונות{images.length > 0 ? `  ·  ${images.length}` : ''}
      </Text>
      <TouchableOpacity style={localStyles.addBtn} onPress={pickImage} activeOpacity={0.7}>
        <PlusIcon width={18} height={18} color={ACCENT} />
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
            <XmarkIcon width={10} height={10} color="#fff" />
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
});
