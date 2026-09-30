"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.DEFAULT_NOTIFICATION_TEXTS = exports.DEFAULT_IOS_DATA_PROTECTION = exports.DEFAULT_ALLOWS_CELLULAR_ACCESS = exports.DEFAULT_MAX_PARALLEL_DOWNLOADS = exports.DEFAULT_PROGRESS_MIN_BYTES = exports.DEFAULT_PROGRESS_INTERVAL = void 0;
exports.DEFAULT_PROGRESS_INTERVAL = 1000;
exports.DEFAULT_PROGRESS_MIN_BYTES = 1024 * 1024; // 1MB
exports.DEFAULT_MAX_PARALLEL_DOWNLOADS = 4;
exports.DEFAULT_ALLOWS_CELLULAR_ACCESS = true;
// Lets a background download save its file even while the device is locked
// (after the first unlock since boot). See the iOS background-download notes in the README.
exports.DEFAULT_IOS_DATA_PROTECTION = 'completeUntilFirstUserAuthentication';
// Default notification texts
exports.DEFAULT_NOTIFICATION_TEXTS = {
    downloadTitle: 'Download',
    downloadStarting: 'Starting download...',
    downloadProgress: 'Downloading... {progress}%',
    downloadPaused: 'Paused',
    downloadFinished: 'Download complete',
    downloadCancel: 'Cancel',
    groupTitle: 'Downloads',
    groupText: (count) => `${count} download${count !== 1 ? 's' : ''} in progress`,
};
exports.config = {
    headers: {},
    progressInterval: exports.DEFAULT_PROGRESS_INTERVAL,
    progressMinBytes: exports.DEFAULT_PROGRESS_MIN_BYTES,
    isLogsEnabled: false,
    logCallback: undefined,
    maxParallelDownloads: exports.DEFAULT_MAX_PARALLEL_DOWNLOADS,
    allowsCellularAccess: exports.DEFAULT_ALLOWS_CELLULAR_ACCESS,
    showNotificationsEnabled: false,
    showCompletionNotification: false,
    showCancelAction: false,
    iosDataProtection: exports.DEFAULT_IOS_DATA_PROTECTION,
    notificationsGrouping: {
        enabled: false,
        mode: 'individual',
        texts: exports.DEFAULT_NOTIFICATION_TEXTS,
    },
};
