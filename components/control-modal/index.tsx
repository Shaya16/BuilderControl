import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ConcreteType,
  Control,
  ControlImage,
  ElementType,
  Level,
  Program,
} from '@/types/project';

import { ACCENT } from '@/constants/controls';
import { StepWaterControl } from './step-airconditioncontrol';
import { StepConcreteType } from './step-concrete-type';
import { StepElectricControl } from './step-electriccontrol';
import {
  ELEMENT_TYPE_OTHER,
  EMPTY_STEP1,
  Step1Form,
  StepElementDetails,
} from './step-element-details';
import { StepInstalationControl } from './step-instalationcontrol';
import { StepIronControl } from './step-ironcontrol';
import { StepOtherControl } from './step-othercontrol';
import { StepPrograms } from './step-programs';
import { styles } from './styles';

const TOTAL_STEPS = 8;
const STEP_LABELS = ['פרטי האלמנט', 'תוכניות', 'בקרת ברזל', 'בקרת חשמל', 'בקרת אינסטלציה', 'בקרת מיזוג אוויר', 'בקרת שונות', 'בקרת יציקה'];

type Props = {
  visible: boolean;
  editingControl: Control | null;
  levels: Level[];
  concreteTypes: ConcreteType[];
  latestPrograms: Program[];
  onSave: (data: {
    levelId: string;
    elementName: string;
    elementLocation: string;
    elementType: ElementType | string;
    programIds: string[];
    concreteType: ConcreteType;
    ironControlImages: ControlImage[];
    electricControlImages: ControlImage[];
    installationControlImages: ControlImage[];
    waterControlImages: ControlImage[];
    otherControlImages: ControlImage[];
    concreteControlImages: ControlImage[];
    electricNeeded: boolean;
    installationNeeded: boolean;
    waterNeeded: boolean;
    validatedConcrete: boolean;
    validatedConcreteAt?: string;
  }) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ControlModal({
  visible,
  editingControl,
  levels,
  concreteTypes,
  latestPrograms,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1Form>(EMPTY_STEP1);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [concreteType, setConcreteType] = useState<ConcreteType | null>(null);
  const [ironControlImages, setIronControlImages] = useState<ControlImage[]>([]);
  const [electricControlImages, setElectricControlImages] = useState<ControlImage[]>([]);
  const [installationControlImages, setInstallationControlImages] = useState<ControlImage[]>([]);
  const [waterControlImages, setWaterControlImages] = useState<ControlImage[]>([]);
  const [concreteControlImages, setConcreteControlImages] = useState<ControlImage[]>([]);
  const [electricNeeded, setElectricNeeded] = useState(true);
  const [otherControlImages, setOtherControlImages] = useState<ControlImage[]>([]);
  const [installationNeeded, setInstallationNeeded] = useState(true);
  const [waterNeeded, setWaterNeeded] = useState(true);
  const [validatedConcrete, setValidatedConcrete] = useState(false);
  const [validatedConcreteAt, setValidatedConcreteAt] = useState<string | undefined>(undefined);

  const insets = useSafeAreaInsets();

  const resetAndOpen = () => {
    if (editingControl) {
      const isOther =
        typeof editingControl.elementType === 'string' &&
        !Object.values(ElementType).includes(editingControl.elementType as ElementType);
      setStep1({
        levelId: editingControl.Level.id,
        elementName: editingControl.elementName,
        elementLocation: editingControl.elementLocation,
        elementType: isOther ? ELEMENT_TYPE_OTHER : (editingControl.elementType as ElementType),
        elementTypeOther: isOther ? editingControl.elementType : '',
      });
      setSelectedProgramIds(editingControl.programs.map((p) => p.id));
      setConcreteType(editingControl.concreateType);
      setIronControlImages(editingControl.IronControlImages ?? []);
      setElectricControlImages(editingControl.ElectricalControlImages ?? []);
      setInstallationControlImages(editingControl.InstallationControlImages ?? []);
      setWaterControlImages(editingControl.WaterControlImages ?? []);
      setConcreteControlImages(editingControl.ConcreteControlImages ?? []);
      setElectricNeeded(editingControl.electricNeeded ?? true);
      setInstallationNeeded(editingControl.installationNeeded ?? true);
      setWaterNeeded(editingControl.waterNeeded ?? true);
      setOtherControlImages(editingControl.otherControlImages ?? []);
      setValidatedConcrete(editingControl.validated_concrete ?? false);
      setValidatedConcreteAt(editingControl.validated_concrete_at);
    } else {
      setStep1(EMPTY_STEP1);
      setSelectedProgramIds([]);
      setConcreteType(null);
      setIronControlImages([]);
      setElectricControlImages([]);
      setInstallationControlImages([]);
      setWaterControlImages([]);
      setConcreteControlImages([]);
      setElectricNeeded(true);
      setInstallationNeeded(true);
      setWaterNeeded(true);
      setOtherControlImages([]);
      setValidatedConcrete(false);
      setValidatedConcreteAt(undefined);
    }
    setStep(1);
  };

  const handleClose = () => {
    setStep(1);
    setStep1(EMPTY_STEP1);
    setSelectedProgramIds([]);
    setConcreteType(null);
    setIronControlImages([]);
    setElectricControlImages([]);
    setInstallationControlImages([]);
    setWaterControlImages([]);
    setConcreteControlImages([]);
    setElectricNeeded(true);
    setInstallationNeeded(true);
    setWaterNeeded(true);
    setOtherControlImages([]);
    setValidatedConcrete(false);
    setValidatedConcreteAt(undefined);
    onClose();
  };

  const hasDirtyState = (): boolean => {
    if (editingControl) return true;
    return (
      step > 1 ||
      step1.elementName.trim() !== '' ||
      step1.elementLocation.trim() !== '' ||
      !!step1.elementType ||
      !!step1.levelId ||
      selectedProgramIds.length > 0 ||
      concreteType !== null ||
      ironControlImages.length > 0 ||
      electricControlImages.length > 0 ||
      installationControlImages.length > 0 ||
      waterControlImages.length > 0 ||
      concreteControlImages.length > 0 ||
      otherControlImages.length > 0
    );
  };

  const confirmClose = () => {
    if (!hasDirtyState()) {
      handleClose();
      return;
    }
    Alert.alert(
      'יציאה',
      'יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?',
      [
        { text: 'המשך עריכה', style: 'cancel' },
        { text: 'צא', style: 'destructive', onPress: handleClose },
      ]
    );
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else confirmClose();
  };

  const handleToggleValidatedConcrete = (val: boolean) => {
    setValidatedConcrete(val);
    setValidatedConcreteAt(val ? new Date().toISOString() : undefined);
  };

  const handleConfirm = () => {
    if (!step1.elementType || !concreteType || !step1.levelId) return;
    if (step1.elementType === ELEMENT_TYPE_OTHER && !step1.elementTypeOther?.trim()) return;
    onSave({
      levelId: step1.levelId,
      elementName: step1.elementName.trim(),
      elementLocation: step1.elementLocation.trim(),
      elementType:
        step1.elementType === ELEMENT_TYPE_OTHER
          ? (step1.elementTypeOther?.trim() ?? '')
          : (step1.elementType as ElementType),
      programIds: selectedProgramIds,
      concreteType,
      ironControlImages,
      electricControlImages,
      installationControlImages,
      waterControlImages,
      concreteControlImages,
      electricNeeded,
      installationNeeded,
      waterNeeded,
      otherControlImages,
      validatedConcrete,
      validatedConcreteAt,
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

  const isStep1Valid = !!(
    step1.levelId &&
    step1.elementName.trim() &&
    step1.elementType &&
    (step1.elementType !== ELEMENT_TYPE_OTHER || step1.elementTypeOther?.trim())
  );
  const isLastStep = step === TOTAL_STEPS;

  const canProceed = (() => {
    if (step === 1) return isStep1Valid;
    if (step === 8) return !!concreteType;
    return true;
  })();

  const canSave =
    isStep1Valid &&
    !!concreteType &&
    (step1.elementType !== ELEMENT_TYPE_OTHER || !!step1.elementTypeOther?.trim());

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
            images={ironControlImages}
            onChangeImages={setIronControlImages}
          />
        );
      case 4:
        return (
          <StepElectricControl
            images={electricControlImages}
            needed={electricNeeded}
            onChangeImages={setElectricControlImages}
            onChangeNeeded={setElectricNeeded}
          />
        );
      case 5:
        return (
          <StepInstalationControl
            images={installationControlImages}
            needed={installationNeeded}
            onChangeImages={setInstallationControlImages}
            onChangeNeeded={setInstallationNeeded}
          />
        );
      case 6:
        return (
          <StepWaterControl
            images={waterControlImages}
            needed={waterNeeded}
            onChangeImages={setWaterControlImages}
            onChangeNeeded={setWaterNeeded}
          />
        );
      case 7:
        return (
          <StepOtherControl
            images={otherControlImages}
            onChangeImages={setOtherControlImages}
          />
        );
      case 8:
        return (
          <StepConcreteType
            concreteTypes={concreteTypes}
            value={concreteType}
            images={concreteControlImages}
            validatedConcrete={validatedConcrete}
            validatedConcreteAt={validatedConcreteAt}
            onChange={setConcreteType}
            onChangeImages={setConcreteControlImages}
            onChangeValidatedConcrete={handleToggleValidatedConcrete}
          />
        );
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
      onRequestClose={confirmClose}
      statusBarTranslucent={Platform.OS === 'android'}
      hardwareAccelerated={Platform.OS === 'android'}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalOverlayPressable} onPress={confirmClose} />
        <View
          style={[
            styles.modalSheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <View style={styles.dragHandle} />

          <View style={styles.stepHeader}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.titleWithStep}>
                <Text style={styles.modalTitle}>
                  {editingControl
                    ? 'עריכת בקרה'
                    : step > 1 && step1.elementName.trim()
                      ? step1.elementName.trim()
                      : 'בקרה חדשה'}
                </Text>
                <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
              </View>
              {editingControl && !isLastStep && (
                <TouchableOpacity
                  style={styles.jumpToLastButton}
                  onPress={() => setStep(TOTAL_STEPS)}
                  activeOpacity={0.8}>
                  <Text style={styles.jumpToLastButtonText}>שלב אחרון</Text>
                  <IconSymbol name="chevron.left" size={14} color={ACCENT} />
                </TouchableOpacity>
              )}
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
              <Text style={styles.backButtonText}>{step === 1 ? 'ביטול' : 'הקודם'}</Text>
            </TouchableOpacity>

            {!isLastStep && (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  editingControl && styles.nextButtonCompact,
                  !canProceed && styles.nextButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceed}
                activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>הבא</Text>
                <IconSymbol name="chevron.left" size={16} color="#fff" />
              </TouchableOpacity>
            )}

            {(isLastStep || editingControl) && (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  editingControl && !isLastStep && styles.nextButtonCompact,
                  !canSave && styles.nextButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canSave}
                activeOpacity={0.8}>
                <Text style={styles.nextButtonText}>{editingControl ? 'שמירה' : 'יצירה'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingControl && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.8}>
              <IconSymbol name="trash" size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>מחיקת בקרה</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
