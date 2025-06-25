/**
 * Global EventBus for inter-service communication
 */

import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to avoid warnings
    this.setMaxListeners(50);
  }
}

export const eventBus = new EventBus();