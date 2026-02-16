import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';

export interface SseEvent {
  type: string;
  data: Record<string, unknown>;
  targetUserIds?: string[];
}

interface SseConnection {
  subject: Subject<MessageEvent>;
  userId: string;
  isAdmin: boolean;
}

const ADMIN_ONLY_EVENTS = new Set([
  'node.status',
  'node.heartbeat',
]);

const OWNER_EVENTS = new Set([
  'server.status',
  'server.install.complete',
  'server.install.failed',
  'server.created',
  'server.deleted',
  'server.stats',
  'server.console',
]);

@Injectable()
export class SseService {
  private readonly connections = new Map<string, SseConnection>();
  private readonly keepaliveInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.keepaliveInterval = setInterval(() => {
      for (const conn of this.connections.values()) {
        conn.subject.next({ data: ':keepalive\n' } as MessageEvent);
      }
    }, 30_000);
  }

  addConnection(userId: string, isAdmin: boolean): { id: string; observable: Observable<MessageEvent> } {
    const connectionId = uuid();
    const subject = new Subject<MessageEvent>();

    this.connections.set(connectionId, { subject, userId, isAdmin });

    return { id: connectionId, observable: subject.asObservable() };
  }

  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.subject.complete();
      this.connections.delete(connectionId);
    }
  }

  emit(event: SseEvent): void {
    for (const conn of this.connections.values()) {
      if (this.shouldReceive(conn, event)) {
        conn.subject.next({ data: event.data, type: event.type } as MessageEvent);
      }
    }
  }

  emitToUser(userId: string, event: SseEvent): void {
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) {
        conn.subject.next({ data: event.data, type: event.type } as MessageEvent);
      }
    }
  }

  private shouldReceive(conn: SseConnection, event: SseEvent): boolean {
    if (event.targetUserIds?.length) {
      return event.targetUserIds.includes(conn.userId);
    }

    if (ADMIN_ONLY_EVENTS.has(event.type)) {
      return conn.isAdmin;
    }

    if (OWNER_EVENTS.has(event.type)) {
      return conn.isAdmin;
    }

    // admin.announcement → all users
    return true;
  }
}
