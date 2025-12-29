import React, { useState } from 'react';
import { Check, Trash2, Calendar, Tag, ChevronDown, ChevronUp, Zap, Clock, AlertCircle, Circle } from 'lucide-react';
import { Todo, Priority, TaskStatus, Subtask } from '../types';
import { generateSubtasks } from '../services/geminiService';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (updatedTodo: Todo) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  const toggleStatus = () => {
    const newStatus = todo.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    onUpdate({ ...todo, status: newStatus });
  };

  const handleGenerateSubtasks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.subtasks.length > 0) {
      setExpanded(!expanded);
      return;
    }

    setIsGeneratingSubtasks(true);
    setExpanded(true);
    try {
      const generated = await generateSubtasks(todo.title, todo.description);
      const newSubtasks: Subtask[] = generated.map(text => ({
        id: crypto.randomUUID(),
        title: text,
        completed: false
      }));
      onUpdate({ ...todo, subtasks: newSubtasks });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = todo.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdate({ ...todo, subtasks: updatedSubtasks });
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      case Priority.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case Priority.MEDIUM: return 'text-blue-600 bg-blue-50 border-blue-200';
      case Priority.LOW: return 'text-slate-500 bg-slate-100 border-slate-200';
      default: return 'text-slate-500 bg-slate-100 border-slate-200';
    }
  };

  const completedSubtasks = todo.subtasks.filter(t => t.completed).length;
  const totalSubtasks = todo.subtasks.length;
  const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div className={`group mb-4 bg-white rounded-xl border transition-all duration-300 ${todo.status === TaskStatus.DONE ? 'opacity-60 border-slate-100' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100'}`}>
      
      {/* Main Card Content */}
      <div className="p-5 flex items-start gap-4">
        
        {/* Checkbox */}
        <button 
          onClick={toggleStatus}
          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
            todo.status === TaskStatus.DONE 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-slate-300 hover:border-indigo-500 text-transparent'
          }`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </button>

        {/* Text Content */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-lg font-medium truncate ${todo.status === TaskStatus.DONE ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {todo.title}
            </h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}>
              {todo.priority}
            </span>
          </div>
          
          {todo.description && (
            <p className="text-slate-500 text-sm mb-3 line-clamp-2">{todo.description}</p>
          )}

          {totalSubtasks > 0 && (
            <div className="mb-3 w-full max-w-[200px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium text-slate-400">Progression</span>
                <span className="text-[10px] font-medium text-slate-500">{completedSubtasks}/{totalSubtasks}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                <Tag className="w-3 h-3" />
                <span>{todo.category}</span>
            </div>
            {todo.dueDate && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${new Date(todo.dueDate) < new Date() && todo.status !== TaskStatus.DONE ? 'text-red-500 bg-red-50' : 'bg-slate-50'}`}>
                <Calendar className="w-3 h-3" />
                <span>{new Date(todo.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
            {todo.tags.map(tag => (
                <span key={tag} className="text-indigo-400">#{tag}</span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={handleGenerateSubtasks}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                title="Générer des sous-tâches avec l'IA"
            >
                <Zap className={`w-4 h-4 ${isGeneratingSubtasks ? 'animate-pulse' : ''}`} />
                {todo.subtasks.length === 0 && <span className="text-xs font-medium">Décomposer</span>}
            </button>
            <button 
                onClick={() => onDelete(todo.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Subtasks Section */}
      {(expanded || isGeneratingSubtasks) && (
        <div className="px-5 pb-5 pl-14 animate-fadeIn">
            <div className="h-px bg-slate-100 mb-4 w-full"></div>
            
            {isGeneratingSubtasks && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 mb-2">
                    <span className="animate-spin">✦</span>
                    L'IA analyse et décompose votre tâche...
                </div>
            )}

            {!isGeneratingSubtasks && todo.subtasks.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sous-tâches</p>
                    {todo.subtasks.map(st => (
                        <div key={st.id} className="flex items-center gap-3 group/sub">
                            <button 
                                onClick={() => toggleSubtask(st.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    st.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 hover:border-indigo-400'
                                }`}
                            >
                                {st.completed && <Check className="w-3 h-3" />}
                            </button>
                            <span className={`text-sm ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {st.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            
            {!isGeneratingSubtasks && todo.subtasks.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                    Aucune sous-tâche. Cliquez sur l'éclair pour en générer.
                </p>
            )}
        </div>
      )}
    </div>
  );
};

export default TodoItem;