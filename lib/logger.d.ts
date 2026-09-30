export type LogCallback = (tag: string, message: string, ...args: unknown[]) => void;
export declare const log: (...args: unknown[]) => void;
