export interface OgmiosMiniProtocol<T> {
    createClient(args: T): Promise<void>;
    isConnected(): Promise<boolean>;
    close(): Promise<void>;
}