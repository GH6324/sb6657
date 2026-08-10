export interface MergePigWsHandlers {
    onInit?: (queue: number[], bestScore: number) => void;
    onNextBall?: (level: number, score: number) => void;
    onGameOver?: (win: boolean, score: number, rank?: number) => void | Promise<void>;
    onError?: (error: unknown) => void;
    onNetworkStatusChange?: (online: boolean) => void;
}

export class MergePigWsClient {
    constructor(siteToken: string, handlers: MergePigWsHandlers);

    handlers: MergePigWsHandlers;

    connect(): void;
    updateScore(score: number, level: number): void;
    sendScoreUpdate(score: number): void;
    sendDrop(score: number, level: number): void;
    sendGameOver(win: boolean, score: number, level: number): void;
    sendRestart(): void;
    sendPing(): void;
    close(): void;
}

export function getAdminToken(): string | null;
export function getSiteToken(): string | null;
