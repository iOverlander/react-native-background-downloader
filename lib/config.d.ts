import { Headers, IosDataProtection, NotificationGroupingMode, NotificationsGroupingConfig, NotificationTexts } from './types';
import type { LogCallback } from './logger';
export declare const DEFAULT_PROGRESS_INTERVAL = 1000;
export declare const DEFAULT_PROGRESS_MIN_BYTES: number;
export declare const DEFAULT_MAX_PARALLEL_DOWNLOADS = 4;
export declare const DEFAULT_ALLOWS_CELLULAR_ACCESS = true;
export declare const DEFAULT_IOS_DATA_PROTECTION: IosDataProtection;
export declare const DEFAULT_NOTIFICATION_TEXTS: Required<NotificationTexts>;
interface ConfigState {
    headers: Headers;
    progressInterval: number;
    progressMinBytes: number;
    isLogsEnabled: boolean;
    logCallback?: LogCallback;
    maxParallelDownloads: number;
    allowsCellularAccess: boolean;
    showNotificationsEnabled: boolean;
    showCompletionNotification: boolean;
    showCancelAction: boolean;
    notificationsGrouping: NotificationsGroupingConfig & {
        mode: NotificationGroupingMode;
    };
    iosDataProtection: IosDataProtection;
}
export declare const config: ConfigState;
export {};
