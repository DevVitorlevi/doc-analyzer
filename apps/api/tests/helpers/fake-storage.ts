import type { StorageProvider } from "@/integrations/storage/s3-storage";
import { StorageError } from "@/integrations/storage/storage-error";

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export function createFakeStorage() {
  const objects = new Map<string, StoredObject>();

  const failures = {
    put: false,
    get: false,
    presign: false,
    delete: false,
  };

  const storage: StorageProvider = {
    async putObject({ key, body, contentType }) {
      if (failures.put) {
        throw new StorageError("put");
      }

      objects.set(key, { body, contentType });
    },

    async getObject(key) {
      if (failures.get) {
        throw new StorageError("get");
      }

      const stored = objects.get(key);

      if (!stored) {
        throw new StorageError("get");
      }

      return stored.body;
    },

    async getPresignedReadUrl(key) {
      if (failures.presign) {
        throw new StorageError("presign");
      }

      return `https://fake-storage.test/${key}`;
    },

    async deleteObject(key) {
      if (failures.delete) {
        throw new StorageError("delete");
      }

      objects.delete(key);
    },
  };

  return {
    storage,
    objects,
    failures,
    reset(): void {
      objects.clear();
      failures.put = false;
      failures.get = false;
      failures.presign = false;
      failures.delete = false;
    },
  };
}
