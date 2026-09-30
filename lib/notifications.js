"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupText = getGroupText;
exports.getNotificationTextsForNative = getNotificationTextsForNative;
const config_1 = require("./config");
/**
 * Get notification text with proper pluralization.
 */
function getGroupText(count) {
    var _a, _b;
    const groupText = (_b = (_a = config_1.config.notificationsGrouping.texts) === null || _a === void 0 ? void 0 : _a.groupText) !== null && _b !== void 0 ? _b : config_1.DEFAULT_NOTIFICATION_TEXTS.groupText;
    if (typeof groupText === 'function')
        return groupText(count);
    return groupText.replace('{count}', String(count));
}
/**
 * Get notification texts config for native side (serializable).
 */
function getNotificationTextsForNative() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const texts = (_a = config_1.config.notificationsGrouping.texts) !== null && _a !== void 0 ? _a : config_1.DEFAULT_NOTIFICATION_TEXTS;
    return {
        downloadTitle: (_b = texts.downloadTitle) !== null && _b !== void 0 ? _b : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadTitle,
        downloadStarting: (_c = texts.downloadStarting) !== null && _c !== void 0 ? _c : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadStarting,
        downloadProgress: (_d = texts.downloadProgress) !== null && _d !== void 0 ? _d : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadProgress,
        downloadPaused: (_e = texts.downloadPaused) !== null && _e !== void 0 ? _e : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadPaused,
        downloadFinished: (_f = texts.downloadFinished) !== null && _f !== void 0 ? _f : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadFinished,
        downloadCancel: (_g = texts.downloadCancel) !== null && _g !== void 0 ? _g : config_1.DEFAULT_NOTIFICATION_TEXTS.downloadCancel,
        groupTitle: (_h = texts.groupTitle) !== null && _h !== void 0 ? _h : config_1.DEFAULT_NOTIFICATION_TEXTS.groupTitle,
        // For native side, we send a pattern with {count} placeholder
        groupText: typeof texts.groupText === 'function'
            ? '{count} download(s) in progress' // Default pattern if function provided
            : ((_j = texts.groupText) !== null && _j !== void 0 ? _j : '{count} download(s) in progress'),
    };
}
