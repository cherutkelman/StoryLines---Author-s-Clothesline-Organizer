export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SyncLogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: any;
}

export class SyncLogger {
  private logs: SyncLogEntry[] = [];
  private maxLogs = 100;

  log(level: LogLevel, message: string, details?: any) {
    const entry: SyncLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}[Sync][${level.toUpperCase()}]\x1b[0m ${message}`, details || '');
  }

  info(message: string, details?: any) { this.log('info', message, details); }
  warn(message: string, details?: any) { this.log('warn', message, details); }
  error(message: string, details?: any) { this.log('error', message, details); }
  debug(message: string, details?: any) { this.log('debug', message, details); }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const syncLogger = new SyncLogger();
