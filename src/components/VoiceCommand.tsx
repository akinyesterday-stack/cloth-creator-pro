import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, Check, ArrowRight, RotateCcw, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export type VoiceStep = 'idle' | 'model' | 'fabric' | 'done';

export interface VoiceCommandData {
  modelName?: string;
  fabricType?: string;
  usageArea?: string;
  en?: number;
  gramaj?: number;
  price?: number;
  quantity?: number;
  rawText: string;
  autoAdd?: boolean;
  action?: 'add' | 'delete' | 'edit' | 'deleteModel' | 'deleteLast';
}

interface VoiceCommandProps {
  onCommand: (command: VoiceCommandData) => void;
  currentStep: VoiceStep;
  onStepChange: (step: VoiceStep) => void;
  collectedData: Partial<VoiceCommandData>;
  onDataCollected: (data: Partial<VoiceCommandData>) => void;
  onReset: () => void;
}

// Extend window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

// Common fabric types for matching
const FABRIC_KEYWORDS = [
  'süprem', 'interlok', 'ribana', 'kaşkorse', 'penye', 'viskon', 'şardon',
  'likralı', 'düz boya', 'melanj', 'çizgili', 'jakarlı', 'örme', 'dokuma'
];

// Common usage areas for matching
const USAGE_KEYWORDS = [
  'ana beden', 'kol', 'yaka', 'manşet', 'etek', 'biye', 'ribana', 'pat',
  'kapüşon', 'cep', 'alt beden', 'üst beden', 'astar', 'kemer', 'paça'
];

export function VoiceCommand({ 
  onCommand, 
  currentStep, 
  onStepChange, 
  collectedData, 
  onDataCollected,
  onReset 
}: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 1.1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const parseFabricDetails = useCallback((text: string): Partial<VoiceCommandData> => {
    const lowerText = text.toLowerCase();
    const result: Partial<VoiceCommandData> = { rawText: text };

    // Check for delete commands
    if (lowerText.includes('sil') || lowerText.includes('kaldır')) {
      if (lowerText.includes('son') || lowerText.includes('sonuncu')) {
        result.action = 'deleteLast';
        return result;
      }
      if (lowerText.includes('model')) {
        result.action = 'deleteModel';
        return result;
      }
    }

    // Check for edit command
    if (lowerText.includes('düzelt') || lowerText.includes('düzenle') || lowerText.includes('değiştir')) {
      result.action = 'edit';
      return result;
    }

    // Parse fabric type
    let fabricType: string | undefined;
    const numberedFabricPattern = /(\d+\/\d+)\s*(süprem|interlok|ribana|kaşkorse|penye|viskon|şardon)/i;
    const numberedMatch = lowerText.match(numberedFabricPattern);
    if (numberedMatch) {
      fabricType = `${numberedMatch[1]} ${numberedMatch[2].toUpperCase()}`;
    }

    if (!fabricType) {
      const fabricModifiers = ['likralı', 'düz boya', 'melanj', 'çizgili', 'jakarlı'];
      for (const keyword of FABRIC_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          let fullFabric = keyword.toUpperCase();
          for (const modifier of fabricModifiers) {
            if (lowerText.includes(modifier)) {
              fullFabric = `${fullFabric} ${modifier.toUpperCase()}`;
            }
          }
          const beforePattern = new RegExp(`(\\d+\\/\\d+)\\s*${keyword}`, 'i');
          const beforeMatch = lowerText.match(beforePattern);
          if (beforeMatch) {
            fullFabric = `${beforeMatch[1]} ${fullFabric}`;
          }
          fabricType = fullFabric;
          break;
        }
      }
    }
    if (fabricType) result.fabricType = fabricType;

    // Parse usage area
    for (const usage of USAGE_KEYWORDS) {
      if (lowerText.includes(usage)) {
        result.usageArea = usage.toUpperCase();
        break;
      }
    }

    // Parse en (width)
    const enPatterns = [
      /en\s*(\d+)/i,
      /(\d+)\s*(?:cm|santim)/i,
    ];
    for (const pattern of enPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value > 50 && value < 300) {
          result.en = value;
        }
        break;
      }
    }

    // Parse gramaj
    const gramajPatterns = [
      /gramaj\s*(\d+)/i,
      /(\d+)\s*(?:gr|gram)/i,
    ];
    for (const pattern of gramajPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (value > 50 && value < 500) {
          result.gramaj = value;
        }
        break;
      }
    }

    // Parse price
    const pricePatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:tl|lira|₺)/i,
      /fiyat[ıi]?\s*(\d+(?:[.,]\d+)?)/i,
    ];
    for (const pattern of pricePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        result.price = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // Check for auto-add trigger
    if (lowerText.includes('ekle') || lowerText.includes('kaydet') || lowerText.includes('yaz') || lowerText.includes('tamam')) {
      result.autoAdd = true;
      result.action = 'add';
    }

    return result;
  }, []);

  const handleModelStep = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    
    // Check for delete commands even in model step
    if (lowerText.includes('sil') || lowerText.includes('kaldır')) {
      const deleteData = parseFabricDetails(text);
      if (deleteData.action) {
        onCommand({ ...deleteData, rawText: text } as VoiceCommandData);
        return;
      }
    }

    // Extract model name - take the main word(s)
    const cleanText = text.trim().replace(/model[i]?\s*/gi, '').trim();
    const modelName = cleanText.split(/\s+/)[0]?.toUpperCase() || text.toUpperCase();
    
    if (modelName && modelName.length > 1) {
      onDataCollected({ modelName });
      speak(`${modelName} modeli seçildi. Şimdi kumaş bilgilerini söyleyin.`);
      toast.success(`Model: ${modelName}`, {
        description: "Şimdi kumaş türü, kullanım yeri, en, gramaj ve fiyat söyleyin"
      });
      onStepChange('fabric');
    } else {
      speak("Model adını anlayamadım. Lütfen tekrar söyleyin.");
      toast.warning("Model adı anlaşılamadı");
    }
  }, [onDataCollected, onStepChange, speak, onCommand, parseFabricDetails]);

  const handleFabricStep = useCallback((text: string) => {
    const fabricData = parseFabricDetails(text);
    
    // Handle delete/edit actions
    if (fabricData.action === 'deleteLast' || fabricData.action === 'deleteModel' || fabricData.action === 'edit') {
      onCommand({ ...fabricData, modelName: collectedData.modelName, rawText: fabricData.rawText || text } as VoiceCommandData);
      return;
    }

    // Check if user is saying a new model name (switch model)
    const lowerText = text.toLowerCase();
    const hasNoFabricData = !fabricData.fabricType && !fabricData.usageArea && !fabricData.price && !fabricData.en && !fabricData.gramaj;
    
    if (hasNoFabricData && !fabricData.autoAdd) {
      // Might be a new model name
      const cleanText = text.trim().replace(/model[i]?\s*/gi, '').trim();
      const potentialModelName = cleanText.split(/\s+/)[0]?.toUpperCase();
      
      if (potentialModelName && potentialModelName.length > 1 && !FABRIC_KEYWORDS.some(k => lowerText.includes(k))) {
        onDataCollected({ modelName: potentialModelName });
        speak(`${potentialModelName} modeline geçildi. Kumaş bilgilerini söyleyin.`);
        toast.success(`Model değiştirildi: ${potentialModelName}`);
        return;
      }
    }

    const mergedData = { ...collectedData, ...fabricData };
    onDataCollected(mergedData);

    const parts: string[] = [];
    if (fabricData.fabricType) parts.push(`Kumaş: ${fabricData.fabricType}`);
    if (fabricData.usageArea) parts.push(`Kullanım: ${fabricData.usageArea}`);
    if (fabricData.en) parts.push(`En: ${fabricData.en} cm`);
    if (fabricData.gramaj) parts.push(`Gramaj: ${fabricData.gramaj} gr`);
    if (fabricData.price) parts.push(`Fiyat: ${fabricData.price} TL`);

    if (parts.length > 0) {
      toast.info(parts.join(' | '), {
        description: fabricData.autoAdd ? "Ekleniyor..." : "'Ekle' veya 'Kaydet' diyerek ekleyebilirsiniz"
      });
    }

    // If auto-add triggered and we have enough data
    if (fabricData.autoAdd && mergedData.fabricType && mergedData.usageArea) {
      onCommand({
        ...mergedData,
        rawText: text,
        action: 'add'
      } as VoiceCommandData);
      
      speak("Kumaş eklendi. Yeni kumaş için bilgileri söyleyin.");
      
      // Reset for next fabric entry but keep model
      onDataCollected({ modelName: collectedData.modelName });
    } else if (parts.length === 0) {
      speak("Anlaşılamadı. Kumaş türü, kullanım yeri, en, gramaj ve fiyat söyleyin.");
      toast.warning("Kumaş bilgisi anlaşılamadı", {
        description: "Örnek: '40/1 süprem ana beden en 180 gramaj 200 150 TL ekle'"
      });
    }
  }, [collectedData, onDataCollected, onCommand, parseFabricDetails, speak]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor");
      return;
    }

    // If we're idle, start with model step
    if (currentStep === 'idle') {
      onStepChange('model');
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      
      const stepMessage = currentStep === 'idle' || currentStep === 'model' 
        ? "Model adını söyleyin" 
        : "Kumaş bilgilerini söyleyin";
      
      toast.info(`🎤 Dinliyorum... ${stepMessage}`);
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);

      if (result.isFinal) {
        if (currentStep === 'idle' || currentStep === 'model') {
          handleModelStep(transcriptText);
        } else if (currentStep === 'fabric') {
          handleFabricStep(transcriptText);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast.warning("Ses algılanamadı. Lütfen tekrar deneyin.");
      } else if (event.error === 'not-allowed') {
        toast.error("Mikrofon erişimi reddedildi.");
      } else {
        toast.error(`Ses tanıma hatası: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [currentStep, onStepChange, handleModelStep, handleFabricStep]);

  const handleReset = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setTranscript("");
    onReset();
    toast.info("Sıfırlandı. Yeni model adı ile başlayabilirsiniz.");
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm">
        <MicOff className="h-4 w-4" />
        <span>Ses tanıma desteklenmiyor</span>
      </div>
    );
  }

  const getStepInfo = () => {
    switch (currentStep) {
      case 'model':
        return { label: 'Model Adı', color: 'bg-primary', example: '"Loska" veya "Begor"' };
      case 'fabric':
        return { label: 'Kumaş Bilgileri', color: 'bg-accent', example: '"40/1 süprem ana beden en 180 gramaj 200 150 TL ekle"' };
      default:
        return { label: 'Başla', color: 'bg-muted', example: 'Model adı söyleyerek başlayın' };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Step Progress */}
      <div className="flex items-center gap-2 w-full justify-center">
        <Badge 
          variant={currentStep === 'model' || currentStep === 'idle' ? 'default' : 'secondary'}
          className={`gap-1 ${currentStep === 'model' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        >
          <span className="text-xs">1</span> Model
          {collectedData.modelName && <Check className="h-3 w-3" />}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge 
          variant={currentStep === 'fabric' ? 'default' : 'secondary'}
          className={`gap-1 ${currentStep === 'fabric' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        >
          <span className="text-xs">2</span> Kumaş
        </Badge>
      </div>

      {/* Collected Data Display */}
      {collectedData.modelName && (
        <div className="bg-secondary/50 px-4 py-2 rounded-lg text-sm w-full max-w-md">
          <span className="font-semibold text-primary">{collectedData.modelName}</span>
          {collectedData.fabricType && (
            <span className="ml-2 text-muted-foreground">| {collectedData.fabricType}</span>
          )}
          {collectedData.usageArea && (
            <span className="ml-2 text-muted-foreground">| {collectedData.usageArea}</span>
          )}
        </div>
      )}

      {/* Main Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={startListening}
          disabled={isListening}
          size="lg"
          className={`
            relative h-16 w-16 rounded-full transition-all duration-300
            ${isListening 
              ? 'bg-destructive hover:bg-destructive voice-pulse' 
              : 'gradient-primary hover:opacity-90 glow-primary-sm'
            }
          `}
        >
          {isListening ? (
            <Volume2 className="h-7 w-7 animate-pulse" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </Button>

        {currentStep !== 'idle' && (
          <Button
            onClick={handleReset}
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            title="Sıfırla"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isListening ? "Dinleniyor..." : stepInfo.label}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isListening ? "Konuşun..." : stepInfo.example}
        </p>
      </div>

      {transcript && (
        <div className="mt-2 px-4 py-2 bg-secondary/50 rounded-lg max-w-md w-full">
          <p className="text-sm text-muted-foreground italic text-center">"{transcript}"</p>
        </div>
      )}

      {/* Commands Help */}
      {!isListening && currentStep === 'fabric' && (
        <div className="mt-2 text-xs text-muted-foreground text-center max-w-md space-y-2">
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Trash2 className="h-3 w-3" /> "Son kaydı sil"
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Edit className="h-3 w-3" /> "Düzenle"
            </Badge>
          </div>
          <p className="text-muted-foreground/70">Yeni model için model adını söyleyin</p>
        </div>
      )}
    </div>
  );
}
