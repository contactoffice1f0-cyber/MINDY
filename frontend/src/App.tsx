import { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import { Memo, Task, memoApi, taskApi } from './api';

interface TaskDraft {
  taskName: string;
  dueDate: string;
  category: string;
}

const EMPTY_DRAFT: TaskDraft = { taskName: '', dueDate: '', category: '' };

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  }).format(parseISODate(value));
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ?? '9999-12-31';
    const bDue = b.dueDate ?? '9999-12-31';
    if (aDue !== bDue) {
      return aDue.localeCompare(bDue);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function App() {
  const todayISO = toISODate(new Date());
  const todayLabel = new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);

  const [newTaskName, setNewTaskName] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(EMPTY_DRAFT);

  const [memoDraft, setMemoDraft] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [memoEditDraft, setMemoEditDraft] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const activeTasks = useMemo(
    () => sortTasks(tasks.filter((task) => !task.isCompleted)),
    [tasks]
  );
  const completedTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.isCompleted)),
    [tasks]
  );
  const todayTasks = useMemo(
    () =>
      activeTasks.filter(
        (task) => task.dueDate !== null && task.dueDate <= todayISO
      ),
    [activeTasks, todayISO]
  );
  const categories = useMemo(() => {
    const values = new Set<string>();
    tasks.forEach((task) => {
      if (task.category) {
        values.add(task.category);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [tasks]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (value: string | null) =>
    normalizedQuery.length === 0 ||
    (value ?? '').toLowerCase().includes(normalizedQuery);

  const matchesTaskSearch = (task: Task) =>
    matchesSearch(task.taskName) || matchesSearch(task.category);

  const visibleTodayTasks = useMemo(
    () => todayTasks.filter(matchesTaskSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayTasks, normalizedQuery]
  );

  const visibleActiveTasks = useMemo(
    () =>
      activeTasks.filter((task) => {
        if (!matchesTaskSearch(task)) {
          return false;
        }
        if (categoryFilter === 'all') {
          return true;
        }
        if (categoryFilter === 'none') {
          return !task.category;
        }
        return task.category === categoryFilter;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTasks, categoryFilter, normalizedQuery]
  );

  const visibleCompletedTasks = useMemo(
    () => completedTasks.filter(matchesTaskSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedTasks, normalizedQuery]
  );

  const visibleMemos = useMemo(
    () => memos.filter((memo) => matchesSearch(memo.memoContent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memos, normalizedQuery]
  );

  const focusedTask =
    activeTasks.find((task) => task.id === focusedTaskId) ?? activeTasks[0];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskList, memoList] = await Promise.all([
        taskApi.list(),
        memoApi.list(),
      ]);
      setTasks(taskList);
      setMemos(memoList);
    } catch {
      setError(
        'サーバーに接続できませんでした。バックエンドが起動しているか確認してください。'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!celebrating) {
      return;
    }
    const timer = window.setTimeout(() => setCelebrating(false), 1800);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  useEffect(() => {
    setEditingTask(false);
  }, [focusedTask?.id]);

  const handleAddTask = async (event: FormEvent) => {
    event.preventDefault();
    const names = newTaskName
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0 || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await Promise.all(
        names.map((name) =>
          taskApi.create({
            taskName: name,
            dueDate: newDueDate || null,
            category: newCategory.trim() || null,
          })
        )
      );
      setTasks((current) => [...current, ...created]);
      setNewTaskName('');
      setNewDueDate('');
      setNewCategory('');
      setFocusedTaskId(created[0].id);
    } catch {
      setError('タスクを追加できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!focusedTask || saving) {
      return;
    }
    const taskName = taskDraft.taskName.trim();
    if (!taskName) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await taskApi.update({
        ...focusedTask,
        taskName,
        dueDate: taskDraft.dueDate || null,
        category: taskDraft.category.trim() || null,
      });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingTask(false);
    } catch {
      setError('タスクを更新できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    setError(null);
    try {
      const updated = await taskApi.update({
        ...task,
        isCompleted: !task.isCompleted,
      });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      if (!updated.isCompleted) {
        setFocusedTaskId(updated.id);
      } else if (task.id === focusedTask?.id) {
        setFocusedTaskId(null);
        setCelebrating(true);
      }
    } catch {
      setError('タスクを更新できませんでした。もう一度お試しください。');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`「${task.taskName}」を削除しますか？`)) {
      return;
    }
    setError(null);
    try {
      await taskApi.remove(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (task.id === focusedTaskId) {
        setFocusedTaskId(null);
      }
    } catch {
      setError('タスクを削除できませんでした。もう一度お試しください。');
    }
  };

  const startEditingTask = (task: Task) => {
    setTaskDraft({
      taskName: task.taskName,
      dueDate: task.dueDate ?? '',
      category: task.category ?? '',
    });
    setEditingTask(true);
  };

  const handleAddMemo = async (event: FormEvent) => {
    event.preventDefault();
    const memoContent = memoDraft.trim();
    if (!memoContent || saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await memoApi.create(memoContent);
      setMemos((current) => [created, ...current]);
      setMemoDraft('');
    } catch {
      setError('メモを保存できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const startEditingMemo = (memo: Memo) => {
    setEditingMemoId(memo.id);
    setMemoEditDraft(memo.memoContent);
  };

  const handleSaveMemo = async (event: FormEvent) => {
    event.preventDefault();
    if (editingMemoId === null || saving) {
      return;
    }
    const memoContent = memoEditDraft.trim();
    if (!memoContent) {
      return;
    }
    const memo = memos.find((item) => item.id === editingMemoId);
    if (!memo) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await memoApi.update({ ...memo, memoContent });
      setMemos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingMemoId(null);
    } catch {
      setError('メモを更新できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemo = async (memo: Memo) => {
    setError(null);
    try {
      await memoApi.remove(memo.id);
      setMemos((current) => current.filter((item) => item.id !== memo.id));
      if (editingMemoId === memo.id) {
        setEditingMemoId(null);
      }
    } catch {
      setError('メモを削除できませんでした。もう一度お試しください。');
    }
  };

  const dueLabel = (task: Task): string | null => {
    if (!task.dueDate) {
      return null;
    }
    if (task.dueDate < todayISO) {
      return `期限切れ・${formatDate(task.dueDate)}`;
    }
    if (task.dueDate === todayISO) {
      return '今日まで';
    }
    return `${formatDate(task.dueDate)}まで`;
  };

  return (
    <div className="app">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="app-header">
        <div>
          <p className="eyebrow">{todayLabel}</p>
          <h1>MINDY</h1>
          <p className="tagline">今、これだけやれば大丈夫。</p>
        </div>
        <div className="header-status">
          <div className="status-pill" aria-live="polite">
            <span className="status-dot" />
            {activeTasks.length === 0
              ? 'タスクは空です'
              : `残り ${activeTasks.length} 件`}
          </div>
          <div className="status-pill today-status">
            <span className="status-dot today-dot" />
            今日 {todayTasks.length} 件
          </div>
        </div>
      </header>

      <div className="search-bar" role="search">
        <label htmlFor="search" className="visually-hidden">
          タスク・メモを検索
        </label>
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id="search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="タスク・メモを検索（例：請求書）"
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search"
            onClick={() => setSearchQuery('')}
          >
            クリア
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>
            再読み込み
          </button>
        </div>
      )}

      <main className="layout">
        <section className="focus-area" aria-labelledby="focus-heading">
          <h2 id="focus-heading" className="section-label">
            いま、これだけ
          </h2>

          {loading ? (
            <div className="focus-card skeleton" aria-label="読み込み中">
              <span />
              <span />
            </div>
          ) : focusedTask ? (
            <article className={`focus-card${celebrating ? ' is-celebrating' : ''}`}>
              <div className="focus-card-top">
                <span className="focus-kicker">ONE TASK</span>
                <span className="focus-count">
                  {activeTasks.length > 1
                    ? `ほかに ${activeTasks.length - 1} 件`
                    : 'これで最後'}
                </span>
              </div>

              {editingTask ? (
                <form className="focus-edit" onSubmit={handleSaveTask}>
                  <label htmlFor="focus-title-input" className="visually-hidden">
                    タスク名
                  </label>
                  <input
                    id="focus-title-input"
                    value={taskDraft.taskName}
                    onChange={(event) =>
                      setTaskDraft((current) => ({
                        ...current,
                        taskName: event.target.value,
                      }))
                    }
                    maxLength={200}
                    autoFocus
                  />
                  <div className="edit-fields">
                    <label>
                      期限
                      <input
                        type="date"
                        value={taskDraft.dueDate}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      カテゴリ
                      <input
                        value={taskDraft.category}
                        onChange={(event) =>
                          setTaskDraft((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        maxLength={100}
                        list="category-options"
                        placeholder="未分類"
                      />
                    </label>
                  </div>
                  <div className="focus-actions">
                    <button
                      type="submit"
                      className="complete-button"
                      disabled={saving || !taskDraft.taskName.trim()}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setEditingTask(false)}
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="focus-title">{focusedTask.taskName}</p>
                  <div className="focus-meta">
                    {focusedTask.category && (
                      <span className="chip category-chip">
                        {focusedTask.category}
                      </span>
                    )}
                    {dueLabel(focusedTask) && (
                      <span
                        className={`chip due-chip${
                          focusedTask.dueDate &&
                          focusedTask.dueDate <= todayISO
                            ? ' is-today'
                            : ''
                        }`}
                      >
                        {dueLabel(focusedTask)}
                      </span>
                    )}
                  </div>
                  <div className="focus-actions">
                    <button
                      type="button"
                      className="complete-button"
                      onClick={() => void handleToggleTask(focusedTask)}
                    >
                      できた！
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => startEditingTask(focusedTask)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => void handleDeleteTask(focusedTask)}
                    >
                      削除
                    </button>
                  </div>
                </>
              )}
            </article>
          ) : (
            <div className="focus-card empty-card">
              <p className="empty-emoji" aria-hidden="true">
                ☕
              </p>
              <p className="empty-title">今日はここまで。</p>
              <p className="empty-copy">
                新しいタスクを1つ追加するか、ゆっくり休みましょう。
              </p>
            </div>
          )}

          {celebrating && (
            <p className="celebration" role="status">
              おつかれさま！ひとつ前に進みました。
            </p>
          )}

          <form className="add-task" onSubmit={handleAddTask}>
            <label htmlFor="new-task">タスクを追加（1行に1つ）</label>
            <textarea
              id="new-task"
              value={newTaskName}
              onChange={(event) => setNewTaskName(event.target.value)}
              placeholder={'例：メールを1通返す\n例：請求書を確認する'}
              rows={2}
              maxLength={2000}
            />
            <div className="add-task-options">
              <label className="inline-field">
                期限
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                />
              </label>
              <label className="inline-field">
                カテゴリ
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  maxLength={100}
                  list="category-options"
                  placeholder="仕事・家事など"
                />
              </label>
              <button type="submit" disabled={saving || !newTaskName.trim()}>
                追加
              </button>
            </div>
            <datalist id="category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </form>

          <section className="task-section" aria-labelledby="today-heading">
            <div className="task-section-heading">
              <h2 id="today-heading" className="section-label">
                今日やること
              </h2>
              <span className="section-hint">
                {visibleTodayTasks.length === 0
                  ? normalizedQuery
                    ? '一致するタスクはありません'
                    : '今日が期限のタスクはありません'
                  : `${visibleTodayTasks.length} 件`}
              </span>
            </div>
            {visibleTodayTasks.length > 0 && (
              <ul className="task-list">
                {visibleTodayTasks.map((task) => (
                  <li
                    key={task.id}
                    className={task.id === focusedTask?.id ? 'is-focused' : ''}
                  >
                    <button
                      type="button"
                      className="task-check"
                      aria-label={`${task.taskName} を完了する`}
                      onClick={() => void handleToggleTask(task)}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="task-select"
                      onClick={() => setFocusedTaskId(task.id)}
                    >
                      <span className="task-name">{task.taskName}</span>
                      <span className="task-meta">
                        {task.category && (
                          <span className="chip category-chip">
                            {task.category}
                          </span>
                        )}
                        {dueLabel(task) && (
                          <span
                            className={`chip due-chip${
                              task.dueDate && task.dueDate <= todayISO
                                ? ' is-today'
                                : ''
                            }`}
                          >
                            {dueLabel(task)}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`${task.taskName} を削除する`}
                      onClick={() => void handleDeleteTask(task)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="task-section" aria-labelledby="pool-heading">
            <div className="task-section-heading">
              <h2 id="pool-heading" className="section-label">
                残っているタスク
              </h2>
              <label className="filter-field">
                カテゴリ
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">すべて</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="none">未分類</option>
                </select>
              </label>
            </div>

            {visibleActiveTasks.length === 0 ? (
              <p className="muted">
                {activeTasks.length === 0
                  ? '残っているタスクはありません。'
                  : 'このカテゴリのタスクはありません。'}
              </p>
            ) : (
              <ul className="task-list">
                {visibleActiveTasks.map((task) => (
                  <li
                    key={task.id}
                    className={task.id === focusedTask?.id ? 'is-focused' : ''}
                  >
                    <button
                      type="button"
                      className="task-check"
                      aria-label={`${task.taskName} を完了する`}
                      onClick={() => void handleToggleTask(task)}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="task-select"
                      onClick={() => setFocusedTaskId(task.id)}
                    >
                      <span className="task-name">{task.taskName}</span>
                      <span className="task-meta">
                        {task.category && (
                          <span className="chip category-chip">
                            {task.category}
                          </span>
                        )}
                        {dueLabel(task) && (
                          <span
                            className={`chip due-chip${
                              task.dueDate && task.dueDate <= todayISO
                                ? ' is-today'
                                : ''
                            }`}
                          >
                            {dueLabel(task)}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`${task.taskName} を削除する`}
                      onClick={() => void handleDeleteTask(task)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {visibleCompletedTasks.length > 0 && (
            <details className="task-pool completed-pool">
              <summary>完了したタスク（{visibleCompletedTasks.length}）</summary>
              <ul>
                {visibleCompletedTasks.map((task) => (
                  <li key={task.id}>
                    <span className="completed-title">{task.taskName}</span>
                    <div className="task-row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`${task.taskName} を未完了に戻す`}
                        onClick={() => void handleToggleTask(task)}
                      >
                        ↺
                      </button>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={`${task.taskName} を削除する`}
                        onClick={() => void handleDeleteTask(task)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="dump-area" aria-labelledby="dump-heading">
          <div className="dump-heading-row">
            <h2 id="dump-heading" className="section-label">
              ブレインダンプ
            </h2>
            <span className="section-hint">考えずに、そのまま出す</span>
          </div>

          <form className="memo-form" onSubmit={handleAddMemo}>
            <label htmlFor="memo" className="visually-hidden">
              メモ
            </label>
            <textarea
              id="memo"
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              placeholder="気になっていること、忘れたくないこと…"
              rows={5}
              maxLength={2000}
            />
            <button type="submit" disabled={saving || !memoDraft.trim()}>
              メモに残す
            </button>
          </form>

          <div className="memo-list" aria-live="polite">
            {loading ? (
              <p className="muted">読み込み中…</p>
            ) : memos.length === 0 ? (
              <p className="muted">
                ここに書き出したメモが並びます。頭の中を空っぽにしましょう。
              </p>
            ) : visibleMemos.length === 0 ? (
              <p className="muted">検索に一致するメモはありません。</p>
            ) : (
              visibleMemos.map((memo) => (
                <article className="memo" key={memo.id}>
                  {editingMemoId === memo.id ? (
                    <form className="memo-edit" onSubmit={handleSaveMemo}>
                      <label htmlFor={`memo-edit-${memo.id}`} className="visually-hidden">
                        メモを編集
                      </label>
                      <textarea
                        id={`memo-edit-${memo.id}`}
                        value={memoEditDraft}
                        onChange={(event) => setMemoEditDraft(event.target.value)}
                        rows={4}
                        maxLength={2000}
                        autoFocus
                      />
                      <div className="memo-edit-actions">
                        <button
                          type="submit"
                          className="small-button"
                          disabled={saving || !memoEditDraft.trim()}
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          className="memo-delete"
                          onClick={() => setEditingMemoId(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>{memo.memoContent}</p>
                      <div className="memo-footer">
                        <time dateTime={memo.createdAt}>
                          {new Intl.DateTimeFormat('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(memo.createdAt))}
                        </time>
                        <div className="memo-actions">
                          <button
                            type="button"
                            className="memo-delete"
                            onClick={() => startEditingMemo(memo)}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="memo-delete"
                            onClick={() => void handleDeleteMemo(memo)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>MINDY — ひとつずつ、軽く。</span>
      </footer>
    </div>
  );
}

export default App;
