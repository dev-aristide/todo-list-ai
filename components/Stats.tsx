import React from 'react';
import { Todo, TaskStatus } from '../types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface StatsProps {
  todos: Todo[];
}

const Stats: React.FC<StatsProps> = ({ todos }) => {
  const total = todos.length;
  const completed = todos.filter(t => t.status === TaskStatus.DONE).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-800">{total}</span>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total</span>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-emerald-600">{completed}</span>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Terminées</span>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-50 opacity-50" style={{ width: `${progress}%`, transition: 'width 1s ease-in-out' }}></div>
        <span className="text-3xl font-bold text-indigo-600 z-10">{progress}%</span>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold z-10">Progression</span>
      </div>
    </div>
  );
};

export default Stats;