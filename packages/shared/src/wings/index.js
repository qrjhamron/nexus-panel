"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageType = exports.ClientMessageType = exports.WingsEventType = void 0;
// ── Wings → Panel Events (WebSocket) ──
var WingsEventType;
(function (WingsEventType) {
    WingsEventType["POWER_STATE"] = "power_state";
    WingsEventType["RESOURCE_STATS"] = "resource_stats";
    WingsEventType["CONSOLE_OUTPUT"] = "console_output";
    WingsEventType["INSTALL_OUTPUT"] = "install_output";
    WingsEventType["INSTALL_COMPLETE"] = "install_complete";
    WingsEventType["SERVER_REGISTERED"] = "server_registered";
})(WingsEventType || (exports.WingsEventType = WingsEventType = {}));
// ── Panel → Client WebSocket Messages ──
var ClientMessageType;
(function (ClientMessageType) {
    ClientMessageType["AUTH"] = "auth";
    ClientMessageType["SUBSCRIBE_CONSOLE"] = "subscribe_console";
    ClientMessageType["SUBSCRIBE_STATS"] = "subscribe_stats";
    ClientMessageType["SEND_COMMAND"] = "send_command";
    ClientMessageType["SEND_POWER_ACTION"] = "send_power_action";
})(ClientMessageType || (exports.ClientMessageType = ClientMessageType = {}));
// ── Panel → Client Server Messages ──
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["AUTH_SUCCESS"] = "auth_success";
    ServerMessageType["CONSOLE_OUTPUT"] = "console_output";
    ServerMessageType["CONSOLE_HISTORY"] = "console_history";
    ServerMessageType["STATS_UPDATE"] = "stats_update";
    ServerMessageType["POWER_STATE"] = "power_state";
    ServerMessageType["ERROR"] = "error";
})(ServerMessageType || (exports.ServerMessageType = ServerMessageType = {}));
//# sourceMappingURL=index.js.map