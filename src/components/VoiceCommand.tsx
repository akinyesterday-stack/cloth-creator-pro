import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceCommandProps {
  onCommand: (command: VoiceCommandData) => void;
}

export interface VoiceCommandData {
  modelName?: string;
  fabricType?: string;
  usageArea?: string;
  price?: number;
  quantity?: number;
  rawText: string;
  autoAdd?: boolean;
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

export function VoiceCommand({ onCommand }: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const parseCommand = useCallback((text: string): VoiceCommandData => {
    const lowerText = text.toLowerCase();
    
    // Parse model name - usually at the beginning like "model loska" or just "loska"
    let modelName: string | undefined;
    const modelPatterns = [
      /model\s+(\w+)/i,
      /modeli?\s+(\w+)/i,
      /^(\w+)\s+(?:için|modeli)/i,
    ];
    
    for (const pattern of modelPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        modelName = match[1].toUpperCase();
        break;
      }
    }
    
    // If no model keyword, try to get the first word as potential model name
    if (!modelName) {
      const words = lowerText.split(/\s+/);
      // Check if first word is not a fabric or usage keyword
      if (words.length > 0) {
        const firstWord = words[0];
        const isFabricKeyword = FABRIC_KEYWORDS.some(k => firstWord.includes(k));
        const isUsageKeyword = USAGE_KEYWORDS.some(k => firstWord.includes(k));
        const isNumber = /^\d/.test(firstWord);
        
        if (!isFabricKeyword && !isUsageKeyword && !isNumber && firstWord.length > 2) {
          modelName = firstWord.toUpperCase();
        }
      }
    }

    // Parse fabric type patterns - more comprehensive
    let fabricType: string | undefined;
    
    // First try numbered patterns like "40/1 süprem"
    const numberedFabricPattern = /(\d+\/\d+)\s*(süprem|interlok|ribana|kaşkorse|penye|viskon|şardon)/i;
    const numberedMatch = lowerText.match(numberedFabricPattern);
    if (numberedMatch) {
      fabricType = `${numberedMatch[1]} ${numberedMatch[2].toUpperCase()}`;
    }
    
    // If no numbered pattern, try to find fabric keywords with modifiers
    if (!fabricType) {
      const fabricModifiers = ['likralı', 'düz boya', 'melanj', 'çizgili', 'jakarlı'];
      
      for (const keyword of FABRIC_KEYWORDS) {
        if (lowerText.includes(keyword)) {
          let fullFabric = keyword.toUpperCase();
          
          // Check for modifiers before or after
          for (const modifier of fabricModifiers) {
            if (lowerText.includes(modifier)) {
              fullFabric = `${fullFabric} ${modifier.toUpperCase()}`;
            }
          }
          
          // Check for number before
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

    // Parse usage area - more comprehensive
    let usageArea: string | undefined;
    for (const usage of USAGE_KEYWORDS) {
      if (lowerText.includes(usage)) {
        usageArea = usage.toUpperCase();
        break;
      }
    }

    // Parse price - multiple patterns
    const pricePatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:tl|lira|₺)/i,
      /fiyat[ıi]?\s*(\d+(?:[.,]\d+)?)/i,
      /(\d+(?:[.,]\d+)?)\s*(?:türk lirası)/i,
    ];
    
    let price: number | undefined;
    for (const pattern of pricePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        price = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // Parse quantity
    const quantityPatterns = [
      /(\d+(?:[.,]\d+)?)\s*(?:metre|mt|m\b)/i,
      /miktar[ıi]?\s*(\d+(?:[.,]\d+)?)/i,
    ];
    
    let quantity: number | undefined;
    for (const pattern of quantityPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        quantity = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // Check if command includes "ekle" to auto-add
    const autoAdd = lowerText.includes('ekle') || lowerText.includes('kaydet') || lowerText.includes('yaz');

    return {
      modelName,
      fabricType,
      usageArea,
      price,
      quantity,
      rawText: text,
      autoAdd,
    };
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 1.1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      toast.info("🎤 Dinliyorum... Konuşabilirsiniz", {
        description: "Örnek: 'Loska modeli 40/1 interlok düz boya ana beden 150 TL ekle'"
      });
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);

      if (result.isFinal) {
        const commandData = parseCommand(transcriptText);
        onCommand(commandData);
        
        // Build comprehensive feedback
        const parts: string[] = [];
        if (commandData.modelName) parts.push(`Model: ${commandData.modelName}`);
        if (commandData.fabricType) parts.push(`Kumaş: ${commandData.fabricType}`);
        if (commandData.usageArea) parts.push(`Kullanım: ${commandData.usageArea}`);
        if (commandData.price) parts.push(`Fiyat: ${commandData.price} TL`);
        if (commandData.quantity) parts.push(`Miktar: ${commandData.quantity} m`);
        
        if (parts.length > 0) {
          const feedback = `Anlaşıldı! ${parts.join(', ')}`;
          speak(feedback);
          toast.success(feedback, {
            description: commandData.autoAdd ? "Otomatik ekleniyor..." : "Form alanları dolduruldu"
          });
        } else {
          speak("Komutu anlayamadım. Lütfen tekrar söyleyin.");
          toast.warning("Komut anlaşılamadı", {
            description: "Örnek: 'Model adı kumaş türü kullanım yeri fiyat'"
          });
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast.warning("Ses algılanamadı. Lütfen tekrar deneyin.");
      } else if (event.error === 'not-allowed') {
        toast.error("Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.");
      } else {
        toast.error(`Ses tanıma hatası: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onCommand, parseCommand, speak]);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm">
        <MicOff className="h-4 w-4" />
        <span>Ses tanıma desteklenmiyor</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
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
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isListening ? "Dinleniyor..." : "Sesli Komut"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isListening ? "Konuşun..." : "Mikrofona tıklayın"}
        </p>
      </div>

      {transcript && (
        <div className="mt-2 px-4 py-2 bg-secondary/50 rounded-lg max-w-xs">
          <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
        </div>
      )}

      {!isListening && (
        <div className="mt-2 text-xs text-muted-foreground text-center max-w-xs space-y-1">
          <p className="font-semibold text-foreground">Örnek komutlar:</p>
          <p className="bg-secondary/30 px-2 py-1 rounded">"Loska 40/1 interlok ana beden 150 TL"</p>
          <p className="bg-secondary/30 px-2 py-1 rounded">"Begor süprem kol 80 lira ekle"</p>
          <p className="bg-secondary/30 px-2 py-1 rounded">"Model XYZ ribana yaka 95 TL"</p>
        </div>
      )}
    </div>
  );
}