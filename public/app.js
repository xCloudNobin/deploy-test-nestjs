'use strict';

const state = {
  projects: [],
  tasks: [],
  selectedProjectId: null,
};

const el = {
  releaseMarker: document.getElementById('release-marker'),
  runtimeMarker: document.getElementById('runtime-marker'),
  projectList: document.getElementById('project-list'),
  projectSearch: document.getElementById('project-search'),
  projectForm: document.getElementById('project-form'),
  projectName: document.getElementById('project-name'),
  projectDescription: document.getElementById('project-description'),
  projectError: document.getElementById('project-error'),
  newProjectBtn: document.getElementById('new-project-btn'),
  taskList: document.getElementById('task-list'),
  taskSearch: document.getElementById('task-search'),
  taskStatusFilter: document.getElementById('task-status-filter'),
  taskPriorityFilter: document.getElementById('task-priority-filter'),
  taskForm: document.getElementById('task-form'),
  taskTitle: document.getElementById('task-title'),
  taskDescription: document.getElementById('task-description'),
  taskError: document.getElementById('task-error'),
  newTaskBtn: document.getElementById('new-task-btn'),
  panelTitle: document.getElementById('panel-title'),
  editDialog: document.getElementById('edit-dialog'),
  editForm: document.getElementById('edit-form'),
  editName: document.getElementById('edit-name'),
  editDescription: document.getElementById('edit-description'),
  editStatus: document.getElementById('edit-status'),
  editPriority: document.getElementById('edit-priority'),
  editError: document.getElementById('edit-error'),
  editTitle: document.getElementById('edit-title'),
  editCancel: document.getElementById('edit-cancel'),
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (!res.ok && res.status >= 400 && res.status < 500) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.message) ? body.message.join('; ') : body.message || body.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return res;
}

function text(node, value) {
  node.textContent = value;
}

function renderProjects() {
  const list = el.projectList;
  list.replaceChildren();
  for (const project of state.projects) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = project.id === state.selectedProjectId ? 'project-item active' : 'project-item';
    const name = document.createElement('span');
    name.className = 'project-name';
    text(name, project.name);
    const meta = document.createElement('span');
    meta.className = 'project-meta';
    text(meta, `${project.status}`);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ghost';
    text(edit, 'edit');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'ghost danger';
    text(del, 'delete');
    button.append(name, meta);
    item.append(button, edit, del);
    button.addEventListener('click', () => selectProject(project.id));
    edit.addEventListener('click', () => openEdit('project', project));
    del.addEventListener('click', () => deleteProject(project.id));
    list.append(item);
  }
}

async function loadProjects() {
  const q = el.projectSearch.value.trim();
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const res = await api(`/api/projects${params.size ? `?${params}` : ''}`);
  const data = await res.json();
  state.projects = data.projects || [];
  if (!state.projects.some((p) => p.id === state.selectedProjectId)) {
    state.selectedProjectId = state.projects[0]?.id ?? null;
    if (state.selectedProjectId) history.replaceState(null, '', `#/projects/${state.selectedProjectId}`);
  }
  renderProjects();
  await loadTasks();
}

function taskMatchesFilters(task) {
  const q = el.taskSearch.value.trim().toLowerCase();
  const status = el.taskStatusFilter.value;
  const priority = el.taskPriorityFilter.value;
  if (status && task.status !== status) return false;
  if (priority && task.priority !== priority) return false;
  if (q) {
    const hay = `${task.title} ${task.description ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderTasks() {
  const list = el.taskList;
  list.replaceChildren();
  if (!state.selectedProjectId) {
    const li = document.createElement('li');
    li.className = 'empty';
    text(li, 'Select a project (or create one) to manage its tasks.');
    list.append(li);
    return;
  }
  const visible = state.tasks.filter(taskMatchesFilters);
  if (visible.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    text(li, 'No tasks match.');
    list.append(li);
    return;
  }
  for (const task of visible) {
    const item = document.createElement('li');
    item.className = `task-row status-${task.status}`;
    const title = document.createElement('span');
    title.className = 'task-title';
    text(title, task.title);
    const desc = document.createElement('span');
    desc.className = 'task-desc';
    text(desc, task.description || '');
    const tags = document.createElement('span');
    tags.className = 'task-tags';
    text(tags, `${task.status} · ${task.priority}`);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ghost';
    text(edit, 'edit');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'ghost danger';
    text(del, 'delete');
    edit.addEventListener('click', () => openEdit('task', task));
    del.addEventListener('click', () => deleteTask(task.id));
    item.append(title, desc, tags, edit, del);
    list.append(item);
  }
}

async function loadTasks() {
  el.newTaskBtn.disabled = !state.selectedProjectId;
  text(el.panelTitle, state.selectedProjectId
    ? `Tasks — ${state.projects.find((p) => p.id === state.selectedProjectId)?.name ?? '…'}`
    : 'Tasks');
  if (!state.selectedProjectId) {
    state.tasks = [];
    renderTasks();
    return;
  }
  const params = new URLSearchParams();
  params.set('project_id', String(state.selectedProjectId));
  const res = await api(`/api/tasks?${params}`);
  const data = await res.json();
  state.tasks = data.tasks || [];
  renderTasks();
}

function selectProject(id) {
  state.selectedProjectId = id;
  history.pushState(null, '', `#/projects/${id}`);
  renderProjects();
  loadTasks();
}

async function createProject(e) {
  e.preventDefault();
  el.projectError.textContent = '';
  try {
    const res = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: el.projectName.value,
        description: el.projectDescription.value || null,
      }),
    });
    const { project } = await res.json();
    el.projectForm.hidden = true;
    el.projectName.value = '';
    el.projectDescription.value = '';
    el.newProjectBtn.disabled = false;
    state.selectedProjectId = project.id;
    history.pushState(null, '', `#/projects/${project.id}`);
    await loadProjects();
  } catch (err) {
    text(el.projectError, err.message);
  }
}

async function createTask(e) {
  e.preventDefault();
  el.taskError.textContent = '';
  try {
    const res = await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        project_id: state.selectedProjectId,
        title: el.taskTitle.value,
        description: el.taskDescription.value || null,
      }),
    });
    await res.json();
    el.taskForm.hidden = true;
    el.taskTitle.value = '';
    el.taskDescription.value = '';
    el.newTaskBtn.disabled = false;
    await loadTasks();
  } catch (err) {
    text(el.taskError, err.message);
  }
}

let currentMode = null;
let currentId = null;

function openEdit(kind, item) {
  currentMode = kind;
  currentId = item.id;
  text(el.editTitle, `${kind === 'project' ? 'Edit project' : 'Edit task'}`);
  el.editError.textContent = '';
  el.editName.value = item.name || item.title || '';
  el.editDescription.value = item.description || '';
  el.editStatus.value = item.status || 'todo';
  el.editPriority.value = item.priority || 'medium';
  for (const option of el.editPriority.options) option.hidden = kind === 'project';
  for (const option of el.editStatus.options) {
    option.hidden = kind === 'project' ? !['active', 'archived'].includes(option.value) : ['active', 'archived'].includes(option.value);
  }
  el.editDialog.showModal();
}

async function saveEdit(e) {
  e.preventDefault();
  el.editError.textContent = '';
  const path = currentMode === 'project'
    ? `/api/projects/${currentId}`
    : `/api/tasks/${currentId}`;
  const body =
    currentMode === 'project'
      ? { name: el.editName.value, description: el.editDescription.value || null, status: el.editStatus.value }
      : { title: el.editName.value, description: el.editDescription.value || null, status: el.editStatus.value, priority: el.editPriority.value };
  try {
    const res = await api(path, { method: 'PATCH', body: JSON.stringify(body) });
    await res.json();
    el.editDialog.close();
    if (currentMode === 'project') await loadProjects();
    else await loadTasks();
  } catch (err) {
    text(el.editError, err.message);
  }
}

async function deleteProject(id) {
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    if (state.selectedProjectId === id) state.selectedProjectId = null;
    await loadProjects();
  } catch (err) {
    // surface as alert in console only; API renders meaningful errors
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

async function deleteTask(id) {
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

function showProjectForm() {
  el.projectForm.hidden = false;
  el.newProjectBtn.disabled = true;
  el.projectName.focus();
}

function showTaskForm() {
  el.taskForm.hidden = false;
  el.newTaskBtn.disabled = true;
  el.taskTitle.focus();
}

function readRoute() {
  const match = /^#\/projects\/(\d+)/.exec(location.hash);
  if (match) state.selectedProjectId = Number(match[1]);
}

async function init() {
  try {
    const res = await api('/api/meta');
    const data = await res.json();
    text(el.releaseMarker, data.release ?? 'unknown');
    text(el.runtimeMarker, `node ${data.runtime?.node ?? ''} · NestJS · TypeORM · SQLite · ${data.platform ?? ''}`);
  } catch (err) {
    text(el.releaseMarker, 'unknown');
  }

  el.newProjectBtn.addEventListener('click', showProjectForm);
  el.newTaskBtn.addEventListener('click', showTaskForm);
  el.projectForm.addEventListener('submit', createProject);
  el.taskForm.addEventListener('submit', createTask);
  el.editForm.addEventListener('submit', saveEdit);
  el.editCancel.addEventListener('click', () => el.editDialog.close());

  for (const btn of document.querySelectorAll('[data-cancel]')) {
    btn.addEventListener('click', () => {
      const key = btn.dataset.cancel;
      el[key].hidden = true;
      if (key === 'projectForm') el.newProjectBtn.disabled = false;
      else el.newTaskBtn.disabled = false;
    });
  }

  let debounce = null;
  const schedule = (fn) => {
    clearTimeout(debounce);
    debounce = setTimeout(fn, 200);
  };
  el.projectSearch.addEventListener('input', () => schedule(loadProjects));
  el.taskSearch.addEventListener('input', () => schedule(renderTasks));
  el.taskStatusFilter.addEventListener('change', renderTasks);
  el.taskPriorityFilter.addEventListener('change', renderTasks);

  readRoute();
  await loadProjects();
}

void init();