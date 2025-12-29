import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Filter, BrainCircuit, Search, Menu, Sparkles, Loader2, Bell, BellRing } from 'lucide-react';
import MagicInput from './components/MagicInput';
import TodoItem from './components/TodoItem';
import Stats from './components/Stats';
import { Todo, TaskStatus, Priority } from './types';
import { getSmartAdvice, prioritizeTasks } from './services/geminiService';

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('supertask-todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  // Sorting state
  const [sortMode, setSortMode] = useState<'default' | 'smart'>('default');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    Notification.permission
  );

  useEffect(() => {
    localStorage.setItem('supertask-todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    // Only fetch advice if we have todos and haven't fetched in a while (mocked by session for now)
    if (todos.length > 0 && !aiAdvice) {
        const fetchAdvice = async () => {
            const advice = await getSmartAdvice(todos.filter(t => t.status !== TaskStatus.DONE));
            setAiAdvice(advice);
        }
        fetchAdvice();
    }
  }, [todos.length]);

  // Reminder Logic
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkReminders = () => {
      const now = new Date();
      let updatesNeeded = false;
      
      const updatedTodos = todos.map(todo => {
        if (
          todo.status !== TaskStatus.DONE && 
          todo.dueDate && 
          !todo.notified
        ) {
          const dueDate = new Date(todo.dueDate);
          // Notify if due date is passed or is today
          // Simple logic: if now >= dueDate (at start of day) or specifically checks time if we had time.
          // Since dueDate is usually YYYY-MM-DD, let's treat it as due at 9 AM of that day or immediately if passed.
          // For this demo, let's say if the date string matches today or is in the past.
          
          const todayStr = now.toISOString().split('T')[0];
          const isDue = todo.dueDate <= todayStr;

          if (isDue) {
            new Notification(`Rappel: ${todo.title}`, {
              body: `Cette tâche est prévue pour ${new Date(todo.dueDate).toLocaleDateString('fr-FR')}.`,
              icon: '/vite.svg' // Fallback icon or remove
            });
            updatesNeeded = true;
            return { ...todo, notified: true };
          }
        }
        return todo;
      });

      if (updatesNeeded) {
        setTodos(updatedTodos);
      }
    };

    // Check immediately then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [todos, notificationPermission]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("Ce navigateur ne supporte pas les notifications de bureau.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const handleAddTodo = (newTodo: Todo) => {
    setTodos([newTodo, ...todos]);
  };

  const handleUpdateTodo = (updatedTodo: Todo) => {
    setTodos(todos.map(t => (t.id === updatedTodo.id ? updatedTodo : t)));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const handleSmartPrioritize = async () => {
    const activeTodos = todos.filter(t => t.status !== TaskStatus.DONE);
    if (activeTodos.length < 2) return;

    setIsOptimizing(true);
    try {
        const sortedIds = await prioritizeTasks(activeTodos);
        
        // Update todos with new aiOrder
        const newTodos = todos.map(t => {
            const index = sortedIds.indexOf(t.id);
            if (index !== -1) {
                return { ...t, aiOrder: index };
            }
            // For tasks not returned (e.g. done tasks or errors), put them at the end
            return { ...t, aiOrder: 9999 };
        });
        
        setTodos(newTodos);
        setSortMode('smart');
    } catch (e) {
        console.error("Prioritization failed", e);
    } finally {
        setIsOptimizing(false);
    }
  };

  const filteredTodos = todos
    .filter(t => {
      if (filter === 'active') return t.status !== TaskStatus.DONE;
      if (filter === 'completed') return t.status === TaskStatus.DONE;
      return true;
    })
    .filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
        // Sort by completion status first (done at bottom)
        if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
        if (a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE) return -1;

        // Smart sort mode
        if (sortMode === 'smart') {
            const orderA = a.aiOrder ?? 9999;
            const orderB = b.aiOrder ?? 9999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
        }

        // Default: Priority then Date
        const pOrder = { [Priority.CRITICAL]: 0, [Priority.HIGH]: 1, [Priority.MEDIUM]: 2, [Priority.LOW]: 3 };
        const pDiff = pOrder[a.priority] - pOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        
        // Fallback to creation date (newest first)
        return b.createdAt - a.createdAt;
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">SuperTask AI</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
            <button 
                onClick={() => setFilter('all')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <LayoutDashboard className="w-4 h-4" />
                Vue d'ensemble
            </button>
            <button 
                onClick={() => setFilter('active')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <Filter className="w-4 h-4" />
                À faire
            </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
            <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
                <h4 className="font-bold text-sm mb-1">Conseil IA du jour</h4>
                <p className="text-xs text-indigo-100 leading-relaxed">
                    {aiAdvice || "Analyse de vos habitudes de travail en cours..."}
                </p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    <BrainCircuit className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">SuperTask AI</h1>
            </div>
            <button className="p-2 text-slate-600"><Menu className="w-6 h-6" /></button>
        </div>

        {/* Header Section */}
        <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Bonjour, Productif.</h2>
            <p className="text-slate-500">Organisez votre journée avec l'intelligence artificielle.</p>
        </div>

        {/* Input Area */}
        <MagicInput onAddTodo={handleAddTodo} />

        {/* Stats */}
        <Stats todos={todos} />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
             <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
             </div>
             
             <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {notificationPermission === 'default' && (
                    <button
                        onClick={requestNotificationPermission}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors"
                        title="Activer les rappels"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">Rappels</span>
                    </button>
                )}
                
                {notificationPermission === 'granted' && (
                     <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100" title="Rappels actifs">
                        <BellRing className="w-4 h-4" />
                     </div>
                )}

                <button
                    onClick={handleSmartPrioritize}
                    disabled={isOptimizing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                        sortMode === 'smart' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 border border-transparent' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    {isOptimizing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    {sortMode === 'smart' ? 'Priorisé par IA' : 'Optimiser ma journée'}
                </button>

                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => {
                            setFilter('all');
                            setSortMode('default');
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tout
                    </button>
                    <button 
                        onClick={() => setFilter('active')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'active' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Actif
                    </button>
                    <button 
                        onClick={() => setFilter('completed')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'completed' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Terminé
                    </button>
                </div>
             </div>
        </div>

        {/* List */}
        <div className="space-y-4">
            {filteredTodos.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LayoutDashboard className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">Aucune tâche trouvée</p>
                    <p className="text-sm text-slate-400">Utilisez la barre magique ci-dessus pour ajouter quelque chose.</p>
                </div>
            ) : (
                filteredTodos.map((todo, index) => (
                    <div key={todo.id} className="relative">
                        {sortMode === 'smart' && filter === 'active' && (
                            <div className="absolute -left-3 top-6 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                                <span className="text-xs font-bold text-indigo-300">#{index + 1}</span>
                            </div>
                        )}
                        <TodoItem 
                            todo={todo} 
                            onUpdate={handleUpdateTodo} 
                            onDelete={handleDeleteTodo} 
                        />
                    </div>
                ))
            )}
        </div>
      </main>
    </div>
  );
};

export default App;