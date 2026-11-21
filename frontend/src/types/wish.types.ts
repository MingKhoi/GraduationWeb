export type WishPaperColor = 'pink' | 'yellow' | 'blue' | 'purple' | 'green';

export interface Wish {
    id: string;
    senderName: string;
    message: string;
    paperColor: WishPaperColor;
    createdAt: string;
}

export interface CreateWishInput {
    message: string;
    paperColor: WishPaperColor;
}
