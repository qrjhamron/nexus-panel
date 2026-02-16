// ── Enums ──

export enum UserRole {
  ROOT_ADMIN = 'root_admin',
  CLIENT = 'client',
  SUBUSER = 'subuser',
}

export enum ServerPowerState {
  RUNNING = 'running',
  STARTING = 'starting',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  INSTALLING = 'installing',
  INSTALL_FAILED = 'install_failed',
  ERROR = 'error',
}

export enum ServerStatus {
  INSTALLING = 'installing',
  INSTALL_FAILED = 'install_failed',
  SUSPENDED = 'suspended',
  RESTORING_BACKUP = 'restoring_backup',
  TRANSFERRING = 'transferring',
}

export enum PowerAction {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
  KILL = 'kill',
}

export enum SubuserPermission {
  WEBSOCKET_CONNECT = 'websocket.connect',
  CONTROL_CONSOLE = 'control.console',
  CONTROL_START = 'control.start',
  CONTROL_STOP = 'control.stop',
  CONTROL_RESTART = 'control.restart',
  USER_READ = 'user.read',
  USER_UPDATE = 'user.update',
  USER_CREATE = 'user.create',
  USER_DELETE = 'user.delete',
  SERVER_READ = 'server.read',
  SERVER_UPDATE = 'server.update',
  SERVER_CREATE = 'server.create',
  SERVER_DELETE = 'server.delete',
  SERVER_SUSPEND = 'server.suspend',
  SERVER_REINSTALL = 'server.reinstall',
  FILE_READ = 'file.read',
  FILE_READ_CONTENT = 'file.read-content',
  FILE_CREATE = 'file.create',
  FILE_UPDATE = 'file.update',
  FILE_DELETE = 'file.delete',
  FILE_ARCHIVE = 'file.archive',
  FILE_SFTP = 'file.sftp',
  DATABASE_READ = 'database.read',
  DATABASE_CREATE = 'database.create',
  DATABASE_DELETE = 'database.delete',
  DATABASE_UPDATE = 'database.update',
  DATABASE_VIEW_PASSWORD = 'database.view_password',
  SCHEDULE_READ = 'schedule.read',
  SCHEDULE_CREATE = 'schedule.create',
  SCHEDULE_UPDATE = 'schedule.update',
  SCHEDULE_DELETE = 'schedule.delete',
  ALLOCATION_READ = 'allocation.read',
  ALLOCATION_CREATE = 'allocation.create',
  ALLOCATION_UPDATE = 'allocation.update',
  ALLOCATION_DELETE = 'allocation.delete',
  STARTUP_READ = 'startup.read',
  STARTUP_UPDATE = 'startup.update',
  SETTINGS_RENAME = 'settings.rename',
}

export enum ScheduleTaskAction {
  COMMAND = 'command',
  POWER = 'power',
  BACKUP = 'backup',
}

export enum AuditAction {
  USER_LOGIN = 'user.login',
  USER_CREATED = 'user.created',
  USER_DELETED = 'user.deleted',
  SERVER_CREATED = 'server.created',
  SERVER_DELETED = 'server.deleted',
  SERVER_POWER = 'server.power',
  SERVER_REINSTALL = 'server.reinstall',
  SERVER_SUSPEND = 'server.suspend',
  SERVER_UNSUSPEND = 'server.unsuspend',
  FILE_MODIFIED = 'file.modified',
  SCHEDULE_CREATED = 'schedule.created',
  SCHEDULE_DELETED = 'schedule.deleted',
  API_KEY_CREATED = 'api_key.created',
  API_KEY_DELETED = 'api_key.deleted',
  NODE_ADDED = 'node.added',
  NODE_REMOVED = 'node.removed',
  EGG_INSTALLED = 'egg.installed',
  DATABASE_CREATED = 'database.created',
  DATABASE_DELETED = 'database.deleted',
  SUBUSER_ADDED = 'subuser.added',
  SUBUSER_REMOVED = 'subuser.removed',
}

export enum NotificationType {
  SERVER_INSTALL_COMPLETE = 'server.install_complete',
  SERVER_ERROR = 'server.error',
  SCHEDULE_COMPLETE = 'schedule.complete',
  SCHEDULE_FAILED = 'schedule.failed',
  SUBUSER_INVITATION = 'subuser.invitation',
  ADMIN_ANNOUNCEMENT = 'admin.announcement',
}

export enum ApiKeyScope {
  SERVERS_LIST = 'servers.list',
  SERVERS_VIEW = 'servers.view',
  SERVERS_POWER = 'servers.power',
  SERVERS_FILES = 'servers.files',
  SERVERS_DATABASES = 'servers.databases',
  SERVERS_SCHEDULES = 'servers.schedules',
  SERVERS_SUBUSERS = 'servers.subusers',
}

export enum NodeConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export enum EggVariableType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
}
