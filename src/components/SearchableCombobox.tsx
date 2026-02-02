import * as React from "react";
import { Check, ChevronsUpDown, Plus, Clock } from "lucide-react";
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
  recentItems?: string[];
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
  recentItems = [],
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customValue, setCustomValue] = React.useState("");

  // Fast filtering - immediate response
  const filteredOptions = React.useMemo(() => {
    if (!searchValue.trim()) return options;
    const query = searchValue.toLowerCase();
    return options.filter((option) =>
      option.toLowerCase().includes(query)
    );
  }, [options, searchValue]);

  // Sort: recent items first, then alphabetically
  const sortedOptions = React.useMemo(() => {
    const recentSet = new Set(recentItems);
    const recent = filteredOptions.filter(o => recentSet.has(o));
    const others = filteredOptions.filter(o => !recentSet.has(o));
    return [...recent, ...others];
  }, [filteredOptions, recentItems]);

  const handleAddCustom = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
      setOpen(false);
      setSearchValue("");
    }
  };

  // Use search value directly if not found in options
  const handleSelectOrCreate = () => {
    if (searchValue.trim() && filteredOptions.length === 0 && allowCustom) {
      onValueChange(searchValue.trim());
      setSearchValue("");
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
          className={cn("w-full justify-between font-normal h-11", className)}
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredOptions.length === 0 && allowCustom) {
                e.preventDefault();
                handleSelectOrCreate();
              }
            }}
          />
          <CommandList>
            {filteredOptions.length === 0 && !showCustomInput && (
              <CommandEmpty className="py-3 px-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                  {allowCustom && searchValue.trim() && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onValueChange(searchValue.trim());
                        setSearchValue("");
                        setOpen(false);
                      }}
                      className="mt-1"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      "{searchValue}" Ekle
                    </Button>
                  )}
                  {allowCustom && !searchValue.trim() && (
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
              
              {/* Recent items section */}
              {recentItems.length > 0 && !searchValue && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Son Kullanılanlar
                </div>
              )}
              
              {sortedOptions.map((option, index) => {
                const isRecent = recentItems.includes(option) && !searchValue;
                const showDivider = isRecent && index === recentItems.filter(r => sortedOptions.includes(r)).length - 1;
                
                return (
                  <React.Fragment key={option}>
                    <CommandItem
                      value={option}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                        setSearchValue("");
                        setShowCustomInput(false);
                      }}
                      className={cn(isRecent && "bg-primary/5")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{option}</span>
                      {isRecent && (
                        <Clock className="ml-auto h-3 w-3 text-muted-foreground" />
                      )}
                    </CommandItem>
                    {showDivider && <div className="my-1 border-t border-border" />}
                  </React.Fragment>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
