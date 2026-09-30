"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadTask = void 0;
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
class UploadTask {
    constructor(taskParams, originalTask) {
        var _a;
        this.id = '';
        this.metadata = {};
        this.state = 'PENDING';
        this.errorCode = 0;
        this.bytesUploaded = 0;
        this.bytesTotal = 0;
        this.id = taskParams.id;
        if (taskParams.bytesUploaded)
            this.bytesUploaded = taskParams.bytesUploaded;
        if (taskParams.bytesTotal)
            this.bytesTotal = taskParams.bytesTotal;
        this.metadata = (_a = this.tryParseJson(taskParams.metadata)) !== null && _a !== void 0 ? _a : {};
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
        this.state = 'UPLOADING';
        this.bytesTotal = params.expectedBytes;
        (_a = this.beginHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onProgress(params) {
        var _a;
        this.bytesUploaded = params.bytesUploaded;
        this.bytesTotal = params.bytesTotal;
        (_a = this.progressHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onDone(params) {
        var _a;
        this.state = 'DONE';
        this.bytesUploaded = params.bytesUploaded;
        this.bytesTotal = params.bytesTotal;
        (_a = this.doneHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    onError(params) {
        var _a;
        this.state = 'FAILED';
        (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, params);
    }
    // methods
    setUploadParams(uploadParams) {
        this.uploadParams = uploadParams;
    }
    async pause() {
        (0, logger_1.log)('UploadTask: pause', this.id);
        this.state = 'PAUSED';
        const nativeModule = getNativeModule();
        if (nativeModule.pauseUploadTask)
            await nativeModule.pauseUploadTask(this.id);
        else
            (0, logger_1.log)('UploadTask: pause not supported - native implementation missing');
    }
    async resume() {
        (0, logger_1.log)('UploadTask: resume', this.id);
        this.state = 'UPLOADING';
        this.errorCode = 0;
        const nativeModule = getNativeModule();
        if (nativeModule.resumeUploadTask)
            await nativeModule.resumeUploadTask(this.id);
        else
            (0, logger_1.log)('UploadTask: resume not supported - native implementation missing');
    }
    start() {
        var _a, _b, _c, _d, _e, _f;
        if (this.state !== 'PENDING') {
            (0, logger_1.log)('UploadTask: start. Upload already started, can\' start again... ', this.id);
            (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, { error: 'Upload already started', errorCode: -1 });
            return;
        }
        if (!this.uploadParams) {
            (0, logger_1.log)('UploadTask: start. uploadParams is missing. "setUploadParams" wasn\'t called before "start"', this.id);
            (_b = this.errorHandler) === null || _b === void 0 ? void 0 : _b.call(this, { error: 'uploadParams is missing. setUploadParams must be called before start', errorCode: -2 });
            return;
        }
        const nativeModule = getNativeModule();
        if (!nativeModule.upload) {
            (0, logger_1.log)('UploadTask: start. Upload not supported - native implementation missing');
            (_c = this.errorHandler) === null || _c === void 0 ? void 0 : _c.call(this, { error: 'Upload not supported - native implementation missing', errorCode: -3 });
            return;
        }
        this.state = 'UPLOADING';
        // kick-off upload after returning the task
        nativeModule.upload({
            id: this.id,
            metadata: JSON.stringify(this.metadata),
            progressInterval: config_1.config.progressInterval,
            progressMinBytes: config_1.config.progressMinBytes,
            ...this.uploadParams,
            method: (_d = this.uploadParams.method) !== null && _d !== void 0 ? _d : 'POST',
            headers: this.headersToUnsafeObject(this.uploadParams.headers),
            isAllowedOverRoaming: (_e = this.uploadParams.isAllowedOverRoaming) !== null && _e !== void 0 ? _e : false,
            isAllowedOverMetered: (_f = this.uploadParams.isAllowedOverMetered) !== null && _f !== void 0 ? _f : false,
        });
    }
    async stop() {
        (0, logger_1.log)('UploadTask: stop', this.id);
        this.state = 'STOPPED';
        const nativeModule = getNativeModule();
        if (nativeModule.stopUploadTask)
            await nativeModule.stopUploadTask(this.id);
        else
            (0, logger_1.log)('UploadTask: stop not supported - native implementation missing');
    }
    tryParseJson(metadata) {
        var _a;
        try {
            if (typeof metadata === 'string')
                return JSON.parse(metadata);
            return (_a = metadata) !== null && _a !== void 0 ? _a : null;
        }
        catch (e) {
            (0, logger_1.log)('UploadTask tryParseJson', e);
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
exports.UploadTask = UploadTask;
