const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cloudguard_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface UserOut {
  id: number;
  email: string;
  full_name: string;
  role: string;
  org_id?: number;
  created_at: string;
}

export interface ApplicationOut {
  id: number;
  name: string;
  description?: string;
  owner?: string;
  department?: string;
  technology_stack?: string;
  current_env?: string;
  target_env?: string;
  migration_status?: string;
  migration_risk?: string;
  org_id: number;
  created_at: string;
  dependency_ids?: number[];
}

export interface ResourceOut {
  id: number;
  name: string;
  resource_type: string;
  environment?: string;
  status?: string;
  is_encrypted?: boolean;
  is_publicly_accessible?: boolean;
  is_backup_enabled?: boolean;
  ssh_public?: boolean;
  permission_level?: string;
  software_version?: string;
  min_supported_version?: string;
  app_id?: number;
  org_id: number;
  created_at: string;
}

export interface TaskOut {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status?: string;
  order_index?: number;
  app_id?: number;
  completed_at?: string;
}

export interface ProjectOut {
  id: number;
  name: string;
  org_id: number;
  progress_percentage: number;
  target_completion_date?: string;
  status?: string;
  created_at: string;
  tasks: TaskOut[];
}

export interface SecurityFindingOut {
  id: number;
  finding_code?: string;
  resource_id: number;
  resource_name?: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  risk_explanation?: string;
  remediation_steps?: string;
  created_at: string;
}

export interface AlertOut {
  id: number;
  alert_code?: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  recommended_action?: string;
  created_at: string;
}

export interface IncidentNoteOut {
  id: number;
  incident_id: number;
  author_id: number;
  author_name?: string;
  note: string;
  created_at: string;
}

export interface IncidentOut {
  id: number;
  incident_code: string;
  alert_id?: number;
  title: string;
  severity: string;
  status: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
  notes: IncidentNoteOut[];
}

export interface DashboardSummary {
  total_applications: number;
  total_resources: number;
  migration_progress: number;
  security_score: number;
  critical_findings: number;
  active_alerts: number;
  open_incidents: number;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{
        access_token: string;
        token_type: string;
        role: string;
        user_id: number;
        full_name: string;
        email: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, fullName: string, role = 'VIEWER') =>
      request<UserOut>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      }),
    me: () => request<UserOut>('/auth/me'),
  },

  dashboard: {
    getSummary: () => request<DashboardSummary>('/dashboard/summary'),
  },

  applications: {
    list: () => request<ApplicationOut[]>('/applications'),
    create: (data: Partial<ApplicationOut>) =>
      request<ApplicationOut>('/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  resources: {
    list: () => request<ResourceOut[]>('/resources'),
    create: (data: Partial<ResourceOut>) =>
      request<ResourceOut>('/resources', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  migrations: {
    list: () => request<ProjectOut[]>('/migrations'),
    getProject: (id: number) => request<ProjectOut>(`/migrations/${id}`),
    createProject: (data: Partial<ProjectOut>) =>
      request<ProjectOut>('/migrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createTask: (data: { project_id: number; app_id?: number; title: string; description?: string; status?: string; order_index?: number }) =>
      request<TaskOut>('/migrations/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTaskStatus: (taskId: number, status: string) =>
      request<TaskOut>(`/migrations/tasks/${taskId}?status_str=${status}`, {
        method: 'PUT',
      }),
  },

  security: {
    getFindings: () => request<SecurityFindingOut[]>('/security/findings'),
    updateFindingStatus: (id: number, status: string) =>
      request<SecurityFindingOut>(`/security/findings/${id}?status_str=${status}`, {
        method: 'PUT',
      }),
    getScore: () =>
      request<{
        security_score: number;
        critical_count: number;
        high_count: number;
        medium_count: number;
        low_count: number;
        total_open_findings: number;
      }>('/security/score'),
    runScan: () =>
      request<{ status: string; findings_found: number }>('/security/scan', {
        method: 'POST',
      }),
  },

  alerts: {
    list: () => request<AlertOut[]>('/alerts'),
    updateStatus: (id: number, status: string) =>
      request<AlertOut>(`/alerts/${id}?status_str=${status}`, {
        method: 'PUT',
      }),
  },

  incidents: {
    list: () => request<IncidentOut[]>('/incidents'),
    create: (data: { alert_id?: number; title: string; severity: string; assigned_to_user_id?: number }) =>
      request<IncidentOut>('/incidents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: number, status: string) =>
      request<IncidentOut>(`/incidents/${id}?status_str=${status}`, {
        method: 'PUT',
      }),
    addNote: (incidentId: number, note: string) =>
      request<IncidentNoteOut>(`/incidents/${incidentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
  },

  ai: {
    chat: (message: string) =>
      request<{ response: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    explainFinding: (findingId: number, title: string, resourceName: string, severity: string) =>
      request<{ explanation: string }>('/ai/explain-finding', {
        method: 'POST',
        body: JSON.stringify({
          finding_id: findingId,
          finding_title: title,
          resource_name: resourceName,
          severity,
        }),
      }),
    remediate: (findingId: number, description: string) =>
      request<{ remediation: string }>('/ai/remediation', {
        method: 'POST',
        body: JSON.stringify({
          finding_id: findingId,
          issue_description: description,
        }),
      }),
    summarizeAlerts: () =>
      request<{ summary: string }>('/ai/summarize-alerts', {
        method: 'POST',
      }),
  },
};
