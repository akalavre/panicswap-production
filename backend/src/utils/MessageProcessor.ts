/**
 * MessageProcessor - High-performance WebSocket message processing
 * Optimized for sub-100ms threat detection
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import * as path from 'path';

interface ProcessingMetrics {
    totalMessages: number;
    processedMessages: number;
    avgProcessingTime: number;
    p95ProcessingTime: number;
    p99ProcessingTime: number;
    droppedMessages: number;
}

interface MessageBatch {
    messages: any[];
    priority: 'critical' | 'high' | 'normal' | 'low';
    timestamp: number;
}

export class MessageProcessor extends EventEmitter {
    private messageQueue: MessageBatch[] = [];
    private workers: Worker[] = [];
    private workerPool: Worker[] = [];
    private processingTimes: number[] = [];
    private metrics: ProcessingMetrics = {
        totalMessages: 0,
        processedMessages: 0,
        avgProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        droppedMessages: 0
    };
    
    // Configuration
    private readonly config = {
        workerCount: 4,
        batchSize: 10,
        maxQueueSize: 1000,
        processingTimeout: 100, // 100ms target
        metricsWindowSize: 1000
    };
    
    constructor(config?: Partial<typeof MessageProcessor.prototype.config>) {
        super();
        
        // Override config if provided
        if (config) {
            Object.assign(this.config, config);
        }
        
        // Initialize worker pool
        this.initializeWorkers();
        
        // Start processing loop
        this.startProcessingLoop();
        
        console.log(`[MessageProcessor] Initialized with ${this.config.workerCount} workers`);
    }
    
    /**
     * Initialize worker threads
     */
    private initializeWorkers(): void {
        const workerPath = path.join(__dirname, 'messageWorker.js');
        
        for (let i = 0; i < this.config.workerCount; i++) {
            const worker = new Worker(workerPath);
            
            worker.on('message', (result) => {
                this.handleWorkerResult(result);
            });
            
            worker.on('error', (error) => {
                console.error(`[MessageProcessor] Worker error:`, error);
                // Replace failed worker
                this.replaceWorker(worker);
            });
            
            this.workers.push(worker);
            this.workerPool.push(worker);
        }
    }
    
    /**
     * Replace a failed worker
     */
    private replaceWorker(failedWorker: Worker): void {
        const index = this.workers.indexOf(failedWorker);
        if (index >= 0) {
            failedWorker.terminate();
            
            const workerPath = path.join(__dirname, 'messageWorker.js');
            const newWorker = new Worker(workerPath);
            
            newWorker.on('message', (result) => {
                this.handleWorkerResult(result);
            });
            
            newWorker.on('error', (error) => {
                console.error(`[MessageProcessor] Worker error:`, error);
                this.replaceWorker(newWorker);
            });
            
            this.workers[index] = newWorker;
            this.workerPool.push(newWorker);
        }
    }
    
    /**
     * Process a message with priority
     */
    async processMessage(message: any, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
        const startTime = Date.now();
        
        this.metrics.totalMessages++;
        
        // Check queue size
        if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
            // Drop low priority messages if queue is full
            if (priority === 'low') {
                this.metrics.droppedMessages++;
                this.emit('messageDropped', message);
                return;
            }
            
            // For higher priority, drop oldest low priority batch
            this.dropOldestLowPriorityBatch();
        }
        
        // Add to appropriate batch
        this.addToBatch(message, priority);
        
        // Track enqueue time
        const enqueueTime = Date.now() - startTime;
        if (enqueueTime > 10) {
            console.warn(`[MessageProcessor] Slow enqueue: ${enqueueTime}ms`);
        }
    }
    
    /**
     * Add message to batch
     */
    private addToBatch(message: any, priority: 'critical' | 'high' | 'normal' | 'low'): void {
        // Find existing batch or create new one
        let batch = this.messageQueue.find(b => 
            b.priority === priority && 
            b.messages.length < this.config.batchSize
        );
        
        if (!batch) {
            batch = {
                messages: [],
                priority,
                timestamp: Date.now()
            };
            
            // Insert batch in priority order
            const insertIndex = this.messageQueue.findIndex(b => 
                this.getPriorityValue(b.priority) < this.getPriorityValue(priority)
            );
            
            if (insertIndex >= 0) {
                this.messageQueue.splice(insertIndex, 0, batch);
            } else {
                this.messageQueue.push(batch);
            }
        }
        
        batch.messages.push(message);
    }
    
    /**
     * Get priority numeric value
     */
    private getPriorityValue(priority: string): number {
        const values: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };
        return values[priority] || 0;
    }
    
    /**
     * Get total queue size
     */
    private getTotalQueueSize(): number {
        return this.messageQueue.reduce((total, batch) => total + batch.messages.length, 0);
    }
    
    /**
     * Drop oldest low priority batch
     */
    private dropOldestLowPriorityBatch(): void {
        const lowPriorityIndex = this.messageQueue.findIndex(b => b.priority === 'low');
        if (lowPriorityIndex >= 0) {
            const dropped = this.messageQueue.splice(lowPriorityIndex, 1)[0];
            this.metrics.droppedMessages += dropped.messages.length;
            this.emit('batchDropped', dropped);
        }
    }
    
    /**
     * Start the processing loop
     */
    private startProcessingLoop(): void {
        setImmediate(() => this.processBatches());
    }
    
    /**
     * Process message batches
     */
    private async processBatches(): Promise<void> {
        // Get available worker
        const worker = this.workerPool.shift();
        
        if (worker && this.messageQueue.length > 0) {
            const batch = this.messageQueue.shift()!;
            const startTime = Date.now();
            
            // Send batch to worker
            worker.postMessage({
                type: 'processBatch',
                batch: batch.messages,
                priority: batch.priority,
                timestamp: batch.timestamp
            });
            
            // Set timeout for processing
            const timeoutId = setTimeout(() => {
                console.warn(`[MessageProcessor] Batch processing timeout for ${batch.priority} priority`);
                this.workerPool.push(worker);
                this.metrics.droppedMessages += batch.messages.length;
            }, this.config.processingTimeout);
            
            // Store timeout for cleanup
            worker.once('message', () => {
                clearTimeout(timeoutId);
            });
        }
        
        // Continue processing
        setImmediate(() => this.processBatches());
    }
    
    /**
     * Handle worker result
     */
    private handleWorkerResult(result: any): void {
        const { processingTime, results, worker } = result;
        
        // Return worker to pool
        if (worker) {
            this.workerPool.push(worker);
        }
        
        // Update metrics
        this.updateMetrics(processingTime);
        
        // Emit results
        if (results && results.length > 0) {
            for (const item of results) {
                if (item.threat) {
                    this.emit('threatDetected', item);
                }
            }
            
            this.metrics.processedMessages += results.length;
        }
    }
    
    /**
     * Update processing metrics
     */
    private updateMetrics(processingTime: number): void {
        this.processingTimes.push(processingTime);
        
        // Keep window size limited
        if (this.processingTimes.length > this.config.metricsWindowSize) {
            this.processingTimes.shift();
        }
        
        // Calculate metrics
        if (this.processingTimes.length > 0) {
            // Average
            this.metrics.avgProcessingTime = 
                this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
            
            // Percentiles
            const sorted = [...this.processingTimes].sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p99Index = Math.floor(sorted.length * 0.99);
            
            this.metrics.p95ProcessingTime = sorted[p95Index] || 0;
            this.metrics.p99ProcessingTime = sorted[p99Index] || 0;
        }
    }
    
    /**
     * Get current metrics
     */
    getMetrics(): ProcessingMetrics & {
        queueSize: number;
        workerPoolSize: number;
        throughput: number;
    } {
        const throughput = this.metrics.processedMessages / 
            (this.processingTimes.length > 0 ? this.metrics.avgProcessingTime / 1000 : 1);
        
        return {
            ...this.metrics,
            queueSize: this.getTotalQueueSize(),
            workerPoolSize: this.workerPool.length,
            throughput
        };
    }
    
    /**
     * Shutdown processor
     */
    async shutdown(): Promise<void> {
        console.log('[MessageProcessor] Shutting down...');
        
        // Stop accepting new messages
        this.removeAllListeners();
        
        // Process remaining messages with timeout
        const shutdownTimeout = setTimeout(() => {
            console.warn('[MessageProcessor] Shutdown timeout, terminating workers');
            this.workers.forEach(w => w.terminate());
        }, 5000);
        
        // Wait for queue to empty
        while (this.messageQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        clearTimeout(shutdownTimeout);
        
        // Terminate workers
        await Promise.all(this.workers.map(w => w.terminate()));
        
        console.log('[MessageProcessor] Shutdown complete');
    }
}