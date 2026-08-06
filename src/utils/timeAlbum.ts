import type { AlbumImage, AlbumImagePayload } from '@/types/timeAlbum';

export function normalizeAlbumImage(image: AlbumImagePayload): AlbumImage {
    return {
        ...image,
        comments: Array.isArray(image.comments) ? image.comments : [],
        showComments: false,
    };
}

export function getAlbumImageTitle(image: Pick<AlbumImage, 'date'>): string {
    return image.date?.trim() || '未命名照片';
}

export function formatAlbumCommentDate(date?: string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleString();
}
