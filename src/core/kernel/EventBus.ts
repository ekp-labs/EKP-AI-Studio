import { EventTopic } from '../types.js';

export type EventCallback = (data: any) => void;

export class EventBus {
  private listeners: Map<EventTopic, Set<EventCallback>> = new Map();

  public subscribe(topic: EventTopic, callback: EventCallback): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    return () => {
      const set = this.listeners.get(topic);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public publish(topic: EventTopic, data: any): void {
    const set = this.listeners.get(topic);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in event listener for topic ${topic}:`, err);
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
