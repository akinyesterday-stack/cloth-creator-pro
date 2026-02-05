import { useState, useRef, useCallback, forwardRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { FabricManager, FabricTypeWithSpec } from "@/components/FabricManager";
import { fabricTypesWithSpecs as defaultFabricTypes, usageAreas as defaultUsageAreas } from "@/data/fabricData";
import { Calculator, Plus, Trash2, FileSpreadsheet, Package, Image, Upload, X, Pencil, Check, Settings, Download, Loader2, Copy, Send, Save, Archive, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RadioPlayer } from "@/components/RadioPlayer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FabricPrice {
  fabric_name: string;
  en: number;
  gramaj: number;
  fiyat: number;
}

interface FabricItem {
  id: string;
  fabricType: string;
  usageArea: string;
  en: number;
  gramaj: number;
  fiyat: number;
  priceExpected?: boolean; // Üreticiden fiyat bekleniyor
  printType?: string; // baskılı tipi: fon, zemin, boyalı, pigment, aşındırma
   boyahane?: string; // boyahane ismi
}

// Print type options for "Baskılı" fabrics
const PRINT_TYPE_OPTIONS = [
  { value: "fon", label: "Fon", color: "FFE4C4" },
  { value: "zemin", label: "Zemin", color: "D4E4BC" },
  { value: "boyalı", label: "Boyalı", color: "E4D4F4" },
  { value: "pigment", label: "Pigment", color: "F4D4E4" },
  { value: "aşındırma", label: "Aşındırma", color: "D4E4F4" },
];

// Standard dyehouse options
const STANDARD_BOYAHANES = [
  "TÜBAŞ",
  "SEZGİNLER", 
  "MEM TEKSTİL",
  "ÜNTEKS",
  "İNTEKS",
  "UNİVERSAL",
  "BOYBO",
  "TORAMAN",
  "CANHAS TEKSTİL",
  "HAN TEKSTİL",
  "KÖSEMLER",
  "SANKO",
  "LERAS DANTEL",
  "MAYTEKS",
  "ÖZEL ÖRME",
  "ÖZEN MENSUCAT",
];

interface ModelGroup {
  id: string;
  modelName: string;
  images: string[]; // up to 10 images per model
  items: FabricItem[];
}

interface CostCalculatorProps {
  isRadioOpen?: boolean;
  isRadioMinimized?: boolean;
  onRadioClose?: () => void;
  onRadioMinimize?: () => void;
}

export const CostCalculator = forwardRef<HTMLDivElement, CostCalculatorProps>(function CostCalculator(
  { isRadioOpen = false, isRadioMinimized = false, onRadioClose, onRadioMinimize },
  ref
) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [currentModelName, setCurrentModelName] = useState("");
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom fabric types and usage areas
  const [fabricTypes, setFabricTypes] = useState<FabricTypeWithSpec[]>([]);
  const [usageAreas, setUsageAreas] = useState<string[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasLoadedFromSystem, setHasLoadedFromSystem] = useState(false);
  
  // Fabric prices from database
  const [fabricPrices, setFabricPrices] = useState<FabricPrice[]>([]);
  
  // Form states
  const [selectedFabric, setSelectedFabric] = useState("");
  const [selectedUsage, setSelectedUsage] = useState("");
  const [en, setEn] = useState<number>(0);
  const [gramaj, setGramaj] = useState<number>(0);
  const [fiyat, setFiyat] = useState<number>(0);

  // Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FabricItem | null>(null);
  
  // Model name editing
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState("");
  
  // Copy to model dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [itemToCopy, setItemToCopy] = useState<{item: FabricItem, sourceModelId: string} | null>(null);
  
  // Multi-select and copy
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [multiCopyDialogOpen, setMultiCopyDialogOpen] = useState(false);
  const [newModelNameForCopy, setNewModelNameForCopy] = useState("");
  
  // Price expected state
  const [priceExpected, setPriceExpected] = useState(false);
  
  // Print type state (for baskılı fabrics)
  const [selectedPrintType, setSelectedPrintType] = useState("");
  
  // Boyahane (dyehouse) states
  const [defaultBoyahane, setDefaultBoyahane] = useState("");
  const [selectedBoyahane, setSelectedBoyahane] = useState("");
  const [customBoyahanes, setCustomBoyahanes] = useState<string[]>([]);
  const [isCustomBoyahaneMode, setIsCustomBoyahaneMode] = useState(false);
  
  // Recent items tracking
  const [recentFabrics, setRecentFabrics] = useState<string[]>([]);
  const [recentUsageAreas, setRecentUsageAreas] = useState<string[]>([]);
  
  // Excel export dialog
  const [excelNameDialogOpen, setExcelNameDialogOpen] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  
  // Check if fabric is "baskılı" type
  const isBaskili = selectedFabric.toLowerCase().includes("baskılı") || 
                   selectedFabric.toLowerCase().includes("baski") ||
                   selectedFabric.toLowerCase().includes("metraj baskı");

  // Load user's fabric types, usage areas and prices from database
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      setIsLoadingData(true);
      try {
        // Load all data in parallel for faster loading
        const [fabricResult, usageResult, priceResult] = await Promise.all([
          supabase.from("user_fabric_types").select("*").eq("user_id", user.id),
          supabase.from("user_usage_areas").select("*").eq("user_id", user.id),
          supabase.from("fabric_prices").select("fabric_name, en, gramaj, fiyat").eq("user_id", user.id)
        ]);

        if (fabricResult.error) throw fabricResult.error;
        if (usageResult.error) throw usageResult.error;
        if (priceResult.error) throw priceResult.error;

        const fabricData = fabricResult.data;
        const usageData = usageResult.data;
        const priceData = priceResult.data;
        
        if (priceData) {
          setFabricPrices(priceData.map(p => ({
            fabric_name: p.fabric_name,
            en: p.en,
            gramaj: p.gramaj,
            fiyat: Number(p.fiyat)
          })));
        }

        // Load custom boyahanes from localStorage
        const savedBoyahanes = localStorage.getItem(`customBoyahanes-${user.id}`);
        if (savedBoyahanes) {
          try {
            setCustomBoyahanes(JSON.parse(savedBoyahanes));
          } catch (e) {
            console.error("Error parsing saved boyahanes:", e);
          }
        }

        // If no fabric types exist, load defaults automatically for new users
        if (!fabricData || fabricData.length === 0) {
          setFabricTypes(defaultFabricTypes);
          setUsageAreas(defaultUsageAreas);
          // Save defaults to database in background
          saveFabricTypes(defaultFabricTypes);
          saveUsageAreas(defaultUsageAreas);
          setHasLoadedFromSystem(true);
        } else {
          setFabricTypes(fabricData.map(f => ({ name: f.name, en: f.en, gramaj: f.gramaj })));
          setHasLoadedFromSystem(true);
        }

        if (usageData && usageData.length > 0) {
          setUsageAreas(usageData.map(u => u.name));
        } else if (!usageData || usageData.length === 0) {
          // If no usage areas exist, load defaults
          setUsageAreas(defaultUsageAreas);
          saveUsageAreas(defaultUsageAreas);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadUserData();
  }, [user]);

  // Save fabric types to database
  const saveFabricTypes = async (types: FabricTypeWithSpec[]) => {
    if (!user) return;

    try {
      // Delete existing
      await supabase.from("user_fabric_types").delete().eq("user_id", user.id);

      // Insert new
      if (types.length > 0) {
        const { error } = await supabase.from("user_fabric_types").insert(
          types.map(t => ({
            user_id: user.id,
            name: t.name,
            en: t.en,
            gramaj: t.gramaj,
          }))
        );
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving fabric types:", error);
      toast.error("Kumaş türleri kaydedilirken hata oluştu");
    }
  };

  // Save usage areas to database
  const saveUsageAreas = async (areas: string[]) => {
    if (!user) return;

    try {
      // Delete existing
      await supabase.from("user_usage_areas").delete().eq("user_id", user.id);

      // Insert new
      if (areas.length > 0) {
        const { error } = await supabase.from("user_usage_areas").insert(
          areas.map(a => ({
            user_id: user.id,
            name: a,
          }))
        );
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving usage areas:", error);
      toast.error("Kullanım yerleri kaydedilirken hata oluştu");
    }
  };

  const handleFabricTypesChange = (types: FabricTypeWithSpec[]) => {
    setFabricTypes(types);
    saveFabricTypes(types);
  };

  const handleUsageAreasChange = (areas: string[]) => {
    setUsageAreas(areas);
    saveUsageAreas(areas);
  };

  // Load default system data
  const handleLoadFromSystem = async () => {
    setFabricTypes(defaultFabricTypes);
    setUsageAreas(defaultUsageAreas);
    await saveFabricTypes(defaultFabricTypes);
    await saveUsageAreas(defaultUsageAreas);
    setHasLoadedFromSystem(true);
    toast.success("Sistem verileri yüklendi ve hesabınıza kaydedildi");
  };

  // Auto-fill en, gramaj, and fiyat when fabric type changes
  const handleFabricChange = (value: string) => {
    setSelectedFabric(value);
    
    // Reset item-specific boyahane to use default when fabric changes
    setSelectedBoyahane(defaultBoyahane);
    
    // First check fabric prices (has fiyat)
    const priceRecord = fabricPrices.find(p => p.fabric_name === value);
    if (priceRecord) {
      setEn(priceRecord.en);
      setGramaj(priceRecord.gramaj);
      setFiyat(priceRecord.fiyat);
      return;
    }
    
    // Fallback to fabric types (no fiyat)
    const fabric = fabricTypes.find(f => f.name === value);
    if (fabric) {
      setEn(fabric.en);
      setGramaj(fabric.gramaj);
    }
  };

  // Save custom boyahane
  const saveCustomBoyahane = (name: string) => {
    if (!user || !name.trim()) return;
    const trimmedName = name.trim().toUpperCase();
    if (!customBoyahanes.includes(trimmedName) && !STANDARD_BOYAHANES.includes(trimmedName)) {
      const updated = [...customBoyahanes, trimmedName];
      setCustomBoyahanes(updated);
      localStorage.setItem(`customBoyahanes-${user.id}`, JSON.stringify(updated));
      toast.success(`"${trimmedName}" boyahane listesine eklendi`);
    }
  };

  // Get all boyahanes (standard + custom)
  const allBoyahanes = [...STANDARD_BOYAHANES, ...customBoyahanes];

  const handleAddModel = () => {
    if (!currentModelName.trim()) return;

    const newModel: ModelGroup = {
      id: Date.now().toString(),
      modelName: currentModelName.trim(),
      images: [],
      items: [],
    };

    setModels([...models, newModel]);
    setActiveModelId(newModel.id);
    setCurrentModelName("");
  };

  // Model name editing handlers
  const handleStartEditModelName = (modelId: string, currentName: string) => {
    setEditingModelId(modelId);
    setEditModelName(currentName);
  };

  const handleSaveModelName = () => {
    if (!editingModelId || !editModelName.trim()) return;
    setModels(models.map(model =>
      model.id === editingModelId
        ? { ...model, modelName: editModelName.trim() }
        : model
    ));
    setEditingModelId(null);
    setEditModelName("");
  };

  const handleCancelEditModelName = () => {
    setEditingModelId(null);
    setEditModelName("");
  };

  const handleAddItem = () => {
    if (!activeModelId || !selectedFabric || !selectedUsage) return;
    
    // Allow 0 price if priceExpected is true
    if (!priceExpected && fiyat <= 0) return;

    const newItem: FabricItem = {
      id: Date.now().toString(),
      fabricType: selectedFabric,
      usageArea: selectedUsage,
      en,
      gramaj,
      fiyat: priceExpected ? 0 : fiyat,
      priceExpected,
      printType: isBaskili ? selectedPrintType : undefined,
      boyahane: selectedBoyahane || defaultBoyahane || undefined,
    };

    setModels(models.map(model => 
      model.id === activeModelId 
        ? { ...model, items: [...model.items, newItem] }
        : model
    ));
    
    // Save manual fabric type if not exists
    if (!fabricTypes.find(f => f.name === selectedFabric)) {
      const newFabricType: FabricTypeWithSpec = { name: selectedFabric, en, gramaj };
      const updatedTypes = [...fabricTypes, newFabricType];
      setFabricTypes(updatedTypes);
      saveFabricTypes(updatedTypes);
    }
    
    // Save manual usage area if not exists
    if (!usageAreas.includes(selectedUsage)) {
      const updatedAreas = [...usageAreas, selectedUsage];
      setUsageAreas(updatedAreas);
      saveUsageAreas(updatedAreas);
    }
    
    // Update recent items
    setRecentFabrics(prev => {
      const filtered = prev.filter(f => f !== selectedFabric);
      return [selectedFabric, ...filtered].slice(0, 5);
    });
    setRecentUsageAreas(prev => {
      const filtered = prev.filter(a => a !== selectedUsage);
      return [selectedUsage, ...filtered].slice(0, 5);
    });
    
    // Save custom boyahane if entered
    const boyahaneValue = selectedBoyahane || defaultBoyahane;
    if (boyahaneValue && !allBoyahanes.includes(boyahaneValue)) {
      saveCustomBoyahane(boyahaneValue);
    }
    
    // Reset form
    setSelectedFabric("");
    setSelectedUsage("");
    setEn(0);
    setGramaj(0);
    setFiyat(0);
    setPriceExpected(false);
    setSelectedPrintType("");
    setSelectedBoyahane(defaultBoyahane); // Reset to default
  };

  // Toggle item selection
  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Select all items in active model
  const handleSelectAllItems = () => {
    if (!activeModel) return;
    if (selectedItems.size === activeModel.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(activeModel.items.map(i => i.id)));
    }
  };

  // Copy selected items to a model
  const handleCopySelectedToModel = (targetModelId: string) => {
    if (!activeModel || selectedItems.size === 0) return;
    
    const itemsToCopy = activeModel.items.filter(i => selectedItems.has(i.id));
    const newItems = itemsToCopy.map(item => ({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    
    setModels(models.map(model =>
      model.id === targetModelId
        ? { ...model, items: [...model.items, ...newItems] }
        : model
    ));
    
    setSelectedItems(new Set());
    setMultiCopyDialogOpen(false);
    toast.success(`${newItems.length} satır kopyalandı`);
  };

  // Create new model and copy selected items
  const handleCopyToNewModel = () => {
    if (!activeModel || selectedItems.size === 0 || !newModelNameForCopy.trim()) return;
    
    const itemsToCopy = activeModel.items.filter(i => selectedItems.has(i.id));
    const newItems = itemsToCopy.map(item => ({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    
    const newModel: ModelGroup = {
      id: Date.now().toString(),
      modelName: newModelNameForCopy.trim(),
      images: [],
      items: newItems,
    };
    
    setModels([...models, newModel]);
    setSelectedItems(new Set());
    setMultiCopyDialogOpen(false);
    setNewModelNameForCopy("");
    toast.success(`${newItems.length} satır yeni modele kopyalandı`);
  };

  const handleRemoveItem = (modelId: string, itemId: string) => {
    setModels(models.map(model =>
      model.id === modelId
        ? { ...model, items: model.items.filter(item => item.id !== itemId) }
        : model
    ));
  };

  const handleRemoveModel = (modelId: string) => {
    setModels(models.filter(model => model.id !== modelId));
    if (activeModelId === modelId) {
      setActiveModelId(models.length > 1 ? models[0].id : null);
    }
  };

  // Edit handlers
  const handleStartEdit = (item: FabricItem) => {
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = (modelId: string) => {
    if (!editForm) return;
    
    setModels(models.map(model =>
      model.id === modelId
        ? { ...model, items: model.items.map(item => 
            item.id === editingItemId ? editForm : item
          )}
        : model
    ));
    setEditingItemId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm(null);
  };

  // Copy item to another model
  const handleOpenCopyDialog = (item: FabricItem, sourceModelId: string) => {
    setItemToCopy({ item, sourceModelId });
    setCopyDialogOpen(true);
  };

  const handleCopyToModel = (targetModelId: string) => {
    if (!itemToCopy) return;
    
    const newItem: FabricItem = {
      ...itemToCopy.item,
      id: Date.now().toString(),
    };
    
    setModels(models.map(model =>
      model.id === targetModelId
        ? { ...model, items: [...model.items, newItem] }
        : model
    ));
    
    setCopyDialogOpen(false);
    setItemToCopy(null);
    toast.success("Satır kopyalandı");
  };

  // Image handling (multi-image per model, max 10)
  const MAX_MODEL_IMAGES = 10;

  const addImagesToActiveModel = useCallback(
    (newImages: string[]) => {
      if (!activeModelId || newImages.length === 0) return;

      setModels((prev) =>
        prev.map((model) => {
          if (model.id !== activeModelId) return model;
          const merged = [...model.images, ...newImages].slice(0, MAX_MODEL_IMAGES);
          return { ...model, images: merged };
        })
      );
    },
    [activeModelId]
  );

  const handleImagePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!activeModelId) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) break;

          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;
            addImagesToActiveModel([imageData]);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    [activeModelId, addImagesToActiveModel]
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeModelId || !e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files).slice(0, MAX_MODEL_IMAGES);
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("File read error"));
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers)
      .then((images) => addImagesToActiveModel(images))
      .catch((err) => console.error(err));

    e.target.value = "";
  };

  const handleRemoveImage = (modelId: string, index: number) => {
    setModels((prev) =>
      prev.map((model) => {
        if (model.id !== modelId) return model;
        const next = model.images.filter((_, i) => i !== index);
        return { ...model, images: next };
      })
    );
  };

  // Auto-save a single model to database (upsert by model name)
  const autoSaveModel = useCallback(async (model: ModelGroup) => {
    if (!user || model.items.length === 0) return;

    try {
      const totalCost = model.items.reduce((sum, item) => sum + item.fiyat, 0);
      
      // Check if model with same name exists
      const { data: existing } = await supabase
        .from("saved_costs")
        .select("id")
        .eq("user_id", user.id)
        .eq("model_name", model.modelName)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase.from("saved_costs").update({
          items: JSON.parse(JSON.stringify(model.items)),
          images: model.images,
          total_cost: totalCost,
        }).eq("id", existing.id);
      } else {
        // Insert new
        await supabase.from("saved_costs").insert([{
          user_id: user.id,
          model_name: model.modelName,
          items: JSON.parse(JSON.stringify(model.items)),
          images: model.images,
          total_cost: totalCost,
        }]);
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  }, [user]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!user) return;
    
    const modelsWithItems = models.filter(m => m.items.length > 0);
    if (modelsWithItems.length === 0) return;

    const timeoutId = setTimeout(() => {
      modelsWithItems.forEach(model => autoSaveModel(model));
    }, 1500); // Save after 1.5 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [models, user, autoSaveModel]);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Maliyet Hesaplayıcı';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Maliyet Listesi', {
      views: [{ showGridLines: true }]
    });

    // Define columns - A sütunu genişliği 40
    worksheet.columns = [
      { header: 'Resim', key: 'resim', width: 40 },
      { header: 'Model Adı', key: 'modelAdi', width: 20 },
      { header: 'Kumaş Türü', key: 'kumasTuru', width: 45 },
      { header: 'Kullanım Yeri', key: 'kullanimYeri', width: 35 },
      { header: 'En (CM)', key: 'en', width: 12 },
      { header: 'Gramaj (GR)', key: 'gramaj', width: 14 },
      { header: 'Fiyat (₺)', key: 'fiyat', width: 14 },
      { header: 'Birim Gramaj', key: 'birimGramaj', width: 14 },
      { header: 'Boyahane', key: 'boyahane', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2563EB' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: '1E40AF' } },
        bottom: { style: 'medium', color: { argb: '1E40AF' } },
        left: { style: 'medium', color: { argb: '1E40AF' } },
        right: { style: 'medium', color: { argb: '1E40AF' } }
      };
    });

    let currentRow = 2;

    for (const model of models) {
      if (model.items.length === 0) continue;

      const startRow = currentRow;
      const rowCount = model.items.length;

      // Add items
      for (let i = 0; i < model.items.length; i++) {
        const item = model.items[i];
        const row = worksheet.addRow({
          resim: '',
          modelAdi: i === 0 ? model.modelName : '',
          kumasTuru: item.fabricType + (item.printType ? ` (${item.printType.toUpperCase()})` : ''),
          kullanimYeri: item.usageArea,
          en: item.en,
          gramaj: item.gramaj,
          fiyat: item.priceExpected ? 'FİYAT BEKLENİYOR' : item.fiyat,
          birimGramaj: '', // Empty for manual entry
          boyahane: item.boyahane || '',
        });

        row.height = 60;

        // Get print type color for baskılı items
        const printTypeColor = item.printType 
          ? PRINT_TYPE_OPTIONS.find(p => p.value === item.printType)?.color 
          : null;

        // Style all cells
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          
          // Model columns (resim and model adı)
          if (colNumber <= 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'DBEAFE' }
            };
            cell.font = { bold: true, size: 11 };
          }
          
          // Apply print type color to fabric type column
          if (colNumber === 3 && printTypeColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: printTypeColor }
            };
          }
          
          // All cells get borders
          cell.border = {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } }
          };
        });

        currentRow++;
      }

      // Merge cells for Resim and Model Adı
      if (rowCount > 1) {
        worksheet.mergeCells(startRow, 1, startRow + rowCount - 1, 1); // Resim
        worksheet.mergeCells(startRow, 2, startRow + rowCount - 1, 2); // Model Adı
      }

      // Add image(s) if exists
      if (model.images.length > 0) {
        try {
          const composeImagesHorizontal = async (images: string[]) => {
            const load = (src: string) =>
              new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
              });

            const imgs = await Promise.all(images.map(load));
            const maxH = Math.max(...imgs.map((i) => i.naturalHeight || i.height));
            const gap = 16;

            const scaled = imgs.map((img) => {
              const h = maxH;
              const w = Math.round(((img.naturalWidth || img.width) / (img.naturalHeight || img.height)) * h);
              return { img, w, h };
            });

            const totalW = scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);

            const canvas = document.createElement("canvas");
            canvas.width = Math.min(totalW, 2400);
            const scaleDown = canvas.width / totalW;
            canvas.height = Math.round(maxH * scaleDown);

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported");

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let x = 0;
            for (const s of scaled) {
              const w = Math.round(s.w * scaleDown);
              const h = Math.round(s.h * scaleDown);
              ctx.drawImage(s.img, x, 0, w, h);
              x += w + Math.round(gap * scaleDown);
            }

            return canvas.toDataURL("image/png");
          };

          const composite =
            model.images.length === 1 ? model.images[0] : await composeImagesHorizontal(model.images);

          const base64Match = composite.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
          if (base64Match) {
            const extRaw = base64Match[1];
            const base64Data = base64Match[2];
            const extension = (extRaw === "jpg" ? "jpeg" : extRaw) as "png" | "jpeg" | "gif";

            const imageId = workbook.addImage({
              base64: base64Data,
              extension,
            });

            // A sütunu genişliği 40 karakter ≈ 280 piksel
            // Satır yüksekliği 60 pt, her satır için
            const colWidthPx = 40 * 7; // ~280 piksel
            const rowHeightPt = 60;
            const totalRowHeightPx = rowHeightPt * rowCount * 1.33; // pt to px (1pt ≈ 1.33px)

            // Padding: her yönden küçük boşluk
            const paddingPx = 8;
            const availableWidth = colWidthPx - paddingPx * 2;
            const availableHeight = totalRowHeightPx - paddingPx * 2;

            // Resim tam olarak hücreye sığsın (en ve boy olarak)
            const imageWidth = availableWidth;
            const imageHeight = availableHeight;

            // Başlangıç pozisyonu: padding kadar içeride
            const colOffset = paddingPx / colWidthPx;
            const rowOffset = paddingPx / (rowHeightPt * 1.33);

            worksheet.addImage(imageId, {
              tl: { col: colOffset, row: startRow - 1 + rowOffset },
              ext: { width: imageWidth, height: imageHeight },
            });
          }
        } catch (error) {
          console.error("Image processing error:", error);
        }
      }

      // Apply thick borders around the entire model group
      for (let r = startRow; r < startRow + rowCount; r++) {
        const row = worksheet.getRow(r);
        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          const existingBorder = cell.border || {};
          
          cell.border = {
            top: r === startRow 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.top,
            bottom: r === startRow + rowCount - 1 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.bottom,
            left: c === 1 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.left,
            right: c === 8 
              ? { style: 'medium', color: { argb: '2563EB' } }
              : existingBorder.right,
          };
        }
      }
    }

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maliyet_listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeModel = models.find(m => m.id === activeModelId);

  return (
    <div ref={ref} className="space-y-8 animate-fade-in" onPaste={handleImagePaste}>
      {/* Loading State - Skeleton */}
      {isLoadingData ? (
        <div className="space-y-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-12 w-64 bg-muted rounded-lg"></div>
          </div>
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-muted h-16 rounded-t-lg"></CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="h-10 bg-muted rounded w-3/4"></div>
              <div className="h-10 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        </div>
      ) : !hasLoadedFromSystem && fabricTypes.length === 0 ? (
        <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-12 flex flex-col items-center justify-center">
            <div className="p-4 bg-primary/20 rounded-full mb-6">
              <Download className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Kumaş ve Kullanım Yeri Verileri</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Henüz kumaş ve kullanım yeri verisi yok. Sistem varsayılan verilerini yükleyerek başlayabilirsiniz.
            </p>
            <Button
              onClick={handleLoadFromSystem}
              size="lg"
              className="gradient-primary hover:opacity-90 px-8"
            >
              <Download className="h-5 w-5 mr-2" />
              Sistemden Yükle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Controls */}
          <div className="flex flex-wrap items-start gap-4">
            {/* Settings Button */}
            <Button
              variant={showManager ? "default" : "outline"}
              onClick={() => setShowManager(!showManager)}
              className="gap-2 h-12"
            >
              <Settings className="h-4 w-4" />
              {showManager ? "Yönetimi Kapat" : "Kumaş & Kullanım Yeri Yönetimi"}
            </Button>
            
            {/* Saved Costs Button */}
            <Button
              variant="outline"
              onClick={() => navigate("/saved-costs")}
              className="gap-2 h-12"
            >
              <Archive className="h-4 w-4" />
              Kayıtlı Maliyetler
            </Button>
          </div>

          {/* Fabric Manager */}
          {showManager && (
            <FabricManager
              fabricTypes={fabricTypes}
              usageAreas={usageAreas}
              onFabricTypesChange={handleFabricTypesChange}
              onUsageAreasChange={handleUsageAreasChange}
            />
          )}

      {/* Model Creation */}
      <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-card via-card to-secondary/20">
        <CardHeader className="gradient-primary rounded-t-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <CardTitle className="text-primary-foreground flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Model Oluştur</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="model-name" className="text-sm font-semibold text-foreground/80">Model Adı</Label>
              <Input
                id="model-name"
                value={currentModelName}
                onChange={(e) => setCurrentModelName(e.target.value)}
                placeholder="Örn: LOSKA, BEGOR..."
                onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
                className="h-12 text-lg border-2 focus:border-primary transition-all duration-300 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddModel}
                disabled={!currentModelName.trim()}
                className="h-12 px-8 gradient-accent text-accent-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Model Ekle
              </Button>
            </div>
          </div>
          
          {/* Model Tabs */}
          {models.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {models.map(model => (
                <div key={model.id} className="relative group">
                  {editingModelId === model.id ? (
                    <div className="flex items-center gap-2 bg-secondary p-2 rounded-lg">
                      <Input
                        value={editModelName}
                        onChange={(e) => setEditModelName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveModelName()}
                        className="h-9 w-40"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveModelName}
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEditModelName}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant={activeModelId === model.id ? "default" : "outline"}
                      size="lg"
                      onClick={() => setActiveModelId(model.id)}
                      className={`relative transition-all duration-300 hover:scale-105 ${
                        activeModelId === model.id ? "shadow-lg shadow-primary/30" : "hover:bg-secondary/80"
                      }`}
                    >
                      {model.images.length > 0 && (
                        <div className="w-6 h-6 rounded overflow-hidden mr-2 border border-white/20">
                          <img src={model.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {model.modelName}
                      <span className="ml-2 text-xs opacity-70 bg-black/10 px-2 py-0.5 rounded-full">
                        {model.items.length}
                      </span>
                    </Button>
                  )}
                  {/* Model action buttons */}
                  {editingModelId !== model.id && (
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditModelName(model.id, model.modelName);
                        }}
                        className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shadow-md hover:scale-110"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveModel(model.id);
                        }}
                        className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow-md hover:scale-110"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Radio Player - opened from ClockWeather button */}
      {isRadioOpen && (
        <RadioPlayer
          isOpen={isRadioOpen}
          onClose={() => onRadioClose?.()}
          isMinimized={isRadioMinimized}
          onMinimize={() => onRadioMinimize?.()}
        />
      )}

      {/* Fabric Entry Form */}
      {activeModel && (
        <Card className="border-none shadow-2xl animate-slide-in overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-secondary/80 via-secondary/50 to-transparent border-b border-border/50">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold">{activeModel.modelName}</span>
              <span className="text-muted-foreground font-normal">- Kumaş Ekle</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Image Upload Section */}
            <div className="flex flex-col sm:flex-row items-start gap-6 p-6 bg-gradient-to-br from-muted/30 to-transparent rounded-2xl border border-border/50">
              <div className="flex-shrink-0 w-full sm:w-auto">
                {activeModel.images.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2">
                      {activeModel.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                            <img src={img} alt={`${activeModel.modelName} ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={() => handleRemoveImage(activeModel.id, idx)}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                            title="Resmi sil"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      {activeModel.images.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center"
                          title="Resim ekle"
                        >
                          <Plus className="h-5 w-5 text-primary/70" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeModel.images.length}/10 resim
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full sm:w-32 h-24 sm:h-32 rounded-xl border-3 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/15 transition-all duration-300 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-8 w-8 text-primary/50 group-hover:text-primary/70 transition-colors mb-2" />
                    <span className="text-xs text-muted-foreground text-center px-2">Ctrl+V veya tıkla</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Model Resimleri
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Resmi <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd> ile yapıştırın veya dosya seçin.
                  Aynı model için <strong>10 adede kadar</strong> resim ekleyebilirsiniz. Excel'e aktarırken resimler beyaz arkaplanda
                  <strong> yan yana</strong> birleştirilip ilk sütunda tek görsel olarak yer alır.
                </p>
              </div>
            </div>

            {/* Default Boyahane Section */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    Varsayılan Boyahane
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Seçilen boyahane tüm kalemlere otomatik uygulanır. Kalem bazında değiştirilebilir.
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <SearchableCombobox
                    options={allBoyahanes}
                    value={defaultBoyahane}
                    onValueChange={(value) => {
                      setDefaultBoyahane(value);
                      setSelectedBoyahane(value);
                      // Save custom if not in list
                      if (value && !allBoyahanes.includes(value)) {
                        saveCustomBoyahane(value);
                      }
                    }}
                    placeholder="Boyahane seçin..."
                    searchPlaceholder="Boyahane ara..."
                    allowCustom={true}
                  />
                </div>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80">Kumaş Türü</Label>
                <SearchableCombobox
                  options={fabricTypes.map(f => f.name)}
                  value={selectedFabric}
                  onValueChange={handleFabricChange}
                  placeholder="Kumaş seçin..."
                  searchPlaceholder="Kumaş ara..."
                  allowCustom={true}
                  recentItems={recentFabrics}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/80">Kullanım Yeri</Label>
                <SearchableCombobox
                  options={usageAreas}
                  value={selectedUsage}
                  onValueChange={setSelectedUsage}
                  placeholder="Kullanım yeri seçin..."
                  searchPlaceholder="Kullanım yeri ara..."
                  allowCustom={true}
                  recentItems={recentUsageAreas}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="en" className="text-sm font-semibold text-foreground/80">En (CM)</Label>
                <Input
                  id="en"
                  type="number"
                  min="0"
                  value={en || ""}
                  onChange={(e) => setEn(Number(e.target.value))}
                  placeholder="0"
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="gramaj" className="text-sm font-semibold text-foreground/80">Gramaj (GR)</Label>
                <Input
                  id="gramaj"
                  type="number"
                  min="0"
                  value={gramaj || ""}
                  onChange={(e) => setGramaj(Number(e.target.value))}
                  placeholder="0"
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fiyat" className="text-sm font-semibold text-foreground/80">Fiyat (₺)</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox 
                      checked={priceExpected}
                      onCheckedChange={(checked) => {
                        setPriceExpected(!!checked);
                        if (checked) setFiyat(0);
                      }}
                      className="h-4 w-4"
                    />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Üreticiden Bekleniyor
                    </span>
                  </label>
                </div>
                <Input
                  id="fiyat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fiyat || ""}
                  onChange={(e) => setFiyat(Number(e.target.value))}
                  placeholder={priceExpected ? "Fiyat bekleniyor..." : "0.00"}
                  className="h-11 border-2 focus:border-primary transition-all duration-300"
                  disabled={priceExpected}
                />
              </div>

              {/* Print Type Selection - only show for baskılı fabrics */}
              {isBaskili && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground/80">Baskı Tipi</Label>
                  <Select value={selectedPrintType} onValueChange={setSelectedPrintType}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Baskı tipi seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `#${opt.color}` }}
                            />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Item-specific Boyahane (different from default) */}
              {defaultBoyahane && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    Boyahane
                    {selectedBoyahane !== defaultBoyahane && (
                      <span className="text-xs text-amber-600">(farklı)</span>
                    )}
                  </Label>
                  <SearchableCombobox
                    options={allBoyahanes}
                    value={selectedBoyahane}
                    onValueChange={setSelectedBoyahane}
                    placeholder={defaultBoyahane}
                    searchPlaceholder="Farklı boyahane..."
                    allowCustom={true}
                    className="h-11"
                  />
                </div>
              )}

              <div className="flex items-end">
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedFabric || !selectedUsage || (!priceExpected && fiyat <= 0)}
                  className="w-full h-11 gradient-accent text-accent-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Kumaş Ekle
                </Button>
              </div>
            </div>

            {/* Items List for Active Model */}
            {activeModel.items.length > 0 && (
              <div className="mt-8">
                <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-inner bg-gradient-to-br from-background to-muted/20">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-muted/80 to-muted/40">
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">#</th>
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">Kumaş Türü</th>
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">Kullanım Yeri</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">En (CM)</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">Gramaj (GR)</th>
                        <th className="text-right py-4 px-5 font-semibold text-sm text-foreground/70">Fiyat</th>
                        <th className="text-left py-4 px-5 font-semibold text-sm text-foreground/70">Boyahane</th>
                        <th className="w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeModel.items.map((item, index) => (
                        <tr 
                          key={item.id} 
                          className="border-t border-border/30 hover:bg-primary/5 transition-colors duration-200"
                        >
                          <td className="py-4 px-5 text-sm text-muted-foreground font-medium">{index + 1}</td>
                          {editingItemId === item.id ? (
                            <>
                              <td className="py-2 px-2">
                                <Input 
                                  value={editForm?.fabricType || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fabricType: e.target.value} : null)}
                                  className="h-9 text-sm"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  value={editForm?.usageArea || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, usageArea: e.target.value} : null)}
                                  className="h-9 text-sm"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  value={editForm?.en || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, en: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-20"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  value={editForm?.gramaj || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, gramaj: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-20"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input 
                                  type="number"
                                  step="0.01"
                                  value={editForm?.fiyat || ""} 
                                  onChange={(e) => setEditForm(prev => prev ? {...prev, fiyat: Number(e.target.value)} : null)}
                                  className="h-9 text-sm text-right w-24"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSaveEdit(activeModel.id)}
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancelEdit}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4 px-5 text-sm font-medium">{item.fabricType}</td>
                              <td className="py-4 px-5 text-sm">{item.usageArea}</td>
                              <td className="py-4 px-5 text-sm text-right font-mono">{item.en}</td>
                              <td className="py-4 px-5 text-sm text-right font-mono">{item.gramaj}</td>
                              <td className="py-4 px-5 text-sm text-right font-bold text-primary">
                                ₺{item.fiyat.toFixed(2)}
                              </td>
                              <td className="py-4 px-5 text-sm text-muted-foreground">
                                {item.boyahane || "-"}
                              </td>
                              <td className="py-4 px-3">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(item)}
                                    className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
                                    title="Düzenle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {models.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenCopyDialog(item, activeModel.id)}
                                      className="h-9 w-9 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full transition-all"
                                      title="Diğer modele kopyala"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(activeModel.id, item.id)}
                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                    title="Sil"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export and Save Buttons */}
      {models.length > 0 && models.some(m => m.items.length > 0) && (
        <Card className="border-none shadow-2xl animate-fade-in overflow-hidden bg-gradient-to-br from-card to-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-foreground mb-2">Dışa Aktarmaya Hazır</h3>
                <p className="text-muted-foreground">
                  {models.filter(m => m.items.length > 0).length} model, toplam{" "}
                  {models.reduce((sum, m) => sum + m.items.length, 0)} kalem kumaş
                </p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Otomatik kaydediliyor
                </span>
                <Button 
                  onClick={handleExportExcel} 
                  size="lg"
                  className="gradient-primary hover:opacity-90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 px-10"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-3" />
                  Excel İndir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Copy to Model Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Satırı Modele Kopyala
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{itemToCopy?.item.fabricType}</strong> satırını hangi modele kopyalamak istiyorsunuz?
            </p>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {models
                  .filter(m => m.id !== itemToCopy?.sourceModelId)
                  .map(model => (
                    <Button
                      key={model.id}
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => handleCopyToModel(model.id)}
                    >
                      {model.images.length > 0 && (
                        <div className="w-8 h-8 rounded overflow-hidden border">
                          <img src={model.images[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium">{model.modelName}</p>
                        <p className="text-xs text-muted-foreground">{model.items.length} kalem</p>
                      </div>
                      <Send className="h-4 w-4 text-primary" />
                    </Button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
