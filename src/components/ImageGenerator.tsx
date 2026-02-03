import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Image, X, Download, Printer, Upload, Grid, 
  Trash2, Scissors, Paintbrush, Loader2, FileImage,
  Move, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ImageItem {
  id: string;
  src: string;
  label: string;
}

interface ImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images?: Array<{ src: string; label: string }>;
  title?: string;
}

export function ImageGenerator({ open, onOpenChange, images: initialImages = [], title = "TAHA GİYİM" }: ImageGeneratorProps) {
  const [images, setImages] = useState<ImageItem[]>(
    initialImages.map((img, idx) => ({
      id: `${Date.now()}-${idx}`,
      src: img.src,
      label: img.label,
    }))
  );
  const [columns, setColumns] = useState(4);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update images when prop changes
  const updateImages = useCallback((newImages: Array<{ src: string; label: string }>) => {
    setImages(
      newImages.map((img, idx) => ({
        id: `${Date.now()}-${idx}`,
        src: img.src,
        label: img.label,
      }))
    );
  }, []);

  // Process image to remove/whiten background
  const processBackground = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();

      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Fill with white first
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const whiteThreshold = 240;
        const grayThreshold = 220;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const isWhiteish = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;
          const isGrayish =
            r > grayThreshold &&
            g > grayThreshold &&
            b > grayThreshold &&
            Math.abs(r - g) < 10 &&
            Math.abs(g - b) < 10 &&
            Math.abs(r - b) < 10;

          if (isWhiteish || isGrayish) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newImages: ImageItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      const reader = new FileReader();
      const imageSrc = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      const label = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
      const processedSrc = removeBackground ? await processBackground(imageSrc) : imageSrc;

      newImages.push({
        id: `${Date.now()}-${Math.random()}`,
        src: processedSrc,
        label,
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    setIsProcessing(false);
    e.target.value = "";
    toast.success(`${newImages.length} resim eklendi`);
  };

  // Handle paste
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!open) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const imageSrc = event.target?.result as string;
            const processedSrc = removeBackground ? await processBackground(imageSrc) : imageSrc;

            setImages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                src: processedSrc,
                label: "MODEL",
              },
            ]);
            toast.success("Resim yapıştırıldı");
          };
          reader.readAsDataURL(blob);
        }
      }
    },
    [open, removeBackground]
  );

  // Add paste event listener
  useState(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  // Remove image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Update label
  const handleLabelChange = (id: string, newLabel: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, label: newLabel } : img))
    );
  };

  // Clear all
  const handleClearAll = () => {
    if (images.length === 0) return;
    if (confirm(`${images.length} resmi silmek istediğinizden emin misiniz?`)) {
      setImages([]);
    }
  };

  // Drag and drop reordering
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const dragIndex = images.findIndex((img) => img.id === draggedId);
    const dropIndex = images.findIndex((img) => img.id === targetId);

    const newImages = [...images];
    const [removed] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    setImages(newImages);
    setDraggedId(null);
  };

  // Process all backgrounds
  const handleProcessAllBackgrounds = async () => {
    if (images.length === 0) {
      toast.error("İşlenecek resim yok!");
      return;
    }

    setIsProcessing(true);
    toast.info(`${images.length} resim işleniyor...`);

    const processed = await Promise.all(
      images.map(async (img) => ({
        ...img,
        src: await processBackground(img.src),
      }))
    );

    setImages(processed);
    setIsProcessing(false);
    toast.success("Tüm arka planlar beyazlatıldı!");
  };

  // Export to image/PDF
  const handleExport = async (format: "png" | "jpg" | "pdf") => {
    if (images.length === 0) {
      toast.error("Kaydedilecek resim yok!");
      return;
    }

    if (!gridRef.current) return;

    setIsProcessing(true);
    setSaveDialogOpen(false);

    try {
      // Calculate layout
      const rows = Math.ceil(images.length / columns);
      const printWidth = 1400;
      const printHeight = 900;

      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: printWidth,
        height: printHeight,
        logging: false,
      });

      if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png", 0.9);
        const pdf = new jsPDF("l", "mm", "a3");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title.replace(/\s+/g, "-")}-model-listesi.pdf`);
        toast.success("PDF kaydedildi");
      } else {
        const link = document.createElement("a");
        link.download = `${title.replace(/\s+/g, "-")}-model-listesi.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, 0.9);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${format.toUpperCase()} kaydedildi`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Kaydetme hatası oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  // Print
  const handlePrint = () => {
    if (images.length === 0) {
      toast.error("Yazdırılacak resim yok!");
      return;
    }
    window.print();
  };

  // Calculate item dimensions
  const rows = Math.ceil(images.length / columns) || 1;
  const itemWidth = `calc(${100 / columns}% - 2px)`;
  const itemHeight = `calc(${100 / Math.min(rows, 4)}% - 2px)`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1400px] h-[900px] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Model Resim Oluşturucu
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Toplam: {images.length} resim
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Controls */}
          <div className="px-4 py-2 border-b flex items-center gap-4 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <Label>Sütun:</Label>
              <Slider
                value={[columns]}
                onValueChange={(val) => setColumns(val[0])}
                min={1}
                max={8}
                step={1}
                className="w-32"
              />
              <span className="font-medium text-sm w-4">{columns}</span>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="removeBg"
                checked={removeBackground}
                onCheckedChange={(checked) => setRemoveBackground(!!checked)}
              />
              <Label htmlFor="removeBg" className="text-sm cursor-pointer">
                <Paintbrush className="h-3 w-3 inline mr-1" />
                Arka plan beyazlat
              </Label>
            </div>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-1" />
              Dosya Aç
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessAllBackgrounds}
              disabled={isProcessing || images.length === 0}
            >
              <Paintbrush className="h-4 w-4 mr-1" />
              Tümünü Beyazlat
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              disabled={isProcessing || images.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Kaydet
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={images.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Tümünü Sil
            </Button>
          </div>

          {/* Info */}
          <div className="px-4 py-1 text-xs text-center text-muted-foreground shrink-0">
            Ctrl+V ile yapıştır veya dosyayı sürükle bırak. Sürükleyerek sıralayabilirsiniz.
          </div>

          {/* Grid */}
          <div
            ref={gridRef}
            className="flex-1 p-2 bg-white overflow-auto print:overflow-visible"
            style={{ display: "flex", flexWrap: "wrap", alignContent: "flex-start" }}
          >
            {images.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Resim eklemek için Ctrl+V veya Dosya Aç</p>
                </div>
              </div>
            ) : (
              images.map((img) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(img.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(img.id)}
                  className={`
                    relative border border-black bg-white flex flex-col cursor-move
                    transition-all duration-200
                    ${draggedId === img.id ? "opacity-50 rotate-2" : ""}
                  `}
                  style={{
                    width: itemWidth,
                    minHeight: "200px",
                    maxHeight: "300px",
                    flexGrow: 1,
                    flexShrink: 1,
                    margin: "1px",
                  }}
                >
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-1 right-1 z-10 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-destructive/80 print:hidden"
                  >
                    ×
                  </button>

                  {/* Move indicator */}
                  <div className="absolute top-1 left-1 z-10 text-muted-foreground print:hidden">
                    <Move className="h-3 w-3" />
                  </div>

                  {/* Image */}
                  <div className="flex-1 flex items-center justify-center p-1 overflow-hidden">
                    <img
                      src={img.src}
                      alt={img.label}
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />
                  </div>

                  {/* Label */}
                  <div className="border-t border-black p-1 bg-white text-center shrink-0">
                    <input
                      type="text"
                      value={img.label}
                      onChange={(e) => handleLabelChange(img.id, e.target.value)}
                      className="w-full text-center text-xs font-bold bg-transparent border-none outline-none print:pointer-events-none"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Loading overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg p-6 flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>İşleniyor...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save format dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kaydetme Formatı</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleExport("png")} className="gap-2">
              <FileImage className="h-4 w-4" />
              PNG olarak kaydet
            </Button>
            <Button onClick={() => handleExport("jpg")} variant="outline" className="gap-2">
              <FileImage className="h-4 w-4" />
              JPG olarak kaydet
            </Button>
            <Button onClick={() => handleExport("pdf")} variant="outline" className="gap-2">
              <FileImage className="h-4 w-4" />
              PDF olarak kaydet
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Vazgeç
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
