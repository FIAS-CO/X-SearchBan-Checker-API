import { Log } from "../util/Log";

class RateLimitManager {
    private rateLimits: Map<string, {
        remaining: number;
        resetTime: number;
    }> = new Map();

    // エンドポイントのグループ定義
    readonly endpointGroups = {
        userSearchGroup: [
            'UserByScreenName',
            'SearchTimeline'
        ],
        userTimelineGroup: [
            'UserTweets'
        ]
    };

    // グループ内の全エンドポイントのレート制限をチェック
    checkGroupRateLimit(token: string, group: string[]): {
        canProceed: boolean;
        resetTime?: number;
    } {
        this.displayAllRateLimits()
        let latestResetTime = 0;

        for (const endpoint of group) {
            const key = this.createKey(endpoint, token)
            const limit = this.rateLimits.get(key);
            if (!limit) continue;

            const now = Date.now();
            if (now < limit.resetTime && limit.remaining <= 0) {
                latestResetTime = Math.max(latestResetTime, limit.resetTime);
                const resetTime = new Date(limit?.resetTime || 0).toLocaleString()
                Log.info(`Rate check NG by ${key} until. ${resetTime}`)
                return {
                    canProceed: false,
                    resetTime: latestResetTime
                };
            }
        }
        Log.info('Rate check OK.')
        return { canProceed: true };
    }

    // レスポンスヘッダーからレート制限情報を更新   
    updateRateLimit(token: string, endpoint: string, headers: Headers, exceeded: boolean = false) {
        const remaining = exceeded ? 0 : parseInt(headers.get('x-rate-limit-remaining') || '0');
        const resetTime = parseInt(headers.get('x-rate-limit-reset') || '0') * 1000;

        const key = this.createKey(endpoint, token)
        this.rateLimits.set(key, {
            remaining,
            resetTime
        });

        const limit = this.rateLimits.get(key);
        Log.info(`Rate limit updated for ${key}:`, {
            remaining: limit?.remaining,
            resetTime: new Date(limit?.resetTime || 0).toLocaleString()
        });
    }

    displayAllRateLimits(): void {
        Log.info('=== Current Rate Limits ===');
        if (this.rateLimits.size === 0) {
            Log.info('No rate limits set');
            return;
        }

        this.rateLimits.forEach((limit, endpoint) => {
            const resetDate = new Date(limit.resetTime).toLocaleString();
            Log.info(`Endpoint: ${endpoint}- Remaining: ${limit.remaining}- Reset time: ${resetDate}`);
        });
    }

    createKey(endpoint: string, token: string) {
        return endpoint + "-" + token;
    }
}

export const rateLimitManager = new RateLimitManager();