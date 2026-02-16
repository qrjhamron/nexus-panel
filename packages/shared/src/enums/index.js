"use strict";
// ── Enums ──
Object.defineProperty(exports, "__esModule", { value: true });
exports.EggVariableType = exports.NodeConnectionStatus = exports.ApiKeyScope = exports.NotificationType = exports.AuditAction = exports.ScheduleTaskAction = exports.SubuserPermission = exports.PowerAction = exports.ServerPowerState = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ROOT_ADMIN"] = "root_admin";
    UserRole["CLIENT"] = "client";
    UserRole["SUBUSER"] = "subuser";
})(UserRole || (exports.UserRole = UserRole = {}));
var ServerPowerState;
(function (ServerPowerState) {
    ServerPowerState["RUNNING"] = "running";
    ServerPowerState["STARTING"] = "starting";
    ServerPowerState["STOPPING"] = "stopping";
    ServerPowerState["STOPPED"] = "stopped";
    ServerPowerState["INSTALLING"] = "installing";
    ServerPowerState["INSTALL_FAILED"] = "install_failed";
    ServerPowerState["ERROR"] = "error";
})(ServerPowerState || (exports.ServerPowerState = ServerPowerState = {}));
var PowerAction;
(function (PowerAction) {
    PowerAction["START"] = "start";
    PowerAction["STOP"] = "stop";
    PowerAction["RESTART"] = "restart";
    PowerAction["KILL"] = "kill";
})(PowerAction || (exports.PowerAction = PowerAction = {}));
var SubuserPermission;
(function (SubuserPermission) {
    SubuserPermission["CONSOLE"] = "console";
    SubuserPermission["FILE_MANAGER"] = "file_manager";
    SubuserPermission["DATABASE_MANAGER"] = "database_manager";
    SubuserPermission["SCHEDULE_MANAGER"] = "schedule_manager";
    SubuserPermission["STARTUP_VARIABLES"] = "startup_variables";
    SubuserPermission["POWER_ACTIONS"] = "power_actions";
    SubuserPermission["SUBUSER_MANAGEMENT"] = "subuser_management";
})(SubuserPermission || (exports.SubuserPermission = SubuserPermission = {}));
var ScheduleTaskAction;
(function (ScheduleTaskAction) {
    ScheduleTaskAction["COMMAND"] = "command";
    ScheduleTaskAction["POWER"] = "power";
    ScheduleTaskAction["BACKUP"] = "backup";
})(ScheduleTaskAction || (exports.ScheduleTaskAction = ScheduleTaskAction = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_LOGIN"] = "user.login";
    AuditAction["USER_CREATED"] = "user.created";
    AuditAction["USER_DELETED"] = "user.deleted";
    AuditAction["SERVER_CREATED"] = "server.created";
    AuditAction["SERVER_DELETED"] = "server.deleted";
    AuditAction["SERVER_POWER"] = "server.power";
    AuditAction["SERVER_REINSTALL"] = "server.reinstall";
    AuditAction["FILE_MODIFIED"] = "file.modified";
    AuditAction["SCHEDULE_CREATED"] = "schedule.created";
    AuditAction["SCHEDULE_DELETED"] = "schedule.deleted";
    AuditAction["API_KEY_CREATED"] = "api_key.created";
    AuditAction["API_KEY_DELETED"] = "api_key.deleted";
    AuditAction["NODE_ADDED"] = "node.added";
    AuditAction["NODE_REMOVED"] = "node.removed";
    AuditAction["EGG_INSTALLED"] = "egg.installed";
    AuditAction["DATABASE_CREATED"] = "database.created";
    AuditAction["DATABASE_DELETED"] = "database.deleted";
    AuditAction["SUBUSER_ADDED"] = "subuser.added";
    AuditAction["SUBUSER_REMOVED"] = "subuser.removed";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SERVER_INSTALL_COMPLETE"] = "server.install_complete";
    NotificationType["SERVER_ERROR"] = "server.error";
    NotificationType["SCHEDULE_COMPLETE"] = "schedule.complete";
    NotificationType["SCHEDULE_FAILED"] = "schedule.failed";
    NotificationType["SUBUSER_INVITATION"] = "subuser.invitation";
    NotificationType["ADMIN_ANNOUNCEMENT"] = "admin.announcement";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var ApiKeyScope;
(function (ApiKeyScope) {
    ApiKeyScope["SERVERS_LIST"] = "servers.list";
    ApiKeyScope["SERVERS_VIEW"] = "servers.view";
    ApiKeyScope["SERVERS_POWER"] = "servers.power";
    ApiKeyScope["SERVERS_FILES"] = "servers.files";
    ApiKeyScope["SERVERS_DATABASES"] = "servers.databases";
    ApiKeyScope["SERVERS_SCHEDULES"] = "servers.schedules";
    ApiKeyScope["SERVERS_SUBUSERS"] = "servers.subusers";
})(ApiKeyScope || (exports.ApiKeyScope = ApiKeyScope = {}));
var NodeConnectionStatus;
(function (NodeConnectionStatus) {
    NodeConnectionStatus["CONNECTED"] = "connected";
    NodeConnectionStatus["DISCONNECTED"] = "disconnected";
    NodeConnectionStatus["ERROR"] = "error";
})(NodeConnectionStatus || (exports.NodeConnectionStatus = NodeConnectionStatus = {}));
var EggVariableType;
(function (EggVariableType) {
    EggVariableType["TEXT"] = "text";
    EggVariableType["NUMBER"] = "number";
    EggVariableType["BOOLEAN"] = "boolean";
    EggVariableType["SELECT"] = "select";
})(EggVariableType || (exports.EggVariableType = EggVariableType = {}));
//# sourceMappingURL=index.js.map