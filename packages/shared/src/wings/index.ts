import { PowerAction, ServerPowerState } from '../enums';
import { ResourceStats, FileEntry } from '../models';

// ── Wings REST API ──

export interface WingsServerConfig {
  uuid: string;
  dockerImage: string;
  startupCommand: string;
  environment: Record<string, string>;
  memoryLimit: number;
  cpuLimit: number;
  diskLimit: number;
  portMappings: { hostPort: number; containerPort: number }[];
  volumePath: string;
}

export interface WingsCreateServerRequest {
  server: WingsServerConfig;
  installScript?: string;
  installDockerImage?: string;
}

export interface WingsInstallServerRequest {
  server: WingsServerConfig;
  installScript: string;
  installDockerImage: string;
}

export interface WingsPowerActionRequest {
  action: PowerAction;
}

export interface WingsConsoleCommandRequest {
  command: string;
}

export interface WingsUpdateResourcesRequest {
  memoryLimit: number;
  cpuLimit: number;
  diskLimit: number;
}

export interface WingsFileListResponse {
  files: FileEntry[];
}

export interface WingsFileReadResponse {
  content: string;
}

export interface WingsFileWriteRequest {
  content: string;
}

export interface WingsCompressRequest {
  paths: string[];
  destination: string;
}

export interface WingsDecompressRequest {
  path: string;
  destination: string;
}

export interface WingsServerStatus {
  uuid: string;
  state: ServerPowerState;
  resources: ResourceStats;
  containerId?: string;
}

// ── Wings → Panel Events (WebSocket) ──

export enum WingsEventType {
  POWER_STATE = 'power_state',
  RESOURCE_STATS = 'resource_stats',
  CONSOLE_OUTPUT = 'console_output',
  INSTALL_OUTPUT = 'install_output',
  INSTALL_COMPLETE = 'install_complete',
  SERVER_REGISTERED = 'server_registered',
}

export interface WingsPowerStateEvent {
  type: WingsEventType.POWER_STATE;
  serverUuid: string;
  state: ServerPowerState;
}

export interface WingsResourceStatsEvent {
  type: WingsEventType.RESOURCE_STATS;
  serverUuid: string;
  stats: ResourceStats;
}

export interface WingsConsoleOutputEvent {
  type: WingsEventType.CONSOLE_OUTPUT;
  serverUuid: string;
  line: string;
}

export interface WingsInstallOutputEvent {
  type: WingsEventType.INSTALL_OUTPUT;
  serverUuid: string;
  line: string;
}

export interface WingsInstallCompleteEvent {
  type: WingsEventType.INSTALL_COMPLETE;
  serverUuid: string;
  success: boolean;
  exitCode: number;
}

export type WingsEvent =
  | WingsPowerStateEvent
  | WingsResourceStatsEvent
  | WingsConsoleOutputEvent
  | WingsInstallOutputEvent
  | WingsInstallCompleteEvent;

// ── Panel → Client WebSocket Messages ──

export enum ClientMessageType {
  AUTH = 'auth',
  SUBSCRIBE_CONSOLE = 'subscribe_console',
  SUBSCRIBE_STATS = 'subscribe_stats',
  SEND_COMMAND = 'send_command',
  SEND_POWER_ACTION = 'send_power_action',
}

export interface ClientAuthMessage {
  type: ClientMessageType.AUTH;
  token: string;
  serverUuid: string;
}

export interface ClientSubscribeConsoleMessage {
  type: ClientMessageType.SUBSCRIBE_CONSOLE;
}

export interface ClientSubscribeStatsMessage {
  type: ClientMessageType.SUBSCRIBE_STATS;
}

export interface ClientSendCommandMessage {
  type: ClientMessageType.SEND_COMMAND;
  command: string;
}

export interface ClientSendPowerActionMessage {
  type: ClientMessageType.SEND_POWER_ACTION;
  action: PowerAction;
}

export type ClientMessage =
  | ClientAuthMessage
  | ClientSubscribeConsoleMessage
  | ClientSubscribeStatsMessage
  | ClientSendCommandMessage
  | ClientSendPowerActionMessage;

// ── Panel → Client Server Messages ──

export enum ServerMessageType {
  AUTH_SUCCESS = 'auth_success',
  CONSOLE_OUTPUT = 'console_output',
  CONSOLE_HISTORY = 'console_history',
  STATS_UPDATE = 'stats_update',
  POWER_STATE = 'power_state',
  ERROR = 'error',
}

export interface ServerAuthSuccessMessage {
  type: ServerMessageType.AUTH_SUCCESS;
}

export interface ServerConsoleOutputMessage {
  type: ServerMessageType.CONSOLE_OUTPUT;
  line: string;
}

export interface ServerConsoleHistoryMessage {
  type: ServerMessageType.CONSOLE_HISTORY;
  lines: string[];
}

export interface ServerStatsUpdateMessage {
  type: ServerMessageType.STATS_UPDATE;
  stats: ResourceStats;
}

export interface ServerPowerStateMessage {
  type: ServerMessageType.POWER_STATE;
  state: ServerPowerState;
}

export interface ServerErrorMessage {
  type: ServerMessageType.ERROR;
  message: string;
}

export type ServerMessage =
  | ServerAuthSuccessMessage
  | ServerConsoleOutputMessage
  | ServerConsoleHistoryMessage
  | ServerStatsUpdateMessage
  | ServerPowerStateMessage
  | ServerErrorMessage;
