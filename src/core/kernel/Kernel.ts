/**
 * EKP Kernel Subsystem
 * Master coordinator for subsystem lifecycles and operational health.
 */

import { SystemState, EventTopic } from '../types';
import { EventBus } from './EventBus';

export interface KernelOptions {
  name?: string;
  version?: string;
  autoStart?: boolean;
}

export class Kernel {
  private state: SystemState = SystemState.UNINITIALIZED;
  private readonly startedAt: number;
  public readonly eventBus: EventBus;
  public readonly name: string;
  public readonly version: string;

  constructor(options: KernelOptions = {}) {
    this.name = options.name || 'EKP-Canonical-Core';
    this.version = options.version || '1.0.0-canonical';
    this.startedAt = Date.now();
    this.eventBus = new EventBus();

    if (options.autoStart) {
      this.initialize();
    }
  }

  /**
   * Boot the EKP system and transition state to READY
   */
  public async initialize(): Promise<void> {
    if (this.state === SystemState.READY) {
      return;
    }

    this.transitionState(SystemState.INITIALIZING, 'System boot initiated');

    await this.eventBus.publish(EventTopic.SYSTEM_LIFECYCLE, 'Kernel', {
      fromState: SystemState.UNINITIALIZED,
      toState: SystemState.INITIALIZING,
      name: this.name,
      version: this.version,
    });

    // Complete initialization
    this.transitionState(SystemState.READY, 'All subsystems initialized successfully');

    await this.eventBus.publish(EventTopic.SYSTEM_LIFECYCLE, 'Kernel', {
      fromState: SystemState.INITIALIZING,
      toState: SystemState.READY,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Safe state transition with lifecycle audit
   */
  public transitionState(newState: SystemState, reason: string): void {
    const oldState = this.state;
    this.state = newState;

    this.eventBus.publish(EventTopic.SYSTEM_LIFECYCLE, 'Kernel', {
      oldState,
      newState,
      reason,
      timestamp: new Date().toISOString(),
    }).catch(err => {
      console.error('[Kernel] Failed to publish state transition event:', err);
    });
  }

  public getState(): SystemState {
    return this.state;
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  public isReady(): boolean {
    return this.state === SystemState.READY;
  }

  public async shutdown(): Promise<void> {
    this.transitionState(SystemState.SHUTTING_DOWN, 'Shutdown requested');
    await this.eventBus.publish(EventTopic.SYSTEM_LIFECYCLE, 'Kernel', {
      state: SystemState.STOPPED,
      uptimeSeconds: this.getUptimeSeconds(),
    });
    this.state = SystemState.STOPPED;
  }
}
