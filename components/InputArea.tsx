import React, { useState, useRef, ChangeEvent } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { fileToBase64 } from '../utils/converters';

interface InputAreaProps {
  onSend: (text: string, images: string[]) => void;
  isLoading: boolean;
  disabled: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading, disabled }) => {
  const [text, setText] = useState('');
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newImages = await Promise.all(
        files.map(async (file: File) => {
          const base64 = await fileToBase64(file);
          return {
            file,
            preview: URL.createObjectURL(file),
            base64,
          };
        })
      );
      setSelectedImages((prev) => [...prev, ...newImages]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((!text.trim() && selectedImages.length === 0) || isLoading || disabled) return;
    
    const imagesToSend = selectedImages.map(img => img.base64);
    onSend(text, imagesToSend);
    
    // Reset
    setText('');
    setSelectedImages([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4 pb-6 md:pb-4 w-full max-w-4xl mx-auto rounded-t-xl md:rounded-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {/* Image Preview Area */}
      {selectedImages.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto py-2">
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group flex-shrink-0">
              <img 
                src={img.preview} 
                alt="preview" 
                className="h-20 w-20 object-cover rounded-lg border border-slate-200" 
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Controls */}
      <div className="flex items-end gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
          title="Add image"
        >
          <ImageIcon className="w-6 h-6" />
        </button>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Please configure Ollama to start..." : "Send a message..."}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-slate-800 placeholder-slate-400 max-h-[150px] overflow-y-auto"
        />
        
        <button
          onClick={handleSend}
          disabled={(!text.trim() && selectedImages.length === 0) || isLoading || disabled}
          className={`p-2 rounded-xl flex-shrink-0 transition-all ${
            text.trim() || selectedImages.length > 0 
              ? 'bg-primary text-white shadow-md hover:bg-blue-600' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default InputArea;