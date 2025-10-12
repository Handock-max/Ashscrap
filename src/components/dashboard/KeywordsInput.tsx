import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";

type KeywordsInputProps = {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  disabled?: boolean;
};

export const KeywordsInput = ({ keywords, onChange, disabled }: KeywordsInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  };

  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (trimmed && keywords.length < 5 && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setInputValue("");
    }
  };

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="keywords">
        Mots-clés ({keywords.length}/5)
      </Label>
      <div className="space-y-2">
        <Input
          id="keywords"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addKeyword}
          placeholder="Tapez un mot-clé et appuyez sur Entrée"
          disabled={disabled || keywords.length >= 5}
        />
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(index)}
                  disabled={disabled}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
