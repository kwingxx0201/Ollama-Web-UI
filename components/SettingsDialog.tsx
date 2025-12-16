import React, { useState, useEffect } from 'react';
import { Settings, X, RefreshCw, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchModels, checkConnection } from '../services/ollamaService';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      handleCheckConnection(settings.host, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCheckConnection = async (host: string, fetchList = true) => {
    setConnectionStatus('idle');
    setErrorMsg('');
    setIsLoadingModels(true);
    
    try {
      const isConnected = await checkConnection(host);
      
      if (isConnected) {
        setConnectionStatus('success');
        if (fetchList) {
          try {
            const fetchedModels = await fetchModels(host);
            setModels(fetchedModels);
            // Auto-select first model if none selected or current invalid
            if (!fetchedModels.includes(localSettings.selectedModel) && fetchedModels.length > 0) {
              setLocalSettings(prev => ({ ...prev, selectedModel: fetchedModels[0] }));
            }
          } catch (e) {
             // Connection ok, but models failed?
             // Silently fail model fetch if main connection was OK, just don't update list
          }
        }
      } else {
        // response.ok was false
        setConnectionStatus('error');
        setErrorMsg('Connected to server, but it returned an error.');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      
      // Determine precise error for UI
      const isMixedContent = window.location.protocol === 'https:' && host.includes('http:');
      const isFetchError = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'AbortError');

      if (isMixedContent) {
        setErrorMsg('Mixed Content Error: Cannot connect to HTTP (localhost) from an HTTPS site. Please use a tunneling service (like ngrok) or run this app locally on HTTP.');
      } else if (isFetchError) {
        if (err.name === 'AbortError') {
           setErrorMsg('Connection Timed Out. Is Ollama running?');
        } else {
           setErrorMsg('Network Error: Could not reach Ollama. Check CORS/OLLAMA_ORIGINS.');
        }
      } else {
        setErrorMsg(err.message || 'Failed to connect.');
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleChange = (field: keyof AppSettings, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic cleanup before saving
    let cleanHost = localSettings.host.trim();
    if (!cleanHost.match(/^https?:\/\//)) {
        cleanHost = `http://${cleanHost}`;
    }
    cleanHost = cleanHost.replace(/\/$/, '');
    
    onSave({ ...localSettings, host: cleanHost });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Host Configuration */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Ollama Server URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localSettings.host}
                onChange={(e) => handleChange('host', e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="http://127.0.0.1:11434"
              />
              <button
                onClick={() => handleCheckConnection(localSettings.host)}
                disabled={isLoadingModels}
                className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                title="Refresh Models"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Status Feedback */}
            {connectionStatus === 'success' && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected successfully
              </p>
            )}
            {connectionStatus === 'error' && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 space-y-2">
                <p className="flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3 h-3" /> Connection Failed
                </p>
                <p>{errorMsg}</p>
                
                <div className="pt-2 border-t border-red-100">
                  <p className="font-semibold mb-1">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Is Ollama running?</li>
                    <li>
                      <strong>CORS:</strong> Did you set <code>OLLAMA_ORIGINS="*"</code>?
                    </li>
                    <li>
                      <strong>Mixed Content:</strong> Are you using HTTPS? You cannot connect to HTTP localhost from HTTPS.
                    </li>
                  </ul>
                  
                  <div className="mt-2">
                    <p className="opacity-75 mb-1">Mac/Linux command:</p>
                    <code className="block bg-black/10 p-2 rounded text-[10px] font-mono whitespace-pre-wrap">
                      OLLAMA_ORIGINS="*" ollama serve
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Model</label>
            <select
              value={localSettings.selectedModel}
              onChange={(e) => handleChange('selectedModel', e.target.value)}
              disabled={models.length === 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="" disabled>Select a model</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {models.length === 0 && connectionStatus !== 'error' && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Connect to server to load models.
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">System Prompt (Optional)</label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
              placeholder="You are a helpful assistant..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;