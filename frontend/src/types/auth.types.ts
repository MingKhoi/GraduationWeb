export type RSVPStatus = 'PENDING' | 'ATTENDING' | 'NOT_ATTENDING';

export interface GuestProfile {
    nickname: string;
    avatarUrl: string | null;
}

export interface Guest {
    id: string;
    fullName: string;
    profile: GuestProfile | null;
    invitation: {
        message: string | null;
    } | null;
    rsvp: {
        status: RSVPStatus;
    } | null;
}

export interface AuthResponse {
    message: string;
    guest: Guest;
}