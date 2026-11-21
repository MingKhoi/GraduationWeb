import { apiRequest } from './api';
import type { CreateWishInput, Wish } from '../types/wish.types';

export const wishesService = {
    list(): Promise<Wish[]> {
        return apiRequest<Wish[]>('/wishes');
    },

    create(wish: CreateWishInput): Promise<Wish> {
        return apiRequest<Wish>('/wishes', {
            method: 'POST',
            body: JSON.stringify(wish),
        });
    },
};
