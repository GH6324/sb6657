export interface AlbumComment {
    id?: number | string;
    douyuID?: string;
    commentname: string;
    createdAt?: string;
}

export interface AlbumImagePayload {
    id: number | string;
    url: string;
    date?: string;
    comments?: AlbumComment[] | null;
}

export interface AlbumImage {
    id: number | string;
    url: string;
    date?: string;
    comments: AlbumComment[];
    showComments: boolean;
}

export interface AlbumPage {
    list?: AlbumImagePayload[];
    lastPage?: boolean;
}
