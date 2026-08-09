import { Registration } from '../types';

const API_BASE = '/api';

// Get all registrations from the server
export const getAllRegistrations = async (): Promise<Registration[]> => {
    try {
        const response = await fetch(`${API_BASE}/registrations`);
        if (!response.ok) {
            throw new Error('Failed to fetch registrations');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching registrations:', error);
        // Fallback to empty array if server is unavailable
        return [];
    }
};

// Add or update a registration on the server
export const upsertRegistration = async (registration: Registration): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE}/registrations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registration),
        });
        if (!response.ok) {
            throw new Error('Failed to save registration');
        }
    } catch (error) {
        console.error('Error saving registration:', error);
        throw error;
    }
};
