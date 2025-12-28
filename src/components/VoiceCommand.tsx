import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceCommandProps {
  onCommand: (command: VoiceCommandData) => void;
}

export interface VoiceCommandData {
  fabricType?: string;
  usageArea?: string;
  price?: number;
  quantity?: number;
  rawText: string;
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
    
    // Parse fabric type patterns
    const fabricPatterns = [
      /(\d+\/\d+)\s*(süprem|interlok|ribana|kaşkorse|penye|viskon|şardon)/i,
      /(süprem|interlok|ribana|kaşkorse|penye|viskon|şardon)\s*(\d+\/\d+)?/i,
    ];
    
    let fabricType: string | undefined;
    for (const pattern of fabricPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        fabricType = match[0].toUpperCase();
        break;
      }
    }

    // Parse usage area
    const usagePatterns = [
      /(ana\s*beden|kol|yaka|manşet|etek|biye|ribana|pat)/i,
    ];
    
    let usageArea: string | undefined;
    for (const pattern of usagePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        usageArea = match[1].toUpperCase();
        break;
      }
    }

    // Parse price
    const priceMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:tl|lira|₺)?/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined;

    // Parse quantity
    const quantityMatch = lowerText.match(/(\d+(?:[.,]\d+)?)\s*(?:metre|mt|m)/i);
    const quantity = quantityMatch ? parseFloat(quantityMatch[1].replace(',', '.')) : undefined;

    return {
      fabricType,
      usageArea,
      price,
      quantity,
      rawText: text,
    };
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 1;
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
      toast.info("Dinliyorum... Konuşabilirsiniz");
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);

      if (result.isFinal) {
        const commandData = parseCommand(transcriptText);
        onCommand(commandData);
        
        // Provide voice feedback
        if (commandData.fabricType || commandData.usageArea || commandData.price) {
          let feedback = "Anlaşıldı. ";
          if (commandData.fabricType) feedback += `Kumaş: ${commandData.fabricType}. `;
          if (commandData.usageArea) feedback += `Kullanım yeri: ${commandData.usageArea}. `;
          if (commandData.price) feedback += `Fiyat: ${commandData.price} TL. `;
          if (commandData.quantity) feedback += `Miktar: ${commandData.quantity} metre. `;
          speak(feedback);
          toast.success(feedback);
        } else {
          speak("Komutu anlayamadım. Lütfen tekrar söyleyin.");
          toast.warning("Komut anlaşılamadı. Örnek: '40/1 interlok ana beden 150 TL'");
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
        <div className="mt-2 text-xs text-muted-foreground text-center max-w-xs">
          <p className="font-medium mb-1">Örnek komutlar:</p>
          <p>"40/1 interlok ana beden 150 TL"</p>
          <p>"Süprem kol 2 metre 80 lira"</p>
        </div>
      )}
    </div>
  );
}