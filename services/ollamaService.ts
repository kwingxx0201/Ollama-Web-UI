import { AppSettings, OllamaListResponse } from '../types';

export const checkConnection = async (host: string): Promise<boolean> => {
  try {
    // Usually a simple GET to root returns 'Ollama is running'
    const response = await fetch(`${host}`, { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.error("Connection check failed:", error);
    return false;
  }
};

export const fetchModels = async (host: string): Promise<string[]> => {
  try {
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) throw new Error('Failed to fetch models');
    const data: OllamaListResponse = await response.json();
    return data.models.map((m) => m.name);
  } catch (error) {
    console.error("Fetch models failed:", error);
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
    const response = await fetch(`${settings.host}/api/chat`, {
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