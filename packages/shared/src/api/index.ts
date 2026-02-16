import {
  UserRole,
  ServerPowerState,
  ServerStatus,
  PowerAction,
  SubuserPermission,
  ScheduleTaskAction,
  ApiKeyScope,
  EggVariableType,
} from '../enums';

// ── Pagination ──

export interface PaginatedRequest {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

// ── Error Response ──

export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Auth ──

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  requiresTwoFactor?: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    rootAdmin: boolean;
    usesTotp: boolean;
  };
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
}

// ── Users ──

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  rootAdmin?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  password?: string;
  rootAdmin?: boolean;
  enabled?: boolean;
}

// ── Nodes ──

export interface CreateNodeRequest {
  name: string;
  description?: string;
  location: string;
  fqdn: string;
  scheme: string;
  behindProxy?: boolean;
  memory: number;
  memoryOverallocate?: number;
  disk: number;
  diskOverallocate?: number;
  daemonPort?: number;
  uploadSize?: number;
}

export interface CreateNodeResponse {
  node: {
    id: string;
    name: string;
    fqdn: string;
  };
  credentials: {
    daemonTokenId: string;
    daemonToken: string;
  };
}

export interface UpdateNodeRequest {
  name?: string;
  description?: string;
  location?: string;
  fqdn?: string;
  scheme?: string;
  behindProxy?: boolean;
  memory?: number;
  memoryOverallocate?: number;
  disk?: number;
  diskOverallocate?: number;
  daemonPort?: number;
  uploadSize?: number;
}

// ── Allocations ──

export interface CreateAllocationsRequest {
  nodeId: string;
  ip: string;
  portStart: number;
  portEnd: number;
}

// ── Eggs / Nests ──

export interface CreateNestRequest {
  author: string;
  name: string;
  description?: string;
}

export interface CreateEggRequest {
  nestId: string;
  name: string;
  description?: string;
  author: string;
  dockerImage: string;
  dockerImages?: Record<string, string>;
  startup: string;
  configFiles?: Record<string, unknown>;
  configStartup?: Record<string, unknown>;
  configStop?: string;
  configLogs?: Record<string, unknown>;
  scriptInstall?: string;
  scriptEntry?: string;
  scriptContainer?: string;
  copyScriptFrom?: string;
  variables?: {
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    userViewable: boolean;
    userEditable: boolean;
    rules: string;
  }[];
}

export interface UpdateEggRequest extends Partial<CreateEggRequest> {}

// ── Servers ──

export interface CreateServerRequest {
  name: string;
  description?: string;
  externalId?: string;
  userId: string;
  nodeId: string;
  nestId: string;
  eggId: string;
  allocationId: string;
  memory: number;
  swap?: number;
  disk: number;
  io?: number;
  cpu: number;
  threads?: string;
  oomDisabled?: boolean;
  startup?: string;
  image?: string;
  envVariables?: Record<string, string>;
}

export interface UpdateServerRequest {
  name?: string;
  description?: string;
  memory?: number;
  swap?: number;
  disk?: number;
  io?: number;
  cpu?: number;
  threads?: string;
  oomDisabled?: boolean;
  startup?: string;
  image?: string;
  envVariables?: Record<string, string>;
}

export interface ServerPowerRequest {
  action: PowerAction;
}

export interface ServerConsoleCommandRequest {
  command: string;
}

// ── Server Databases ──

export interface CreateServerDatabaseRequest {
  serverId: string;
  databaseHostId: string;
  database?: string;
  remote?: string;
}

// ── Schedules ──

export interface CreateScheduleRequest {
  serverId: string;
  name: string;
  cronDayOfWeek: string;
  cronDayOfMonth: string;
  cronMonth: string;
  cronHour: string;
  cronMinute: string;
  isActive?: boolean;
  tasks?: {
    sequence: number;
    action: ScheduleTaskAction;
    payload: string;
    timeOffset?: number;
  }[];
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {}

// ── Subusers ──

export interface InviteSubuserRequest {
  serverId: string;
  email: string;
  permissions: string[];
}

export interface UpdateSubuserPermissionsRequest {
  permissions: string[];
}

// ── API Keys ──

export interface CreateApiKeyRequest {
  memo?: string;
  allowedIps?: string[];
}

export interface CreateApiKeyResponse {
  apiKey: {
    id: string;
    keyStart: string;
  };
  plainTextToken: string;
}

// ── File Operations ──

export interface WriteFileRequest {
  path: string;
  content: string;
}

export interface CreateDirectoryRequest {
  path: string;
  name: string;
}

export interface RenameFileRequest {
  path: string;
  newName: string;
}

export interface CompressFilesRequest {
  paths: string[];
  destination: string;
}

export interface DecompressArchiveRequest {
  path: string;
  destination: string;
}

export interface DeleteFilesRequest {
  paths: string[];
}

// ── Search ──

export interface GlobalSearchRequest {
  query: string;
}

export interface GlobalSearchResponse {
  servers: { id: string; uuid: string; name: string; status?: ServerStatus }[];
  users: { id: string; username: string; email: string }[];
  eggs: { id: string; name: string; nestName: string }[];
  nodes: { id: string; name: string; fqdn: string }[];
}

// ── Admin Dashboard Stats ──

export interface AdminDashboardStats {
  totalUsers: number;
  totalServers: number;
  totalNodes: number;
  serversByStatus: Record<string, number>;
  nodes: {
    id: string;
    name: string;
    connectionStatus: string;
    memoryUsed: number;
    memoryTotal: number;
    diskUsed: number;
    diskTotal: number;
  }[];
}

// ── Notifications ──

export interface MarkNotificationReadRequest {
  notificationIds: string[];
}

// ── Node Heartbeat ──

export interface NodeHeartbeatRequest {
  version: string;
  totalMemory: number;
  usedMemory: number;
  totalDisk: number;
  usedDisk: number;
  cpuPercent: number;
  servers: {
    uuid: string;
    state: ServerPowerState;
    resources: {
      cpuPercent: number;
      memoryBytes: number;
      diskBytes: number;
      networkRxBytes: number;
      networkTxBytes: number;
    };
  }[];
}
