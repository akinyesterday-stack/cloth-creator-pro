import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface SearchableComboboxProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowCustom?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Seçin...",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç bulunamadı.",
  className,
  allowCustom = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customValue, setCustomValue] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleAddCustom = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && !showCustomInput && (
              <CommandEmpty className="py-3 px-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                  {allowCustom && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCustomInput(true);
                        setCustomValue(searchValue);
                      }}
                      className="mt-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Manuel Ekle
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}
            
            {showCustomInput && (
              <div className="p-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Manuel Giriş:</p>
                <div className="flex gap-2">
                  <Input
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Yeni değer girin..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddCustom} className="h-8">
                    Ekle
                  </Button>
                </div>
              </div>
            )}
            
            <CommandGroup className="max-h-[300px] overflow-auto">
              {allowCustom && !showCustomInput && filteredOptions.length > 0 && (
                <CommandItem
                  onSelect={() => setShowCustomInput(true)}
                  className="text-primary border-b border-border mb-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Manuel Giriş Yap
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    setSearchValue("");
                    setShowCustomInput(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
