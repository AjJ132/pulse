import { Logger as PowertoolsLogger } from '@aws-lambda-powertools/logger';
import { Context } from 'aws-lambda';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SILENT';

interface LoggerConfig {
  serviceName?: string;
  logLevel?: LogLevel;
  sampleRateValue?: number;
  persistentLogAttributes?: Record<string, any>;
  prettyPrint?: boolean;
}

export class Logger {
  private static instance: Logger;
  private logger: PowertoolsLogger;
  private serviceName: string;
  private prettyPrint: boolean;
  private isLocalDevelopment: boolean;

  private constructor(config: LoggerConfig = {}) {
    this.serviceName = config.serviceName || process.env.SERVICE_NAME || 'pulse-news-crawler';
    this.isLocalDevelopment = !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.AWS_EXECUTION_ENV;
    
    // Check for explicit pretty print setting, fallback to local development detection
    if (config.prettyPrint !== undefined) {
      this.prettyPrint = config.prettyPrint;
    } else if (process.env.LOG_PRETTY_PRINT !== undefined) {
      this.prettyPrint = process.env.LOG_PRETTY_PRINT.toLowerCase() === 'true';
    } else {
      this.prettyPrint = this.isLocalDevelopment;
    }
    
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
   * Pretty print log entry for local development
   */
  private prettyPrintLog(level: string, message: string, data?: Record<string, any>): void {
    if (!this.prettyPrint) return;

    const timestamp = new Date().toISOString();
    const levelColors: Record<string, string> = {
      DEBUG: '\x1b[36m', // cyan
      INFO: '\x1b[32m',  // green
      WARN: '\x1b[33m',  // yellow
      ERROR: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    
    const color = levelColors[level] || '';
    
    console.log(`${color}${bold}[${level}]${reset} ${timestamp}`);
    console.log(`${bold}Message:${reset} ${message}`);
    
    if (data && Object.keys(data).length > 0) {
      console.log(`${bold}Data:${reset}`);
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log(''); // Empty line for better readability
  }

  /**
   * Log using either pretty print or structured logging
   */
  private logWithFormat(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, any>): void {
    if (this.prettyPrint) {
      this.prettyPrintLog(level.toUpperCase(), message, data);
    } else {
      if (data && Object.keys(data).length > 0) {
        this.logger[level](message, data);
      } else {
        this.logger[level](message);
      }
    }
  }

  /**
   * Generic log method - main logging interface
   */
  public log(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    this.logWithFormat('info', message, Object.keys(logData).length > 0 ? logData : undefined);
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    this.logWithFormat('debug', message, Object.keys(logData).length > 0 ? logData : undefined);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    this.logWithFormat('info', message, Object.keys(logData).length > 0 ? logData : undefined);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: Record<string, any>, caller?: string): void {
    const logData = {
      ...(data || {}),
      ...(caller ? { caller } : {})
    };

    this.logWithFormat('warn', message, Object.keys(logData).length > 0 ? logData : undefined);
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

    if (this.prettyPrint && error instanceof Error) {
      // Special handling for errors in pretty print mode
      const timestamp = new Date().toISOString();
      const red = '\x1b[31m';
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';
      
      console.log(`${red}${bold}[ERROR]${reset} ${timestamp}`);
      console.log(`${bold}Message:${reset} ${message}`);
      console.log(`${bold}Error:${reset} ${error.message}`);
      if (caller) {
        console.log(`${bold}Caller:${reset} ${caller}`);
      }
      if (error.stack) {
        console.log(`${bold}Stack:${reset}`);
        console.log(error.stack);
      }
      console.log(''); // Empty line for better readability
    } else {
      this.logWithFormat('error', message, Object.keys(logData).length > 0 ? logData : undefined);
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

  /**
   * Enable or disable pretty printing
   */
  public setPrettyPrint(enabled: boolean): void {
    this.prettyPrint = enabled;
  }

  /**
   * Check if pretty printing is enabled
   */
  public isPrettyPrintEnabled(): boolean {
    return this.prettyPrint;
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
