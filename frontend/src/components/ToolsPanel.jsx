import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Code, 
  FolderSearch, 
  CheckSquare, 
  Clock, 
  Play, 
  Trash2, 
  Plus, 
  Pause, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  listTasks, 
  createTask, 
  updateTask, 
  deleteTask,
  listCronJobs,
  createCronJob,
  pauseCronJob,
  resumeCronJob,
  deleteCronJob,
  runBash,
  runCode,
  searchFiles
} from '../services/api';

export default function ToolsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('tasks');

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // Cron state
  const [cronJobs, setCronJobs] = useState([]);
  const [cronName, setCronName] = useState('');
  const [cronExpr, setCronExpr] = useState('*/5 * * * *');
  const [cronType, setCronType] = useState('bash');
  const [cronData, setCronData] = useState('{"command":"uptime"}');

  // Bash tool state
  const [bashCmd, setBashCmd] = useState('ls -la');
  const [bashOutput, setBashOutput] = useState(null);
  const [bashLoading, setBashLoading] = useState(false);

  // Code runner state
  const [jsCode, setJsCode] = useState('console.log("Hello from Marnie sandbox!");\nconsole.log("Math:", Math.sqrt(144));');
  const [jsOutput, setJsOutput] = useState(null);
  const [jsLoading, setJsLoading] = useState(false);

  // Filesystem search state
  const [searchDir, setSearchDir] = useState('.');
  const [searchPattern, setSearchPattern] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'tasks') fetchTasks();
      if (activeTab === 'cron') fetchCron();
    }
  }, [isOpen, activeTab]);

  const fetchTasks = async () => {
    try {
      const data = await listTasks();
      setTasks(data);
    } catch (err) {
      console.warn('Failed to fetch tasks:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({ title: newTaskTitle.trim(), priority: newTaskPriority });
      setNewTaskTitle('');
      fetchTasks();
    } catch (err) {
      alert(`Error creating task: ${err.message}`);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      await updateTask(task.id, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      alert(`Error updating task: ${err.message}`);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      fetchTasks();
    } catch (err) {
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const fetchCron = async () => {
    try {
      const data = await listCronJobs();
      setCronJobs(data);
    } catch (err) {
      console.warn('Failed to fetch cron jobs:', err);
    }
  };

  const handleCreateCron = async (e) => {
    e.preventDefault();
    if (!cronName.trim() || !cronExpr.trim()) return;
    try {
      let parsedData = {};
      try {
        parsedData = JSON.parse(cronData);
      } catch {
        alert('Invalid JSON in action data');
        return;
      }
      await createCronJob({
        name: cronName.trim(),
        expression: cronExpr.trim(),
        action_type: cronType,
        action_data: parsedData,
      });
      setCronName('');
      fetchCron();
    } catch (err) {
      alert(`Error creating scheduled job: ${err.message}`);
    }
  };

  const handleToggleCron = async (job) => {
    try {
      if (job.enabled) {
        await pauseCronJob(job.id);
      } else {
        await resumeCronJob(job.id);
      }
      fetchCron();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteCron = async (id) => {
    try {
      await deleteCronJob(id);
      fetchCron();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRunBash = async () => {
    if (!bashCmd.trim()) return;
    setBashLoading(true);
    setBashOutput(null);
    try {
      const res = await runBash(bashCmd.trim());
      setBashOutput(res);
    } catch (err) {
      setBashOutput({ stdout: '', stderr: err.message, exitCode: -1 });
    } finally {
      setBashLoading(false);
    }
  };

  const handleRunJS = async () => {
    if (!jsCode.trim()) return;
    setJsLoading(true);
    setJsOutput(null);
    try {
      const res = await runCode(jsCode.trim());
      setJsOutput(res);
    } catch (err) {
      setJsOutput({ stdout: '', stderr: err.message, exitCode: -1 });
    } finally {
      setJsLoading(false);
    }
  };

  const handleSearchFiles = async () => {
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const res = await searchFiles(searchDir || '.', searchPattern);
      setSearchResults(res);
    } catch (err) {
      setSearchResults({ matches: [], error: err.message });
    } finally {
      setSearchLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '760px',
          maxWidth: '92vw',
          height: '82vh',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              System Tools & Workspace Inspector
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Direct inspection for SQLite tasks, background scheduled jobs, terminal execution, and sandboxes.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0 1rem',
          gap: '0.5rem',
        }}>
          {[
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'cron', label: 'Scheduled Jobs', icon: Clock },
            { id: 'bash', label: 'Bash Terminal', icon: Terminal },
            { id: 'code', label: 'Code Sandbox', icon: Code },
            { id: 'filesystem', label: 'File Search', icon: FolderSearch },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.7rem 0.85rem',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
                  borderBottom: isActive ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.88rem',
                  }}
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.84rem',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 1rem',
                    backgroundColor: 'var(--accent-terracotta)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  <Plus size={15} /> Add
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    No tasks saved in SQLite database.
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleTaskStatus(task)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent-terracotta)' }}
                          />
                          <span style={{
                            fontSize: '0.88rem',
                            textDecoration: isDone ? 'line-through' : 'none',
                            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                          }}>
                            {task.title}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: task.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                            color: task.priority === 'high' ? '#DC2626' : 'var(--text-secondary)',
                            fontWeight: 500,
                          }}>
                            {task.priority}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* CRON JOBS */}
          {activeTab === 'cron' && (
            <div>
              <form onSubmit={handleCreateCron} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Job Name (e.g. Health Check)"
                    value={cronName}
                    onChange={(e) => setCronName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-card)',
                      fontSize: '0.85rem',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Cron Exp (*/5 * * * *)"
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    style={{
                      width: '150px',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-card)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <select
                    value={cronType}
                    onChange={(e) => setCronType(e.target.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-card)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="bash">Bash</option>
                    <option value="discord">Discord</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder='Action Data JSON e.g. {"command":"date"}'
                    value={cronData}
                    onChange={(e) => setCronData(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-card)',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1rem',
                      backgroundColor: 'var(--accent-terracotta)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                    }}
                  >
                    Schedule Job
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cronJobs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    No recurring scheduled jobs scheduled.
                  </div>
                ) : (
                  cronJobs.map((job) => (
                    <div
                      key={job.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{job.name}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: job.enabled ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-tertiary)',
                            color: job.enabled ? '#15803D' : 'var(--text-muted)',
                            fontWeight: 500,
                          }}>
                            {job.enabled ? 'Active' : 'Paused'}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)',
                          }}>
                            {job.expression}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                          [{job.action_type}] {job.action_data}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleToggleCron(job)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.78rem',
                          }}
                        >
                          {job.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => handleDeleteCron(job.id)}
                          style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BASH */}
          {activeTab === 'bash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={bashCmd}
                  onChange={(e) => setBashCmd(e.target.value)}
                  placeholder="Shell command (e.g. df -h, uname -a, ls)"
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRunBash(); }}
                />
                <button
                  onClick={handleRunBash}
                  disabled={bashLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1rem',
                    backgroundColor: 'var(--accent-terracotta)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  <Play size={14} />
                  <span>{bashLoading ? 'Running...' : 'Execute'}</span>
                </button>
              </div>

              {bashOutput && (
                <div style={{
                  backgroundColor: '#181715',
                  color: '#ECE7DF',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {bashOutput.stdout && <div>{bashOutput.stdout}</div>}
                  {bashOutput.stderr && <div style={{ color: '#F87171' }}>{bashOutput.stderr}</div>}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#888' }}>
                    Process Exit Code: {bashOutput.exitCode}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CODE RUNNER */}
          {activeTab === 'code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea
                value={jsCode}
                onChange={(e) => setJsCode(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleRunJS}
                  disabled={jsLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'var(--accent-terracotta)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  <Play size={14} />
                  <span>{jsLoading ? 'Executing Sandbox...' : 'Run JS Sandbox'}</span>
                </button>
              </div>

              {jsOutput && (
                <div style={{
                  backgroundColor: '#181715',
                  color: '#ECE7DF',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}>
                  {jsOutput.stdout && <div>{jsOutput.stdout}</div>}
                  {jsOutput.stderr && <div style={{ color: '#F87171' }}>{jsOutput.stderr}</div>}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#888' }}>
                    Exit code: {jsOutput.exitCode}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FILESYSTEM SEARCH */}
          {activeTab === 'filesystem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Root Directory (e.g. . or ./workspace)"
                  value={searchDir}
                  onChange={(e) => setSearchDir(e.target.value)}
                  style={{
                    width: '40%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.85rem',
                  }}
                />
                <input
                  type="text"
                  placeholder="Pattern or substring (e.g. .js or test)"
                  value={searchPattern}
                  onChange={(e) => setSearchPattern(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '0.85rem',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchFiles(); }}
                />
                <button
                  onClick={handleSearchFiles}
                  disabled={searchLoading}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: 'var(--accent-terracotta)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Matches found: {searchResults.matches?.length || 0}
                  </div>
                  {searchResults.matches && searchResults.matches.length > 0 ? (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {searchResults.matches.map((m, idx) => (
                        <li key={idx} style={{
                          fontSize: '0.82rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)',
                          padding: '0.2rem 0',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          {m}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No matching files.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
