"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";

interface TickerSearchProps {
  value: string;
  onChange: (ticker: string) => void;
}

export function TickerSearch({ value, onChange }: TickerSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState(value);
  const [results, setResults] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const debouncedSearch = useDebounce(searchValue, 300);

  // Sync internal search value if external value changes (e.g., clearing the form)
  React.useEffect(() => {
    setSearchValue(value);
  }, [value]);

  React.useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 1) {
      setResults([]);
      return;
    }

    const fetchTickers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://crisislens.onrender.com"}/tickers/search?q=${debouncedSearch}`);
        const data = await res.json();
        // Ensure data is an array to prevent crashes
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickers();
  }, [debouncedSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Select ticker..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search ticker..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
            
            {/* 1. Action Group: Always allows the user to select exactly what they typed */}
            {searchValue && (
              <CommandGroup heading="Action">
                <CommandItem
                  value={searchValue}
                  onSelect={(currentValue) => {
                    onChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                  className="cursor-pointer font-medium text-blue-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use "{searchValue.toUpperCase()}"
                </CommandItem>
              </CommandGroup>
            )}

            {/* 2. Suggestions Group: Results from DB / yFinance */}
            {results.length > 0 && (
              <CommandGroup heading="Suggestions">
                {results.map((ticker) => (
                  <CommandItem
                    key={ticker.symbol}
                    value={ticker.symbol}
                    onSelect={() => {
                      onChange(ticker.symbol.toUpperCase());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === ticker.symbol ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold">{ticker.symbol}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {ticker.name}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isLoading && results.length === 0 && searchValue && (
              <CommandEmpty>No suggestions found. Click 'Use' above to add anyway.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}