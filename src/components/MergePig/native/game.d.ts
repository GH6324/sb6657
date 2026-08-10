import type { MergePigWsClient } from './wsClient.js';

export interface MergeMilkFrogGameCallbacks {
    onRestartRequest: () => void;
    onPlayAgain: () => void;
    onLeaderboardOpen?: () => void;
}

export class MergeMilkFrogGame {
    constructor(root: HTMLElement, callbacks: MergeMilkFrogGameCallbacks);

    wsClient: MergePigWsClient | null;

    start(): void;
    onServerInit(queue: number[], bestScore: number): void;
    onServerNextBall(level: number): void;
    setNetworkStatus(online: boolean): void;
    destroy(): void;
}
