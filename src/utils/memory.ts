// 内存监控和缓存管理工具
import { client } from '../bot';
import { MONITORING } from '../config/constants';
import { logger } from './logger';

/**
 * 获取当前内存使用情况
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024) // MB
  };
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  const guilds = client.guilds.cache.size;
  let totalMembers = 0;
  let totalRoles = 0;
  
  client.guilds.cache.forEach(guild => {
    totalMembers += guild.members.cache.size;
    totalRoles += guild.roles.cache.size;
  });
  
  return {
    guilds,
    members: totalMembers,
    roles: totalRoles,
    users: client.users.cache.size
  };
}

/**
 * 手动清理缓存（紧急情况）
 */
export function clearCaches() {
  let cleared = 0;
  
  client.guilds.cache.forEach(guild => {
    // 清理成员缓存（保留 Bot 自己）
    guild.members.cache.sweep(member => member.id !== client.user?.id);
    cleared++;
  });
  
  // 清理用户缓存（保留 Bot 自己）
  client.users.cache.sweep(user => user.id !== client.user?.id);
  
  return cleared;
}

/**
 * 启动内存监控
 */
export function startMemoryMonitor(intervalMinutes: number = MONITORING.MEMORY_CHECK_INTERVAL) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  setInterval(() => {
    const memory = getMemoryUsage();
    const cache = getCacheStats();
    
    logger.info(
      `📊 Memory: ${memory.heapUsed}/${memory.heapTotal} MB | ` +
      `Cache: ${cache.guilds} guilds, ${cache.members} members, ${cache.users} users`
    );
    
    // 🚨 内存警告
    if (memory.heapUsed > MONITORING.MEMORY_WARNING_THRESHOLD) {
      logger.warn(
        `⚠️ High memory usage: ${memory.heapUsed} MB! Consider restarting or clearing cache.`
      );
    }
    
    // 🚨 紧急清理
    if (memory.heapUsed > MONITORING.MEMORY_CRITICAL_THRESHOLD) {
      logger.error(`🚨 Critical memory usage: ${memory.heapUsed} MB! Auto-clearing cache...`);
      const cleared = clearCaches();
      logger.info(`Cleared cache for ${cleared} guilds`);
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
        logger.info('Forced garbage collection');
      }
    }
  }, intervalMs);
  
  logger.success(`Memory monitor started (interval: ${intervalMinutes} min)`);
}

/**
 * 打印内存和缓存报告
 */
export function logMemoryReport() {
  const memory = getMemoryUsage();
  const cache = getCacheStats();
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 MEMORY REPORT');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`Heap Used:  ${memory.heapUsed} MB`);
  logger.info(`Heap Total: ${memory.heapTotal} MB`);
  logger.info(`RSS:        ${memory.rss} MB`);
  logger.info(`External:   ${memory.external} MB`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`Guilds:     ${cache.guilds}`);
  logger.info(`Members:    ${cache.members}`);
  logger.info(`Users:      ${cache.users}`);
  logger.info(`Roles:      ${cache.roles}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
