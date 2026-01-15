// 简单的日志系统
// 支持不同级别的日志输出和格式化

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private showTimestamp: boolean = true;

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 设置是否显示时间戳
   */
  setShowTimestamp(show: boolean): void {
    this.showTimestamp = show;
  }

  /**
   * 格式化时间戳
   */
  private timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 格式化日志消息
   */
  private format(level: string, message: string, ...args: any[]): string {
    const argsStr = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    const timestampStr = this.showTimestamp ? `[${this.timestamp()}] ` : '';
    return `${timestampStr}[${level}] ${message}${argsStr}`;
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.format('DEBUG', message, ...args));
    }
  }

  /**
   * INFO 级别日志
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(this.format('INFO', message, ...args));
    }
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message, ...args));
    }
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', message, ...args));
    }
  }

  /**
   * 带表情符号的特殊日志方法（保持兼容性）
   */
  success(message: string): void {
    this.info(`✅ ${message}`);
  }

  bot(message: string): void {
    this.info(`🤖 ${message}`);
  }

  network(message: string): void {
    this.info(`📡 ${message}`);
  }

  sync(message: string): void {
    this.info(`🔄 ${message}`);
  }

  newGuild(message: string): void {
    this.info(`🆕 ${message}`);
  }

  memberJoin(message: string): void {
    this.info(`👋 ${message}`);
  }

  memberLeave(message: string): void {
    this.warn(`👋 ${message}`);
  }

  delete(message: string): void {
    this.warn(`🗑️ ${message}`);
  }

  celebrate(message: string): void {
    this.info(`🎉 ${message}`);
  }
}

// 导出单例
export const logger = new Logger();

// 从环境变量设置日志级别
if (process.env.LOG_LEVEL) {
  const level = process.env.LOG_LEVEL.toUpperCase();
  if (level in LogLevel) {
    logger.setLevel(LogLevel[level as keyof typeof LogLevel]);
  }
}

// 从环境变量设置是否显示时间戳
if (process.env.LOG_TIMESTAMP === 'false') {
  logger.setShowTimestamp(false);
}
