// Simple global event bus for health entry changes (add/edit/delete/sync)
// Screens subscribe to get real-time refresh without navigation.
export type HealthEntryChangedPayload = {
  type: 'add' | 'edit' | 'delete' | 'sync';
  convexId?: string | null;
  watermelonId?: string | null;
  timestamp?: number;
};

type Handler = (payload: HealthEntryChangedPayload) => void;

class HealthEntriesEvents {
  private handlers: Set<Handler> = new Set();

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(payload: HealthEntryChangedPayload) {
    try {
      for (const h of this.handlers) {
        try { h(payload); } catch (err) { console.warn('[HealthEntriesEvents] handler error', err); }
      }
    } finally {
      // Optionally log diagnostics
      console.log(`📡 [EVENT] healthEntryChanged: ${payload.type} convexId=${payload.convexId || 'n/a'} wmId=${payload.watermelonId || 'n/a'}`);
    }
  }
}

export const healthEntriesEvents = new HealthEntriesEvents();
