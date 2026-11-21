import { API_URL, apiRequest } from './api';
import type { GuestProfile } from '../types/auth.types';

export interface UpdateGuestProfileInput {
    nickname: string;
    avatarUrl?: string;
}

export function getProfileAvatarUrl(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl) return null;
    return avatarUrl.startsWith('/profiles/')
        ? `${API_URL}${avatarUrl}`
        : avatarUrl;
}

export const profilesService = {
    update(input: UpdateGuestProfileInput): Promise<GuestProfile> {
        return apiRequest<GuestProfile>('/profiles/me', {
            method: 'PATCH',
            body: JSON.stringify(input),
        });
    },

    async uploadAvatar(photo: File, nickname: string): Promise<GuestProfile> {
        const formData = new FormData();
        formData.append('avatar', photo);
        formData.append('nickname', nickname);

        const response = await fetch(`${API_URL}/profiles/me/avatar`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message || `Không thể lưu ảnh đại diện (${response.status}).`,
            );
        }

        return data as GuestProfile;
    },
};
