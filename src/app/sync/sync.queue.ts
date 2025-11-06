import { Injectable } from '@angular/core';
import { FinPocketDB, SyncQueueEntity } from '../core/services/finpocket-db.service';

export interface SyncOperation {
  id?: number;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  syncedAt?: string;
  retryCount?: number;
  nextRetryAt?: string;
}

const MIN_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 10000;
const MAX_RETRY_COUNT = 10;

@Injectable({ providedIn: 'root' })
export class SyncQueue {
  private isProcessing = false;

  constructor(private readonly db: FinPocketDB) {}

  /**
   * Appends a new operation to the sync queue.
   */
  async append(operation: Omit<SyncOperation, 'id' | 'createdAt'>): Promise<number> {
    const entity: SyncQueueEntity = {
      entityType: operation.entityType,
      entityId: operation.entityId,
      action: operation.action,
      payload: operation.payload,
      createdAt: new Date().toISOString(),
    };

    return await this.db.syncQueue.add(entity);
  }

  /**
   * Processes pending sync operations with exponential backoff.
   */
  async flush(
    syncHandler: (operation: SyncOperation) => Promise<void>
  ): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pending = await this.db.syncQueue
        .where('syncedAt')
        .equals(undefined as any)
        .toArray();

      for (const entity of pending) {
        const operation: SyncOperation = {
          id: entity.id,
          entityType: entity.entityType,
          entityId: entity.entityId,
          action: entity.action,
          payload: entity.payload,
          createdAt: entity.createdAt,
          syncedAt: entity.syncedAt,
        };

        try {
          await syncHandler(operation);
          
          // Mark as synced
          if (operation.id) {
            await this.db.syncQueue.update(operation.id, {
              syncedAt: new Date().toISOString(),
            });
          }
        } catch (error: any) {
          // Handle 401 Unauthorized - cancel and require re-authentication
          if (error?.status === 401 || error?.code === 401) {
            console.warn('Sync operation failed with 401, canceling queue');
            throw new Error('Authentication required');
          }

          // Apply exponential backoff for other errors
          const retryCount = (operation.retryCount || 0) + 1;
          
          if (retryCount >= MAX_RETRY_COUNT) {
            console.error('Max retry count reached, removing operation', operation);
            if (operation.id) {
              await this.db.syncQueue.delete(operation.id);
            }
            continue;
          }

          const backoffMs = Math.min(
            MIN_BACKOFF_MS * Math.pow(2, retryCount - 1),
            MAX_BACKOFF_MS
          );

          console.warn(
            `Sync operation failed, retrying in ${backoffMs}ms (attempt ${retryCount})`,
            error
          );

          if (operation.id) {
            await this.db.syncQueue.update(operation.id, {
              ...entity,
              retryCount,
              nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
            } as any);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clears all pending operations from the queue.
   */
  async clear(): Promise<void> {
    await this.db.syncQueue.clear();
  }

  /**
   * Gets all pending operations.
   */
  async getPending(): Promise<SyncOperation[]> {
    const entities = await this.db.syncQueue
      .where('syncedAt')
      .equals(undefined as any)
      .toArray();

    return entities.map((entity) => ({
      id: entity.id,
      entityType: entity.entityType,
      entityId: entity.entityId,
      action: entity.action,
      payload: entity.payload,
      createdAt: entity.createdAt,
      syncedAt: entity.syncedAt,
    }));
  }
}
