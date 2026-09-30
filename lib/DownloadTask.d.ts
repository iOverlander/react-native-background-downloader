import { TaskInfo, DownloadTask as DownloadTaskType, BeginHandler, ProgressHandler, DoneHandler, ErrorHandler, BeginHandlerParams, ProgressHandlerParams, DoneHandlerParams, ErrorHandlerParams, TaskInfoNative, DownloadParams, DownloadTaskState, Metadata } from './types';
export declare class DownloadTask {
    id: string;
    metadata: Metadata;
    destination?: string;
    state: DownloadTaskState;
    errorCode: number;
    bytesDownloaded: number;
    bytesTotal: number;
    downloadParams?: DownloadParams;
    beginHandler?: BeginHandler;
    progressHandler?: ProgressHandler;
    doneHandler?: DoneHandler;
    errorHandler?: ErrorHandler;
    constructor(taskParams: TaskInfo | TaskInfoNative, originalTask?: DownloadTaskType);
    begin(handler: BeginHandler): this;
    progress(handler: ProgressHandler): this;
    done(handler: DoneHandler): this;
    error(handler: ErrorHandler): this;
    onBegin(params: BeginHandlerParams): void;
    onProgress(params: ProgressHandlerParams): void;
    onDone(params: DoneHandlerParams): void;
    onError(params: ErrorHandlerParams): void;
    /**
     * Update download parameters.
     * If the task is paused, this will also update headers in the native layer.
     * If the task is in-progress or completed, only the local JS object is updated.
     *
     * @param downloadParams - The new download parameters
     * @returns Promise<boolean> - true if native headers were updated, false otherwise
     */
    setDownloadParams(downloadParams: DownloadParams): Promise<boolean>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    start(): void;
    stop(): Promise<void>;
    tryParseJson(metadata?: string | Metadata | object): Metadata | null;
    private headersToUnsafeObject;
}
