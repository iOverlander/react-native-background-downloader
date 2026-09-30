"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const config_1 = require("./config");
const log = (...args) => {
    if (config_1.config.isLogsEnabled) {
        console.log('[RNBackgroundDownloader]', ...args);
        // Call external log callback if provided
        if (config_1.config.logCallback) {
            const message = args.length > 0 && typeof args[0] === 'string' ? args[0] : 'log';
            const restArgs = args.length > 1 ? args.slice(1) : [];
            config_1.config.logCallback('RNBD', message, ...restArgs);
        }
    }
};
exports.log = log;
