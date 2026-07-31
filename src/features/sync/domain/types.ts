export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payloadJson: string;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
};

export type EnqueueSyncInput = {
  entityType: string;
  entityId: string;
  operation: string;
  payload: Record<string, unknown>;
};
