import { Injectable } from '@nestjs/common';

export interface HeartbeatData {
  version: string;
  totalMemory: number;
  usedMemory: number;
  totalDisk: number;
  usedDisk: number;
  cpuPercent: number;
  servers: Array<{
    uuid: string;
    state: string;
    resources?: Record<string, unknown>;
  }>;
  receivedAt: Date;
}

@Injectable()
export class NodeHeartbeatStore {
  private readonly heartbeats = new Map<string, HeartbeatData>();

  private static readonly OFFLINE_THRESHOLD_MS = 60_000;

  set(nodeId: string, data: HeartbeatData): void {
    this.heartbeats.set(nodeId, data);
  }

  get(nodeId: string): HeartbeatData | undefined {
    return this.heartbeats.get(nodeId);
  }

  isOnline(nodeId: string): boolean {
    const data = this.heartbeats.get(nodeId);
    if (!data) return false;
    return (
      Date.now() - data.receivedAt.getTime() <
      NodeHeartbeatStore.OFFLINE_THRESHOLD_MS
    );
  }

  delete(nodeId: string): void {
    this.heartbeats.delete(nodeId);
  }
}
