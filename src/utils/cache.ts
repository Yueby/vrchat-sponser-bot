import NodeCache from 'node-cache';
import { logger } from './logger';

// 缓存时间：1分钟 (60秒)
const CACHE_TTL = 60;

// 创建缓存实例
// stdTTL: 默认缓存时间
// checkperiod: 定期清理过期数据的周期
const cache = new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: 120
});

/**
 * 缓存管理器
 */
export const apiCache = {
    /**
     * 获取缓存
     * @param key 缓存键 (通常是 guildId)
     */
    get: <T>(key: string): T | undefined => {
        return cache.get<T>(key);
    },

    /**
     * 设置缓存
     * @param key 缓存键
     * @param data 数据
     */
    set: <T>(key: string, data: T): void => {
        cache.set(key, data);
    },

    /**
     * 删除指定服务器的缓存
     * @param guildId 服务器 ID
     */
    delete: (guildId: string): void => {
        cache.del(guildId);
        logger.info(`Cache cleared for guild: ${guildId}`);
    },

    /**
     * 清空所有缓存
     */
    clearAll: (): void => {
        cache.flushAll();
        logger.info('All API caches cleared');
    }
};
