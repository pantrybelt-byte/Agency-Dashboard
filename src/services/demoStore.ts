/**
 * A tiny observable collection backing the demonstration data path.
 *
 * Without this, writes made in demo mode (scheduling a report, adding a
 * threshold alert) would vanish or need a parallel code path in every
 * component. With it, demo and Firestore expose the identical
 * subscribe/add/remove surface, so the UI never branches on which is active.
 */
export type Listener<T> = (items: T[]) => void;

export class DemoCollection<T> {
  private items: T[];
  private readonly listeners = new Set<Listener<T>>();

  constructor(seed: T[]) {
    this.items = [...seed];
  }

  /** Emits the current contents immediately, then on every change. */
  subscribe(listener: Listener<T>): () => void {
    listener(this.items);
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): T[] {
    return this.items;
  }

  add(item: T): void {
    this.items = [item, ...this.items];
    this.emit();
  }

  remove(predicate: (item: T) => boolean): void {
    this.items = this.items.filter((item) => !predicate(item));
    this.emit();
  }

  update(predicate: (item: T) => boolean, patch: (item: T) => T): void {
    this.items = this.items.map((item) => (predicate(item) ? patch(item) : item));
    this.emit();
  }

  private emit(): void {
    // Copy first: a listener that unsubscribes during iteration would
    // otherwise mutate the set we are walking.
    for (const listener of [...this.listeners]) listener(this.items);
  }
}
