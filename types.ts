export enum Priority {
  LOW = 'Basse',
  MEDIUM = 'Moyenne',
  HIGH = 'Haute',
  CRITICAL = 'Critique'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  tags: string[];
  createdAt: number;
  dueDate?: string; // ISO string
  subtasks: Subtask[];
  aiAnalysis?: string; // Quick tip or motivation from AI
  aiOrder?: number; // Order suggested by AI
  notified?: boolean; // Has the reminder been sent?
}

export interface AIParseResult {
  title: string;
  description: string;
  priority: string;
  category: string;
  tags: string[];
  dueDate: string | null;
}