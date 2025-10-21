// Simple event emitter for cross-tab notification bell updates
// Usage: NotificationBellEvent.on('read', callback)
//        NotificationBellEvent.emit('read')

const listeners: Record<string, (() => void)[]> = {};

export const NotificationBellEvent = {
  on(event: string, cb: () => void) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return () => {
      listeners[event] = listeners[event].filter(fn => fn !== cb);
    };
  },
  emit(event: string) {
    (listeners[event] || []).forEach(fn => fn());
  },
};
