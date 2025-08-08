type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // Default: DEV -> debug, PROD -> warn. Allow override via VITE_LOG_LEVEL
    const envLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined)?.toLowerCase() as LogLevel | undefined;
    if (envLevel && levelOrder[envLevel] !== undefined) {
      this.minLevel = envLevel;
    } else {
      this.minLevel = import.meta.env.DEV ? 'debug' : 'warn';
    }
  }

  private shouldLog(level: LogLevel) {
    return levelOrder[level] >= levelOrder[this.minLevel];
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.log('error', message, error.message, error.stack, ...args);
    } else {
      this.log('error', message, error, ...args);
    }
  }
}

export const logger = new Logger();