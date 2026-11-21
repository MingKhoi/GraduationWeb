import { API_URL, apiRequest } from './api';
import type { MemoryPhoto } from '../types/memory.types';

function getResponseError(data: { message?: string } | null, status: number) {
    return data?.message || `Không thể hoàn tất yêu cầu (${status}).`;
}

export const memoriesService = {
    list(): Promise<MemoryPhoto[]> {
        return apiRequest<MemoryPhoto[]>('/memories');
    },

    async create(photo: File, note: string): Promise<MemoryPhoto> {
        const formData = new FormData();
        formData.append('photo', photo);
        formData.append('note', note);

        const response = await fetch(`${API_URL}/memories`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(getResponseError(data, response.status));
        }

        return data as MemoryPhoto;
    },

    imageUrl(id: string): string {
        return `${API_URL}/memories/${encodeURIComponent(id)}/image`;
    },

    async download(id: string): Promise<Blob> {
        const response = await fetch(
            `${API_URL}/memories/${encodeURIComponent(id)}/download`,
            { credentials: 'include' },
        );
        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(getResponseError(data, response.status));
        }
        return response.blob();
    },
};
