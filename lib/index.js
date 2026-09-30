"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directories = exports.getExistingUploadTasks = exports.completeHandler = exports.getExistingDownloadTasks = void 0;
exports.cleanup = cleanup;
exports.setConfig = setConfig;
exports.createDownloadTask = createDownloadTask;
exports.createUploadTask = createUploadTask;
exports.getNativeModule = getNativeModule;
const react_native_1 = require("react-native");
const DownloadTask_1 = require("./DownloadTask");
const UploadTask_1 = require("./UploadTask");
const config_1 = require("./config");
const logger_1 = require("./logger");
const notifications_1 = require("./notifications");
// Lazy initialization state
let RNBackgroundDownloader = null;
let turboModule = null;
let isIOSNewArchitecture = false;
let isInitialized = false;
/**
 * Lazily initialize the native module.
 * This is called on first actual use of the module, not at import time.
 * This prevents issues with module loading before React Native's bridge is ready.
 */
function ensureNativeModuleInitialized() {
    if (isInitialized && RNBackgroundDownloader != null)
        return RNBackgroundDownloader;
    // Try TurboModules first
    turboModule = react_native_1.TurboModuleRegistry.get('RNBackgroundDownloader');
    // Check if iOS new architecture event emitters are available
    // On Android, we always use NativeEventEmitter because Android uses RCTDeviceEventEmitter
    isIOSNewArchitecture = react_native_1.Platform.OS === 'ios' && turboModule != null && typeof turboModule.onDownloadBegin === 'function';
    if (isIOSNewArchitecture && turboModule) {
        // New architecture: TurboModules use getConstants() method
        const constants = turboModule.getConstants();
        RNBackgroundDownloader = Object.assign(turboModule, constants);
    }
    else {
        // Fall back to old architecture - must use NativeModules for proper event emission
        RNBackgroundDownloader = react_native_1.NativeModules.RNBackgroundDownloader;
        // For old architecture, constants may need to be fetched via getConstants() as well
        if (RNBackgroundDownloader && !RNBackgroundDownloader.documents && typeof RNBackgroundDownloader.getConstants === 'function') {
            const constants = RNBackgroundDownloader.getConstants();
            if (constants)
                Object.assign(RNBackgroundDownloader, constants);
        }
    }
    if (!RNBackgroundDownloader)
        throw new Error('The package \'@kesha-antonov/react-native-background-downloader\' doesn\'t seem to be linked. Make sure: \n\n' +
            react_native_1.Platform.select({ ios: '- You have run \'pod install\'\n', default: '' }) +
            '- You rebuilt the app after installing the package\n' +
            '- You are not using Expo Go\n');
    isInitialized = true;
    // Initialize event listeners after native module is ready
    initializeEventListeners();
    return RNBackgroundDownloader;
}
const MIN_PROGRESS_INTERVAL = 250;
const tasksMap = new Map();
const uploadTasksMap = new Map();
// Set up event listeners based on architecture
// For old architecture, we need to defer NativeEventEmitter creation
// to avoid issues during module initialization
let eventListenersInitialized = false;
let eventSubscriptions = [];
/**
 * Clean up event listeners. Call this before hot reload or module invalidation.
 * This prevents memory leaks from accumulated event listeners.
 */
function cleanup() {
    for (const subscription of eventSubscriptions)
        subscription.remove();
    eventSubscriptions = [];
    eventListenersInitialized = false;
    isInitialized = false;
    // Clear module references to allow proper re-initialization
    RNBackgroundDownloader = null;
    turboModule = null;
    isIOSNewArchitecture = false;
    tasksMap.clear();
    uploadTasksMap.clear();
}
function initializeEventListeners() {
    var _a, _b, _c, _d;
    if (eventListenersInitialized)
        return;
    eventListenersInitialized = true;
    if (isIOSNewArchitecture && turboModule) {
        // iOS new architecture: use EventEmitter from TurboModule spec
        turboModule.onDownloadBegin((data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadBegin', id, rest);
            const task = tasksMap.get(id);
            if (!task) {
                (0, logger_1.log)('downloadBegin: task not found in tasksMap', id);
                return;
            }
            task.onBegin(rest);
        });
        turboModule.onDownloadProgress((events) => {
            (0, logger_1.log)('downloadProgress', events);
            for (const event of events) {
                const { id, ...rest } = event;
                const task = tasksMap.get(id);
                if (task)
                    task.onProgress(rest);
            }
        });
        turboModule.onDownloadComplete((data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadComplete', id, rest);
            const task = tasksMap.get(id);
            if (!task)
                (0, logger_1.log)('downloadComplete: task not found in tasksMap', id);
            else
                task.onDone(rest);
            tasksMap.delete(id);
        });
        turboModule.onDownloadFailed((data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadFailed', id, rest);
            const task = tasksMap.get(id);
            if (!task)
                (0, logger_1.log)('downloadFailed: task not found in tasksMap', id);
            else
                task.onError(rest);
            tasksMap.delete(id);
        });
        // Upload events for new architecture (optional - may not exist in all versions)
        if (typeof turboModule.onUploadBegin === 'function') {
            (_a = turboModule.onUploadBegin) === null || _a === void 0 ? void 0 : _a.call(turboModule, (data) => {
                const { id, ...rest } = data;
                (0, logger_1.log)('uploadBegin', id, rest);
                const task = uploadTasksMap.get(id);
                if (!task) {
                    (0, logger_1.log)('uploadBegin: task not found in uploadTasksMap', id);
                    return;
                }
                task.onBegin(rest);
            });
            (_b = turboModule.onUploadProgress) === null || _b === void 0 ? void 0 : _b.call(turboModule, (events) => {
                (0, logger_1.log)('uploadProgress', events);
                for (const event of events) {
                    const { id, ...rest } = event;
                    const task = uploadTasksMap.get(id);
                    if (task)
                        task.onProgress(rest);
                }
            });
            (_c = turboModule.onUploadComplete) === null || _c === void 0 ? void 0 : _c.call(turboModule, (data) => {
                const { id, ...rest } = data;
                (0, logger_1.log)('uploadComplete', id, rest);
                const task = uploadTasksMap.get(id);
                if (!task)
                    (0, logger_1.log)('uploadComplete: task not found in uploadTasksMap', id);
                else
                    task.onDone(rest);
                uploadTasksMap.delete(id);
            });
            (_d = turboModule.onUploadFailed) === null || _d === void 0 ? void 0 : _d.call(turboModule, (data) => {
                const { id, ...rest } = data;
                (0, logger_1.log)('uploadFailed', id, rest);
                const task = uploadTasksMap.get(id);
                if (!task)
                    (0, logger_1.log)('uploadFailed: task not found in uploadTasksMap', id);
                else
                    task.onError(rest);
                uploadTasksMap.delete(id);
            });
        }
    }
    else {
        // Old architecture: use NativeEventEmitter with the native module
        // RCTEventEmitter on native side requires NativeEventEmitter on JS side
        // RNBackgroundDownloader is guaranteed to be non-null here since initializeEventListeners
        // is only called after ensureNativeModuleInitialized() succeeds
        const eventEmitter = new react_native_1.NativeEventEmitter(RNBackgroundDownloader);
        eventSubscriptions.push(eventEmitter.addListener('downloadBegin', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadBegin', id, rest);
            const task = tasksMap.get(id);
            if (!task) {
                (0, logger_1.log)('downloadBegin: task not found in tasksMap', id);
                return;
            }
            task.onBegin(rest);
        }));
        eventSubscriptions.push(eventEmitter.addListener('downloadProgress', (events) => {
            (0, logger_1.log)('downloadProgress', events);
            for (const event of events) {
                const { id, ...rest } = event;
                const task = tasksMap.get(id);
                if (task)
                    task.onProgress(rest);
            }
        }));
        eventSubscriptions.push(eventEmitter.addListener('downloadComplete', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadComplete', id, rest);
            const task = tasksMap.get(id);
            if (!task)
                (0, logger_1.log)('downloadComplete: task not found in tasksMap', id);
            else
                task.onDone(rest);
            tasksMap.delete(id);
        }));
        eventSubscriptions.push(eventEmitter.addListener('downloadFailed', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('downloadFailed', id, rest);
            const task = tasksMap.get(id);
            if (!task)
                (0, logger_1.log)('downloadFailed: task not found in tasksMap', id);
            else
                task.onError(rest);
            tasksMap.delete(id);
        }));
        // Upload events for old architecture
        eventSubscriptions.push(eventEmitter.addListener('uploadBegin', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('uploadBegin', id, rest);
            const task = uploadTasksMap.get(id);
            if (!task) {
                (0, logger_1.log)('uploadBegin: task not found in uploadTasksMap', id);
                return;
            }
            task.onBegin(rest);
        }));
        eventSubscriptions.push(eventEmitter.addListener('uploadProgress', (events) => {
            (0, logger_1.log)('uploadProgress', events);
            for (const event of events) {
                const { id, ...rest } = event;
                const task = uploadTasksMap.get(id);
                if (task)
                    task.onProgress(rest);
            }
        }));
        eventSubscriptions.push(eventEmitter.addListener('uploadComplete', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('uploadComplete', id, rest);
            const task = uploadTasksMap.get(id);
            if (!task)
                (0, logger_1.log)('uploadComplete: task not found in uploadTasksMap', id);
            else
                task.onDone(rest);
            uploadTasksMap.delete(id);
        }));
        eventSubscriptions.push(eventEmitter.addListener('uploadFailed', (data) => {
            const { id, ...rest } = data;
            (0, logger_1.log)('uploadFailed', id, rest);
            const task = uploadTasksMap.get(id);
            if (!task)
                (0, logger_1.log)('uploadFailed: task not found in uploadTasksMap', id);
            else
                task.onError(rest);
            uploadTasksMap.delete(id);
        }));
        // Native debug log events - forward native iOS logs to JS logCallback
        eventSubscriptions.push(eventEmitter.addListener('nativeDebugLog', (data) => {
            (0, logger_1.log)('[Native]', data.taskId || '', data.message);
        }));
    }
}
// Event listeners are now initialized lazily when ensureNativeModuleInitialized() is called
// This ensures the bridge is ready before any native module access
function setConfig({ headers = {}, progressInterval = config_1.DEFAULT_PROGRESS_INTERVAL, progressMinBytes = config_1.DEFAULT_PROGRESS_MIN_BYTES, isLogsEnabled = false, logCallback, maxParallelDownloads, allowsCellularAccess, showNotificationsEnabled, showCompletionNotification, showCancelAction, notificationsGrouping, iosDataProtection, }) {
    var _a, _b, _c, _d, _e;
    config_1.config.headers = headers;
    if (iosDataProtection !== undefined)
        config_1.config.iosDataProtection = iosDataProtection;
    if (progressInterval >= MIN_PROGRESS_INTERVAL)
        config_1.config.progressInterval = progressInterval;
    else
        console.warn(`[RNBackgroundDownloader] progressInterval must be a number >= ${MIN_PROGRESS_INTERVAL}. You passed ${progressInterval}`);
    if (progressMinBytes >= 0)
        config_1.config.progressMinBytes = progressMinBytes;
    else
        console.warn(`[RNBackgroundDownloader] progressMinBytes must be a number >= 0. You passed ${progressMinBytes}`);
    if (maxParallelDownloads !== undefined)
        if (maxParallelDownloads >= 1)
            config_1.config.maxParallelDownloads = maxParallelDownloads;
        else
            console.warn(`[RNBackgroundDownloader] maxParallelDownloads must be a number >= 1. You passed ${maxParallelDownloads}`);
    if (allowsCellularAccess !== undefined)
        config_1.config.allowsCellularAccess = allowsCellularAccess;
    // Update showNotificationsEnabled
    if (showNotificationsEnabled !== undefined)
        config_1.config.showNotificationsEnabled = showNotificationsEnabled;
    // Android 14+ notification extras - both opt-in
    if (showCompletionNotification !== undefined)
        config_1.config.showCompletionNotification = showCompletionNotification;
    if (showCancelAction !== undefined)
        config_1.config.showCancelAction = showCancelAction;
    // Update notification grouping config
    if (notificationsGrouping !== undefined)
        config_1.config.notificationsGrouping = {
            enabled: (_a = notificationsGrouping.enabled) !== null && _a !== void 0 ? _a : false,
            mode: (_b = notificationsGrouping.mode) !== null && _b !== void 0 ? _b : 'individual',
            texts: {
                ...config_1.DEFAULT_NOTIFICATION_TEXTS,
                ...notificationsGrouping.texts,
            },
        };
    config_1.config.isLogsEnabled = isLogsEnabled;
    config_1.config.logCallback = logCallback;
    // Notify native side about configuration changes
    try {
        const nativeModule = ensureNativeModuleInitialized();
        if (nativeModule.setLogsEnabled)
            nativeModule.setLogsEnabled(isLogsEnabled);
        // Only call native methods if config was successfully updated
        if (nativeModule.setMaxParallelDownloads && maxParallelDownloads !== undefined && maxParallelDownloads >= 1)
            nativeModule.setMaxParallelDownloads(config_1.config.maxParallelDownloads);
        if (nativeModule.setAllowsCellularAccess && allowsCellularAccess !== undefined)
            nativeModule.setAllowsCellularAccess(config_1.config.allowsCellularAccess);
        // Update notification config on native side (Android)
        if (react_native_1.Platform.OS === 'android' && nativeModule.setNotificationGroupingConfig)
            nativeModule.setNotificationGroupingConfig({
                enabled: config_1.config.notificationsGrouping.enabled,
                showNotificationsEnabled: (_c = config_1.config.showNotificationsEnabled) !== null && _c !== void 0 ? _c : false,
                showCompletionNotification: (_d = config_1.config.showCompletionNotification) !== null && _d !== void 0 ? _d : false,
                showCancelAction: (_e = config_1.config.showCancelAction) !== null && _e !== void 0 ? _e : false,
                mode: config_1.config.notificationsGrouping.mode,
                texts: (0, notifications_1.getNotificationTextsForNative)(),
            });
    }
    catch {
        // Ignore if native module is not available yet
    }
}
const getExistingDownloadTasks = async () => {
    const nativeModule = ensureNativeModuleInitialized();
    const downloads = await nativeModule.getExistingDownloadTasks();
    const downloadTasks = downloads.map(downloadInfo => {
        var _a;
        // Parse metadata from JSON string to object
        let metadata = {};
        if (downloadInfo.metadata)
            try {
                metadata = JSON.parse(downloadInfo.metadata);
            }
            catch {
                // Keep empty object if parsing fails
            }
        const taskInfo = {
            ...downloadInfo,
            metadata,
            errorCode: (_a = downloadInfo.errorCode) !== null && _a !== void 0 ? _a : 0,
        };
        // second argument re-assigns event handlers
        const task = new DownloadTask_1.DownloadTask(taskInfo, tasksMap.get(taskInfo.id));
        switch (taskInfo.state) {
            case nativeModule.TaskRunning: {
                task.state = 'DOWNLOADING';
                break;
            }
            case nativeModule.TaskSuspended: {
                task.state = 'PAUSED';
                break;
            }
            case nativeModule.TaskCanceling: {
                // On iOS, paused tasks (via cancelByProducingResumeData) are in Canceling state with errorCode -999
                if (taskInfo.errorCode === -999) {
                    task.state = 'PAUSED';
                }
                else {
                    task.stop();
                    return undefined;
                }
                break;
            }
            case nativeModule.TaskCompleted: {
                if (taskInfo.bytesDownloaded === taskInfo.bytesTotal)
                    task.state = 'DONE';
                else
                    // IOS completed the download but it was not done.
                    return undefined;
            }
        }
        return task;
    }).filter((task) => task !== undefined);
    for (const task of downloadTasks)
        tasksMap.set(task.id, task);
    return downloadTasks;
};
exports.getExistingDownloadTasks = getExistingDownloadTasks;
const completeHandler = (jobId) => {
    if (jobId == null) {
        (0, logger_1.log)('completeHandler: jobId is empty');
        return;
    }
    const nativeModule = ensureNativeModuleInitialized();
    return nativeModule.completeHandler(jobId);
};
exports.completeHandler = completeHandler;
function createDownloadTask({ isAllowedOverRoaming = true, isAllowedOverMetered = true, metadata, ...rest }) {
    // Ensure native module and event listeners are initialized before creating tasks
    ensureNativeModuleInitialized();
    if (!rest.id || !rest.url || !rest.destination)
        throw new Error('[RNBackgroundDownloader] id, url and destination are required');
    rest.headers = { ...config_1.config.headers, ...rest.headers };
    rest.destination = rest.destination.replace('file://', '');
    const task = new DownloadTask_1.DownloadTask({
        id: rest.id,
        metadata,
    });
    task.setDownloadParams({
        isAllowedOverRoaming,
        isAllowedOverMetered,
        ...rest,
    });
    tasksMap.set(rest.id, task);
    return task;
}
const getExistingUploadTasks = async () => {
    const nativeModule = ensureNativeModuleInitialized();
    if (!nativeModule.getExistingUploadTasks) {
        (0, logger_1.log)('getExistingUploadTasks: not supported - native implementation missing');
        return [];
    }
    const uploads = await nativeModule.getExistingUploadTasks();
    const uploadTasks = uploads.map(uploadInfo => {
        var _a;
        // Parse metadata from JSON string to object
        let metadata = {};
        if (uploadInfo.metadata)
            try {
                metadata = JSON.parse(uploadInfo.metadata);
            }
            catch {
                // Keep empty object if parsing fails
            }
        const taskInfo = {
            ...uploadInfo,
            metadata,
            errorCode: (_a = uploadInfo.errorCode) !== null && _a !== void 0 ? _a : 0,
        };
        // second argument re-assigns event handlers
        const task = new UploadTask_1.UploadTask(taskInfo, uploadTasksMap.get(taskInfo.id));
        switch (taskInfo.state) {
            case nativeModule.TaskRunning: {
                task.state = 'UPLOADING';
                break;
            }
            case nativeModule.TaskSuspended: {
                task.state = 'PAUSED';
                break;
            }
            case nativeModule.TaskCanceling: {
                // On iOS, paused tasks (via cancelByProducingResumeData) are in Canceling state with errorCode -999
                if (taskInfo.errorCode === -999) {
                    task.state = 'PAUSED';
                }
                else {
                    task.stop();
                    return undefined;
                }
                break;
            }
            case nativeModule.TaskCompleted: {
                if (taskInfo.bytesUploaded === taskInfo.bytesTotal)
                    task.state = 'DONE';
                else
                    // IOS completed the upload but it was not done.
                    return undefined;
            }
        }
        return task;
    }).filter((task) => task !== undefined);
    for (const task of uploadTasks)
        uploadTasksMap.set(task.id, task);
    return uploadTasks;
};
exports.getExistingUploadTasks = getExistingUploadTasks;
function createUploadTask({ isAllowedOverRoaming = true, isAllowedOverMetered = true, metadata, ...rest }) {
    // Ensure native module and event listeners are initialized before creating tasks
    ensureNativeModuleInitialized();
    if (!rest.id || !rest.url || !rest.source)
        throw new Error('[RNBackgroundDownloader] id, url and source are required');
    rest.headers = { ...config_1.config.headers, ...rest.headers };
    rest.source = rest.source.replace('file://', '');
    const task = new UploadTask_1.UploadTask({
        id: rest.id,
        metadata,
    });
    task.setUploadParams({
        isAllowedOverRoaming,
        isAllowedOverMetered,
        ...rest,
    });
    uploadTasksMap.set(rest.id, task);
    return task;
}
// Use getter to lazily initialize native module when directories are accessed
exports.directories = {
    get documents() {
        return ensureNativeModuleInitialized().documents;
    },
};
/**
 * Get the native module instance.
 * This is exported for internal use by DownloadTask to avoid duplicating
 * the TurboModule/NativeModule lookup logic.
 * @internal
 */
function getNativeModule() {
    return ensureNativeModuleInitialized();
}
