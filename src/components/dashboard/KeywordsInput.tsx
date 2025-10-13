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
          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
            {keywords.map((keyword, index) => (
              <div key={index} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm border border-blue-300 dark:border-blue-700">
                <span>{keyword}</span>
                <X
                  className="h-3 w-3 cursor-pointer text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => removeKeyword(index)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
