/**
 * API Service for Move Better Physiotherapy Clinic
 * Handles communication with FastAPI backend and Supabase Auth.
 */

const API_BASE_URL = (window.location.protocol === 'file:')
    ? 'http://localhost:8000/api'
    : `${window.location.origin}/api`;

const API = {
    // AUTHENTICATION
    async login(email, password) {
        return this._fetch('/auth/login', 'POST', { email, password });
    },

    async signup(email, password, role = 'Therapist') {
        return this._fetch('/auth/signup', 'POST', { email, password, role });
    },

    async logout() {
        localStorage.removeItem('mb_token');
        localStorage.removeItem('mb_user');
        if (window.AndroidBridge && typeof window.AndroidBridge.logout === 'function') {
            window.AndroidBridge.logout();
        } else {
            window.location.reload();
        }
    },

    // PATIENTS
    async getPatients() {
        return this._fetch('/patients', 'GET');
    },

    async registerPatient(patientData) {
        return this._fetch('/patients', 'POST', patientData);
    },

    async getPatientProfile(patientId) {
        return this._fetch(`/patients/${patientId}/profile`, 'GET');
    },

    async updatePatientProfile(patientId, updateData) {
        return this._fetch(`/patients/${patientId}`, 'PATCH', updateData);
    },


    // APPOINTMENTS
    async getAppointments() {
        return this._fetch('/appointments', 'GET');
    },

    async bookAppointment(apptData) {
        return this._fetch('/appointments', 'POST', apptData);
    },

    async updateAppointment(apptId, updateData) {
        return this._fetch(`/appointments/${apptId}`, 'PATCH', updateData);
    },

    async deleteAppointment(apptId) {
        return this._fetch(`/appointments/${apptId}`, 'DELETE');
    },


    // AUDIO UPLOADS
    async uploadAudio(file, patientId, sessionNumber = 1, clinicalSnapshot = null) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patient_id', patientId);
        formData.append('session_number', sessionNumber);
        if (clinicalSnapshot) {
            formData.append('clinical_snapshot', JSON.stringify(clinicalSnapshot));
        }

        const response = await fetch(`${API_BASE_URL}/audio/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this._getToken()}`
            },
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || 'Audio upload failed');
        }

        if (!result || !result.transcription) {
            throw new Error("No transcription received from server");
        }

        // Parse format from backend (handle both tagged and raw formats)
        const parts = result.transcription.split('FULL TRANSCRIPT:');
        const summary = (parts[0].includes('SUMMARY:') ? parts[0].replace('SUMMARY:', '') : '').trim();
        const transcript = (parts[1] || parts[0].replace('SUMMARY:', '')).trim();

        console.log("Audio Processing Result:", { summary, transcriptLength: transcript.length });

        return { ...result, summary, transcript };
    },

    // CHATBOT
    async chat(message, patientId = null, sessionNumber = null) {
        return this._fetch('/chat', 'POST', { 
            message, 
            patient_id: patientId, 
            session_number: sessionNumber 
        });
    },

    // ASSESSMENTS
    async createAssessment(data) {
        return this._fetch('/assessments/assessments', 'POST', data);
    },

    async getAssessment(patientId, sessionNumber = null) {
        let url = `/assessments/assessments/${patientId}`;
        if (sessionNumber) url += `?session_number=${sessionNumber}`;
        return this._fetch(url, 'GET');
    },

    async saveAudioTranscript(patientId, transcript, snapshot = null, sessionNumber = 1) {
        const body = { transcript, session_number: sessionNumber };
        if (snapshot) body.clinical_snapshot = snapshot;
        return this._fetch(`/assessments/assessments/${patientId}/transcript`, 'PATCH', body);
    },

    // SESSION DESIGN & TREATMENT
    async generateTreatmentDraft(patientId) {
        return this._fetch(`/treatment/generate/${patientId}`, 'POST');
    },

    async saveSessionPlan(data) {
        return this._fetch('/treatment/session-plans', 'POST', data);
    },

    async getSessionPlan(patientId, sessionNumber = null) {
        let url = `/treatment/session-plans/${patientId}`;
        if (sessionNumber) url += `?session_number=${sessionNumber}`;
        return this._fetch(url, 'GET');
    },

    async finalizeTreatmentPlan(data) {
        return this._fetch('/treatment/treatment-plans', 'POST', data);
    },

    async getFinalizedTreatmentPlan(patientId, appointmentId = null, sessionNumber = null) {
        let url = `/treatment/treatment-plans/${patientId}?`;
        if (appointmentId) url += `appointment_id=${appointmentId}&`;
        if (sessionNumber) url += `session_number=${sessionNumber}&`;
        return this._fetch(url.replace(/[?&]$/, ''), 'GET');
    },

    // DASHBOARD
    async getDashboardStats() {
        return this._fetch('/dashboard/stats', 'GET');
    },

    // HELPERS
    _getToken() {
        return localStorage.getItem('mb_token');
    },

    async _fetch(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = this._getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers
        };

        if (body && method !== 'GET') {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API Request failed');
            }
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }
};
