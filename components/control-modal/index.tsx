import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ConcreateType,
  Control,
  ElementType,
  Level,
  Program,
} from '@/types/project';

import { StepConcreteType } from './step-concrete-type';
import { StepElectricControl } from './step-electriccontrol';
import { EMPTY_STEP1, Step1Form, StepElementDetails } from './step-element-details';
import { StepInstalationControl } from './step-instalationcontrol';
import { StepIronControl } from './step-ironcontrol';
import { StepPrograms } from './step-programs';
import { StepWaterControl } from './step-watercontrol';
import { styles } from './styles';

const TOTAL_STEPS = 7;
const STEP_LABELS = ['Element Details', 'Programs','Iron Control', 'Electric Control', 'Installation Control', 'Water Control', 'Concrete Type', ];

type Props = {
  visible: boolean;
  editingControl: Control | null;
  levels: Level[];
  latestPrograms: Program[];
  onSave: (data: {
    levelId: string;
    elementName: string;
    elementLocation: string;
    elementType: ElementType;
    programIds: string[];
    concreateType: ConcreateType;
    ironControlImages: string[];
    ironControlDescription: string;
    electricControlImages: string[];
    electricControlDescription: string;
    installationControlImages: string[];
    installationControlDescription: string;
    waterControlImages: string[];
    waterControlDescription: string;
    concreteControlImages: string[];
    concreteControlDescription: string;
    electricNeeded: boolean;
    installationNeeded: boolean;
    waterNeeded: boolean;
  }) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ControlModal({
  visible,
  editingControl,
  levels,
  latestPrograms,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1Form>(EMPTY_STEP1);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [concreateType, setConcreateType] = useState<ConcreateType | ''>('');
  const [ironControlImages, setIronControlImages] = useState<string[]>([]);
  const [electricControlImages, setElectricControlImages] = useState<string[]>([]);
  const [electricControlDescription, setElectricControlDescription] = useState('');
  const [ironControlDescription, setIronControlDescription] = useState('');
  const [installationControlImages, setInstallationControlImages] = useState<string[]>([]);
  const [installationControlDescription, setInstallationControlDescription] = useState('');
  const [waterControlImages, setWaterControlImages] = useState<string[]>([]);
  const [waterControlDescription, setWaterControlDescription] = useState('');
  const [concreteControlImages, setConcreteControlImages] = useState<string[]>([]);
  const [concreteControlDescription, setConcreteControlDescription] = useState('');
  const [electricNeeded, setElectricNeeded] = useState(true);
  const [installationNeeded, setInstallationNeeded] = useState(true);
  const [waterNeeded, setWaterNeeded] = useState(true);

  const resetAndOpen = () => {
    if (editingControl) {
      setStep1({
        levelId: editingControl.Level.id,
        elementName: editingControl.elementName,
        elementLocation: editingControl.elementLocation,
        elementType: editingControl.elementType,
      });
      setSelectedProgramIds(editingControl.programs.map((p) => p.id));
      setConcreateType(editingControl.concreateType);
      setIronControlImages(editingControl.IronControlImagesUri ?? []);
      setIronControlDescription(editingControl.IronControlDescription ?? '');
      setElectricControlImages(editingControl.ElectricalControlImagesUri ?? []);
      setElectricControlDescription(editingControl.ElectricalControlDescription ?? '');
      setInstallationControlImages(editingControl.InstallationControlImagesUri ?? []);
      setInstallationControlDescription(editingControl.InstallationControlDescription ?? '');
      setWaterControlImages(editingControl.WaterControlImagesUri ?? []);
      setWaterControlDescription(editingControl.WaterControlDescription ?? '');
      setConcreteControlImages(editingControl.ConcreteControlImagesUri ?? []);
      setConcreteControlDescription(editingControl.ConcreteControlDescription ?? '');
      setElectricNeeded(editingControl.electricNeeded ?? true);
      setInstallationNeeded(editingControl.installationNeeded ?? true);
      setWaterNeeded(editingControl.waterNeeded ?? true);
    } else {
      setStep1(EMPTY_STEP1);
      setSelectedProgramIds([]);
      setConcreateType('');
      setIronControlImages([]);
      setIronControlDescription('');
      setElectricControlImages([]);
      setElectricControlDescription('');
      setInstallationControlImages([]);
      setInstallationControlDescription('');
      setWaterControlImages([]);
      setWaterControlDescription('');
      setConcreteControlImages([]);
      setConcreteControlDescription('');
      setElectricNeeded(true);
      setInstallationNeeded(true);
      setWaterNeeded(true);
    }
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    setStep1(EMPTY_STEP1);
    setSelectedProgramIds([]);
    setConcreateType('');
    setIronControlImages([]);
    setIronControlDescription('');
    setElectricControlImages([]);
    setElectricControlDescription('');
    setInstallationControlImages([]);
    setInstallationControlDescription('');
    setWaterControlImages([]);
    setWaterControlDescription('');
    setConcreteControlImages([]);
    setConcreteControlDescription('');
    setElectricNeeded(true);
    setInstallationNeeded(true);
    setWaterNeeded(true);
    onClose();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else handleClose();
  };

  const handleConfirm = () => {
    if (!step1.elementType || !concreateType || !step1.levelId) return;
    onSave({
      levelId: step1.levelId,
      elementName: step1.elementName.trim(),
      elementLocation: step1.elementLocation.trim(),
      elementType: step1.elementType as ElementType,
      programIds: selectedProgramIds,
      concreateType: concreateType as ConcreateType,
      ironControlImages,
      ironControlDescription,
      electricControlImages,
      electricControlDescription,
      installationControlImages,
      installationControlDescription,
      waterControlImages,
      waterControlDescription,
      concreteControlImages,
      concreteControlDescription,
      electricNeeded,
      installationNeeded,
      waterNeeded,
    });
    handleClose();
  };

  const toggleProgram = (id: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const updateStep1 = (update: Partial<Step1Form>) => {
    setStep1((prev) => ({ ...prev, ...update }));
  };

  const isStep1Valid = !!(step1.levelId && step1.elementName.trim() && step1.elementType);
  const isLastStep = step === TOTAL_STEPS;

  const canProceed = (() => {
    if (step === 1) return isStep1Valid;
    if (step === 7) return !!concreateType;
    return true;
  })();

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepElementDetails form={step1} levels={levels} onChange={updateStep1} />;
      case 2:
        return (
          <StepPrograms
            latestPrograms={latestPrograms}
            selectedIds={selectedProgramIds}
            onToggle={toggleProgram}
          />
        );
      case 3:
        return (
          <StepIronControl
            imageUris={ironControlImages}
            description={ironControlDescription}
            onChangeImages={setIronControlImages}
            onChangeDescription={setIronControlDescription}
          />
        );
      case 4:
        return (
          <StepElectricControl
            imageUris={electricControlImages}
            description={electricControlDescription}
            needed={electricNeeded}
            onChangeImages={setElectricControlImages}
            onChangeDescription={setElectricControlDescription}
            onChangeNeeded={setElectricNeeded}
          />
        );
      case 5:
        return (
          <StepInstalationControl
            imageUris={installationControlImages}
            description={installationControlDescription}
            needed={installationNeeded}
            onChangeImages={setInstallationControlImages}
            onChangeDescription={setInstallationControlDescription}
            onChangeNeeded={setInstallationNeeded}
          />
        );
      case 6:
        return (
          <StepWaterControl
            imageUris={waterControlImages}
            description={waterControlDescription}
            needed={waterNeeded}
            onChangeImages={setWaterControlImages}
            onChangeDescription={setWaterControlDescription}
            onChangeNeeded={setWaterNeeded}
          />
        );
      case 7:
        return <StepConcreteType value={concreateType} onChange={setConcreateType} imageUris={concreteControlImages} description={concreteControlDescription} onChangeImages={setConcreteControlImages} onChangeDescription={setConcreteControlDescription} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      
      visible={visible}
      transparent
      animationType="slide"
      onShow={resetAndOpen}
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalOverlayPressable} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.dragHandle} />

          <View style={styles.stepHeader}>
            <Text style={styles.modalTitle}>
              {editingControl
                ? 'Edit Control'
                : step > 1 && step1.elementName.trim()
                  ? step1.elementName.trim()
                  : 'New Control'}
            </Text>
            <View style={styles.stepDots}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
              ))}
            </View>
            <Text style={styles.stepLabel}>{STEP_LABELS[step - 1]}</Text>
          </View>

          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            keyboardShouldPersistTaps="handled">
            {renderStep()}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>

            {!isLastStep ? (
              <TouchableOpacity
                style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={!canProceed}
                activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>Next</Text>
                <IconSymbol name="chevron.right" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
                onPress={handleConfirm}
                disabled={!canProceed}
                activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>{editingControl ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingControl && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.8}>
              <IconSymbol name="trash" size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Control</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
