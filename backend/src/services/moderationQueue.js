/**
 * Redis Queue Service for Moderation Jobs
 * Handles job creation and queue management
 */

const Queue = require('bull');
const logger = require('../utils/logger');

let moderationQueue = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

/**
 * Initialize the moderation queue
 */
function initQueue() {
  if (moderationQueue) {
    return moderationQueue;
  }

  try {
    moderationQueue = new Queue('moderation-jobs', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200 // Keep last 200 failed jobs
      }
    });

    // Queue event handlers
    moderationQueue.on('error', (error) => {
      logger.error('Moderation queue error:', error);
    });

    moderationQueue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting in queue`);
    });

    logger.info('Moderation queue initialized successfully');
    return moderationQueue;

  } catch (error) {
    logger.error('Failed to initialize moderation queue:', error);
    throw error;
  }
}

/**
 * Add a moderation job to the queue
 * @param {Object} jobData - Job data containing document_id, file_path, metadata
 * @returns {Promise<Object>} Job object
 */
async function addModerationJob(jobData) {
  try {
    const queue = getQueue();
    
    const job = await queue.add(jobData, {
      jobId: jobData.document_id, // Use document_id as job ID for idempotency
      priority: 1 // Normal priority
    });

    logger.info(`Moderation job created for document ${jobData.document_id}`);
    return job;

  } catch (error) {
    logger.error('Failed to add moderation job:', error);
    throw new Error(`Failed to queue moderation job: ${error.message}`);
  }
}

/**
 * Get the queue instance
 */
function getQueue() {
  if (!moderationQueue) {
    return initQueue();
  }
  return moderationQueue;
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const queue = getQueue();
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return null;
  }
}

/**
 * Close the queue connection
 */
async function closeQueue() {
  if (moderationQueue) {
    await moderationQueue.close();
    moderationQueue = null;
    logger.info('Moderation queue closed');
  }
}

module.exports = {
  initQueue,
  addModerationJob,
  getQueue,
  getQueueStats,
  closeQueue
};
