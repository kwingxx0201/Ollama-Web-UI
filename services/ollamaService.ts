import { AppSettings, OllamaListResponse } from '../types';

// Helper to normalize host URL
const normalizeHost = (host: string): string => {
  let normalized = host.trim();
  // If it doesn't start with http:// or https://, assume http://
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `http://${normalized}`;
  }
  // Remove trailing slash
  return normalized.replace(/\/$/, '');
};

export const checkConnection = async (host: string): Promise<boolean> => {
  const cleanHost = normalizeHost(host);
  
  // Basic validation to prevent fetching invalid defaults
  if (cleanHost === 'http://' || cleanHost === 'https://') return false;

  // We let the fetch error bubble up so the UI can handle "Failed to fetch" (CORS/Network)
  // vs "404" (Wrong path)
  const response = await fetch(`${cleanHost}`, { 
    method: 'GET',
    mode: 'cors',
    credentials: 'omit'
  });
  return response.ok;
};

export const fetchModels = async (host: string): Promise<string[]> => {
  try {
    const cleanHost = normalizeHost(host);
    const response = await fetch(`${cleanHost}/api/tags`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data: OllamaListResponse = await response.json();
    return data.models.map((m) => m.name);
  } catch (error) {
    // Re-throw so UI can handle it
    throw error;
  }
};

export const streamChat = async (
  settings: AppSettings,
  messages: { role: string; content: string; images?: string[] }[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: any) => void
) => {
  try {
    const cleanHost = normalizeHost(settings.host);
    const response = await fetch(`${cleanHost}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.selectedModel,
        messages: messages,
        stream: true, // Enable streaming
        options: {
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Error (${response.status}): ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onDone();
        break;
      }

      const text = decoder.decode(value, { stream: true });
      // Ollama sends multiple JSON objects in one chunk sometimes, or one split across chunks.
      // However, usually it's newline delimited JSON.
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message && json.message.content) {
            onChunk(json.message.content);
          }
          if (json.done) {
            // Final stats often come in the last packet
          }
        } catch (e) {
          // In case of a split JSON line (rare in simple reading but possible),
          // a production app needs a buffer. For simplicity, we assume robust newline separation here.
          console.warn("Error parsing stream line", e);
        }
      }
    }
  } catch (error) {
    onError(error);
  }
};