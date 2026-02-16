import {
  UserRole,
  ServerPowerState,
  ServerStatus,
  SubuserPermission,
  ScheduleTaskAction,
  AuditAction,
  NotificationType,
  ApiKeyScope,
  NodeConnectionStatus,
  EggVariableType,
} from '../enums';

// ── Base ──

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ── User ──

export interface User extends BaseEntity {
  email: string;
  username: string;
  rootAdmin: boolean;
  usesTotp: boolean;
  enabled: boolean;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface UserSession extends BaseEntity {
  userId: string;
  ipAddress: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrentSession?: boolean;
}

// ── Node ──

export interface Node extends BaseEntity {
  name: string;
  description?: string;
  location: string;
  fqdn: string;
  scheme: string;
  behindProxy: boolean;
  memory: number;
  memoryOverallocate: number;
  disk: number;
  diskOverallocate: number;
  daemonPort: number;
  daemonTokenId: string;
  uploadSize: number;
  connectionStatus: NodeConnectionStatus;
  wingsVersion?: string;
}

// ── Allocation ──

export interface Allocation extends BaseEntity {
  nodeId: string;
  ip: string;
  ipAlias?: string;
  port: number;
  notes?: string;
  serverId?: string | null;
}

// ── Nest & Egg ──

export interface Nest extends BaseEntity {
  author: string;
  name: string;
  description?: string;
  eggs?: Egg[];
}

export interface EggVariable extends BaseEntity {
  eggId: string;
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  userViewable: boolean;
  userEditable: boolean;
  rules: string;
}

export interface Egg extends BaseEntity {
  nestId: string;
  name: string;
  description?: string;
  author: string;
  dockerImage: string;
  dockerImages: Record<string, string>;
  startup: string;
  configFiles?: Record<string, unknown>;
  configStartup?: Record<string, unknown>;
  configStop?: string;
  configLogs?: Record<string, unknown>;
  scriptInstall?: string;
  scriptEntry: string;
  scriptContainer: string;
  copyScriptFrom?: string;
  variables?: EggVariable[];
  nest?: Nest;
}

// ── Server ──

export interface Server extends BaseEntity {
  uuid: string;
  uuidShort: string;
  externalId?: string;
  name: string;
  description?: string;
  userId: string;
  nodeId: string;
  nestId: string;
  eggId: string;
  allocationId: string;
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads?: string;
  oomDisabled: boolean;
  startup: string;
  image: string;
  envVariables: Record<string, string>;
  installed: number;
  status?: ServerStatus;
  user?: User;
  node?: Node;
  egg?: Egg;
  allocation?: Allocation;
}

// ── Server Subuser ──

export interface ServerSubuser extends BaseEntity {
  serverId: string;
  userId: string;
  permissions: string[];
  user?: User;
}

// ── Database Host ──

export interface DatabaseHost extends BaseEntity {
  name: string;
  host: string;
  port: number;
  username: string;
  maxDatabases?: number;
  nodeId?: string;
}

// ── Server Database ──

export interface ServerDatabase extends BaseEntity {
  serverId: string;
  databaseHostId: string;
  database: string;
  username: string;
  remote: string;
  maxConnections: number;
}

// ── Schedule ──

export interface ScheduleTask extends BaseEntity {
  scheduleId: string;
  action: ScheduleTaskAction;
  sequence: number;
  payload: string;
  timeOffset: number;
}

export interface Schedule extends BaseEntity {
  serverId: string;
  name: string;
  cronDayOfWeek: string;
  cronDayOfMonth: string;
  cronMonth: string;
  cronHour: string;
  cronMinute: string;
  isActive: boolean;
  isProcessing: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  tasks: ScheduleTask[];
}

// ── API Key ──

export interface ApiKey extends BaseEntity {
  userId: string;
  keyStart: string;
  memo?: string;
  allowedIps: string[];
  lastUsedAt?: string;
}

// ── Audit Log ──

export interface AuditLogEntry {
  id: string;
  userId?: string;
  event: string;
  ip?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: User;
}

// ── Notification ──

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  resourceType?: string;
  resourceId?: string;
}

// ── File System ──

export interface FileEntry {
  name: string;
  mode?: string;
  modeBits?: number;
  size: number;
  isFile: boolean;
  isSymlink: boolean;
  isDirectory: boolean;
  mimetype?: string;
  createdAt?: string;
  modifiedAt: string;
}

// ── Resource Stats ──

export interface ResourceStats {
  cpuPercent: number;
  memoryBytes: number;
  memoryLimit: number;
  networkRxBytes: number;
  networkTxBytes: number;
  diskBytes: number;
  timestamp: string;
}

// ── Heartbeat ──

export interface NodeHeartbeat {
  version: string;
  totalMemory: number;
  usedMemory: number;
  totalDisk: number;
  usedDisk: number;
  cpuPercent: number;
  servers: {
    uuid: string;
    state: ServerPowerState;
    resources: ResourceStats;
  }[];
}
