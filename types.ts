export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // Base64 strings
  timestamp: number;
  id: string;
}

export interface AppSettings {
  host: string;
  selectedModel: string;
  systemPrompt: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    images?: string[];
  };
  done: boolean;
}

export interface OllamaListResponse {
  models: OllamaModel[];
}