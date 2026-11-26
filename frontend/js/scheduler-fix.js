/* Scheduler overrides. Aa file app.js PACHHI load thay chhe. */

// Mobile par console nathi, etle JS error screen par toast ma dekhase
window.addEventListener('error', function (e) {
    try { showToast('JS error: ' + e.message + ' (line ' + e.lineno + ')', 'warning'); } catch (x) {}
});
window.addEventListener('unhandledrejection', function (e) {
    try { showToast('Promise error: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), 'warning'); } catch (x) {}
});

window.openSchedulerModal = async function () {
    const overlay = document.getElementById('sched-overlay');
    if (!overlay) {
        showToast('sched-overlay HTML ma nathi', 'warning');
        return;
    }
    if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
    }

    // juna inline styles saaf
    overlay.removeAttribute('style');
    const modal = overlay.querySelector('.sched-modal');
    if (modal) modal.removeAttribute('style');

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

    const summaryEl = document.getElementById('sched-summary');
    if (summaryEl) summaryEl.style.display = 'block';

    if (!schedSelectedDate) {
        schedSelectedTime = null;
        schedCurrentDate = new Date();
    } else {
        schedCurrentDate = new Date(schedSelectedDate);
    }

    // Modal TARAT dekhaado
    overlay.classList.add('open');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    try { renderStatusPills(); } catch (e) { console.error(e); }
    try { renderCalendar(); } catch (e) { console.error(e); }
    try { renderTimeSlots(); } catch (e) { console.error(e); }
    try { updateSummary(); } catch (e) { console.error(e); }
    try { checkDoneBtn(); } catch (e) { console.error(e); }

    // Jo modal haju pan dekhato na hoy to numbers toast ma batavse
    setTimeout(function () {
        const m = document.querySelector('#sched-overlay .sched-modal');
        if (m) {
            const r = m.getBoundingClientRect();
            if (r.height < 50 || r.width < 50) {
                showToast('Modal size problem: w=' + Math.round(r.width) + ' h=' + Math.round(r.height), 'warning');
            }
        }
    }, 300);

    // Pachhi live appointments load karo
    try {
        schedAllAppointments = await API.getAppointments();
    } catch (err) {
        console.error('Failed to fetch live schedule', err);
        schedAllAppointments = [];
    }
    try { renderCalendar(); } catch (e) { console.error(e); }
    try { renderTimeSlots(); } catch (e) { console.error(e); }
};

window.closeSchedulerModal = function () {
    const overlay = document.getElementById('sched-overlay');
    if (overlay) {
        overlay.classList.remove('open');
        overlay.removeAttribute('style');
    }
    document.body.style.overflow = '';

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
        btn.innerText = 'Done';
    }
    const sessEl = document.getElementById('sched-session-number');
    if (sessEl) sessEl.value = '1';
};

// Bug fix: 'conditions' variable define nahoto (Session Design ma patient select par error)
window.setupSessionDesignSearch = function () {
    const searchInput = document.getElementById('tp-patient-search');
    const resultsList = document.getElementById('tp-search-results');
    const hiddenId = document.getElementById('tp-patient-id');
    const hiddenCond = document.getElementById('tp-patient-condition');

    if (!searchInput || !resultsList) return;
    if (searchInput.hasAttribute('data-has-listener')) return;
    searchInput.setAttribute('data-has-listener', 'true');

    searchInput.addEventListener('input', function (e) {
        const query = e.target.value.toLowerCase().trim();
        resultsList.innerHTML = '';
        if (!query) { resultsList.classList.remove('active'); return; }
        if (!allPatients) return;

        const filtered = allPatients.filter(function (p) {
            const name = (p.full_name || '').toLowerCase();
            const phone = (p.phone || p.contact_number || '').toLowerCase();
            return name.includes(query) || phone.includes(query);
        });

        if (filtered.length > 0) {
            resultsList.classList.add('active');
            filtered.forEach(function (p) {
                const phone = p.phone || p.contact_number || '--';
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.style.padding = '12px 16px';
                li.innerHTML =
                    '<div style="font-weight:600; color:#2d3748;">' + p.full_name +
                    ' <span style="font-weight:400; color:#718096; font-size:12px; margin-left:8px;">(' + phone + ')</span></div>' +
                    '<div style="color:#a0aec0; font-size:11px; margin-top:2px;">Patient Clinical Profile</div>';

                li.onclick = function () {
                    const conditions = extractPatientConditions(p);
                    searchInput.value = p.full_name;
                    hiddenId.value = p.id;
                    hiddenCond.value = conditions.join(', ');
                    resultsList.classList.remove('active');
                    showToast('Designing session for: ' + p.full_name);
                    loadAggregatedSessions(
                        { name: p.full_name, phone: p.phone || p.contact_number },
                        'tp-sessions-list',
                        'tp-session-select'
                    );
                };
                resultsList.appendChild(li);
            });
        }
    });

    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !resultsList.contains(e.target)) {
            resultsList.classList.remove('active');
        }
    });
};

window.show = function (id, btn) {
    const target = document.getElementById(id);
    if (!target) {
        showToast('"' + id + '" section haju banyu nathi', 'warning');
        return;
    }
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
    target.classList.add('active');
    if (btn) btn.classList.add('active');

    const trashFab = document.getElementById('trash-fab');
    if (trashFab) {
        trashFab.style.display = (id === 'dashboard' || id === 'register') ? 'flex' : 'none';
    }

    if (id === 'appointments' || id === 'assessment' || id === 'session-design' || id === 'treatment-plan') {
        loadPatientSelects();
    }
    if (id === 'assessment') {
        initAssessmentUI();
    }
};