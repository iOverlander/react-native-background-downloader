import { DownloadTask } from './DownloadTask';
import { UploadTask } from './UploadTask';
import { Config, DownloadParams, TaskInfo, UploadParams, UploadTaskInfo } from './types';
import type { Spec } from './NativeRNBackgroundDownloader';
/**
 * Clean up event listeners. Call this before hot reload or module invalidation.
 * This prevents memory leaks from accumulated event listeners.
 */
export declare function cleanup(): void;
export declare function setConfig({ headers, progressInterval, progressMinBytes, isLogsEnabled, logCallback, maxParallelDownloads, allowsCellularAccess, showNotificationsEnabled, showCompletionNotification, showCancelAction, notificationsGrouping, iosDataProtection, }: Config): void;
export declare const getExistingDownloadTasks: () => Promise<DownloadTask[]>;
export declare const completeHandler: (jobId: string) => Promise<void> | undefined;
export declare function createDownloadTask({ isAllowedOverRoaming, isAllowedOverMetered, metadata, ...rest }: TaskInfo & DownloadParams): DownloadTask;
export declare const getExistingUploadTasks: () => Promise<UploadTask[]>;
export declare function createUploadTask({ isAllowedOverRoaming, isAllowedOverMetered, metadata, ...rest }: UploadTaskInfo & UploadParams): UploadTask;
export declare const directories: {
    readonly documents: string;
};
/**
 * Get the native module instance.
 * This is exported for internal use by DownloadTask to avoid duplicating
 * the TurboModule/NativeModule lookup logic.
 * @internal
 */
export declare function getNativeModule(): Spec;
export type * from './types';
