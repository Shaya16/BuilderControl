import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ACCENT } from '@/constants/controls';

import { styles } from './styles';

type Props = {
  imageUris: string[];
  description: string;
  onChangeImages: (uris: string[]) => void;
  onChangeDescription: (desc: string) => void;
};

export function StepIronControl({
  imageUris,
  description,
  onChangeImages,
  onChangeDescription,
}: Props) {
  const pickImage = () => {
    Alert.alert('Add Image', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled) {
            onChangeImages([...imageUris, result.assets[0].uri]);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
          });
          if (!result.canceled) {
            onChangeImages([...imageUris, ...result.assets.map((a) => a.uri)]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = (uri: string) => {
    onChangeImages(imageUris.filter((u) => u !== uri));
  };

  return (
    <View style={styles.stepBody}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          Iron Control Images{imageUris.length > 0 ? `  ·  ${imageUris.length}` : ''}
        </Text>
        <View style={ironStyles.imageGrid}>
          {imageUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={ironStyles.imageWrapper}>
              <Image source={{ uri }} style={ironStyles.image} resizeMode="cover" />
              <TouchableOpacity
                style={ironStyles.removeBtn}
                onPress={() => removeImage(uri)}
                activeOpacity={0.8}>
                <IconSymbol name="xmark" size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={ironStyles.addBtn} onPress={pickImage} activeOpacity={0.7}>
            <IconSymbol name="plus" size={22} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Short Description</Text>
        <TextInput
          style={[styles.input, ironStyles.textArea]}
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Add a short description..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const ironStyles = StyleSheet.create({
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: 88,
    height: 88,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
  },
});
