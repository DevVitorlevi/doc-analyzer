export type StorageOperation = "put" | "get" | "delete" | "presign";

export class StorageError extends Error {
  readonly operation: StorageOperation;

  constructor(operation: StorageOperation, cause?: unknown) {
    super(`Storage operation failed: ${operation}`, { cause });
    this.name = "StorageError";
    this.operation = operation;
  }
}
