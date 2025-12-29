import React, { useState } from 'react';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';
import { parseTodoWithAI } from '../services/geminiService';
import { Todo, TaskStatus, Priority } from '../types';
import { v4 as uuidv4 } from 'uuid'; // We'll just generate random IDs manually if no library, but let's assume simple unique ID generation for this env.

interface MagicInputProps {
  onAddTodo: (todo: Todo) => void;
}

const MagicInput: React.FC<MagicInputProps> = ({ onAddTodo }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const result = await parseTodoWithAI(input);
      
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        title: result.title,
        description: result.description,
        status: TaskStatus.TODO,
        priority: result.priority as Priority,
        category: result.category,
        tags: result.tags,
        createdAt: Date.now(),
        dueDate: result.dueDate || undefined,
        subtasks: [],
      };

      onAddTodo(newTodo);
      setInput('');
    } catch (error) {
      console.error("Failed to add smart todo", error);
      // Fallback manual add could go here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-8 group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
      <form onSubmit={handleSubmit} className="relative bg-white rounded-xl shadow-xl flex items-center p-2 border border-slate-100">
        <div className="pl-4 pr-2 text-indigo-500">
            {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <Sparkles className="w-6 h-6" />
            )}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Préparer le rapport Q3 pour le directeur avant vendredi en urgence..."
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-lg py-3 px-2"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className={`p-3 rounded-lg transition-all duration-200 ${
            input.trim() && !isProcessing
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transform hover:scale-105'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </form>
      <div className="absolute top-full left-0 w-full text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs text-slate-500 bg-white/80 backdrop-blur px-2 py-1 rounded-full shadow-sm">
          L'IA détecte automatiquement titre, priorité, date et tags
        </span>
      </div>
    </div>
  );
};

export default MagicInput;