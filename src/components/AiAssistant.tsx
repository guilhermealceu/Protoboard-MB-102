import React, { useState } from 'react';
import { Device, Wire } from '../types';
import { Sparkles, MessageSquare, Send, Brain, Cpu, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface AiAssistantProps {
  devices: Device[];
  wires: Wire[];
  onAddAutoWire: (source: string, dest: string, color: string, label: string) => void;
}

interface SuggestionStep {
  instruction: string;
  source: string;
  dest: string;
  color: string;
  importance?: string;
  applied?: boolean;
}

interface SuggestionResponse {
  overview: string;
  steps: SuggestionStep[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  devices,
  wires,
  onAddAutoWire,
}) => {
  const [activeTab, setActiveTab] = useState<'suggest' | 'chat'>('suggest');
  
  // Suggestion State
  const [suggestionData, setSuggestionData] = useState<SuggestionResponse | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [appliedStepIndices, setAppliedStepIndices] = useState<Set<number>>(new Set());

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([
    { sender: 'assistant', text: 'Olá! Sou o Mestre do MB-102. Estou pronto para ajudar você a organizar seu protótipo. Tem alguma dúvida de como ligar seus sensores ou Arduino? Me pergunte qualquer coisa!' }
  ]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Request suggested wiring from Gemini API
  const handleRequestWiring = async () => {
    if (devices.length === 0) {
      setSuggestionError('Por favor, adicione pelo menos um componente na aba "Componentes" antes de pedir ajuda ao mestre.');
      return;
    }

    setIsGeneratingSuggestion(true);
    setSuggestionError(null);
    setSuggestionData(null);
    setAppliedStepIndices(new Set());

    try {
      const response = await fetch('/api/ai/suggest-wiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede: status ${response.status}`);
      }

      const data = await response.json();
      setSuggestionData(data);
    } catch (err: any) {
      console.error(err);
      setSuggestionError(err.message || 'Falha ao obter sugestões. Verifique se a sua API Key está configurada.');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // Send a chat question to Gemini
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsSendingMessage(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha de rede (${response.status})`);
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { sender: 'assistant', text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: `Desculpe, ocorreu um erro ao conectar com o mestre. Detalhes: ${err.message}. Certifique-se de configurar a sua chave do Gemini API nos Segredos.`
      }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Automatically apply a suggested wire step to the breadboard
  const handleApplyWireStep = (step: SuggestionStep, index: number) => {
    const { source, dest, color, instruction } = step;
    
    // Normalizing hole names to ensure they exist on our grid
    const normSource = source.toLowerCase().trim();
    const normDest = dest.toLowerCase().trim();

    // Perform check to ensure these coordinates are valid format
    const isValidHole = (id: string) => {
      return /^[a-j]-[0-9]+$/.test(id) || 
             id.startsWith('top-') || 
             id.startsWith('bottom-');
    };

    if (!isValidHole(normSource) || !isValidHole(normDest)) {
      alert(`As coordenadas geradas pela IA (${source} & ${dest}) não são perfeitamente reconhecidas nesta protoboard física. Tente mapear manualmente.`);
      return;
    }

    // Add wire using parent callback
    onAddAutoWire(normSource, normDest, color, instruction.substring(0, 30));
    
    // Mark as applied
    setAppliedStepIndices(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('suggest')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'suggest' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Brain className="w-3.5 h-3.5" />
          Sugestão de Fiação por IA
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Conversar com Mestre IA
        </button>
      </div>

      {/* Tab Contents: Wire Suggestions */}
      {activeTab === 'suggest' && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Plano de Cabeamento Inteligente</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Seus componentes cadastrados serão analisados pela IA para gerar um plano passo a passo com fiação organizada!
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestWiring}
              disabled={isGeneratingSuggestion || devices.length === 0}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGeneratingSuggestion ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Gerando sugestão...
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  Calcular Ligações com IA
                </>
              )}
            </button>
          </div>

          {/* Errors and Empty limits */}
          {suggestionError && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-lg flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-bold text-red-300">Erro na IA</span>
                <p className="text-red-200 leading-relaxed text-[11px]">{suggestionError}</p>
              </div>
            </div>
          )}

          {devices.length === 0 && !suggestionData && (
            <div className="p-4 bg-slate-950/30 border border-slate-900 border-dashed rounded-lg text-center text-slate-500 text-xs italic">
              Nenhum componente cadastrado. Cadastre um sensor ou Arduino e peça o plano de cabeamento acima!
            </div>
          )}

          {/* AI Output Result */}
          {suggestionData && (
            <div className="flex flex-col gap-3 flex-1 max-h-[380px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1">
              <div className="p-3 bg-slate-950 rounded-lg border border-indigo-900/40">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Visão Geral do Plano</span>
                <p className="text-[11px] text-slate-300 leading-relaxed italic">
                  &ldquo;{suggestionData.overview}&rdquo;
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Passos de Ligação Recomendados:</span>
                
                {suggestionData.steps.map((step, idx) => {
                  const isApplied = appliedStepIndices.has(idx);

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 bg-slate-950 rounded-lg border transition-all flex items-start justify-between gap-3 ${isApplied ? 'border-emerald-950 bg-slate-950/50' : 'border-slate-800'}`}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-bold">
                            Passo {idx + 1}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-800"
                            style={{ backgroundColor: step.color }}
                          ></span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {step.source} &rarr; {step.dest}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isApplied ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {step.instruction}
                        </p>
                      </div>

                      {/* Auto Apply Action Button */}
                      <button
                        onClick={() => handleApplyWireStep(step, idx)}
                        disabled={isApplied}
                        className={`p-1.5 rounded transition-colors shrink-0 cursor-pointer ${isApplied ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-indigo-400'}`}
                        title={isApplied ? 'Cabo aplicado na protoboard' : 'Aplicar cabo automaticamente'}
                      >
                        {isApplied ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Assistant Chatbot */}
      {activeTab === 'chat' && (
        <div className="flex flex-col gap-3 flex-1 h-[420px] lg:h-[calc(100vh-220px)]">
          {/* Scrollable Messages window */}
          <div className="flex-1 bg-slate-950/80 rounded-lg border border-slate-800 p-3 overflow-y-auto flex flex-col gap-3 max-h-[350px] lg:max-h-none">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col max-w-[85%] rounded-lg p-2.5 text-xs leading-relaxed ${msg.sender === 'user' ? 'self-end bg-indigo-600 text-white rounded-br-none' : 'self-start bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'}`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider block mb-0.5 text-slate-400/80">
                  {msg.sender === 'user' ? 'Você' : 'Mestre MB-102'}
                </span>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
            {isSendingMessage && (
              <div className="self-start bg-slate-900 text-slate-400 rounded-lg p-2.5 text-xs border border-slate-800 italic animate-pulse">
                Mestre está analisando seu circuito...
              </div>
            )}
          </div>

          {/* Message input form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: Como ligar o pino analógico do Microfone?"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isSendingMessage}
              className="flex-1 text-xs rounded bg-slate-950 border border-slate-800 text-slate-300 p-2.5 focus:ring-1 focus:ring-indigo-500 outline-hidden"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingMessage}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
