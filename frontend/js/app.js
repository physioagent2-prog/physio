/* =========================================
   UI NAVIGATION & TABS
   ========================================= */

function show(id, btn) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
    
    // Control Trash Bin visibility
    const trashFab = document.getElementById('trash-fab');
    if (trashFab) {
        if (id === 'dashboard' || id === 'register') {
            trashFab.style.display = 'flex';
        } else {
            trashFab.style.display = 'none';
        }
    }

    // Proactively refresh dropdowns when entering sensitive tabs
    if (id === 'appointments' || id === 'assessment' || id === 'session-design' || id === 'treatment-plan') {
        loadPatientSelects();
    }

    if (id === 'assessment') {
        initAssessmentUI();
    }
}

/**
 * CLINICAL SNAPSHOT GENERATORS
 * Creates structured JSON mirrors of the UI state for specific database tables.
 */

function getPatientSnapshot() {
    const selectedConditions = [];
    document.querySelectorAll('input[name="reg-condition"]:checked').forEach(cb => {
        if (cb.value === 'Other') {
            const otherVal = document.getElementById('reg-cond-other-val').value.trim();
            if (otherVal) selectedConditions.push(`Other: ${otherVal}`);
        } else {
            selectedConditions.push(cb.value);
        }
    });

    return {
        "Patient Profile": {
            "Full Name": document.getElementById('reg-name').value,
            "Date of Birth": document.getElementById('reg-dob').value,
            "Gender": document.getElementById('reg-gender').value,
            "Contact Number": document.getElementById('reg-phone').value,
            "Address": document.getElementById('reg-address').value,
            "Occupation": document.getElementById('reg-occupation').value
        },
        "Medical History": {
            "Known Conditions": selectedConditions,
            "Current Medications": document.getElementById('reg-meds').value.trim(),
            "Allergies": document.getElementById('reg-allergies').value.trim(),
            "Previous Injuries or Surgeries": document.getElementById('reg-injuries').value.trim()
        }
    };
}

function getAppointmentSnapshot(patientName) {
    let displayTime = schedSelectedTime || "--";
    if (schedSelectedTime) {
        let [h, m] = schedSelectedTime.split(':');
        h = parseInt(h);
        let ampm = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12 || 12;
        displayTime = `${String(h12).padStart(2,'0')}:${m} ${ampm}`;
    }

    const sessEl = document.getElementById('sched-session-number');
    const sessVal = sessEl ? sessEl.value : '1';
    const sessionText = sessVal === '1' ? 'Session 1 — Initial Assessment' : `Session ${sessVal}`;

    return {
        "Appointment Details": {
            "Patient Name": patientName || document.getElementById('s-name').textContent,
            "Date": schedSelectedDate || "--",
            "Time Slot": displayTime,
            "Status": schedSelectedStatus,
            "Session": sessionText
        }
    };
}

function getAssessmentSnapshot() {
    const onsetVal = document.querySelector('input[name="as-onset"]:checked')?.value;
    const onsetText = sanitizeClinicalText(onsetVal, 'as-onset-other-val');
    
    const getChecked = (name, otherValId) => {
        let vals = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
        if (vals.includes('Other')) {
            const other = document.getElementById(otherValId)?.value.trim();
            if (other) vals = vals.map(v => v === 'Other' ? `Other: ${other}` : v);
        }
        return vals;
    };

    const romData = [];
    document.querySelectorAll('#as-rom-tbody tr').forEach(tr => {
        const joint = tr.getAttribute('data-joint') || tr.querySelector('.rom-joint-name')?.value || 'Unknown';
        romData.push({
            "Joint": joint,
            "Active ROM": formatClinicalMeasure(tr.querySelector('.rom-active')?.value),
            "Passive ROM": formatClinicalMeasure(tr.querySelector('.rom-passive')?.value),
            "Pain": tr.querySelector('.rom-pain')?.value
        });
    });

    const customFunctional = Array.from(document.querySelectorAll('.as-custom-functional-val'))
                                  .map(input => input.value.trim())
                                  .filter(v => v);

    return {
        "Chief Complaint & Pain": {
            "Patient Name": document.getElementById('assessment-patient-search').value,
            "Chief Complaint": document.getElementById('as-complaint').value,
            "Onset of Symptoms": onsetText,
            "Pain Intensity": document.getElementById('as-pain-slider').value + "/10",
            "Pain Type": getChecked('as-pain-type', 'as-pain-other-val'),
            "Associated Symptoms": getChecked('as-symptoms', 'as-symptoms-other-val')
        },
        "Range of Motion & Posture": {
            "Posture Observation": getChecked('as-posture', 'as-posture-other-val'),
            "ROM Assessment": romData,
            "Special Tests Used": document.getElementById('as-special-tests').value,
            "Functional Limitations": [...getChecked('as-functional', 'as-func-other-val'), ...customFunctional]
        }
    };
}

function getAudioSnapshot(fileName, filePath, transcript) {
    return {
        "Audio Metadata": {
            "File Name": fileName,
            "File Path": filePath || "N/A",
            "Transcript": transcript
        }
    };
}

/* =========================================
   SESSION & AUTH MANAGEMENT
   ========================================= */

let currentUser = null;

async function checkSession() {
    const token = localStorage.getItem('mb_token');
    const userJson = localStorage.getItem('mb_user');
    
    if (token && userJson) {
        currentUser = JSON.parse(userJson);
        setupAuthenticatedUI();
    } else {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
    }
}

function setupAuthenticatedUI() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    if (currentUser) {
        const displayName = currentUser.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Admin');
        document.getElementById('current-user-name').textContent = displayName;
    }
    
    // Universal Access: Admin Tab always visible for everyone
    if (document.getElementById('admin-nav-tab')) {
        document.getElementById('admin-nav-tab').style.display = 'block';
    }
    
    // Initial data load
    loadDashboard();
}
/* AUTH FORM HANDLERS (SAFE) */
let isLoginMode = true;

const authSwitchLink = document.getElementById('auth-switch-link');
if (authSwitchLink) {
    authSwitchLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.getElementById('auth-title').textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
        document.getElementById('auth-subtitle').textContent = isLoginMode ? 'Login to access your clinic dashboard' : 'Join Move Better Physiotherapy Clinic';
        document.getElementById('auth-btn-text').textContent = isLoginMode ? 'Login' : 'Sign Up';
        document.getElementById('auth-switch-text').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        authSwitchLink.textContent = isLoginMode ? "Sign Up" : "Login";
        const signupFields = document.getElementById('signup-fields');
        if (signupFields) signupFields.style.display = isLoginMode ? 'none' : 'block';
    });
}

const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        try {
            let result;
            if (isLoginMode) {
                result = await API.login(email, password);
            } else {
                result = await API.signup(email, password, "Admin");
                alert('Signup successful! Please login.');
                isLoginMode = true;
                if (authSwitchLink) authSwitchLink.click();
                return;
            }

            if (result.access_token) {
                localStorage.setItem('mb_token', result.access_token);
                localStorage.setItem('mb_user', JSON.stringify(result.user));
                currentUser = result.user;
                setupAuthenticatedUI();
            }
        } catch (err) {
            alert(err.message);
        }
    });
}

/* =========================================
   DASHBOARD LOGIC
   ========================================= */

async function loadDashboard() {
    try {
        const stats = await API.getDashboardStats();
        if (document.getElementById('stat-patients')) {
            document.getElementById('stat-patients').textContent = stats.active_patients;
            document.getElementById('stat-pending').textContent = stats.pending_appointments;
            document.getElementById('stat-appointments').textContent = stats.today_appointments;
            document.getElementById('stat-sessions').textContent = stats.sessions_week;
            
            const welcomeText = stats.today_appointments > 0 
                ? `You have ${stats.today_appointments} patients scheduled for today. Best of luck with your sessions!`
                : `No appointments scheduled for today yet. Use this time for patient record management!`;
            document.getElementById('dashboard-welcome').textContent = welcomeText;
        }
        
        // Populate Smart Appointments Board
        if (document.getElementById('appointments-board-list')) {
            try {
                schedAllAppointments = await API.getAppointments();
                renderAppointmentsBoard(); // Use default active filter
            } catch(e) {
                console.error("Failed to load appointments for board", e);
            }
        }
        
        // Populate Pending Patients Panel
        if (stats.pending_patients) {
            renderPendingPatients(stats.pending_patients);
        }

        // Populate Trash Bin
        if (stats.cancelled_list) {
            renderTrashList(stats.cancelled_list);
        }
        
        // Populate selection dropdowns if on appropriate tabs
        loadPatientSelects();
    } catch (err) {
        console.error("Dashboard stats failed", err);
    }
}

function renderPendingPatients(patients) {
    const container = document.getElementById('pending-patients-list');
    const badge = document.getElementById('pending-count-badge');
    if (!container) return;
    
    badge.textContent = patients.length;
    
    if (patients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px;">
                <div style="font-size: 28px; margin-bottom: 8px;">✅</div>
                <div style="font-size: 13px; color: var(--color-text-secondary);">All patients are scheduled!</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    patients.forEach((p, i) => {
        const initials = p.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        const regDate = new Date(p.created_at);
        const timeAgo = getTimeAgo(regDate);
        
        html += `
        <div class="pending-patient-row" style="
            display: flex; align-items: center; gap: 12px; padding: 12px;
            border-radius: 10px; margin-bottom: 8px;
            background: ${i === 0 ? 'linear-gradient(135deg, rgba(230,126,34,0.08), rgba(243,156,18,0.05))' : '#f8f9fa'};
            border: 1px solid ${i === 0 ? 'rgba(230,126,34,0.2)' : '#eee'};
            transition: all 0.2s ease;
            animation: slideInPending 0.3s ease ${i * 0.05}s both;
        " onmouseover="this.style.transform='translateX(4px)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" 
           onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style="
                width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
                background: linear-gradient(135deg, #E67E22, #F39C12);
                color: #fff; font-size: 12px; font-weight: 700;
                display: flex; align-items: center; justify-content: center;
            ">${initials}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.full_name}</div>
                <div style="font-size: 11px; color: var(--color-text-secondary);">${p.phone || 'No phone'} · ${timeAgo}</div>
            </div>
            <button onclick="navigateToBooking('${p.id}', '${p.full_name}', '${p.appointment_id || ''}')" style="
                background: none; border: 1px solid var(--color-primary); color: var(--color-primary);
                font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer;
                white-space: nowrap; transition: all 0.2s;
            " onmouseover="this.style.background='var(--color-primary)';this.style.color='#fff'"
               onmouseout="this.style.background='none';this.style.color='var(--color-primary)'">Schedule</button>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function navigateToBooking(patientId, patientName, appointmentId) {
    // Open scheduler modal in "pending booking" mode
    pendingBookingPatientId = patientId;
    pendingBookingPatientName = patientName;
    pendingBookingApptId = appointmentId || null;  // existing appointment to PATCH
    pendingPatientData = null;
    openSchedulerModal();
}


let allPatients = [];     // Deduplicated list for search dropdowns
let allPatientsRaw = [];  // Full list for aggregated session lookups

async function loadPatientSelects() {
    const selects = [
        document.getElementById('appt-patient-select')
    ];
    
    try {
        const rawPatients = await API.getPatients();

        // Phone kyarek "phone" ane kyarek "contact_number" ma hoy chhe -> ek j field banavo
        rawPatients.forEach(p => { if (!p.phone) p.phone = p.contact_number || ''; });

        allPatientsRaw = rawPatients; // Store full list for aggregated lookups
        
        // DEDUPLICATION LOGIC: Filter unique Name + Phone pairs
        const uniqueMap = new Map();
        rawPatients.forEach(p => {
            const key = `${(p.full_name || "").toLowerCase()}_${(p.phone || "").toLowerCase()}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, p);
            }
        });
        allPatients = Array.from(uniqueMap.values());
        
        console.log("Loaded Unique Patients:", allPatients.length);
        
        // Populate standard selects
        selects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">— Select registered patient —</option>';
            allPatients.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.phone ? `${p.full_name} (${p.phone})` : p.full_name;
                select.appendChild(opt);
            });
            select.value = currentVal;
        });

        // Initialize Searchable Select for Session Design Builder
        setupSessionDesignSearch();

        // Initialize Searchable Select for Treatment Plan Viewer
        setupTreatmentViewerSearch();

        // Initialize Searchable Select for Assessment Page
        setupAssessmentSearch();

        return true;
    } catch (err) {
        console.error("Failed to load patients for selects", err);
        return false;
    }
}

async function refreshPatientList() {
    const ok = await loadPatientSelects();
    if (ok) {
        showToast(`Patient list refreshed (${allPatients.length} patients)`, 'success');
    } else {
        showToast('Could not load patient list. Check internet / login again.', 'warning');
    }
}

function setupAssessmentSearch() {
    const searchInput = document.getElementById('assessment-patient-search');
    const resultsList = document.getElementById('assessment-search-results');
    const hiddenIdInput = document.getElementById('assessment-patient-id');

    if (!searchInput || !resultsList) return;

    // Prevent multiple listeners
    if (searchInput.hasAttribute('data-has-listener')) return;
    searchInput.setAttribute('data-has-listener', 'true');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsList.innerHTML = '';
        
        if (!query) {
            resultsList.classList.remove('active');
            return;
        }

        if (!allPatients || allPatients.length === 0) {
            console.warn("No patients loaded for search");
            return;
        }

        const filtered = allPatients.filter(p => {
            const name = (p.full_name || "").toLowerCase();
            const phone = (p.phone || p.contact_number || "").toLowerCase();
            return name.includes(query) || phone.includes(query);
        });

        if (filtered.length > 0) {
            resultsList.classList.add('active');
            filtered.forEach(p => {
                const phone = p.phone || p.contact_number || '--';
                
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.style.padding = '12px 16px';
                li.innerHTML = `
                    <div style="font-weight:600; color:#2d3748;">${p.full_name} <span style="font-weight:400; color:#718096; font-size:12px; margin-left:8px;">(${phone})</span></div>
                    <div style="color:#a0aec0; font-size:11px; margin-top:2px;">Patient Clinical Profile</div>
                `;
                
                li.onclick = () => {
                    const conditions = extractPatientConditions(p);
                    searchInput.value = p.full_name; // No longer append condition label here
                    hiddenIdInput.value = p.id;
                    resultsList.classList.remove('active');
                    showToast(`Clinical Session Initialized: ${p.full_name}`, "info");
                    
                    // NEW: Aggregate sessions for ALL IDs matching this name + phone
                    loadAggregatedSessions({ name: p.full_name, phone: p.phone || p.contact_number }, 'assessment-sessions-list', 'assessment-session-select');
                    
                    // NUCLEAR WORKFLOW TRIGGER
                    currentAssessmentMode = null; 
                    const mainArea = document.getElementById('as-main-content-area');
                    const step2 = document.getElementById('as-step-2-container');
                    
                    if (mainArea) mainArea.classList.add('is-locked');
                    if (step2) step2.style.display = 'block';

                    applyAssessmentModeUI(); 
                    
                    // Forced reset of methodology indicators
                    document.querySelectorAll('.status-dot').forEach(dot => dot.classList.remove('green'));
                    document.querySelectorAll('.mode-option-v2').forEach(btn => btn.classList.remove('active'));
                };
                resultsList.appendChild(li);
            });
        } else {
            resultsList.classList.add('active');
            const li = document.createElement('li');
            li.className = 'search-result-item';
            li.style.color = '#7f8c8d';
            li.style.cursor = 'default';
            li.textContent = 'No matching patients found';
            resultsList.appendChild(li);
        }
    });

    // Close results on blur
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) {
            resultsList.classList.remove('active');
        }
    });
}

/* =========================================
   CLINICAL FORMS HANDLERS
   ========================================= */

// PATIENT REGISTRATION
function triggerRegistrationScheduler(e) {
    if (e) e.preventDefault();

    const nameEl = document.getElementById('reg-name');
    const dobEl = document.getElementById('reg-dob');
    const genderEl = document.getElementById('reg-gender');
    const phoneEl = document.getElementById('reg-phone');

    const fullName = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';

    if (!fullName) {
        showToast('Please enter patient Full Name first!', 'warning');
        if (nameEl) nameEl.focus();
        return;
    }
    if (!phone) {
        showToast('Please enter Contact Number first!', 'warning');
        if (phoneEl) phoneEl.focus();
        return;
    }

    // Collect Known Conditions
    const selectedConditions = [];
    document.querySelectorAll('input[name="reg-condition"]:checked').forEach(cb => {
        if (cb.value === 'Other') {
            const otherVal = document.getElementById('reg-cond-other-val')?.value.trim();
            if (otherVal) selectedConditions.push(`Other: ${otherVal}`);
        } else {
            selectedConditions.push(cb.value);
        }
    });

    const medicalHistory = {
        "Known conditions (check all that apply)": selectedConditions,
        "Current medications": document.getElementById('reg-meds')?.value.trim() || '',
        "Allergies": document.getElementById('reg-allergies')?.value.trim() || '',
        "Previous injuries or surgeries": document.getElementById('reg-injuries')?.value.trim() || ''
    };

    pendingPatientData = {
        full_name: fullName,
        dob: dobEl ? dobEl.value : '',
        gender: genderEl ? genderEl.value : 'Male',
        phone: phone,
        address: document.getElementById('reg-address')?.value.trim() || '',
        occupation: document.getElementById('reg-occupation')?.value.trim() || '',
        medical_history: medicalHistory
    };

    // Reset other scheduling states so new registration mode runs cleanly
    pendingBookingPatientId = null;
    pendingBookingPatientName = null;
    pendingBookingApptId = null;
    reschedulingApptId = null;
    
    openSchedulerModal();
}

const regForm = document.getElementById('patient-reg-form');
if (regForm) {
    // Toggle Other condition input (Safely)
    const otherCheckReg = document.getElementById('reg-cond-other-check');
    const otherWrapperReg = document.getElementById('reg-cond-other-wrapper');
    if (otherCheckReg && otherWrapperReg) {
        otherCheckReg.addEventListener('change', (e) => {
            otherWrapperReg.style.display = e.target.checked ? 'block' : 'none';
            if (!e.target.checked) {
                const otherInput = document.getElementById('reg-cond-other-val');
                if (otherInput) otherInput.value = '';
            }
        });
    }

    regForm.addEventListener('submit', triggerRegistrationScheduler);

}


// APPOINTMENT BOOKING (Unified with Scheduler Modal)
const apptForm = document.getElementById('appt-book-form');
if (apptForm) {
    apptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const patientSelect = document.getElementById('appt-patient-select');
        const patientId = patientSelect.value;
        const patientName = patientSelect.options[patientSelect.selectedIndex].text.split(' (')[0];
        
        if (!patientId) {
            alert('Please select a patient!');
            return;
        }

        // Open unified scheduler with this patient selected
        pendingBookingPatientId = patientId;
        pendingBookingPatientName = patientName;
        pendingBookingApptId = null; 
        pendingPatientData = null; 

        // Pre-fill date/time from form if user already picked them
        const preDate = document.getElementById('appt-date').value;
        const preTime = document.getElementById('appt-time').value;
        if (preDate) schedSelectedDate = preDate;
        if (preTime) schedSelectedTime = preTime;

        openSchedulerModal();
    });
}

/* =========================================
   AI CLINICAL ASSISTANT (CHATBOT)
   ========================================= */

function openChatbot() {
    document.getElementById('chatbot-section').style.display = 'block';
}

function closeChatbot() {
    document.getElementById('chatbot-section').style.display = 'none';
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    displayChatMessage('user', msg);
    input.value = '';

    try {
        const patientId = document.getElementById('tpv-patient-id')?.value || 
                          document.getElementById('assessment-patient-id')?.value || 
                          null;
        const sessionNum = parseInt(document.getElementById('tp-session-select')?.value || 
                                    document.getElementById('assessment-session-select')?.value || 
                                    document.getElementById('assessment-session-select')?.getAttribute('data-max-existing') ||
                                    1);

        const response = await API.chat(msg, patientId, sessionNum);
        displayChatMessage('ai', response.ai_response);
    } catch (err) {
        displayChatMessage('ai', 'Error: ' + err.message);
    }
}

function displayChatMessage(role, text) {
    const chatContainer = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${role}`;
    msgDiv.innerHTML = `
        <div class="chat-bubble">
            <div class="chat-sender">${role === 'ai' ? 'Move Better AI' : 'You'}</div>
            <div class="chat-text">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* =========================================
   UI TOGGLES & MODALS
   ========================================= */

function openPTPanel() {
    document.getElementById('pt-overlay').classList.add('open');
    document.getElementById('pt-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePTPanel() {
    document.getElementById('pt-overlay').classList.remove('open');
    document.getElementById('pt-panel').classList.remove('open');
    document.body.style.overflow = '';
}

function switchAudioMode(mode, btn) {
    document.querySelectorAll('.audio-mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.audio-mode-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('audio-mode-' + mode).classList.add('active');
}

/* =========================================
   AI CLINICAL ASSISTANT (AUDIO & WHISPER)
   ========================================= */

let mediaRecorder;
let audioChunks = [];
let recordInterval;
let startTime;
let audioContext;
let analyser;
let dataArray;
let animationId;

/**
 * Premium Integrated Recording Toggle
 */
function toggleInlineRecording() {
    const btn = document.getElementById('inline-record-btn');
    const status = document.getElementById('pt-record-status');
    const parent = document.querySelector('.pt-notes-container');
    
    if (mediaRecorder && mediaRecorder.state === 'recording' && currentAudioTarget === 'notes') {
        mediaRecorder.stop();
        btn.querySelector('span').textContent = '🎤';
        status.style.display = 'none';
        parent.classList.remove('recording-active');
    } else {
        startTranscribableRecording('notes');
        btn.querySelector('span').textContent = '⏹️';
        status.style.display = 'flex';
        parent.classList.add('recording-active');
    }
}


function updateInlineTimer() {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    
    const inlineTimer = document.getElementById('inline-record-timer');
    if (inlineTimer) inlineTimer.textContent = `${mins}:${secs}`;
    
    const chatTimer = document.getElementById('chat-record-timer');
    if (chatTimer) chatTimer.textContent = `${mins}:${secs}`;
    
    const workTimer = document.getElementById('workspace-mic-status');
    if (workTimer && mediaRecorder && mediaRecorder.state === 'recording') {
        workTimer.textContent = `${mins}:${secs} Listening...`;
    }
}

/**
 * GENERIC RECORDING UTILITY
 */
let currentAudioTarget = null; // 'chat', 'notes', or 'workspace'

async function startTranscribableRecording(target) {
    currentAudioTarget = target;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Setup Visualizer if target is notes (where the canvas lives)
        if (target === 'notes') {
            setupWaveformVisualizer(stream);
        }

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const file = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
            
            // Cleanup UI
            stream.getTracks().forEach(t => t.stop());
            if (audioContext && target === 'notes') audioContext.close();
            clearInterval(recordInterval);
            
            // Process based on target
            await processAudioTranscription(file, target);
        };

        mediaRecorder.start();
        startTime = Date.now();
        recordInterval = setInterval(updateInlineTimer, 1000);
    } catch (err) {
        showToast('Microphone access denied', 'error');
        console.error(err);
    }
}

async function processAudioTranscription(file, target) {
    const patientId = document.getElementById('tpv-patient-id').value || document.getElementById('assessment-patient-id').value || document.getElementById('tp-patient-id').value;
    const sessionStr = document.getElementById('tp-session-select')?.value || document.getElementById('assessment-session-select')?.value;
    const sessionNumber = parseInt(sessionStr) || 1;

    if (!patientId) {
        showToast('Patient context lost. Select a patient again.', 'error');
        return;
    }

    showToast('Transcribing audio...', 'info');
    
    try {
        const snapshot = getAudioSnapshot(file.name, null, 'Voice Command Processing...');
        const result = await API.uploadAudio(file, patientId, sessionNumber, snapshot);
        
        const transcript = result.transcript;

        if (target === 'chat') {
            const input = document.getElementById('tpv-chat-input');
            input.value = transcript;
            sendClinicalChat(); // Auto-send after voice
        } else if (target === 'workspace') {
            const contentArea = document.getElementById('tpv-content');
            // Insert at end or cursor
            const p = document.createElement('p');
            p.innerHTML = `<em>(Dictated: ${new Date().toLocaleTimeString()})</em><br>${transcript}`;
            contentArea.appendChild(p);
            showToast('Voice note added to protocol.', 'success');
        } else {
            // Default to PT panel notes
            const notesEl = document.getElementById('pt-notes');
            notesEl.value = (notesEl.value + "\n\n" + transcript).trim();
        }
    } catch (err) {
        showToast('Transcription failed: ' + err.message, 'error');
    }
}

/**
 * CHATBOT VOICE HANDLER
 */
function toggleChatMic() {
    const btn = document.getElementById('chat-mic-btn');
    const status = document.getElementById('chat-record-status');
    
    if (mediaRecorder && mediaRecorder.state === 'recording' && currentAudioTarget === 'chat') {
        mediaRecorder.stop();
        btn.classList.remove('recording');
        status.style.display = 'none';
        btn.querySelector('span').textContent = '🎤';
    } else {
        startTranscribableRecording('chat');
        btn.classList.add('recording');
        status.style.display = 'flex';
        btn.querySelector('span').textContent = '⏹️';
    }
}

/**
 * WORKSPACE VOICE HANDLER
 */
function toggleWorkspaceMic() {
    const btn = document.getElementById('workspace-mic-btn');
    const status = document.getElementById('workspace-mic-status');
    
    if (mediaRecorder && mediaRecorder.state === 'recording' && currentAudioTarget === 'workspace') {
        mediaRecorder.stop();
        btn.classList.remove('active');
        status.textContent = '';
        btn.querySelector('.mic-icon').textContent = '🎤';
    } else {
        startTranscribableRecording('workspace');
        btn.classList.add('active');
        btn.querySelector('.mic-icon').textContent = '⏹️';
    }
}

function setupWaveformVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            canvasCtx.fillStyle = '#e53e3e';
            const y = canvas.height - barHeight;
            canvasCtx.fillRect(x, y, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    draw();
}

async function handlePTAudioUpload(input, isAppend = false) {
    const file = input.files[0];
    const patientId = document.getElementById('assessment-patient-id').value;
    const sessionNumber = parseInt(document.getElementById('assessment-session-select')?.value || 1);
    
    if (!patientId) {
        showToast('Please select a patient first!', 'error');
        return;
    }
    if (!file) return;

    const statusEl = document.getElementById('pt-audio-status');
    const notesEl = document.getElementById('pt-notes');
    const suggestEl = document.getElementById('pt-ai-suggestions');

    if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.style.background = '#ebf8ff';
        statusEl.innerHTML = '<span class="loading-spinner" style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> Processing...';
    }
    
    // Only show "Processing" text if not appending (to avoid flickering text)
    if (!isAppend) {
        notesEl.value = 'Processing audio... Please wait.';
    }

    try {
        const snapshot = getAudioSnapshot(file.name, null, 'Pending Processing...');
        const result = await API.uploadAudio(file, patientId, sessionNumber, snapshot);
        
        if (statusEl) {
            statusEl.style.background = '#f0fff4';
            statusEl.innerHTML = '<span>✅</span> Analysis Complete';
        }
        
        const transcript = result.transcript;
        const summary = result.summary;

        // APPEND LOGIC
        if (isAppend) {
            const currentText = notesEl.value.trim();
            if (currentText) {
                notesEl.value = currentText + "\n\n" + transcript;
            } else {
                notesEl.value = transcript;
            }
        } else {
            notesEl.value = transcript;
        }
        
        // Scroll to bottom after appending
        notesEl.scrollTop = notesEl.scrollHeight;
        
        // Update AI Suggestions ONLY if element exists (user requested removal)
        const checkSuggestEl = document.getElementById('pt-ai-suggestions');
        if (checkSuggestEl && summary) {
            const bulletPoints = summary.split('\n').filter(p => p.trim() && p.includes('-'));
            if (bulletPoints.length > 0) {
                checkSuggestEl.innerHTML = bulletPoints.map(p => `
                    <div class="suggestion-card" style="background: white; border:1px solid #eef2f7; border-radius:10px; padding:12px; display:flex; align-items:start; gap:10px;">
                        <div style="background:#fff5f5; color:#e53e3e; padding:8px; border-radius:8px; font-size:14px;">🚩</div>
                        <div style="font-size:11px; color:#4a5568; line-height:1.5;">${p.replace('-', '').trim()}</div>
                    </div>
                `).join('');
            }
        }
        showToast('Clinical analysis complete! ✨');
    } catch (err) {
        showToast('Audio processing failed: ' + (err.message || err), 'error');
        if (statusEl) {
            statusEl.style.background = '#fff5f5';
            statusEl.style.borderColor = '#feb2b2';
            statusEl.style.color = '#c53030';
            statusEl.innerHTML = '<span>❌</span> <span id="pt-audio-name">Error: ' + file.name + '</span>';
        }
        notesEl.value = 'Error: ' + (err.message || err);
    }
}

async function uploadAudioTranscript() {
    // Deprecated in favor of saveAudioAssessment for richer data handling
    return saveAudioAssessment();
}

/**
 * EXCLUSIVITY MODE LOGIC (Restructured for Explicit Toggle)
 */

let currentAssessmentMode = null; // null, 'manual', or 'audio'

function selectAssessmentMode(mode) {
    const manualBtn = document.getElementById('mode-btn-manual');
    const audioBtn = document.getElementById('mode-btn-audio');
    const dotManual = document.getElementById('dot-manual');
    const dotAudio = document.getElementById('dot-audio');
    
    // Reset buttons
    manualBtn.classList.remove('active');
    audioBtn.classList.remove('active');
    dotManual.classList.remove('green');
    dotAudio.classList.remove('green');

    // Set Active
    if (mode === 'manual') {
        manualBtn.classList.add('active');
        dotManual.classList.add('green');
    } else if (mode === 'audio') {
        audioBtn.classList.add('active');
        dotAudio.classList.add('green');
    }

    currentAssessmentMode = mode;
    applyAssessmentModeUI();
}

function applyAssessmentModeUI() {
    console.log("EXEC MASTER: Applying Assessment Mode UI", {mode: currentAssessmentMode});
    
    const masterArea = document.getElementById('as-main-content-area');
    const leftCol = document.getElementById('as-manual-col-left');
    const rightCol = document.getElementById('as-manual-col-right');

    if (!masterArea || !leftCol || !rightCol) return;

    // Reset all states
    masterArea.classList.remove('is-locked');
    leftCol.classList.remove('path-locked');
    rightCol.classList.remove('path-locked');

    if (!currentAssessmentMode) {
        // GLOBAL LOCK (Initial Stage 1 Complete)
        masterArea.classList.add('is-locked');
    } else if (currentAssessmentMode === 'manual') {
        // MANUAL MODE: Path Isolation
        const ptPanel = document.getElementById('pt-panel');
        if (ptPanel && ptPanel.classList.contains('open')) closePTPanel();
    } else if (currentAssessmentMode === 'audio') {
        // AUDIO MODE: Path Isolation
        leftCol.classList.add('path-locked');
        rightCol.classList.add('path-locked');
        
        openPTPanel();
    }
}

function initAssessmentUI() {
    const assessmentSection = document.getElementById('assessment');
    if (!assessmentSection) return;

    // Click interceptor to guide patient selection
    assessmentSection.onclick = (e) => {
        const patientId = document.getElementById('assessment-patient-id').value;
        const searchInput = document.getElementById('assessment-patient-search');
        
        // If clicking inside the form area but no patient picked
        if (!patientId && (e.target.closest('.assessment-container') || e.target.closest('#as-step-2-container'))) {
            showToast("⚠️ Standard protocol: Please select a patient first!", "warning");
            searchInput.classList.add('pulse-search');
            searchInput.focus();
            setTimeout(() => searchInput.classList.remove('pulse-search'), 3000);
        }
    };
    
    // Initial state: Step 2 hidden
    document.getElementById('as-step-2-container').style.display = 'none';
}

function resetAssessmentMode() {
    confirmAndResetAssessment();
}

function confirmAndResetAssessment() {
    if (!confirm("This will clear all current assessment data for this patient. Proceed?")) return;

    // Clear Manual Form
    AS_MANUAL_INPUTS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'as-pain-slider' ? '5' : '');
    });
    document.getElementById('pain-val-display').textContent = '5/10';
    document.querySelectorAll('#assessment input[type="checkbox"], #assessment input[type="radio"]').forEach(el => el.checked = false);
    document.querySelectorAll('.as-custom-functional-val').forEach(el => el.closest('.custom-functional-item').remove());
    
    // Clear Custom ROM entries
    document.querySelectorAll('.rom-custom-row').forEach(row => row.remove());
    document.querySelectorAll('.rom-active, .rom-passive').forEach(el => el.value = '');
    document.querySelectorAll('.rom-pain').forEach(el => el.selectedIndex = 0);

    // Clear Audio Panel
    document.getElementById('pt-notes').value = '';
    const statusEl = document.getElementById('pt-audio-status');
    if (statusEl) statusEl.style.display = 'none';
    
    showToast('Assessment data cleared.', 'info');
}

async function saveAudioAssessment() {
    const patientId = document.getElementById('assessment-patient-id').value;
    const sessionNumber = parseInt(document.getElementById('assessment-session-select').value || 1);
    const transcript = document.getElementById('pt-notes').value.trim();

    if (!patientId) {
        showToast('Please select a patient first!', 'error');
        return;
    }
    
    if (!transcript || transcript.includes('Processing audio...')) {
        showToast('Cannot save empty or processing transcript.', 'warning');
        return;
    }

    try {
        // Create clinical snapshot FROM the transcript/AI notes
        const snapshot = getAudioSnapshot('Consultation Update', null, transcript);
        const result = await API.saveAudioTranscript(patientId, transcript, snapshot);
        
        // Also ensure an assessment record exists (if it doesn't already)
        // to make it visible in the treatment plan system
        const existing = await API.getAssessment(patientId, sessionNumber);
        if (!existing) {
            await API.createAssessment({
                patient_id: patientId,
                session_number: sessionNumber,
                complaint: "Audio consultation (see snapshot)",
                snapshot: snapshot
            });
        }
        
        showToast('Audio assessment saved successfully! ✅', 'success');
        closePTPanel();
    } catch (err) {
        showToast('Failed to save audio assessment: ' + err.message, 'error');
        console.error(err);
    }
}

/* =========================================
   ASSESSMENT SUITE LOGIC
   ========================================= */

function toggleAsOther(wrapperId, isShown) {
    const el = document.getElementById(wrapperId);
    if (el) el.style.display = isShown ? 'block' : 'none';
}

function addAsROMRow() {
    const tbody = document.getElementById('as-rom-tbody');
    const tr = document.createElement('tr');
    tr.className = 'rom-custom-row';
    tr.innerHTML = `
        <td style="padding: 10px;">
            <input type="text" class="rom-joint-name" placeholder="Body part..." style="width: 100%; padding: 4px; border: 1px solid #eee; border-radius:4px; font-weight:600;">
        </td>
        <td style="padding: 10px; text-align:center;"><input type="text" class="rom-active" placeholder="°" style="width: 50px; text-align:center; padding: 4px; border: 1px solid #eee; border-radius:4px;"></td>
        <td style="padding: 10px; text-align:center;"><input type="text" class="rom-passive" placeholder="°" style="width: 50px; text-align:center; padding: 4px; border: 1px solid #eee; border-radius:4px;"></td>
        <td style="padding: 10px; text-align:center;">
            <select class="rom-pain" style="font-size: 11px; padding: 4px; border: 1px solid #eee; border-radius:4px;">
                <option>No</option><option>Mild</option><option>Mod</option><option>Severe</option>
            </select>
        </td>
        <td style="padding: 10px; text-align:center;">
            <button type="button" class="rom-delete-btn" onclick="this.closest('tr').remove()">×</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function addAsFunctionalRow() {
    const container = document.getElementById('as-custom-functional-container');
    const div = document.createElement('div');
    div.className = 'custom-functional-item';
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.innerHTML = `
        <input type="text" class="as-custom-functional-val reg-input" placeholder="Custom limitation..." style="font-size:12px; padding:8px; flex:1;">
        <button type="button" class="rom-delete-btn" onclick="this.closest('div').remove()">×</button>
    `;
    container.appendChild(div);
}

/**
 * CLEANUP HELPER: Strips internal "Other: " prefix and handles category logic
 */
function sanitizeClinicalText(text, fallbackElId = null) {
    if (!text) return 'N/A';
    if (Array.isArray(text)) {
        return text.map(v => sanitizeClinicalText(v)).join(', ');
    }
    
    // If the value is literally "Other", try to pull from the descriptive input
    if (text === 'Other' && fallbackElId) {
        const otherVal = document.getElementById(fallbackElId)?.value.trim();
        return otherVal || 'Other (unspecified)';
    }

    // Strip internal prefix
    return text.toString().replace(/^Other:\s*/i, '');
}

/**
 * UNIT HELPER: Prevents duplicate symbols like 70°°
 */
function formatClinicalMeasure(val, unit = '°') {
    if (!val) return '--';
    const sVal = val.toString().trim();
    if (sVal === '' || sVal === '--') return '--';
    
    // Check if unit is already present (e.g., user typed "70°" or "10 flexion")
    if (sVal.toLowerCase().includes(unit.toLowerCase()) || sVal.includes('°')) {
        return sVal;
    }
    return `${sVal}${unit}`;
}

async function saveAssessment() {
    const patientId = document.getElementById('assessment-patient-id').value;
    const sessionNumber = parseInt(document.getElementById('assessment-session-select').value || 1);
    if (!patientId) {
        showToast('Please select a patient first', 'error');
        return;
    }

    try {
        // 1. Fetch Fresh Patient Profile for the Unified Snapshot
        const profile = await API.getPatientProfile(patientId);
        const registrationData = profile.patient;

        // Helper to get checked values + "Other" text
        const getValues = (name, otherCheckId, otherValId) => {
            let vals = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
                            .map(cb => cb.value)
                            .filter(v => v !== 'Other');
            const otherCheck = document.getElementById(otherCheckId);
            if (otherCheck && otherCheck.checked) {
                const otherText = document.getElementById(otherValId).value.trim();
                if (otherText) vals.push(`Other: ${otherText}`);
            }
            return vals;
        };

        // Onset is Radio
        let onset = document.querySelector('input[name="as-onset"]:checked')?.value || '';
        if (onset === 'Other') {
            const otherText = document.getElementById('as-onset-other-val').value.trim();
            if (otherText) onset = `Other: ${otherText}`;
        }

        // Collect ROM
        const romData = [];
        document.querySelectorAll('#as-rom-tbody tr').forEach(tr => {
            let name = '';
            if (tr.classList.contains('rom-fixed-row')) {
                name = tr.getAttribute('data-joint');
            } else {
                name = tr.querySelector('.rom-joint-name').value.trim() || 'Custom';
            }

            romData.push({
                joint: name,
                active: tr.querySelector('.rom-active').value,
                passive: tr.querySelector('.rom-passive').value,
                pain: tr.querySelector('.rom-pain').value
            });
        });

        // Custom Functional
        const customFunctional = Array.from(document.querySelectorAll('.as-custom-functional-val'))
                                      .map(input => input.value.trim())
                                      .filter(v => v);

        // EVALUATION BLOCK
        const evaluationData = {
            chief_complaint: document.getElementById('as-complaint').value,
            onset: onset,
            pain_intensity: document.getElementById('as-pain-slider').value,
            pain_types: getValues('as-pain-type', 'as-pain-other-check', 'as-pain-other-val'),
            associated_symptoms: getValues('as-symptoms', 'as-symptoms-other-check', 'as-symptoms-other-val'),
            posture_observation: getValues('as-posture', 'as-posture-other-check', 'as-posture-other-val'),
            rom: romData,
            special_tests: document.getElementById('as-special-tests').value,
            functional_limitations: [...getValues('as-functional', 'as-func-other-check', 'as-func-other-val'), ...customFunctional]
        };

        const data = {
            patient_id: patientId,
            session_number: sessionNumber,
            ...evaluationData,
            date: new Date().toISOString()
        };

        await API.createAssessment(data);
        showToast('Unified assessment saved successfully! ✨');
    } catch (err) {
        showToast('Failed to save unified assessment: ' + (err.message || err), 'error');
        console.error(err);
    }
}

async function generateProfessionalPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const patientId = document.getElementById('assessment-patient-id').value;
    if (!patientId) {
        showToast('Select a patient to generate report', 'error');
        return;
    }

    showToast('Generating clinical report...', 'success');

    try {
        const profile = await API.getPatientProfile(patientId);
        const p = profile.patient;
        const appts = profile.appointments || [];

        // HELPER: Professional Page Footer
        const addFooter = (pageNum, total) => {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('CONFIDENTIAL MEDICAL RECORD - Move Better Physiotherapy Clinic', 105, 285, { align: 'center' });
            doc.text(`Page ${pageNum} of ${total}`, 195, 285, { align: 'right' });
        };

        // HELPER: Section Header
        const sectionHeader = (title, y) => {
            doc.setFillColor(44, 62, 80);
            doc.rect(15, y, 180, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(title.toUpperCase(), 20, y + 5.5);
            return y + 15;
        };

        /* =========================================
           PAGE 1: DEMOGRAPHICS & APPOINTMENTS
           ========================================= */
        // Branded Header
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, 210, 42, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('MOVE BETTER PHYSIOTHERAPY', 15, 25);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('CLINICAL EVALUATION & PROGRESSION REPORT', 15, 34);

        let y = 55;
        y = sectionHeader('Patient Registration Profile', y);
        
        const demoData = [
            ['Full Name:', p.full_name, 'Gender:', p.gender || 'N/A'],
            ['Date of Birth:', p.dob || 'N/A', 'Contact:', p.phone || 'N/A'],
            ['Occupation:', p.occupation || 'N/A', 'ID Number:', p.id_number || 'N/A'],
            ['Address:', p.address || 'N/A', '', '']
        ];

        doc.autoTable({
            startY: y,
            body: demoData,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2, textColor: [44, 62, 80] },
            columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 2: { fontStyle: 'bold', width: 30 } }
        });

        y = doc.lastAutoTable.finalY + 12;
        y = sectionHeader('Recent Appointment History', y);

        const apptRows = appts.slice(0, 5).map(a => [
            new Date(a.date).toLocaleDateString(),
            a.time_slot,
            a.status,
            a.appointment_type || 'Follow-up'
        ]);

        doc.autoTable({
            startY: y,
            head: [['Date', 'Time Slot', 'Status', 'Session Type']],
            body: apptRows.length > 0 ? apptRows : [['No prior appointments recorded', '--', '--', '--']],
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 100, 100] }
        });

        y = doc.lastAutoTable.finalY + 12;
        y = sectionHeader('Clinical History & Context', y);

        const medical = p.medical_history || {};
        const medicalRows = [
            ['Known Conditions:', medical["Known conditions (check all that apply)"]?.join(', ') || 'None reported'],
            ['Medications:', medical["Current medications"] || 'None reported'],
            ['Allergies:', medical["Allergies"] || 'Denies'],
            ['Surgical History:', medical["Previous injuries or surgeries"] || 'None reported']
        ];

        doc.autoTable({
            startY: y,
            body: medicalRows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 0: { fontStyle: 'bold', width: 40, fillColor: [245, 245, 245] } }
        });

        addFooter(1, 4);

        /* =========================================
           PAGE 2: PHYSICAL EVALUATION
           ========================================= */
        doc.addPage();
        y = 30;
        y = sectionHeader('Primary Evaluation Findings', y);

        doc.setTextColor(44, 62, 80);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Chief Complaint:', 15, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const complaint = document.getElementById('as-complaint').value || 'N/A';
        const splitComplaint = doc.splitTextToSize(complaint, 175);
        doc.text(splitComplaint, 20, y + 7);
        
        y += 15 + (splitComplaint.length * 5);
        
        doc.setFont(undefined, 'bold');
        doc.text('Onset of Symptoms:', 15, y);
        doc.setFont(undefined, 'normal');
        const onsetVal = document.querySelector('input[name="as-onset"]:checked')?.value;
        doc.text(sanitizeClinicalText(onsetVal, 'as-onset-other-val'), 60, y);

        y += 12;
        y = sectionHeader('Pain Profile & Secondary Symptoms', y);
        
        doc.setFont(undefined, 'bold');
        doc.text(`Current Pain Intensity: ${document.getElementById('as-pain-slider').value}/10`, 15, y);
        
        y += 10;
        const painTypes = Array.from(document.querySelectorAll('input[name="as-pain-type"]:checked')).map(cb => cb.value);
        doc.text('Quality of Pain:', 15, y);
        doc.setFont(undefined, 'normal');
        doc.text(sanitizeClinicalText(painTypes, 'as-pain-other-val'), 60, y);

        y += 10;
        const symptoms = Array.from(document.querySelectorAll('input[name="as-symptoms"]:checked')).map(cb => cb.value);
        doc.setFont(undefined, 'bold');
        doc.text('Assoc. Symptoms:', 15, y);
        doc.setFont(undefined, 'normal');
        doc.text(sanitizeClinicalText(symptoms, 'as-symptoms-other-val'), 60, y);

        y += 10;
        const posture = Array.from(document.querySelectorAll('input[name="as-posture"]:checked')).map(cb => cb.value);
        doc.setFont(undefined, 'bold');
        doc.text('Posture Findings:', 15, y);
        doc.setFont(undefined, 'normal');
        doc.text(sanitizeClinicalText(posture, 'as-posture-other-val'), 60, y);

        addFooter(2, 4);

        /* =========================================
           PAGE 3: ROM ASSESSMENT
           ========================================= */
        doc.addPage();
        y = 30;
        y = sectionHeader('Range of Motion (ROM) Clinical Data', y);

        const romRows = [];
        document.querySelectorAll('#as-rom-tbody tr').forEach(tr => {
            let name = tr.classList.contains('rom-fixed-row') ? tr.getAttribute('data-joint') : tr.querySelector('.rom-joint-name').value;
            const active = tr.querySelector('.rom-active').value;
            const passive = tr.querySelector('.rom-passive').value;
            const pain = tr.querySelector('.rom-pain').value;
            if (active || passive || (pain && pain !== 'No')) {
                romRows.push([
                    name, 
                    formatClinicalMeasure(active), 
                    formatClinicalMeasure(passive), 
                    pain
                ]);
            }
        });

        doc.autoTable({
            startY: y,
            head: [['Joint / Segment', 'Active ROM', 'Passive ROM', 'Pain Level']],
            body: romRows.length > 0 ? romRows : [['No significant restrictions recorded', '--', '--', '--']],
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } }
        });

        addFooter(3, 4);

        /* =========================================
           PAGE 4: FUNCTIONAL STATUS & SPECIAL TESTS
           ========================================= */
        doc.addPage();
        y = 30;
        y = sectionHeader('Functional Status & Special Tests', y);

        doc.setFont(undefined, 'bold');
        doc.text('Advanced Assessment Performance:', 15, y);
        doc.setFont(undefined, 'normal');
        const tests = document.getElementById('as-special-tests').value || 'None documented';
        const splitTests = doc.splitTextToSize(tests, 140);
        doc.text(splitTests, 60, y);

        y += 12 + (splitTests.length * 4);
        const functional = Array.from(document.querySelectorAll('input[name="as-functional"]:checked')).map(cb => cb.value);
        const custom = Array.from(document.querySelectorAll('.as-custom-functional-val')).map(i => i.value).filter(v => v);
        const limitations = [...functional, ...custom];
        
        doc.setFont(undefined, 'bold');
        doc.text('Activity Limitations:', 15, y);
        doc.setFont(undefined, 'normal');
        const splitLimits = doc.splitTextToSize(sanitizeClinicalText(limitations, 'as-func-other-val'), 130);
        doc.text(splitLimits, 60, y);

        y += 20 + (splitLimits.length * 4);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Signature / Therapist Approval:', 15, y);
        doc.line(15, y + 10, 80, y + 10);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Authorized Clinical Signature', 15, y + 15);
        doc.text(`Date of Approval: ${new Date().toLocaleDateString()}`, 130, y + 15);

        addFooter(4, 4);

        doc.save(`ClinicalReport_${p.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Hospital report generated successfully! 📑');
    } catch (err) {
        showToast('Error generating hospital report', 'error');
        console.error(err);
    }
}

// INITIALIZE SESSION
checkSession();

/* =========================================
   SCHEDULER MODAL & TOAST LOGIC
   ========================================= */

let pendingPatientData = null;
let pendingBookingPatientId = null;
let pendingBookingPatientName = null;
let pendingBookingApptId = null;  // existing appointment ID for pending patients
let reschedulingApptId = null;
let reschedulingPatientName = null;
let schedCurrentDate = new Date(); 
let schedSelectedDate = null; 
let schedSelectedTime = null; 
let schedSelectedStatus = 'Confirmed';
let schedAllAppointments = [];
const ALL_TIME_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `mb-toast ${type}`;
    
    let icon = type === 'success' ? '✅' : '⚠️';
    
    toast.innerHTML = `
        <div class="mb-toast-icon">${icon}</div>
        <div class="mb-toast-text">${message}</div>
    `;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

async function openSchedulerModal() {
    window.scrollTo(0, 0);

    const overlay = document.getElementById('sched-overlay');
    if (!overlay) {
        console.error('sched-overlay not found');
        return;
    }
    if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
    }
    overlay.removeAttribute('style');      // purana inline styles saaf
    overlay.classList.add('open');

    const sName = document.getElementById('s-name');
    const hTitle = document.getElementById('sched-header-title');
    const hSub = document.getElementById('sched-header-sub');

    if (reschedulingApptId) {
        if (sName) sName.textContent = reschedulingPatientName;
        if (hTitle) hTitle.textContent = 'Reschedule Session';
        if (hSub) hSub.textContent = 'Modify time slot for this session.';
        schedSelectedStatus = 'Confirmed';
    } else if (pendingBookingPatientId) {
        if (sName) sName.textContent = pendingBookingPatientName;
        if (hTitle) hTitle.textContent = 'Schedule Pending Appointment';
        if (hSub) hSub.textContent = 'Choose date and time for this patient.';
        schedSelectedStatus = 'Pending';
    } else {
        if (sName) sName.textContent = pendingPatientData ? pendingPatientData.full_name : '--';
        if (hTitle) hTitle.textContent = 'Schedule Patient Appointment';
        if (hSub) hSub.textContent = 'Choose date and available session time.';
        schedSelectedStatus = 'Confirmed';
    }

    try { renderStatusPills(); } catch (e) { console.error(e); }

    const summaryEl = document.getElementById('sched-summary');
    if (summaryEl) summaryEl.style.display = 'block';

    if (!schedSelectedDate) {
        schedSelectedTime = null;
        schedCurrentDate = new Date();
    } else {
        schedCurrentDate = new Date(schedSelectedDate);
    }

    // Pehla calendar dekhaado, pachhi live data load karo
    try { renderCalendar(); } catch (e) { console.error(e); }
    try { renderTimeSlots(); } catch (e) { console.error(e); }
    try { updateSummary(); } catch (e) { console.error(e); }
    try { checkDoneBtn(); } catch (e) { console.error(e); }

    try {
        schedAllAppointments = await API.getAppointments();
    } catch (err) {
        console.error('Failed to fetch live schedule', err);
        schedAllAppointments = [];
    }
    try { renderCalendar(); } catch (e) { console.error(e); }
    try { renderTimeSlots(); } catch (e) { console.error(e); }
}

function closeSchedulerModal() {
    const overlay = document.getElementById('sched-overlay');
    if (overlay) {
        overlay.classList.remove('open');
        overlay.removeAttribute('style');
    }

    pendingPatientData = null;
    pendingBookingPatientId = null;
    pendingBookingPatientName = null;
    pendingBookingApptId = null;
    reschedulingApptId = null;
    reschedulingPatientName = null;
    schedSelectedDate = null;
    schedSelectedTime = null;
    schedSelectedStatus = 'Confirmed';
    
    const btn = document.getElementById('sched-done-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Done";
    }
    
    // Reset session number
    const sessEl = document.getElementById('sched-session-number');
    if (sessEl) sessEl.value = '1';
}

function updateSummary() {
    let dtStr = "--";
    if (schedSelectedDate && schedSelectedTime) {
        let [h, m] = schedSelectedTime.split(':');
        h = parseInt(h);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        dtStr = `${schedSelectedDate} at ${String(h12).padStart(2,'0')}:${m} ${ampm}`;
    } else if (schedSelectedDate) {
        dtStr = schedSelectedDate;
    }
    const dt = document.getElementById('s-datetime');
    const st = document.getElementById('s-status');
    const ss = document.getElementById('s-session');
    if (dt) dt.textContent = dtStr;
    if (st) st.textContent = schedSelectedStatus;

    const sessEl = document.getElementById('sched-session-number');
    const sessVal = sessEl ? sessEl.value : '1';
    if (ss) ss.textContent = sessVal === '1' ? 'Session 1 — Initial Assessment' : `Session ${sessVal}`;
}

function checkDoneBtn() {
    if (schedSelectedStatus === 'Pending' || schedSelectedStatus === 'Cancelled') {
        // For Pending/Cancelled, no date/time needed
        document.getElementById('sched-done-btn').disabled = false;
    } else {
        // For Confirmed, require date + time
        document.getElementById('sched-done-btn').disabled = !(schedSelectedDate && schedSelectedTime);
    }
}

// Status Selection
function selectStatus(status) {
    schedSelectedStatus = status;
    renderStatusPills();
    updateSummary();
    checkDoneBtn();
}

function renderStatusPills() {
    const pills = document.querySelectorAll('#status-pill-row .status-pill');
    pills.forEach(p => p.classList.remove('active'));
    
    pills.forEach(p => {
        if (p.textContent.includes(schedSelectedStatus)) {
            p.classList.add('active');
        }
    });
    
    const hint = document.getElementById('status-hint');
    if (schedSelectedStatus === 'Confirmed') {
        hint.textContent = 'Patient will be allocated the selected time slot.';
    } else if (schedSelectedStatus === 'Pending') {
        hint.textContent = 'Patient will be moved to the pending appointments list.';
    } else if (schedSelectedStatus === 'Cancelled') {
        hint.textContent = 'This appointment will be permanently removed.';
    }
}

// Calendar Logic
function changeMonth(dir) {
    schedCurrentDate.setMonth(schedCurrentDate.getMonth() + dir);
    renderCalendar();
}

function renderCalendar() {
    const monthYr = document.getElementById('cal-month-yr');
    const grid = document.getElementById('cal-grid');
    
    const year = schedCurrentDate.getFullYear();
    const month = schedCurrentDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthYr.textContent = `${monthNames[month]} ${year}`;
    
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';
    daysName.forEach(d => html += `<div class="cal-day-name">${d}</div>`);
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < firstDayIndex; i++) {
        html += `<div class="cal-date empty"></div>`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        d.setHours(0,0,0,0);
        
        let classes = 'cal-date';
        let onClick = `onclick="selectDate('${year}', '${month+1}', '${i}')"`;
        
        if (d < today) {
            classes += ' disabled';
            onClick = '';
        } else {
            // Check if date is fully booked
            const mStr = String(month+1).padStart(2,'0');
            const dStr = String(i).padStart(2,'0');
            const isoDate = `${year}-${mStr}-${dStr}`;
            
            const bookedForDay = schedAllAppointments.filter(
                a => String(a.date).substring(0,10) === isoDate && a.status !== 'Cancelled'
            );
            const bookedTimes = bookedForDay.map(a => a.time ? a.time.substring(0,5) : '');
            const availableSlots = ALL_TIME_SLOTS.filter(t => !bookedTimes.includes(t));
            
            if (availableSlots.length === 0 && ALL_TIME_SLOTS.length > 0) {
                classes += ' fully-booked';
            } else if (bookedForDay.length > 0) {
                classes += ' partially-booked';
            } else {
                classes += ' available';
            }
        }
        
        const mStr = String(month+1).padStart(2,'0');
        const dStr = String(i).padStart(2,'0');
        const isoDate = `${year}-${mStr}-${dStr}`;
        
        if (schedSelectedDate === isoDate) {
            classes += ' active';
        }
        
        html += `<div class="${classes}" ${onClick}>${i}</div>`;
    }
    
    grid.innerHTML = html;
}

function selectDate(y, m, d) {
    schedSelectedDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    schedSelectedTime = null; 
    renderCalendar();
    renderTimeSlots();
    updateSummary();
    checkDoneBtn();
}

// Time Slots Logic
function renderTimeSlots() {
    const grid = document.getElementById('time-slot-grid');
    if (!schedSelectedDate) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; font-size:12px; color:var(--color-text-secondary); padding:20px;">Please select a date from the calendar.</div>';
        return;
    }
    
    const times = ALL_TIME_SLOTS;
    
    // Filter database appointments for this specific date
    const bookedForDate = schedAllAppointments.filter(
        a => a.date === schedSelectedDate && a.status !== 'Cancelled' && a.id !== reschedulingApptId
    );
    
    let html = '';
    times.forEach((t, i) => {
        // Check if there is an appointment at this exact time
        let matchingAppt = bookedForDate.find(a => a.time && a.time.substring(0,5) === t);
        let isBooked = !!matchingAppt; 
        
        let display12 = t;
        let [h, m] = t.split(':');
        h = parseInt(h);
        let ampm = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12 || 12;
        display12 = `${String(h12).padStart(2,'0')}:${m} ${ampm}`;
        
        if (isBooked) {
             let pName = matchingAppt.patients?.full_name || 'Unknown Patient';
             let tooltip = `Patient Name: ${pName}\nSelected Date: ${schedSelectedDate}\nSelected Time: ${display12}`;
             html += `<div class="time-pill booked" title="${tooltip}">${display12}</div>`;
        } else {
             let active = (schedSelectedTime === t) ? 'selected' : '';
             html += `<div class="time-pill ${active}" onclick="selectTime('${t}')">${display12}</div>`;
        }
    });
    
    grid.innerHTML = html;
}

function selectTime(time24) {
    schedSelectedTime = time24;
    renderTimeSlots();
    updateSummary();
    checkDoneBtn();
}

// Action Logic
async function handleSchedDone() {
    const btn = document.getElementById('sched-done-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";
    
    const sessionNumber = parseInt(document.getElementById('sched-session-number').value) || 1;
    const sessionType = sessionNumber === 1 ? 'Initial Assessment' : `Session ${sessionNumber}`;
    
    try {
        // === CANCELLED STATUS ===
        if (schedSelectedStatus === 'Cancelled') {
            if (reschedulingApptId) {
                await API.deleteAppointment(reschedulingApptId);
                closeSchedulerModal();
                loadDashboard();
                showToast('Appointment cancelled.', 'success');
            } else if (pendingBookingApptId) {
                await API.deleteAppointment(pendingBookingApptId);
                closeSchedulerModal();
                loadDashboard();
                showToast('Pending appointment cancelled.', 'success');
            } else {
                closeSchedulerModal();
                showToast('Scheduling cancelled.', 'warning');
            }
            return;
        }
        
        // === PENDING STATUS ===
        if (schedSelectedStatus === 'Pending') {
            if (reschedulingApptId) {
                await API.updateAppointment(reschedulingApptId, { 
                    status: 'Pending', 
                    session_number: sessionNumber,
                    clinical_snapshot: getAppointmentSnapshot(reschedulingPatientName) 
                });
                closeSchedulerModal();
                loadDashboard();
                showToast('Appointment set to pending.', 'success');
            } else if (pendingBookingApptId) {
                await API.updateAppointment(pendingBookingApptId, { 
                    session_number: sessionNumber,
                    clinical_snapshot: getAppointmentSnapshot(pendingBookingPatientName) 
                });
                closeSchedulerModal();
                showToast('Patient remains in pending list.', 'warning');
            } else if (pendingPatientData) {
                // Registration + Pending
                const pSnapshot = getPatientSnapshot();
                const aSnapshot = getAppointmentSnapshot(pendingPatientData.full_name);
                const newPatient = await API.registerPatient({ ...pendingPatientData, clinical_snapshot: pSnapshot });
                await API.bookAppointment({
                    patient_id: newPatient.id,
                    session_type: sessionType,
                    session_number: sessionNumber,
                    status: 'Pending',
                    clinical_snapshot: aSnapshot
                });
                closeSchedulerModal();
                const rForm = document.getElementById('patient-reg-form');
                if (rForm) rForm.reset();
                loadDashboard();
                showToast('Patient registered as pending.', 'success');
            }
            return;
        }
        
        // === CONFIRMED STATUS (requires date + time) ===
        if (!schedSelectedDate || !schedSelectedTime) {
            showToast('Please select a date and time for Confirmed status.', 'warning');
            btn.disabled = false;
            btn.innerText = "Done";
            return;
        }
        
        if (reschedulingApptId) {
            const payload = {
                status: 'Confirmed',
                session_number: sessionNumber,
                session_type: sessionType,
                clinical_snapshot: getAppointmentSnapshot(reschedulingPatientName)
            };
            if (schedSelectedDate) payload.date = schedSelectedDate.split('T')[0];
            if (schedSelectedTime) payload.time = schedSelectedTime.substring(0, 5);
            
            await API.updateAppointment(reschedulingApptId, payload);
            closeSchedulerModal();
            loadDashboard();
            showToast('Appointment rescheduled successfully.', 'success');

        } else if (pendingBookingPatientId) {
            const snapshot = getAppointmentSnapshot(pendingBookingPatientName);
            if (pendingBookingApptId) {
                // PATCH existing pending appointment
                await API.updateAppointment(pendingBookingApptId, {
                    date: schedSelectedDate,
                    time: schedSelectedTime,
                    status: 'Confirmed',
                    session_number: sessionNumber,
                    session_type: sessionType,
                    clinical_snapshot: snapshot
                });
            } else {
                await API.bookAppointment({
                    patient_id: pendingBookingPatientId,
                    date: schedSelectedDate,
                    time: schedSelectedTime,
                    session_type: sessionType,
                    session_number: sessionNumber,
                    status: 'Confirmed',
                    clinical_snapshot: snapshot
                });
            }
            closeSchedulerModal();
            loadDashboard();
            showToast(`Appointment confirmed for ${pendingBookingPatientName}.`, 'success');
            
        } else if (pendingPatientData) {
            const pSnapshot = getPatientSnapshot();
            const aSnapshot = getAppointmentSnapshot(pendingPatientData.full_name);
            const newPatient = await API.registerPatient({ ...pendingPatientData, clinical_snapshot: pSnapshot });
            await API.bookAppointment({
                patient_id: newPatient.id,
                date: schedSelectedDate,
                time: schedSelectedTime,
                session_type: sessionType,
                session_number: sessionNumber,
                status: 'Confirmed',
                clinical_snapshot: aSnapshot
            });
            closeSchedulerModal();
            const rForm = document.getElementById('patient-reg-form');
            if (rForm) rForm.reset();
            loadDashboard(); 
            showToast('Patient registered and appointment confirmed.', 'success');
        }
        
    } catch (err) {
        showToast('Action Failed: ' + err.message, 'warning');
        btn.disabled = false;
        btn.innerText = "Done";
    }
}

async function handleSchedBack() {
    // If this is a new registration, register patient as Pending
    if (pendingPatientData) {
        try {
            const pSnapshot = getPatientSnapshot();
            const aSnapshot = getAppointmentSnapshot(pendingPatientData.full_name);
            const sessionNumber = parseInt(document.getElementById('sched-session-number').value) || 1;
            const newPatient = await API.registerPatient({ ...pendingPatientData, clinical_snapshot: pSnapshot });
            await API.bookAppointment({
                patient_id: newPatient.id,
                session_type: sessionNumber === 1 ? 'Initial Assessment' : `Session ${sessionNumber}`,
                session_number: sessionNumber,
                status: 'Pending',
                clinical_snapshot: aSnapshot
            });
            showToast(`${pendingPatientData.full_name} registered as pending.`, 'success');
            const rForm = document.getElementById('patient-reg-form');
            if (rForm) rForm.reset();
        } catch (err) {
            showToast('Registration failed: ' + err.message, 'warning');
        }
    }
    
    closeSchedulerModal();
    loadDashboard();
    const dashboardBtn = document.querySelectorAll('.nav-btn')[0];
    if (dashboardBtn) show('dashboard', dashboardBtn);
}

/* =========================================
   DASHBOARD BOARD LOGIC
   ========================================= */
let activeBoardFilter = 'today';
let activeBoardPickedDate = null;

function setBoardFilter(filter, btnElement) {
    activeBoardFilter = filter;
    activeBoardPickedDate = null;
    
    // Update active button styling
    const btns = document.querySelectorAll('.b-filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    
    renderAppointmentsBoard();
}

function setBoardFilterDate(dateStr) {
    if (!dateStr) return;
    activeBoardFilter = 'pickdate';
    activeBoardPickedDate = dateStr;
    
    // Highlight Pick Date button
    const btns = document.querySelectorAll('.b-filter-btn');
    btns.forEach(b => b.classList.remove('active'));
    const pickBtn = document.getElementById('bf-pick');
    if (pickBtn) {
        pickBtn.classList.add('active');
        pickBtn.textContent = '\uD83D\uDCC5 ' + dateStr;
    }
    
    renderAppointmentsBoard();
}

function renderAppointmentsBoard() {
    const listContainer = document.getElementById('appointments-board-list');
    if(!listContainer || !schedAllAppointments) return;
    
    // Determine Date Limits (LOCAL timezone, not UTC)
    const now = new Date();
    const todayStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const tomStr = tom.getFullYear() + '-' +
        String(tom.getMonth() + 1).padStart(2, '0') + '-' +
        String(tom.getDate()).padStart(2, '0');

    // End of current week (Sunday)
    const endOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    const weekEndStr = endOfWeek.getFullYear() + '-' +
        String(endOfWeek.getMonth() + 1).padStart(2, '0') + '-' +
        String(endOfWeek.getDate()).padStart(2, '0');

    let filteredList = [];

    // Use .substring(0,10) to safely handle any datetime strings from the backend
    if (activeBoardFilter === 'today') {
        filteredList = schedAllAppointments.filter(a => String(a.date).substring(0, 10) === todayStr);
    } else if (activeBoardFilter === 'tomorrow') {
        filteredList = schedAllAppointments.filter(a => String(a.date).substring(0, 10) === tomStr);
    } else if (activeBoardFilter === 'week') {
        filteredList = schedAllAppointments.filter(a => {
            const d = String(a.date).substring(0, 10);
            return d >= todayStr && d <= weekEndStr;
        });
    } else if (activeBoardFilter === 'pickdate' && activeBoardPickedDate) {
        filteredList = schedAllAppointments.filter(a => String(a.date).substring(0, 10) === activeBoardPickedDate);
    }
    
    // Update Mini-stats
    const tTotal = filteredList.length;
    const tConf = filteredList.filter(a => a.status === 'Confirmed').length;
    const tPend = filteredList.filter(a => a.status === 'Pending').length;
    const tComp = filteredList.filter(a => a.status === 'Completed').length;
    
    document.getElementById('ms-total').innerText = tTotal;
    document.getElementById('ms-confirmed').innerText = tConf;
    document.getElementById('ms-pending').innerText = tPend;
    document.getElementById('ms-completed').innerText = tComp;
    
    // Render Rows
    if(tTotal === 0) {
        listContainer.innerHTML = `
            <div class="b-empty">
                <div class="b-empty-icon">📅</div>
                <p>No appointments scheduled for this selection.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    // Sort by Date then Time
    filteredList.sort((a,b) => (String(a.date) + a.time).localeCompare(String(b.date) + b.time));
    
    filteredList.forEach(appt => {
        // Format 24h -> 12h
        let display12 = '--';
        const tStr = appt.time ? appt.time.substring(0,5) : '';
        if(tStr) {
            let [h, m] = tStr.split(':');
            h = parseInt(h);
            let ampm = h >= 12 ? 'PM' : 'AM';
            let h12 = h % 12 || 12;
            display12 = `${String(h12).padStart(2,'0')}:${m} ${ampm}`;
        }
        
        // Patient name from nested relation
        let pName = (appt.patients && appt.patients.full_name) ? appt.patients.full_name : 'Unknown Patient';
        let badgeClass = appt.status ? appt.status.toLowerCase().replace(' ', '-') : 'confirmed';
        
        // Show date subtitle on week and pick-date views
        let subLabel = (activeBoardFilter === 'week' || activeBoardFilter === 'pickdate')
            ? `<div class="a-time-lbl">${appt.date}</div>`
            : `<div class="a-time-lbl">Today</div>`;
        
        html += `
        <div class="a-row">
            <div class="a-time">
                <div class="a-time-val">${display12}</div>
                ${subLabel}
            </div>
            <div class="a-details">
                <div class="a-name">${pName}</div>
                <div class="a-type">${appt.session_type || 'Regular therapy session'}</div>
            </div>
            <div class="a-status">
                <div class="a-badge ${badgeClass}">${appt.status || 'Confirmed'}</div>
            </div>
            <div class="a-actions">
                <button class="a-btn" onclick="openViewPanel('${appt.patient_id}')">View</button>
                <button class="a-btn" onclick="openEditModal('${appt.id}')">Reschedule</button>
            </div>
        </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

/* =========================================
   PATIENT VIEW PANEL LOGIC
   ========================================= */
let currentViewPatientId = null;
let currentPatientData = null; // Global to store profile for editing


async function openViewPanel(patientId) {
    console.log("Opening View Panel for Patient:", patientId);
    if(!patientId) return;
    
    currentViewPatientId = patientId;
    togglePatientEdit(false); // Reset to view mode
    
    document.getElementById('view-overlay').classList.add('open');
    
    // Show Loading in panel
    document.getElementById('vp-name').textContent = "Loading...";
    document.getElementById('vp-history-list').innerHTML = '<div style="font-size:12px;color:var(--color-text-secondary);">Fetching records...</div>';
    
    try {
        const data = await API.getPatientProfile(patientId);
        renderPatientView(data);
    } catch(err) {
        showToast("Failed to load patient: " + err.message, "warning");
        closeViewPanel();
    }
}

function renderPatientView(data) {
    const p = data.patient;
    const history = data.appointments;
    currentPatientData = p; // Store for Edit mode

    
    // Header
    const initials = p.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('vp-avatar').textContent = initials;
    document.getElementById('vp-name').textContent = p.full_name;
    document.getElementById('vp-meta').textContent = `${p.gender} | Registered ${new Date(p.created_at).toLocaleDateString()}`;
    
    // Grid Details
    document.getElementById('vp-dob').textContent = p.dob || '--';
    document.getElementById('vp-gender').textContent = p.gender || '--';
    document.getElementById('vp-phone').textContent = p.phone || '--';
    document.getElementById('vp-address').textContent = p.address || '--';
    
    // Medical History Rendering (Safe)
    let mh = p.medical_history;
    if (typeof mh === 'string' && mh.trim().startsWith('{')) {
        try { mh = JSON.parse(mh); } catch(e) { mh = {}; }
    }
    mh = (mh && typeof mh === 'object') ? mh : {};

    const rawConds = mh["Known conditions (check all that apply)"];
    const condList = Array.isArray(rawConds) ? rawConds : [];
    const meds = mh["Current medications"] || '--';
    const allergies = mh["Allergies"] || '--';
    const injuries = mh["Previous injuries or surgeries"] || '--';
    
    // Fallback if medical_history is just a string (legacy)
    if (typeof p.medical_history === 'string' && !p.medical_history.trim().startsWith('{')) {
        document.getElementById('vp-history-conditions').textContent = p.medical_history || '--';
    } else {
        const condHtml = condList.length > 0 
            ? condList.map(c => `<span class="cond-badge" style="background:rgba(27, 58, 92, 0.05); padding:3px 10px; border-radius:12px; font-size:11px; margin-right:6px; display:inline-block; margin-bottom:6px; border:1px solid rgba(27, 58, 92, 0.1);">${c}</span>`).join('') 
            : '--';
        document.getElementById('vp-history-conditions').innerHTML = condHtml;
    }
    
    document.getElementById('vp-history-meds').textContent = meds;
    document.getElementById('vp-history-allergies').textContent = allergies;
    document.getElementById('vp-history-injuries').textContent = injuries;
    
    // Session History
    const list = document.getElementById('vp-history-list');
    if(!history || history.length === 0) {
        list.innerHTML = '<div style="font-size:12px;color:var(--color-text-secondary);padding:10px;text-align:center;">No past appointments.</div>';
    } else {
        list.innerHTML = history.map(h => `
            <div class="vp-history-item">
                <div class="vp-h-info">
                    <div>${h.session_type || 'Physiotherapy Session'}</div>
                    <div>${h.date} at ${h.time.substring(0,5)}</div>
                </div>
                <div class="vp-h-status badge-${h.status ? h.status.toLowerCase() : 'confirmed'}" 
                     style="color: var(--mb-navy); opacity: 0.8;">
                    ${h.status || 'Confirmed'}
                </div>
            </div>
        `).join('');
    }
}

function closeViewPanel(e) {
    // If e exists, make sure it clicked the overlay background, not the panel
    if(e && e.target !== document.getElementById('view-overlay')) return;
    
    document.getElementById('view-overlay').classList.remove('open');
    currentViewPatientId = null;
}

function togglePatientEdit(enable) {
    const vals = document.querySelectorAll('.vp-field-val');
    const inputs = [
        document.getElementById('vp-edit-dob'),
        document.getElementById('vp-edit-gender'),
        document.getElementById('vp-edit-phone'),
        document.getElementById('vp-edit-occ'),
        document.getElementById('vp-edit-address')
    ];
    
    const editBtn = document.getElementById('vp-edit-btn');
    const actionRow = document.getElementById('vp-edit-actions');
    
    if (enable) {
        // Switch to Edit Mode
        vals.forEach(v => v.style.display = 'none');
        inputs.forEach(i => i.style.display = 'block');
        
        // Match input values to current text
        document.getElementById('vp-edit-dob').value = document.getElementById('vp-dob').textContent;
        document.getElementById('vp-edit-gender').value = document.getElementById('vp-gender').textContent;
        document.getElementById('vp-edit-phone').value = document.getElementById('vp-phone').textContent;
        document.getElementById('vp-edit-occ').value = document.getElementById('vp-occ').textContent;
        document.getElementById('vp-edit-address').value = document.getElementById('vp-address').textContent;
        
        editBtn.style.display = 'none';
        actionRow.style.display = 'flex';
        document.getElementById('vp-medical-view').style.display = 'none';
        document.getElementById('vp-medical-edit').style.display = 'block';

        // Toggle logic for Other in Edit mode (Safely)
        const otherCheck = document.getElementById('vp-edit-cond-other-check');
        const otherWrapper = document.getElementById('vp-edit-cond-other-wrapper');
        
        if (otherCheck && otherWrapper) {
            if (!otherCheck.hasAttribute('data-listener')) {
                otherCheck.addEventListener('change', (e) => {
                    otherWrapper.style.display = e.target.checked ? 'block' : 'none';
                    if (!e.target.checked) document.getElementById('vp-edit-cond-other-val').value = '';
                });
                otherCheck.setAttribute('data-listener', 'true');
            }
        }

        // Set Medical History Edit Values (Safe)
        let mh = currentPatientData?.medical_history;
        if (typeof mh === 'string' && mh.trim().startsWith('{')) {
            try { mh = JSON.parse(mh); } catch(e) { mh = {}; }
        }
        mh = (mh && typeof mh === 'object') ? mh : {};
        
        const rawConds = mh["Known conditions (check all that apply)"];
        const condList = Array.isArray(rawConds) ? rawConds : [];
        
        // Reset all checkboxes first
        const checks = document.querySelectorAll('input[name="edit-condition"]');
        checks.forEach(cb => {
            cb.checked = false;
            // Match condition name
            if (condList.includes(cb.value)) cb.checked = true;
            
            // Special handling for Other
            if (cb.value === 'Other' && condList.some(c => c.startsWith('Other:'))) {
                cb.checked = true;
                const otherVal = condList.find(c => c.startsWith('Other:')).replace('Other: ', '');
                document.getElementById('vp-edit-cond-other-val').value = otherVal;
                document.getElementById('vp-edit-cond-other-wrapper').style.display = 'block';
            }
        });

        // Hide Other wrapper if not checked
        if (!document.getElementById('vp-edit-cond-other-check').checked) {
            document.getElementById('vp-edit-cond-other-wrapper').style.display = 'none';
        }

        document.getElementById('vp-edit-meds').value = mh["Current medications"] || '';
        document.getElementById('vp-edit-allergies').value = mh["Allergies"] || '';
        document.getElementById('vp-edit-injuries').value = mh["Previous injuries or surgeries"] || '';

    } else {
        // Switch to View Mode
        vals.forEach(v => v.style.display = 'block');
        inputs.forEach(i => i.style.display = 'none');
        
        editBtn.style.display = 'block';
        actionRow.style.display = 'none';
        document.getElementById('vp-medical-view').style.display = 'block';
        document.getElementById('vp-medical-edit').style.display = 'none';
    }
}

async function savePatientProfile() {
    if (!currentViewPatientId) return;
    
    const saveBtn = document.querySelector('#vp-edit-actions .done-btn');
    const originalText = saveBtn.innerText;
    
    try {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;
        
        // Collect Edit Mode Conditions
        const selectedConditions = [];
        document.querySelectorAll('input[name="edit-condition"]:checked').forEach(cb => {
            if (cb.value === 'Other') {
                const otherVal = document.getElementById('vp-edit-cond-other-val').value.trim();
                if (otherVal) selectedConditions.push(`Other: ${otherVal}`);
            } else {
                selectedConditions.push(cb.value);
            }
        });

        const medicalHistory = {
            "Known conditions (check all that apply)": selectedConditions,
            "Current medications": document.getElementById('vp-edit-meds').value.trim(),
            "Allergies": document.getElementById('vp-edit-allergies').value.trim(),
            "Previous injuries or surgeries": document.getElementById('vp-edit-injuries').value.trim()
        };

        const updateData = {
            date_of_birth: document.getElementById('vp-edit-dob').value,
            gender: document.getElementById('vp-edit-gender').value,
            contact_number: document.getElementById('vp-edit-phone').value,
            occupation: document.getElementById('vp-edit-occ').value,
            address: document.getElementById('vp-edit-address').value,
            medical_history: medicalHistory
        };
        
        await API.updatePatientProfile(currentViewPatientId, updateData);
        
        showToast("Patient profile updated successfully", "success");
        
        // Refresh panel and dashboard
        await openViewPanel(currentViewPatientId); 
        loadDashboard(); 
        
    } catch (err) {
        showToast("Update failed: " + err.message, "warning");
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

/* =========================================
   CLEAN RE-IMPLEMENTATION: RESCHEDULE FLOW
   ========================================= */
function openEditModal(apptId) {
    console.log("Starting Reschedule Flow for ID:", apptId);
    
    // 1. Locate the appointment
    const target = (schedAllAppointments || []).find(a => a.id === apptId);
    if (!target) {
        showToast("Session not found. Refreshing...", "warning");
        loadDashboard();
        return;
    }

    // 2. Set strict isolated state
    reschedulingApptId = apptId;
    reschedulingPatientName = (target.patients && target.patients.full_name) ? target.patients.full_name : 'Patient';
    
    // Force date to YYYY-MM-DD
    schedSelectedDate = target.date ? target.date.split('T')[0] : null;
    
    // Force time to HH:MM
    schedSelectedTime = target.time ? target.time.substring(0, 5) : null;

    // 3. Reset other flows
    pendingPatientData = null;
    pendingBookingPatientId = null;
    pendingBookingApptId = null;

    // 4. Pre-fill session number
    const sessEl = document.getElementById('sched-session-number');
    if (sessEl && target.session_number) {
        sessEl.value = String(target.session_number);
    }

    // 5. Open the modal
    openSchedulerModal();
}

/* =========================================
   TRASH BIN / UNDO LOGIC
   ========================================= */
function toggleTrashDrawer() {
    document.getElementById('trash-overlay').classList.add('open');
}

function closeTrashDrawer(e) {
    if (e && e.target !== document.getElementById('trash-overlay') && !e.target.classList.contains('view-close-btn')) return;
    document.getElementById('trash-overlay').classList.remove('open');
}

function renderTrashList(cancelled) {
    const container = document.getElementById('trash-list-container');
    const fab = document.getElementById('trash-fab');
    const badge = document.getElementById('trash-badge');
    
    if (!container || !fab) return;

    // Update badge and check visibility
    badge.textContent = cancelled.length;
    badge.style.display = cancelled.length > 0 ? 'flex' : 'none';

    if (cancelled.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--color-text-secondary); padding: 40px 10px;">
                <div style="font-size: 24px; margin-bottom: 8px;">✨</div>
                <div style="font-size: 13px;">Trash is empty.</div>
            </div>
        `;
        return;
    }

    let html = '';
    cancelled.forEach(item => {
        // Fallback for null timestamps
        const cancelledAt = item.cancelled_at ? new Date(item.cancelled_at) : new Date();
        const timeAgo = (cancelledAt.toString() === 'Invalid Date') ? 'just now' : getTimeAgo(cancelledAt);
        
        html += `
            <div class="trash-list-item">
                <div class="trash-item-info">
                    <div class="item-name">${item.patient_name}</div>
                    <div class="item-meta">Session ${item.session_number} · Cancelled ${timeAgo}</div>
                </div>
                <button class="trash-undo-btn" onclick="undoCancellation('${item.id}')">
                    <span>Undo</span>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function undoCancellation(apptId) {
    console.log("Undoing cancellation for:", apptId);
    try {
        // Use the global event object to find the button
        const btn = window.event ? window.event.currentTarget : null;
        if (btn) {
            btn.innerHTML = 'Restoring...';
            btn.disabled = true;
        }

        await API.updateAppointment(apptId, { status: 'Pending' });
        
        showToast("Appointment restored to Pending", "success");
        loadDashboard(); // Refresh all stats and lists
        
        // If trash becomes empty after this, modal might auto-close or look empty
    } catch (err) {
        showToast("Restoration failed: " + err.message, "warning");
    }
}

/* =========================================
   TREATMENT PLAN BUILDER
   ========================================= */

/* =========================================
   SESSION DESIGN & TREATMENT VIEWER
   ========================================= */

/**
 * Helper: Extract clean conditions from a patient.
 */
function extractPatientConditions(patient) {
    if (!patient) return [];
    let conditions = [];

    try {
        // 1. Try Clinical Snapshot (Modern flow)
        const snapshot = (typeof patient.clinical_snapshot === 'string') 
            ? JSON.parse(patient.clinical_snapshot) 
            : patient.clinical_snapshot;
            
        if (snapshot) {
            const medHistory = snapshot['Medical History'] || snapshot.medical_history || snapshot['Medical Conditions'] || snapshot.medical_conditions;
            if (medHistory) {
                conditions = medHistory['Known Conditions'] || medHistory.known_conditions || medHistory['Conditions'] || medHistory.conditions || medHistory;
            }
        }

        // 2. Try Medical History column directly
        if (!conditions || (Array.isArray(conditions) && conditions.length === 0)) {
            const rawMed = patient.medical_history;
            if (rawMed) {
                try {
                    // Try parsing as JSON first
                    const parsed = JSON.parse(rawMed);
                    if (Array.isArray(parsed)) {
                        conditions = parsed;
                    } else if (typeof parsed === 'object') {
                        conditions = parsed['Known Conditions'] || 
                                     parsed.known_conditions || 
                                     parsed['Conditions'] || 
                                     parsed.conditions || 
                                     parsed['Known conditions (check all that apply)'] ||
                                     parsed.diagnoses || 
                                     parsed['Diagnoses'];
                    } else {
                        conditions = [parsed.toString()];
                    }
                } catch (jsonErr) {
                    // If not JSON, treat as a semi-colon or comma separated string (Legacy/Manual)
                    conditions = rawMed.split(/[;,]/).map(s => s.trim()).filter(Boolean);
                    if (conditions.length === 0) conditions = [rawMed.trim()];
                }
            }
        }
        
        // 3. Last ditch: check if there's a top-level property
        if (!conditions || (Array.isArray(conditions) && conditions.length === 0)) {
            const lastDitch = patient.known_conditions || patient.conditions || patient.medical_conditions || patient.diagnoses;
            if (lastDitch) {
                conditions = Array.isArray(lastDitch) ? lastDitch : [lastDitch.toString()];
            }
        }
    } catch (e) {
        console.warn("Error parsing patient history:", e);
    }

    if (!Array.isArray(conditions)) return [];

    return conditions
        .map(c => {
            if (typeof c === 'string' && c.startsWith('Other: ')) return c.replace('Other: ', '').trim();
            if (c === 'Other') return null;
            return c;
        })
        .filter(Boolean);
}

/**
 * Sets up Search for Session Design Page.
 */
function setupSessionDesignSearch() {
    const searchInput = document.getElementById('tp-patient-search');
    const resultsList = document.getElementById('tp-search-results');
    const hiddenId    = document.getElementById('tp-patient-id');
    const hiddenCond  = document.getElementById('tp-patient-condition');

    if (!searchInput || !resultsList) return;
    if (searchInput.hasAttribute('data-has-listener')) return;
    searchInput.setAttribute('data-has-listener', 'true');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsList.innerHTML = '';
        if (!query) { resultsList.classList.remove('active'); return; }
        if (!allPatients) return;

        const filtered = allPatients.filter(p => {
            const name = (p.full_name || "").toLowerCase();
            const phone = (p.phone || p.contact_number || "").toLowerCase();
            return name.includes(query) || phone.includes(query);
        });

        if (filtered.length > 0) {
            resultsList.classList.add('active');
            filtered.forEach(p => {
                const phone = p.phone || p.contact_number || '--';
                
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.style.padding = '12px 16px';
                li.innerHTML = `
                    <div style="font-weight:600; color:#2d3748;">${p.full_name} <span style="font-weight:400; color:#718096; font-size:12px; margin-left:8px;">(${phone})</span></div>
                    <div style="color:#a0aec0; font-size:11px; margin-top:2px;">Patient Clinical Profile</div>
                `;
                
                    li.onclick = () => {
                        searchInput.value = p.full_name;
                        hiddenId.value = p.id;
                        hiddenCond.value = conditions.join(', ');
                        resultsList.classList.remove('active');
                        showToast(`Designing session for: ${p.full_name}`);
                        
                        // NEW: Aggregate sessions for ALL IDs matching this name + phone
                        loadAggregatedSessions({ name: p.full_name, phone: p.phone || p.contact_number }, 'tp-sessions-list', 'tp-session-select');
                    };
                resultsList.appendChild(li);
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) resultsList.classList.remove('active');
    });
}

/**
 * Sets up Search for Treatment Plan Viewer Page.
 */
function setupTreatmentViewerSearch() {
    const nameSearch  = document.getElementById('tpv-patient-search');
    const phoneSearch = document.getElementById('tpv-phone-search');
    const resultsList = document.getElementById('tpv-search-results');
    const hiddenId    = document.getElementById('tpv-patient-id');

    if (!nameSearch || !phoneSearch || !resultsList) return;
    if (nameSearch.hasAttribute('data-has-listener')) return;
    nameSearch.setAttribute('data-has-listener', 'true');

    const handleSearch = () => {
        const nameQuery = nameSearch.value.toLowerCase().trim();
        const phoneQuery = phoneSearch.value.toLowerCase().trim();
        
        resultsList.innerHTML = '';
        if (!nameQuery && !phoneQuery) { resultsList.classList.remove('active'); return; }
        if (!allPatients) return;

        const filtered = allPatients.filter(p => {
            const name = (p.full_name || "").toLowerCase();
            const phone = (p.phone || p.contact_number || "").toLowerCase();
            
            const nameMatch = nameQuery ? name.includes(nameQuery) : true;
            const phoneMatch = phoneQuery ? phone.includes(phoneQuery) : true;
            return nameMatch && phoneMatch;
        });

        if (filtered.length > 0) {
            resultsList.classList.add('active');
            filtered.forEach(p => {
                const phoneStr = p.phone || p.contact_number || '--';
                
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.style.padding = '12px 16px';
                li.innerHTML = `
                    <div style="font-weight:600; color:#2d3748;">${p.full_name} <span style="font-weight:400; color:#718096; font-size:12px; margin-left:8px;">(${phoneStr})</span></div>
                    <div style="color:#a0aec0; font-size:11px; margin-top:2px;">Patient Identity Confirmed</div>
                `;
                
                li.onclick = () => {
                    nameSearch.value = p.full_name;
                    phoneSearch.value = phoneStr;
                    hiddenId.value = p.id;
                    resultsList.classList.remove('active');
                    
                    // Clear previous session badge if any
                    const chatBadge = document.getElementById('chat-session-badge');
                    if (chatBadge) {
                        chatBadge.style.display = 'none';
                        chatBadge.textContent = '';
                    }

                    loadAggregatedSessions({ name: p.full_name, phone: phoneStr }, 'tpv-session-list', null, 'viewer');

                    const sessionSelector = document.getElementById('tpv-session-selector');
                    const prepContainer = document.getElementById('tpv-prep-container');
                    const emptyState = document.getElementById('tpv-empty-state');
                    const displayArea = document.getElementById('tpv-display-area');
                    
                    if (sessionSelector) sessionSelector.style.display = 'block';
                    if (prepContainer) prepContainer.style.display = 'none'; 
                    
                    if (emptyState) {
                         emptyState.innerHTML = `
                            <div style="text-align:center; padding: 40px 20px;">
                                <span style="font-size: 40px; margin-bottom: 20px; display:block;">📅</span>
                                <h3 style="color:#2c3e50; margin-bottom:10px;">Select a Session Button</h3>
                                <p style="color:#64748b; max-width:400px; margin:0 auto;">Choose one of the session buttons in the sidebar to load specific data and start analysis.</p>
                            </div>
                         `;
                         emptyState.style.display = 'flex';
                    }
                    if (displayArea) displayArea.style.display = 'none';
                };
                resultsList.appendChild(li);
            });
        }
    };

    nameSearch.addEventListener('input', handleSearch);
    phoneSearch.addEventListener('input', handleSearch);
}

/**
 * Toggle visibility of custom modality input.
 */
function toggleModalityOther(cb) {
    const container = document.getElementById('tp-modality-other-container');
    if (container) container.style.display = cb.checked ? 'block' : 'none';
}

/**
 * Save Session Design.
 * Switches to Treatment Plan page on success.
 */
async function saveTreatmentPlan(status = 'active') {
    const patientId = document.getElementById('tp-patient-id').value;
    if (!patientId) { showToast('Select a patient first.', 'warning'); return; }

    let modalities = Array.from(document.querySelectorAll('input[name="tp-modality"]:checked')).map(cb => cb.value);
    
    // Handle "Other" custom text
    const otherCheck = document.getElementById('tp-modality-other-check');
    const otherText = document.getElementById('tp-modality-other-text').value.trim();
    if (otherCheck && otherCheck.checked && otherText) {
        // Remove generic "Other" and add specific custom text
        modalities = modalities.filter(m => m !== 'Other');
        modalities.push(`Other: ${otherText}`);
    }

    const patientName = document.getElementById('tp-patient-search').value;
    const condition = document.getElementById('tp-patient-condition').value;

    const snapshot = {
        "Session Design": {
            "Patient": patientName,
            "Condition": condition,
            "Short-term Goals": document.getElementById('tp-short-goals').value,
            "Long-term Goals": document.getElementById('tp-long-goals').value,
            "Frequency": document.getElementById('tp-frequency').value,
            "Duration": document.getElementById('tp-duration').value,
            "Modalities": modalities,
            "Notes": document.getElementById('tp-therapist-notes').value
        }
    };

    const sessionNum = parseInt(document.getElementById('tp-session-select').value || 1);
    
    const payload = {
        patient_id: patientId,
        session_number: sessionNum,
        short_term_goals: document.getElementById('tp-short-goals').value,
        long_term_goals: document.getElementById('tp-long-goals').value,
        frequency: document.getElementById('tp-frequency').value,
        duration_weeks: document.getElementById('tp-duration').value,
        modalities: modalities,
        therapist_notes: document.getElementById('tp-therapist-notes').value,
        status: status,
        clinical_snapshot: snapshot
    };

    try {
        await API.saveSessionPlan(payload);
        showToast(status === 'draft' ? 'Draft saved!' : 'Session plan created! ✅', 'success');
        
        if (status === 'active') {
            // Auto-select patient in viewer and switch
            const viewerSearch = document.getElementById('tpv-patient-search');
            const viewerId = document.getElementById('tpv-patient-id');
            if (viewerSearch) viewerSearch.value = patientName;
            if (viewerId) viewerId.value = patientId;
            
            show('treatment-plan', document.querySelector('[onclick*="treatment-plan"]'));
            // Trigger the premium streaming generation
            generateStreamingTreatmentPlan(patientId);
        }
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    }
}

/**
 * Load Active Plan into Viewer.
 */
async function loadActivePlan(patientId) {
    const displayArea = document.getElementById('tpv-display-area');
    const emptyState  = document.getElementById('tpv-empty-state');
    const content     = document.getElementById('tpv-content');
    const historyList = document.getElementById('tpv-history-list');

    if (!displayArea || !content) return;

    displayArea.style.display = 'none';
    emptyState.style.display = 'flex';
    content.innerHTML = 'Loading plan data...';

    try {
        const plan = await API.getSessionPlan(patientId);
        if (!plan) {
            content.innerHTML = '<p style="padding:40px; text-align:center; color:#999;">No active session design found for this patient.</p>';
            displayArea.style.display = 'block';
            emptyState.style.display = 'none';
            return;
        }

        const mods = Array.isArray(plan.modalities) ? plan.modalities.map(m => `<span class="tpv-modality-pill">${m}</span>`).join('') : 'None';
        const date = new Date(plan.created_at).toLocaleDateString();

        content.innerHTML = `
            <div class="tpv-section">
                <div class="tpv-section-label">Active Treatment Strategy</div>
                <div class="tpv-section-meta">Last updated: ${date} • Status: <span class="tp-status-badge tp-status-${plan.status}">${plan.status}</span></div>
            </div>

            <div class="tpv-section">
                <div class="tpv-section-label">Medical Condition & Diagnosis</div>
                <div class="tpv-section-content">${plan.condition || 'Not specified'}</div>
            </div>

            <div class="tpv-section">
                <div class="tpv-section-label">General Frequency & Duration</div>
                <div class="tpv-section-content">
                    <span class="premium-badge">${plan.frequency || 'N/A'}</span>
                    <span class="premium-badge">${plan.duration_weeks || 'N/A'}</span>
                </div>
            </div>

            <div class="tpv-section">
                <div class="tpv-section-label">Short-Term Goals</div>
                <div class="tpv-section-content">${plan.short_term_goals || 'No goals specified.'}</div>
            </div>

            <div class="tpv-section">
                <div class="tpv-section-label">Treatments & Modalities</div>
                <div style="margin-top:10px;">${mods}</div>
            </div>

            <div class="tpv-section">
                <div class="tpv-section-label">Therapist Notes & Precautions</div>
                <div class="tpv-section-content" style="white-space: pre-wrap;">${plan.therapist_notes || 'No special notes provided.'}</div>
            </div>
        `;

        displayArea.style.display = 'flex'; // Changed to flex for the column layout
        emptyState.style.display = 'none';
        document.getElementById('tpv-history-section').style.display = 'block';
        document.getElementById('tpv-section-index').style.display = 'none'; // Hide section index for raw view
        document.getElementById('tpv-section-toggles').style.display = 'none'; // Hide toggles for raw view
        document.getElementById('tpv-save-container').style.display = 'none'; // No save button for existing plans
        
        // Also update history list
        loadViewerHistory(patientId);

        // Update Metadata Title
        const appts = await API.getAppointments();
        const pAppt = appts.filter(a => a.patient_id === patientId).sort((a,b) => new Date(b.date) - new Date(a.date))[0];
        if (pAppt) {
            updatePlanMetadata(pAppt.session_number, pAppt.date);
        }

    } catch (err) {
        content.innerHTML = `<p style="color:red; padding:20px;">Error loading plan: ${err.message}</p>`;
        displayArea.style.display = 'flex';
        emptyState.style.display = 'none';
    }
}

/**
 * Update the Treatment Plan Metadata UI (Session & Date)
 */
function updatePlanMetadata(sessionNum, dateStr) {
    const parentHeader = document.querySelector('.viewer-sidebar h4');
    if (parentHeader) {
        const date = new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const badgeClass = sessionNum === 1 ? 'session-badge' : 'session-badge historical';
        const badgeText = sessionNum === 1 ? 'INITIAL PLAN' : 'PREVIOUS RECORD';
        
        parentHeader.innerHTML = `📋 SESSION ${sessionNum || 1} &bull; ${date} <span class="${badgeClass}">${badgeText}</span>`;
        parentHeader.style.color = 'var(--mb-navy)';
        parentHeader.style.fontSize = '12px';
        parentHeader.style.letterSpacing = '1px';
    }
}

/**
 * Load History for Viewer.
 */
async function loadViewerHistory(patientId) {
    const list = document.getElementById('tpv-history-list');
    if (!list) return;
    try {
        const plans = await API.getSessionPlan(patientId); // Backend returns latest, ideally returns list
        const planArr = Array.isArray(plans) ? plans : [plans];
        list.innerHTML = planArr.filter(Boolean).map(p => {
            const date = new Date(p.created_at).toLocaleDateString();
            return `
                <div class="tp-history-card" onclick="loadActivePlan('${p.patient_id}')">
                    <div>
                        <div class="tp-hc-title">${p.frequency} Plan</div>
                        <div class="tp-hc-meta">Modified: ${date}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

/**
 * Floating Chat Toggle.
 */
function toggleFloatingChat() {
    const box = document.getElementById('floating-chat-box');
    const label = document.getElementById('floating-chat-label');
    if (!box) return;
    box.classList.toggle('active');
    label.textContent = box.classList.contains('active') ? 'Close Chat' : 'Clinical Assistant';

    // When opening, update welcome card with current patient info
    if (box.classList.contains('active')) {
        const patientName = document.getElementById('tpv-patient-search')?.value;
        const welcomeText = document.getElementById('chat-welcome-text');
        if (welcomeText && patientName) {
            welcomeText.textContent = `Patient "${patientName}" loaded. I have access to all their assessments, transcripts, and plans.`;
        }
    }
}

/**
 * SECTION-BASED PARSING ENGINE
 * Splits the AI markdown into logical blocks for the accordion view.
 */
function parseTreatmentPlanToSections(md) {
    if (!md) return [];
    
    // STRICT LEVEL PARSING:
    // We only create buttons for Top Level (#) and Second Level (##) headers.
    // Sub-headers (### like "1. Goals") stay inside the section content.
    const blocks = md.split(/^#{1,2}\s+/gm);
    const sections = [];
    
    blocks.forEach(block => {
        if (!block.trim()) return;
        
        const lines = block.split('\n');
        let title = lines[0].trim();
        let content = lines.slice(1).join('\n').trim();
        
        // Skip splash header
        if (title.toUpperCase().includes('DETAILED TREATMENT PLAN')) {
            if (content.length < 50) return;
        }

        // Clean up title
        title = title.replace(/[#*:-]+$/, '').replace(/^[#*:-]+/, '').trim();

        if (title && content) {
            sections.push({
                id: 'section-' + Math.random().toString(36).substr(2, 9),
                title: title,
                content: content
            });
        }
    });

    if (sections.length === 0) {
        sections.push({ id: 'main-plan', title: 'Full Protocol', content: md });
    }

    return sections;
}

/**
 * STREAMING AI TREATMENT GENERATION (Integrated with Chatbot)
 */
async function generateStreamingTreatmentPlan(patientId) {
    const displayArea = document.getElementById('tpv-display-area');
    const emptyState = document.getElementById('tpv-empty-state');
    const loadingState = document.getElementById('tpv-loading-state');
    const indexContainer = document.getElementById('tpv-section-index');
    const loaderStatus = document.getElementById('tpv-loader-status');
    const loaderProgress = document.getElementById('tpv-loader-progress');

    if (!displayArea || !loadingState) return;

    // UI Setup
    displayArea.style.display = 'none';
    emptyState.style.display = 'none';
    indexContainer.style.display = 'none';
    loadingState.style.display = 'flex';
    
    loaderStatus.textContent = 'Initiating clinical analysis...';
    loaderProgress.style.width = '10%';

    // 1. Prepare Chatbot for streaming
    const chatHistory = getSessionChatHistory(); // Get conversation from current UI/memory
    
    const chatBox = document.getElementById('floating-chat-box');
    if (chatBox && !chatBox.classList.contains('active')) {
        toggleFloatingChat();
    }
    
    const chatContainer = document.getElementById('tpv-chat-messages');
    const welcome = document.getElementById('chat-welcome-card');
    if (welcome) welcome.style.display = 'none';

    // Create a special streaming bubble
    const streamBubbleId = 'stream-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg ai';
    msgDiv.innerHTML = `
        <div class="chat-bubble chat-streaming-bubble">
            <div class="chat-sender">Move Better AI · Writing...</div>
            <div id="${streamBubbleId}" class="chat-text"></div>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    const streamTarget = document.getElementById(streamBubbleId);

    try {
        const token = localStorage.getItem('mb_token');
        const payload = {
            appointment_id: currentAppointmentId,
            chat_history: chatHistory
        };
        
        const response = await fetch(`${API_BASE_URL}/ai/treatment/generate-plan/${patientId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Generation failed');
        
        // Hide preparation UI if plan generation starts
        const prepContainer = document.getElementById('tpv-prep-container');
        if (prepContainer) prepContainer.style.display = 'none';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let markdownBuffer = '';
        
        loaderStatus.textContent = 'Synthesizing evidence-informed protocol...';
        loaderProgress.style.width = '30%';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            markdownBuffer += parsed.text;
                            // Real-time update in chatbot
                            streamTarget.innerHTML = formatMarkdown(markdownBuffer);
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                            
                            // Visual Progress Simulation
                            if (markdownBuffer.length > 500) loaderProgress.style.width = '60%';
                            if (markdownBuffer.length > 2000) loaderProgress.style.width = '90%';
                        }
                    } catch (e) {}
                }
            }
        }

        // 2. Generation Complete - Parse and Show UI
        loaderStatus.textContent = 'Formatting clinical document...';
        loaderProgress.style.width = '100%';
        
        const sections = parseTreatmentPlanToSections(markdownBuffer);
        window.currentActivePlan = sections; // Global store for switching
        window.activeSectionIds = new Set(); // Multi-toggle state

        // Fetch latest session metadata to show correct labels
        try {
            const appts = await API.getAppointments();
            const pAppts = appts.filter(a => a.patient_id === patientId).sort((a,b) => new Date(b.date) - new Date(a.date));
            const latest = pAppts[0];
            updatePlanMetadata(latest?.session_number || 1, latest?.date || new Date().toISOString());
            
            // Initialize Personalized Greeting for Dr. Kajal
            const patientName = document.getElementById('tpv-patient-search').value;
            const welcomeCard = document.getElementById('chat-welcome-card');
            const welcomeText = document.getElementById('chat-welcome-text');
            if (welcomeCard && welcomeText) {
                welcomeCard.style.display = 'block';
                welcomeText.innerHTML = `How can I assist you, <strong>Dr. Kajal J. Patel</strong>, with patient <strong>${patientName || 'this patient'}</strong>? I have analyzed all assessments and session transcripts.`;
                // Clear old messages when patient changes
                document.querySelectorAll('.chat-msg').forEach(m => m.remove());
            }
        } catch (e) {
            updatePlanMetadata(1, new Date().toISOString());
        }

        renderPlanSectionIndex(sections);
        
        setTimeout(() => {
            loadingState.style.display = 'none';
            displayArea.style.display = 'flex';
            indexContainer.style.display = 'block';
            document.getElementById('tpv-section-toggles').style.display = 'flex';
            document.getElementById('tpv-save-container').style.display = 'flex';
            
            // Show only first section by default (as per user request)
            if (sections.length > 0) {
                togglePlanSection(0, true); 
            }
            
            showToast('Treatment plan generated. Review and confirm to save.', 'success');
        }, 800);

    } catch (err) {
        showToast('AI Generation failed: ' + err.message, 'error');
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

function renderPlanSectionIndex(sections) {
    const list = document.getElementById('tpv-section-list');
    const toggles = document.getElementById('tpv-section-toggles');
    if (!list || !toggles) return;
    
    // Sidebar list (simple vertical link)
    list.innerHTML = sections.map((s, idx) => `
        <div class="section-chip" data-idx="${idx}" onclick="togglePlanSection(${idx})">
            <span class="chip-icon">📄</span>
            <span class="chip-title">${s.title}</span>
        </div>
    `).join('');

    // Top horizontal toggles (Premium chips)
    toggles.innerHTML = sections.map((s, idx) => `
        <div id="tog-${idx}" class="toggle-chip" onclick="togglePlanSection(${idx})">
            <i class="fas fa-plus-circle"></i>
            <span>${s.title}</span>
        </div>
    `).join('');
}

/**
 * MULTI-TOGGLE SECTION LOGIC
 */
function togglePlanSection(index, forceOn = false) {
    if (!window.currentActivePlan || !window.currentActivePlan[index]) return;
    
    const section = window.currentActivePlan[index];
    const chip = document.getElementById(`tog-${index}`);
    
    if (window.activeSectionIds.has(index) && !forceOn) {
        window.activeSectionIds.delete(index);
        if (chip) chip.classList.remove('active');
        if (chip) chip.querySelector('i').className = 'fas fa-plus-circle';
    } else {
        window.activeSectionIds.add(index);
        if (chip) chip.classList.add('active');
        if (chip) chip.querySelector('i').className = 'fas fa-check-circle';
    }

    renderActiveSections();
}

function renderActiveSections() {
    const contentArea = document.getElementById('tpv-content');
    if (!contentArea) return;

    if (window.activeSectionIds.size === 0) {
        contentArea.innerHTML = `
            <div style="text-align:center; padding: 60px; color: #94a3b8;">
                <i class="fas fa-layer-group" style="font-size:32px; margin-bottom:15px;"></i>
                <p>Select sections from the top bar to view your protocol.</p>
            </div>
        `;
        return;
    }

    // Sort by original index to maintain logical clinical flow
    const sortedIndices = Array.from(window.activeSectionIds).sort((a, b) => a - b);
    
    let combinedHtml = '';
    sortedIndices.forEach(idx => {
        const section = window.currentActivePlan[idx];
        combinedHtml += `
            <div class="clinical-content" data-section-idx="${idx}">
                <h2>${section.title}</h2>
                <div class="section-editable-body">
                    ${formatMarkdown(section.content)}
                </div>
            </div>
        `;
    });

    contentArea.innerHTML = combinedHtml;
}

/**
 * SAVE FINALIZED TREATMENT PLAN
 */
async function confirmAndSaveTreatmentPlan() {
    const patientId = document.getElementById('tpv-patient-id').value;
    const contentArea = document.getElementById('tpv-content');
    
    if (!patientId || !contentArea) return;

    const finalizedContent = contentArea.innerHTML;
    // Extract plain text for simple summaries if needed
    const plainText = contentArea.innerText;

    try {
        showToast('Saving protocol to clinical records...', 'info');
        
        await API.finalizeTreatmentPlan({
            patient_id: patientId,
            finalized_content: finalizedContent,
            status: 'finalized'
        });

        showToast('Treatment Plan Finalized & Saved!', 'success');
        
        // Disable save button or show saved state
        const saveContainer = document.getElementById('tpv-save-container');
        if (saveContainer) saveContainer.style.display = 'none';
        
        // Refresh history
        loadViewerHistory(patientId);
        
    } catch (err) {
        showToast('Failed to save protocol: ' + err.message, 'error');
    }
}

/**
 * Premium Markdown to HTML converter
 */
function formatMarkdown(md) {
    if (!md) return '';
    
    let html = md;
    
    // Detect Red Flags
    if (html.includes('⚠️') || html.toLowerCase().includes('red flag')) {
        // Simple wrap for red flags if they appear in text
        html = html.replace(/(⚠️.*$)/gim, '<div class="clinical-warning"><div class="warning-title">⚠️ Clinical Alert</div>$1</div>');
    }

    return html
        .replace(/^# (.*$)/gim, '<h2>$1</h2>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        .replace(/^### (.*$)/gim, '<h4>$1</h4>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

/**
 * UPGRADED PATIENT-AWARE CLINICAL CHAT
 */
async function sendClinicalChat() {
    const patientId = document.getElementById('tpv-patient-id').value;
    const input = document.getElementById('tpv-chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const sessionBadge = document.getElementById('chat-session-badge');
    const sessionNumber = sessionBadge ? parseInt(sessionBadge.textContent.replace('Session ', '')) : null;

    if (!patientId) {
        showToast('Select a patient first to use the clinical assistant.', 'warning');
        return;
    }

    // UI State
    const chatContainer = document.getElementById('tpv-chat-messages');
    const welcome = document.getElementById('chat-welcome-card');
    if (welcome) welcome.style.display = 'none';

    displayClinicalChatMessage('user', msg);
    input.value = '';

    // INTENT DETECTION: Check if user wants to start the actual plan generation
    const triggerPhrase = "OK THEN LETS START TO CREATE TREATMENT PLAN";
    if (msg.toUpperCase().includes(triggerPhrase)) {
        generateStreamingTreatmentPlan(patientId);
        return;
    }
    
    // Create AI response bubble for streaming
    const streamId = 'chat-stream-' + Date.now();
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.className = 'chat-msg ai';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    aiMsgDiv.innerHTML = `
        <div class="chat-bubble">
            <div class="chat-sender">Move Better AI</div>
            <div id="${streamId}" class="chat-text">...</div>
            <div class="chat-time">${time}</div>
        </div>
    `;
    chatContainer.appendChild(aiMsgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const streamTarget = document.getElementById(streamId);
    const typing = document.getElementById('chat-typing');
    if (typing) typing.style.display = 'block';

    const history = getSessionChatHistory();

    try {
        const token = localStorage.getItem('mb_token');
        const response = await fetch(`${API_BASE_URL}/ai/chatbot/stream/${patientId}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: msg,
                session_number: sessionNumber,
                chat_history: history
            })
        });

        if (!response.ok) throw new Error('Chat generation failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        if (typing) typing.style.display = 'none';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            fullResponse += parsed.text;
                            // Real-time update with markdown support
                            streamTarget.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse.replace(/\n/g, '<br>');
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        } else if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        // Fallback: If it's not JSON, maybe it's raw text
                        if (dataStr && !dataStr.startsWith('{')) {
                            fullResponse += dataStr;
                            streamTarget.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullResponse) : fullResponse.replace(/\n/g, '<br>');
                        }
                    }
                }
            }
        }
        
        // Final render with full markdown support once stream is done
        const hasProtocol = fullResponse.includes('PHASE 1') || fullResponse.includes('TREATMENT PLAN');
        
        streamTarget.innerHTML = formatMarkdown(fullResponse);

        if (hasProtocol) {
            const applyBtn = document.createElement('button');
            applyBtn.className = 'apply-plan-btn';
            applyBtn.innerHTML = `<span>📋</span> Apply this Plan to Workspace`;
            applyBtn.onclick = () => applyChatPlanToWorkspace(fullResponse);
            streamTarget.appendChild(applyBtn);
        }

        // SAVE history for persistence
        saveSessionConsultation();

    } catch (err) {
        if (typing) typing.style.display = 'none';
        streamTarget.textContent = 'Clinical Assistant Error: ' + err.message;
        streamTarget.style.color = 'var(--color-danger)';
    }
}

/**
 * CONSULTATIVE ANALYSIS HANDLERS
 */

/**
 * SESSION-BASED CONSULTATION LOGIC
 */
let currentAppointmentId = null;

async function loadSessionsForTreatment(patientId) {
    const list = document.getElementById('tpv-session-list');
    if (!list) return;
    list.innerHTML = '<div style="font-size:12px; color:#94a3b8;">Loading sessions...</div>';
    
    try {
        const data = await API.getPatientProfile(patientId);
        const appts = data.appointments || [];
        
        if (appts.length === 0) {
            list.innerHTML = '<div style="font-size:12px; color:#94a3b8; padding:10px;">No appointments found.</div>';
            return;
        }

        list.innerHTML = appts.map(a => {
            const date = new Date(a.date).toLocaleDateString();
            const time = a.time ? a.time.substring(0,5) : '';
            return `
                <div class="session-select-card" id="session-card-${a.id}" onclick="selectSessionForTreatment('${a.id}', '${date}')">
                    <div style="font-weight:600; font-size:13px; color:#1e293b;">Session ${a.session_number}</div>
                    <div style="font-size:11px; color:#64748b;">${date} • ${time}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        list.innerHTML = `<div style="font-size:12px; color:#ef4444;">Error: ${err.message}</div>`;
    }
}

function animateButtonText(btn, newText) {
    if (!btn) return;
    btn.style.opacity = '0';
    setTimeout(() => {
        btn.innerHTML = newText;
        btn.style.opacity = '1';
    }, 200);
}

async function selectSessionForTreatment(apptId, dateStr, patientIdForThisSession) {
    currentAppointmentId = apptId;
    
    // IMPORTANT: Swap patient context to the specific record this session belongs to
    if (patientIdForThisSession) {
        document.getElementById('tpv-patient-id').value = patientIdForThisSession;
    }
    
    // Highlight UI
    document.querySelectorAll('.session-select-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`session-card-${apptId}`);
    if (card) card.classList.add('active');
    
    // Show prep button
    document.getElementById('tpv-prep-container').style.display = 'block';
    
    // Update view state and active session button prompt
    const emptyState = document.getElementById('tpv-empty-state');
    const analyzeBtn = document.getElementById('tpv-analyze-btn');
    
    emptyState.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
            <span style="font-size: 48px; margin-bottom: 24px; display:block;">⚙️</span>
            <h3 style="color:#2c3e50; margin-bottom:12px;">Session ${apptId ? 'Ready' : ''}</h3>
            <p style="color:#64748b; max-width:400px; margin:0 auto; line-height:1.6;">
                You are now context-locked into <strong>Session from ${dateStr}</strong>. 
                <br><br>
                This means AI will audit specific database records for this visit only. Click the button below to generate high-fidelity rehab protocol.
            </p>
        </div>
    `;
    
    if (analyzeBtn) {
        animateButtonText(analyzeBtn, `🧠 Analyze & Prep Session ${apptId ? 'Context' : ''}`);
    }

    // Attempt to RECOVER previous consultation and plan
    recoverSessionHistory(apptId);
    
    // UPDATE Chatbot Header with Session Info
    const chatBadge = document.getElementById('chat-session-badge');
    const data = await API.getPatientProfile(patientIdForThisSession || document.getElementById('tpv-patient-id').value);
    const appt = (data.appointments || []).find(a => a.id === apptId);
    
    if (chatBadge && appt) {
        chatBadge.textContent = `Session ${appt.session_number}`;
        chatBadge.style.display = 'inline-block';
        chatBadge.style.background = 'rgba(255,255,255,0.2)';
    }
    
    // SYNC the session-select input at the top if it exists
    const topSessionInput = document.getElementById('tp-session-select');
    if (topSessionInput) {
        // Since we already have the patient context, we can fetch
        const data = await API.getPatientProfile(patientIdForThisSession || document.getElementById('tpv-patient-id').value);
        const appt = (data.appointments || []).find(a => a.id === apptId);
        if (appt) topSessionInput.value = appt.session_number;
    }
}

async function initiateCaseAnalysis() {
    const patientId = document.getElementById('tpv-patient-id').value;
    if (!patientId) {
        showToast('Select a patient first.', 'warning');
        return;
    }

    const chatContainer = document.getElementById('tpv-chat-messages');
    const welcome = document.getElementById('chat-welcome-card');
    if (welcome) welcome.style.display = 'none';

    // Clear old chat messages for a fresh analysis
    chatContainer.innerHTML = '';

    const streamId = 'analysis-' + Date.now();
    const aiMsgDiv = document.createElement('div');
    aiMsgDiv.className = 'chat-msg ai';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    aiMsgDiv.innerHTML = `
        <div class="chat-bubble">
            <div class="chat-sender">Move Better AI · Case Audit</div>
            <div id="${streamId}" class="chat-text">...</div>
            <div class="chat-time">${time}</div>
        </div>
    `;
    chatContainer.appendChild(aiMsgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const streamTarget = document.getElementById(streamId);

    try {
        const token = localStorage.getItem('mb_token');
        let url = `${API_BASE_URL}/ai/treatment/analyze-case/${patientId}`;
        
        // Pass the locked appointment ID for specific session analysis
        if (currentAppointmentId) {
            url += `?appointment_id=${currentAppointmentId}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Analysis failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnalysis = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.text) {
                            fullAnalysis += parsed.text;
                            streamTarget.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullAnalysis) : fullAnalysis.replace(/\n/g, '<br>');
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        } else if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                         // Fallback for raw text
                        if (dataStr && !dataStr.startsWith('{')) {
                            fullAnalysis += dataStr;
                            streamTarget.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullAnalysis) : fullAnalysis.replace(/\n/g, '<br>');
                        }
                    }
                }
            }
        }
        
        // Final render with markdown
        streamTarget.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullAnalysis) : fullAnalysis.replace(/\n/g, '<br>');

        // SAVE the analysis to session history
        saveSessionConsultation();

    } catch (err) {
        streamTarget.textContent = 'Analysis Error: ' + err.message;
        streamTarget.style.color = 'var(--color-danger)';
    }
}

async function recoverSessionHistory(apptId) {
    const patientId = document.getElementById('tpv-patient-id').value;
    const chatContainer = document.getElementById('tpv-chat-messages');
    const welcome = document.getElementById('chat-welcome-card');
    
    try {
        // 1. Fetch Plan for this session
        const plan = await API.getFinalizedTreatmentPlan(patientId, apptId);
        
        if (plan) {
            // If plan exists, show it in the workspace
            renderTreatmentPlanFromSnapshot(plan.finalized_content);
            
            // Populate chat from saved history
            if (plan.chat_history && plan.chat_history.length > 0) {
                if (welcome) welcome.style.display = 'none';
                chatContainer.innerHTML = '';
                plan.chat_history.forEach(msg => {
                    displayClinicalChatMessage(msg.role, msg.content);
                });
            } else {
                if (welcome) welcome.style.display = 'block';
                chatContainer.innerHTML = '';
            }
        } else {
            // Reset chat for clean analysis if no previous consultation
            if (welcome) welcome.style.display = 'block';
            chatContainer.innerHTML = '';
            
            // Hide display area if no plan for this session
            document.getElementById('tpv-display-area').style.display = 'none';
            document.getElementById('tpv-empty-state').style.display = 'flex';
        }

    } catch (err) {
        console.error("Session recovery failed:", err);
    }
}

function getSessionChatHistory() {
    const chatContainer = document.getElementById('tpv-chat-messages');
    const messages = [];
    chatContainer.querySelectorAll('.chat-msg').forEach(msgDiv => {
        const role = msgDiv.classList.contains('user') ? 'user' : 'assistant';
        const content = msgDiv.querySelector('.chat-text').innerText;
        messages.push({ role, content });
    });
    return messages;
}

async function saveSessionConsultation() {
    const patientId = document.getElementById('tpv-patient-id').value;
    const history = getSessionChatHistory();
    
    const sessionBadge = document.getElementById('chat-session-badge');
    const sessionNumber = sessionBadge ? parseInt(sessionBadge.textContent.replace('Session ', '')) : 1;
    
    if (!currentAppointmentId || !patientId) return;

    try {
        await API.finalizeTreatmentPlan({
            patient_id: patientId,
            session_number: sessionNumber,
            appointment_id: currentAppointmentId,
            chat_history: history,
            status: 'consultation'
        });
    } catch (err) {
        console.error("Failed to save consultation history:", err);
    }
}

function renderTreatmentPlanFromSnapshot(htmlContent) {
    const displayArea = document.getElementById('tpv-display-area');
    const emptyState = document.getElementById('tpv-empty-state');
    const content = document.getElementById('tpv-content');
    const saveContainer = document.getElementById('tpv-save-container');

    displayArea.style.display = 'flex';
    emptyState.style.display = 'none';
    content.innerHTML = htmlContent;
    
    if (saveContainer) saveContainer.style.display = 'block';
}

function displayClinicalChatMessage(role, text) {
    if (!text) return;
    const chatContainer = document.getElementById('tpv-chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${role}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Choose between marked and simple formatting
    const formattedText = typeof marked !== 'undefined' ? marked.parse(text) : text.replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = `
        <div class="chat-bubble">
            <div class="chat-sender">${role === 'user' ? 'Dr. Kajal' : 'Move Better AI'}</div>
            <div class="chat-text">${formattedText}</div>
            <div class="chat-time">${time}</div>
        </div>
    `;
    
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleQuickPrompt(action) {
    const input = document.getElementById('tpv-chat-input');
    let query = "";
    if (action === 'Summarize Case') query = "Please summarize this patient's clinical case, focusing on the chief complaint and latest assessment findings.";
    if (action === 'Identify Risks') query = "Identify any potential risks or clinical red flags based on the patient's medical history and current assessment.";
    if (action === 'Home Exercises') query = "Suggest 3 evidence-based home exercises suitable for this patient's current condition.";
    if (action === 'Red Flags') query = "Based on the records, are there any clinical red flags I should be aware of?";
    
    if (query) {
        input.value = query;
        sendClinicalChat();
    }
}

/**
 * PROTOCOL SWAPPING LOGIC
 */
async function applyChatPlanToWorkspace(markdown) {
    if (!markdown) return;
    
    const patientId = document.getElementById('tpv-patient-id').value;
    if (!patientId) return;

    try {
        // 1. Process markdown into structured sections
        const sections = parseTreatmentPlanToSections(markdown);
        if (sections.length === 0) {
            showToast('Could not identify sections in the chat response.', 'warning');
            return;
        }

        // 2. Update state and UI
        window.currentActivePlan = sections;
        window.activeSectionIds = new Set(); // Reset visibility
        
        renderPlanSectionIndex(sections);
        
        // 3. Auto-open first section
        togglePlanSection(0, true);
        
        // 4. Highlight current workspace
        const contentArea = document.getElementById('tpv-content');
        contentArea.classList.add('highlight-new');
        setTimeout(() => contentArea.classList.remove('highlight-new'), 2000);
        
        showToast('New treatment plan applied to workspace!', 'success');
        
        // 5. Scroll main view into view if needed
        document.getElementById('tpv-display-area').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        showToast('Failed to apply plan: ' + err.message, 'error');
    }
}

async function populateSessionDropdown(patientId, selectElementId) {
    const select = document.getElementById(selectElementId);
    if(!select) return;
    
    // Default fallback state
    select.innerHTML = '<option value=\"1\">Session 1</option>';
    
    try {
        const profile = await API.getPatientProfile(patientId);
        const appts = profile.appointments || [];
        
        if (appts.length > 0) {
            // Find all unique session numbers, sort descending
            const sessions = [...new Set(appts.map(a => Number(a.session_number) || 1))].sort((a,b) => b - a);
            
            // Generate options
            select.innerHTML = '';
            sessions.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = 'Session ' + s;
                select.appendChild(opt);
            });
        }
    } catch(err) {
        console.error('Failed to load session numbers for dropdown', err);
    }
}


/* NEW: Session Retrieval Helper for Dropdowns */
async function loadSessionsForDropdown(patientId, selectId) {
    const inputEl = document.getElementById(selectId);
    if (!inputEl) return;
    
    // Find the associated datalist
    const listId = inputEl.getAttribute('list');
    const datalistEl = document.getElementById(listId);
    
    try {
        const profile = await API.getPatientProfile(patientId);
        const appts = profile.appointments || [];
        
        if (datalistEl) datalistEl.innerHTML = ''; // Clear options
        
        if (appts.length === 0) {
            inputEl.value = "1";
            if (datalistEl) datalistEl.innerHTML = '<option value="1">Session 1 (New)</option>';
            return;
        }
        
        // Extract distinct session numbers
        let maxSession = 1;
        const sessions = new Set();
        appts.forEach(a => {
            const sNum = parseInt(a.session_number || 1);
            sessions.add(sNum);
            if (sNum > maxSession) maxSession = sNum;
        });
        
        // Populate Datalist
        const sortedSessions = Array.from(sessions).sort((a,b) => a-b);
        if (datalistEl) {
            sortedSessions.forEach(sNum => {
                const opt = document.createElement('option');
                opt.value = sNum;
                opt.textContent = `Session ${sNum}`;
                datalistEl.appendChild(opt);
            });
            // Also suggest the NEXT new session
            const nextSession = maxSession + 1;
            const nextOpt = document.createElement('option');
            nextOpt.value = nextSession;
            nextOpt.textContent = `Session ${nextSession} (New)`;
            datalistEl.appendChild(nextOpt);
        }

        // DEFAULT BEHAVIOR: Default to the HIGHEST existing session number
        inputEl.value = maxSession.toString();
        inputEl.setAttribute('data-max-existing', maxSession);
        
        // Add change listener to validate if session exists (only for specific pages)
        inputEl.onchange = (e) => {
            const val = parseInt(e.target.value);
            if (val > maxSession + 1) {
                showToast(`Warning: Session ${val} is far beyond current history (Max: ${maxSession}).`, "warning");
            }
        };
        
    } catch (e) {
        console.error('Failed to load sessions:', e);
        inputEl.value = "1";
    }
}


/**
 * AGGREGATED SESSION LOADER
 * Fetches all appointments for ALL patients matching a given Name + Phone.
 * Used to unify history across duplicate registration records.
 */
async function loadAggregatedSessions(identityInfo, listId, inputId, mode = 'dropdown') {
    const { name, phone } = identityInfo;
    const datalist = document.getElementById(listId);
    if (!datalist && mode !== 'viewer') return;

    try {
        // 1. Find all matching Patient IDs
        const matchingIds = allPatientsRaw
            .filter(p => {
                const pName = (p.full_name || "").toLowerCase();
                const pPhone = (p.phone || p.contact_number || "").toLowerCase();
                return pName === name.toLowerCase() && pPhone === (phone || "").toLowerCase();
            })
            .map(p => p.id);

        if (matchingIds.length === 0) return;

        // 2. Fetch all appointments in parallel
        const allApptPromises = matchingIds.map(id => API.getPatientProfile(id));
        const profiles = await Promise.all(allApptPromises);
        
        // 3. Flatten and sort all appointments by date (descending)
        const allAppts = profiles.flatMap(prof => prof.appointments || []);
        allAppts.sort((a,b) => new Date(b.date) - new Date(a.date));

        if (mode === 'viewer') {
            const list = document.getElementById('tpv-session-list');
            if (!list) return;
            
            if (allAppts.length === 0) {
                list.innerHTML = '<div style="font-size:12px; color:#94a3b8; padding:10px;">No recorded sessions found.</div>';
                return;
            }

            list.innerHTML = allAppts.map(a => {
                const date = new Date(a.date).toLocaleDateString();
                const time = a.time ? a.time.substring(0,5) : '--:--';
                return `
                    <div class="session-select-card" id="session-card-${a.id}" onclick="selectSessionForTreatment('${a.id}', '${date}', '${a.patient_id}')">
                        <div class="tpv-sc-badge">S${a.session_number}</div>
                        <div class="tpv-sc-info">
                            <div class="tpv-sc-title">Session ${a.session_number}</div>
                            <div class="tpv-sc-meta">${date} • ${time}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Auto-select latest session
            const latest = allAppts[0];
            const latestDate = new Date(latest.date).toLocaleDateString();
            selectSessionForTreatment(latest.id, latestDate, latest.patient_id);
            
        } else {
            // DROPDOWN / DATALIST MODE (Assessment & Session Design)
            if (datalist) datalist.innerHTML = '';
            
            let maxSession = 0;
            allAppts.forEach(a => {
                const sNum = parseInt(a.session_number || 1);
                if (sNum > maxSession) maxSession = sNum;
                
                if (datalist) {
                    const opt = document.createElement('option');
                    opt.value = sNum;
                    opt.textContent = `Session ${sNum} (${new Date(a.date).toLocaleDateString()})`;
                    datalist.appendChild(opt);
                }
            });

            // Suggest next session
            if (datalist) {
                const nextOpt = document.createElement('option');
                nextOpt.value = maxSession + 1;
                nextOpt.textContent = `Session ${maxSession + 1} (New)`;
                datalist.appendChild(nextOpt);
            }

            // Default input to latest
            const input = document.getElementById(inputId);
            if (input) {
                input.value = maxSession || 1;
                input.setAttribute('data-max-existing', maxSession);
            }
        }

    } catch (err) {
        console.error("Aggregation failed:", err);
        showToast("Failed to load historical sessions.", "warning");
    }
}
