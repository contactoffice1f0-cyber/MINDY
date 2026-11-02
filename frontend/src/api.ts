export interface Task {
  id: number;
  taskName: string;
  dueDate: string | null;
  category: string | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface Memo {
  id: number;
  memoContent: string;
  createdAt: string;
}

export interface TaskInput {
  taskName: string;
  dueDate: string | null;
  category: string | null;
}

interface TaskDto {
  id: number;
  task_name: string;
  due_date: string | null;
  category: string | null;
  is_completed: boolean;
  created_at: string;
}

interface MemoDto {
  id: number;
  memo_content: string;
  created_at: string;
}

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `API request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function toTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    taskName: dto.task_name,
    dueDate: dto.due_date,
    category: dto.category,
    isCompleted: dto.is_completed,
    createdAt: dto.created_at,
  };
}

function toMemo(dto: MemoDto): Memo {
  return {
    id: dto.id,
    memoContent: dto.memo_content,
    createdAt: dto.created_at,
  };
}

function toTaskPayload(task: Task) {
  return {
    task_name: task.taskName,
    due_date: task.dueDate,
    category: task.category,
    is_completed: task.isCompleted,
  };
}

export const taskApi = {
  list: async (): Promise<Task[]> => {
    const dtos = await request<TaskDto[]>('/tasks');
    return dtos.map(toTask);
  },
  create: async (input: TaskInput): Promise<Task> => {
    const dto = await request<TaskDto>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        task_name: input.taskName,
        due_date: input.dueDate,
        category: input.category,
      }),
    });
    return toTask(dto);
  },
  update: async (task: Task): Promise<Task> => {
    const dto = await request<TaskDto>(`/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify(toTaskPayload(task)),
    });
    return toTask(dto);
  },
  remove: async (id: number): Promise<void> => {
    await request<unknown>(`/tasks/${id}`, { method: 'DELETE' });
  },
};

export const memoApi = {
  list: async (): Promise<Memo[]> => {
    const dtos = await request<MemoDto[]>('/memos');
    return dtos.map(toMemo);
  },
  create: async (memoContent: string): Promise<Memo> => {
    const dto = await request<MemoDto>('/memos', {
      method: 'POST',
      body: JSON.stringify({ memo_content: memoContent }),
    });
    return toMemo(dto);
  },
  update: async (memo: Memo): Promise<Memo> => {
    const dto = await request<MemoDto>(`/memos/${memo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ memo_content: memo.memoContent }),
    });
    return toMemo(dto);
  },
  remove: async (id: number): Promise<void> => {
    await request<unknown>(`/memos/${id}`, { method: 'DELETE' });
  },
};
