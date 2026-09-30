"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadTask = void 0;
const config_1 = require("./config");
const logger_1 = require("./logger");
// Import shared native module getter to avoid duplicating TurboModule lookup
// This is lazily imported to avoid circular dependency issues at module load time
let getNativeModuleImpl = null;
function getNativeModule() {
    if (!getNativeModuleImpl)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        getNativeModuleImpl = require('./index').getNativeModule;
    return getNativeModuleImpl();
}
class DownloadTask {
    constructor(taskParams, originalTask) {
        var _a, _b;
        this.id = '';
        this.metadata = {};
        this.state = 'PENDING';
        this.errorCode = 0;
        this.bytesDownloaded = 0;
        this.bytesTotal = 0;
        this.id = taskParams.id;
        if (taskParams.bytesDownloaded)
            this.bytesDownloaded = taskParams.bytesDownloaded;
        if (taskParams.bytesTotal)
            this.bytesTotal = taskParams.bytesTotal;
        if (taskParams.destination)
            this.destination = (_a = taskParams.destination) !== null && _a !== void 0 ? _a : undefined;
        this.metadata = (_b = this.tryParseJson(taskParams.metadata)) !== null && _b !== void 0 ? _b : {};
        if (originalTask) {
            this.beginHandler = originalTask.beginHandler;
            this.progressHandler = originalTask.progressHandler;
            this.doneHandler = originalTask.doneHandler;
            this.errorHandler = originalTask.errorHandler;
        }
    }
    // event listeners setters
    begin(handler) {
        if (typeof handler !== 'function')
            throw new Error('begin handler must be a function');
        this.beginHandler = handler;
        return this;
    }
    progress(handler) {
        if (typeof handler !== 'function')
            throw new Error('progress handler must be a function');
        this.progressHandler = handler;
        return this;
    }
    done(handler) {
        if (typeof handler !== 'function')
            throw new Error('done handler must be a function');
        this.doneHandler = handler;
        return this;
    }
    error(handler) {
        if (typeof handler !== 'function')
            throw new Error('error handler must be a function');
        this.errorHandler = handler;
        return this;
    }
    // event listeners
    onBegin(params) {
        var _a;
        this.state = 'DOWNLOADING';
        this.bytesTotal = params.expectedBytes;
        (_a = this.beginHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onProgress(params) {
        var _a;
        this.bytesDownloaded = params.bytesDownloaded;
        this.bytesTotal = params.bytesTotal;
        (_a = this.progressHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onDone(params) {
        var _a;
        this.state = 'DONE';
        this.bytesDownloaded = params.bytesDownloaded;
        this.bytesTotal = params.bytesTotal;
        (_a = this.doneHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onError(params) {
        var _a;
        this.state = 'FAILED';
        (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    // methods
    /**
     * Update download parameters.
     * If the task is paused, this will also update headers in the native layer.
     * If the task is in-progress or completed, only the local JS object is updated.
     *
     * @param downloadParams - The new download parameters
     * @returns Promise<boolean> - true if native headers were updated, false otherwise
     */
    async setDownloadParams(downloadParams) {
        this.downloadParams = downloadParams;
        // If task is paused, update headers in native layer
        if (this.state === 'PAUSED' && downloadParams.headers) {
            const headers = this.headersToUnsafeObject(downloadParams.headers);
            if (headers) {
                (0, logger_1.log)('DownloadTask: setDownloadParams updating native headers', this.id);
                return getNativeModule().updateTaskHeaders(this.id, headers);
            }
        }
        return false;
    }
    async pause() {
        (0, logger_1.log)('DownloadTask: pause', this.id);
        this.state = 'PAUSED';
        await getNativeModule().pauseTask(this.id);
    }
    async resume() {
        (0, logger_1.log)('DownloadTask: resume', this.id);
        this.state = 'DOWNLOADING';
        this.errorCode = 0;
        await getNativeModule().resumeTask(this.id);
    }
    start() {
        var _a, _b, _c, _d, _e;
        if (this.state !== 'PENDING') {
            (0, logger_1.log)('DownloadTask: start. Download already started, can\' start again... ', this.id);
            (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, { error: 'Download already started', errorCode: -1 });
            return;
        }
        if (!this.downloadParams) {
            (0, logger_1.log)('DownloadTask: start. downloadParams is missing. "setDownloadParams" wasn\'t called before "start"', this.id);
            (_b = this.errorHandler) === null || _b === void 0 ? void 0 : _b.call(this, { error: 'downloadParams is missing. setDownloadParams must be called before start', errorCode: -2 });
            return;
        }
        this.state = 'DOWNLOADING';
        // kick-off download after returning the task
        getNativeModule().download({
            id: this.id,
            metadata: JSON.stringify(this.metadata),
            progressInterval: config_1.config.progressInterval,
            progressMinBytes: config_1.config.progressMinBytes,
            ...this.downloadParams,
            headers: this.headersToUnsafeObject(this.downloadParams.headers),
            isAllowedOverRoaming: (_c = this.downloadParams.isAllowedOverRoaming) !== null && _c !== void 0 ? _c : false,
            isAllowedOverMetered: (_d = this.downloadParams.isAllowedOverMetered) !== null && _d !== void 0 ? _d : false,
            // iOS-only; ignored on Android. Falls back to the global setConfig default.
            iosDataProtection: (_e = this.downloadParams.iosDataProtection) !== null && _e !== void 0 ? _e : config_1.config.iosDataProtection,
        });
    }
    async stop() {
        (0, logger_1.log)('DownloadTask: stop', this.id);
        this.state = 'STOPPED';
        await getNativeModule().stopTask(this.id);
    }
    tryParseJson(metadata) {
        var _a;
        try {
            if (typeof metadata === 'string')
                return JSON.parse(metadata);
            return (_a = metadata) !== null && _a !== void 0 ? _a : null;
        }
        catch (e) {
            (0, logger_1.log)('DownloadTask tryParseJson', e);
            return null;
        }
    }
    headersToUnsafeObject(headers) {
        if (!headers)
            return undefined;
        // Filter out null values from headers to match native UnsafeObject type
        return Object.keys(headers)
            .reduce((mapped, key) => {
            if (headers[key])
                mapped[key] = headers[key];
            return mapped;
        }, {});
    }
}
exports.DownloadTask = DownloadTask;
