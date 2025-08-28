import { Logger as PowertoolsLogger } from '@aws-lambda-powertools/logger';
import { Context } from 'aws-lambda';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SILENT';

interface LoggerConfig {
  serviceName?: string;
  logLevel?: LogLevel;
  sampleRateValue?: number;
  persistentLogAttributes?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private logger: PowertoolsLogger;
  private serviceName: string;

  private constructor(config: LoggerConfig = {}) {
    this.serviceName = config.serviceName || process.env.SERVICE_NAME || 'pulse-news-crawler';
    
    this.logger = new PowertoolsLogger({
      serviceName: this.serviceName,
      logLevel: config.logLevel || (process.env.LOG_LEVEL as LogLevel) || 'INFO',
      sampleRateValue: config.sampleRateValue || parseFloat(process.env.SAMPLE_RATE || '0'),
      persistentLogAttributes: config.persistentLogAttributes || {},
    });
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Initialize logger with Lambda context
   */
  public initWithContext(context: Context): void {
    this.logger.addContext(context);
  }

  /**
   * Generic log method - main logging interface
   */
  public log(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    if (Object.keys(logData).length > 0) {
      this.logger.info(message, logData);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    if (Object.keys(logData).length > 0) {
      this.logger.debug(message, logData);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    if (Object.keys(logData).length > 0) {
      this.logger.info(message, logData);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    if (Object.keys(logData).length > 0) {
      this.logger.warn(message, logData);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error | Record<string, any>, caller?: string): void {
    let logData: Record<string, any> = {};

    if (error instanceof Error) {
      logData = { error: error.message, stack: error.stack };
    } else if (error && typeof error === 'object') {
      logData = { ...error };
    }

    if (caller) {
      logData.caller = caller;
    }

    if (Object.keys(logData).length > 0) {
      this.logger.error(message, logData);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Add persistent attributes that will be included in all logs
   */
  public addPersistentLogAttributes(attributes: Record<string, any>): void {
    this.logger.appendKeys(attributes);
  }

  /**
   * Remove persistent attributes
   */
  public removePersistentLogAttributes(keys: string[]): void {
    this.logger.removeKeys(keys);
  }

  /**
   * Create a child logger with additional context
   */
  public createChild(additionalContext: Record<string, any>): PowertoolsLogger {
    return this.logger.createChild(additionalContext);
  }

  /**
   * Get the underlying Powertools logger instance for advanced usage
   */
  public getPowertoolsLogger(): PowertoolsLogger {
    return this.logger;
  }

  /**
   * Set log level dynamically
   */
  public setLogLevel(level: LogLevel): void {
    this.logger.setLogLevel(level);
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.logger.getLevelName() as LogLevel;
  }
}

// Export a default instance for convenience
export const logger = Logger.getInstance();

// Export factory function for creating configured instances
export const createLogger = (config: LoggerConfig): Logger => {
  return Logger.getInstance(config);
};

// Default export for even simpler imports
export default logger;
