const { Plugin, MarkdownRenderer, moment, PluginSettingTab, Setting, TFile, Notice, MarkdownRenderChild, Modal } = require('obsidian');

/* =========================================================================
   HELPER: TIME PARSING
   ========================================================================= */
function parseTimeObj(tStr) {
    if (!tStr) return null;
    const match = tStr.match(/\b((1[0-2]|0?[1-9])(:[0-5][0-9])?\s*[ap]m|([01]?[0-9]|2[0-3]):[0-5][0-9])\b/i);
    if (match) {
        const parsed = moment(match[0], ['hh:mm A', 'h:mm A', 'h A', 'ha', 'HH:mm', 'h a', 'H:mm']);
        if (parsed.isValid()) return { hour: parsed.hour(), minute: parsed.minute() };
    }
    return null;
}

/* =========================================================================
   SVG ICON LIBRARY (no emoji - pure SVG)
   ========================================================================= */
const SVG = {
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    list: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    tasks: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    alarm: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M5 3L2 6"/><path d="M22 6l-3-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="15" y1="13" x2="12" y2="13"/></svg>`,
    repeat: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    back: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    file: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    timeview: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    listview: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
};

/* =========================================================================
   1. SETTINGS & DEFAULTS
   ========================================================================= */
const DEFAULT_SETTINGS = {
    defaultView: 'calendar',
    defaultSort: 'Time: Oldest First',
    codeBlockHeight: '800px',
    maxDots: 4,
    enableReminders: true,
    enableAlarmTone: true,
    enableAlarmVibration: true,
    recurringLimitMonths: 12,
    timeViewMaxPerSlot: 3,
    timeViewHalfHour: false,
    timeViewGridMode: 'event hour',
    statusColors: {
        pending: '#006D77',
        completed: '#588157',
        closed: '#AD2831',
        important: '#003566'
    }
};

/* =========================================================================
   2. CUSTOM MODAL FOR REMINDERS
   ========================================================================= */
class ReminderModal extends Modal {
    constructor(app, event, plugin) {
        super(app);
        this.event = event;
        this.plugin = plugin;
    }

    /* ---- Alarm audio engine (Web Audio API) ---- */
    _startAlarm() {
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this._alarmActive = true;
            const playBeep = () => {
                if (!this._alarmActive || !this._audioCtx) return;
                const ctx = this._audioCtx;
                // Two-tone alarm: high then low
                const tones = [880, 660];
                tones.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
                    gain.gain.setValueAtTime(0.35, ctx.currentTime + i * 0.18);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.16);
                    osc.start(ctx.currentTime + i * 0.18);
                    osc.stop(ctx.currentTime + i * 0.18 + 0.16);
                });
                this._alarmTimeout = setTimeout(playBeep, 1200);
            };
            playBeep();
        } catch(e) { /* AudioContext not available */ }
    }

    _startVibration() {
        if (!navigator.vibrate) return;
        this._vibActive = true;
        const pulse = () => {
            if (!this._vibActive) return;
            // Strong pattern: long-short-long
            navigator.vibrate([400, 150, 400, 150, 400]);
            this._vibInterval = setTimeout(pulse, 1300);
        };
        pulse();
    }

    _stopAlarm() {
        this._alarmActive = false;
        this._vibActive = false;
        if (this._alarmTimeout) { clearTimeout(this._alarmTimeout); this._alarmTimeout = null; }
        if (this._vibInterval) { clearTimeout(this._vibInterval); this._vibInterval = null; }
        if (this._audioCtx) { try { this._audioCtx.close(); } catch(e){} this._audioCtx = null; }
        if (navigator.vibrate) navigator.vibrate(0);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('cevent-reminder-modal');

        // Start alarm + vibration based on settings
        if (this.plugin.settings.enableAlarmTone !== false) this._startAlarm();
        if (this.plugin.settings.enableAlarmVibration !== false) this._startVibration();

        const header = contentEl.createEl('h2', { text: '⏰ Event Alarm' });
        header.style.color = 'var(--interactive-accent)';
        header.style.textAlign = 'center';
        header.style.marginTop = '0';

        const title = contentEl.createEl('h3', { text: this.event.name });
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';

        const details = contentEl.createDiv();
        details.style.background = 'var(--background-secondary)';
        details.style.padding = '20px';
        details.style.borderRadius = '16px';
        details.style.marginBottom = '24px';
        details.style.border = '1px solid var(--background-modifier-border)';

        details.createEl('p', { text: `📅 Date: ${this.event.date}` }).style.margin = '0 0 8px 0';
        details.createEl('p', { text: `⏰ Alarm Time: ${this.event.alarm}` }).style.margin = '0 0 8px 0';
        if(this.event.time) {
             details.createEl('p', { text: `🕒 Schedule: ${this.event.time}` }).style.margin = '0';
        }

        if (this.event.note) {
            details.createEl('hr').style.margin = '15px 0';
            const noteDiv = details.createDiv();
            noteDiv.createEl('strong', { text: 'Description:' });
            const noteBody = noteDiv.createDiv();
            noteBody.style.marginTop = '8px';
            noteBody.style.padding = '12px';
            noteBody.style.background = 'var(--background-primary)';
            noteBody.style.borderRadius = '8px';
            noteBody.style.whiteSpace = 'pre-wrap';
            noteBody.style.fontSize = '0.9em';
            noteBody.setText(this.event.note);
        }

        const btnContainer = contentEl.createDiv();
        btnContainer.style.display = 'flex';
        btnContainer.style.flexWrap = 'wrap';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '10px';

        const completeBtn = btnContainer.createEl('button', { text: '✅ Complete' });
        completeBtn.style.backgroundColor = 'var(--text-success)';
        completeBtn.style.color = 'white';
        completeBtn.style.borderRadius = '28px';
        completeBtn.onclick = async () => {
            await this.plugin.updateEventStatus(this.event, 'x');
            new Notice(`Marked "${this.event.name}" as complete!`);
            this.close();
        };

        const viewAppBtn = btnContainer.createEl('button', { text: '🔍 View Details', cls: 'mod-cta' });
        viewAppBtn.style.borderRadius = '28px';
        viewAppBtn.onclick = () => {
            if (this.plugin.activeAppInstances.length > 0) {
                const app = this.plugin.activeAppInstances[0];
                app.selectedEvent = this.event;
                app.previousView = app.currentView;
                app.currentView = 'event';
                app.render();
                new Notice("Opened event details in your dashboard container.");
            } else {
                const standaloneModal = new Modal(this.app);
                standaloneModal.onOpen = () => {
                    standaloneModal.contentEl.empty();
                    standaloneModal.contentEl.style.height = '80vh';
                    standaloneModal.contentEl.style.width = '90vw';
                    standaloneModal.contentEl.style.maxWidth = '900px';
                    
                    const standaloneApp = new CEventApp(standaloneModal.contentEl, this.plugin, 'modal', '100%');
                    standaloneApp.selectedEvent = this.event;
                    standaloneApp.currentView = 'event';
                    standaloneApp.previousView = 'calendar';
                    standaloneApp.mount();
                };
                standaloneModal.open();
            }
            this.close();
        };

        const openNoteBtn = btnContainer.createEl('button', { text: '📄 Open Note' });
        openNoteBtn.style.borderRadius = '28px';
        openNoteBtn.onclick = async () => {
            this.close();
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(this.event.file);
        };

        const dismissBtn = btnContainer.createEl('button', { text: '✕ Dismiss' });
        dismissBtn.style.borderRadius = '28px';
        dismissBtn.onclick = () => this.close();
    }

    onClose() {
        this._stopAlarm();
        const { contentEl } = this;
        contentEl.empty();
    }
}

/* =========================================================================
   3. CORE APPLICATION UI LOGIC
   ========================================================================= */
class CEventApp {
    constructor(containerEl, plugin, context = 'codeblock', customHeight = null) {
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.context = context;
        this.customHeight = customHeight;

        this.currentView = this.plugin.settings.defaultView;
        this.previousView = 'list';
        this.listSubView = 'list';
        this.selectedDateObj = moment();
        this.currentMonthObj = moment();
        this.selectedEvent = null;

        this.listFilter = 'all';
        this.searchQuery = '';
        this.timeScope = 'Selected Date';
        this.sortMode = this.plugin.settings.defaultSort;

        this.currentBaseEvents = [];
    }

    mount() {
        this.containerEl.empty();
        this.rootEl = this.containerEl.createDiv(`cevent-app-root context-${this.context}`);
        if (this.customHeight) this.rootEl.style.height = this.customHeight;
        this.render();
    }

    render() {
        this.rootEl.empty();

        if (this.currentView === 'event') {
            const wrapper = this.rootEl.createDiv('cevent-dashboard-wrapper');
            this.renderEventInfo(wrapper);
            return;
        }

        // Render 3-tab chrome
        this.renderTabChrome(this.rootEl);
    }

    renderTabChrome(root) {
        const chrome = root.createDiv('cevent-tab-chrome');
        const tabBar = chrome.createDiv('cevent-tab-bar');

        const tabs = [
            { id: 'calendar', svgKey: 'calendar', label: 'Calendar' },
            { id: 'list',     svgKey: 'list',     label: 'Schedule' },
            { id: 'allTasks', svgKey: 'tasks',    label: 'All Tasks' },
        ];

        const contentArea = chrome.createDiv('cevent-tab-content');

        tabs.forEach(tab => {
            const btn = tabBar.createDiv(`cevent-tab-btn ${this.currentView === tab.id ? 'active' : ''}`);
            btn.innerHTML = SVG[tab.svgKey];
            btn.setAttribute('aria-label', tab.label);
            btn.title = tab.label;
            btn.onclick = () => {
                this.currentView = tab.id;
                this.render();
            };
        });

        const wrapper = contentArea.createDiv('cevent-dashboard-wrapper');
        switch (this.currentView) {
            case 'calendar': this.renderCalendar(wrapper); break;
            case 'list':     this.renderListViewWrapper(wrapper); break;
            case 'allTasks': this.renderAllTasksView(wrapper); break;
            default: this.renderListViewWrapper(wrapper);
        }
    }

    /* =========================================================================
       VIEW 1: CALENDAR
       ========================================================================= */
    renderCalendar(container) {
        const topSection = container.createDiv('cevent-fixed-header');
        const header = topSection.createDiv('cevent-calendar-header cevent-flex-between');

        const dateContainer = header.createDiv('cevent-month-year-container');
        const dayMonthLabel = dateContainer.createDiv({ cls: 'cevent-header-day-month' });
        dayMonthLabel.setText(this.currentMonthObj.format('D MMMM'));
        dayMonthLabel.title = 'Click to jump to month';
        dayMonthLabel.style.cursor = 'pointer';

        const yearLabel = dateContainer.createDiv({ cls: 'cevent-header-year' });
        yearLabel.setText(this.currentMonthObj.format('YYYY'));
        yearLabel.title = 'Click to change year';
        yearLabel.style.cursor = 'pointer';

        const yearPicker = dateContainer.createEl('input', { type: 'number', cls: 'cevent-year-picker' });
        yearPicker.value = this.currentMonthObj.format('YYYY');
        yearPicker.min = '1900';
        yearPicker.max = '2100';
        yearPicker.onchange = (e) => {
            const yr = parseInt(e.target.value);
            if (yr >= 1900 && yr <= 2100) {
                this.currentMonthObj.year(yr);
                this.render();
            }
        };
        yearLabel.onclick = () => yearPicker.focus();

        const controls = header.createDiv('cevent-flex-row cevent-calendar-controls');
        const datePicker = controls.createEl('input', { type: 'month', cls: 'cevent-month-picker' });
        datePicker.value = this.currentMonthObj.format('YYYY-MM');
        datePicker.onchange = (e) => {
            if (e.target.value) {
                this.currentMonthObj = moment(e.target.value, 'YYYY-MM');
                this.render();
            }
        };

        const todayBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Go to today' });
        todayBtn.innerHTML = SVG.calendar;
        todayBtn.onclick = () => {
            this.currentMonthObj = moment();
            this.selectedDateObj = moment();
            this.render();
        };

        const prevBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Previous month' });
        prevBtn.innerHTML = SVG.chevronLeft;
        prevBtn.onclick = () => { this.currentMonthObj.subtract(1, 'month'); this.render(); };

        const nextBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Next month' });
        nextBtn.innerHTML = SVG.chevronRight;
        nextBtn.onclick = () => { this.currentMonthObj.add(1, 'month'); this.render(); };

        dayMonthLabel.onclick = () => datePicker.showPicker ? datePicker.showPicker() : datePicker.click();

        const scrollArea = container.createDiv('cevent-scrollable-body');
        const grid = scrollArea.createDiv('cevent-grid');

        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        days.forEach(d => grid.createDiv({ cls: 'cevent-day-header', text: d }));

        const startOfMonth = this.currentMonthObj.clone().startOf('month');
        const startDate = startOfMonth.clone().startOf('week');
        const endDate = startDate.clone().add(41, 'days');

        const todayStr = moment().format('DD-MM-YYYY');
        let currentDay = startDate.clone();
        const maxDots = parseInt(this.plugin.settings.maxDots) || 4;

        while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
            const isCurrentMonth = currentDay.month() === this.currentMonthObj.month();
            const dateStr = currentDay.format('DD-MM-YYYY');
            const eventsForDay = this.plugin.eventsByDate[dateStr] || [];

            const dayWrapper = grid.createDiv('cevent-day-wrapper');
            dayWrapper.dataset.date = dateStr;

            dayWrapper.addEventListener('dragover', (e) => { e.preventDefault(); dayWrapper.addClass('drag-over'); });
            dayWrapper.addEventListener('dragleave', () => dayWrapper.removeClass('drag-over'));
            dayWrapper.addEventListener('drop', (e) => this.handleEventDrop(e, dateStr, dayWrapper));

            if (currentDay.day() === 0) dayWrapper.createDiv({ cls: 'cevent-week-number', text: currentDay.week() });
            else dayWrapper.createDiv({ cls: 'cevent-week-number', text: ' ' });

            const dayEl = dayWrapper.createDiv('cevent-day');
            dayEl.setText(currentDay.format('D'));

            if (!isCurrentMonth) dayEl.addClass('faint');
            if (dateStr === todayStr) dayEl.addClass('is-today');
            if (dateStr === this.selectedDateObj.format('DD-MM-YYYY')) dayEl.addClass('selected');

            const dotContainer = dayWrapper.createDiv('cevent-dot-container');

            if (eventsForDay.length > 0) {
                eventsForDay.slice(0, maxDots).forEach(ev => {
                    let dotColor = this.plugin.settings.statusColors.pending;
                    if (ev.status === 'completed') dotColor = this.plugin.settings.statusColors.completed;
                    else if (ev.status === 'closed') dotColor = this.plugin.settings.statusColors.closed;
                    else if (ev.tags && ev.tags.includes('#important')) dotColor = this.plugin.settings.statusColors.important;
                    if (ev.color) dotColor = ev.color;
                    
                    let indicator;
                    if (ev.icon) {
                        indicator = dotContainer.createDiv('cevent-event-icon-custom');
                        indicator.innerHTML = ev.icon.startsWith('<svg') ? ev.icon : `<span>${ev.icon}</span>`;
                        indicator.style.color = dotColor;
                        if(ev.icon.startsWith('<svg')) indicator.style.fill = dotColor;
                    } else {
                        indicator = dotContainer.createDiv('cevent-event-dot active');
                        indicator.style.background = dotColor;
                        if (ev.isMultiDay) indicator.addClass('is-multi-day');
                    }

                    if (!ev.isProjectedRecurring) {
                        indicator.draggable = true;
                        indicator.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', ev.id); indicator.style.opacity = '0.5'; });
                        indicator.addEventListener('dragend', () => { indicator.style.opacity = '1'; });
                    } else {
                        indicator.title = 'Recurring (cannot drag)';
                    }
                });

                if (eventsForDay.length > maxDots) {
                    dotContainer.createDiv('cevent-event-dot-more').setText(`+${eventsForDay.length - maxDots}`);
                }
            }

            const clickedDay = currentDay.clone();
            dayEl.onclick = () => {
                this.selectedDateObj = clickedDay;
                this.timeScope = 'Selected Date';
                this.currentView = 'list';
                this.render();
            };
            currentDay.add(1, 'days');
        }
    }

    async handleEventDrop(e, targetDateStr, dayWrapper) {
        e.preventDefault();
        dayWrapper.removeClass('drag-over');
        const eventId = e.dataTransfer.getData('text/plain');
        if (!eventId) return;
        const ev = this.plugin.eventsArray.find(event => event.id === eventId);
        if (!ev) return;
        if (ev.originalStartDate === targetDateStr) return;
        await this.plugin.updateEventDate(ev, targetDateStr);
        new Notice(`Moved "${ev.name}" to ${targetDateStr}`);
    }

    /* =========================================================================
       VIEW 2: LIST VIEW & TIME VIEW
       ========================================================================= */
    getBaseEvents() {
        if (this.timeScope === 'Upcoming') {
            return this.plugin.eventsArray.filter(e => {
                const eventDate = moment(e.originalStartDate, 'DD-MM-YYYY');
                return eventDate.isValid() && eventDate.isAfter(moment(), 'day');
            });
        } 
        
        let targetDate = this.selectedDateObj;
        if (this.timeScope === 'Next Day') targetDate = moment().add(1, 'days');
        else if (this.timeScope === 'Previous Day') targetDate = moment().subtract(1, 'days');

        const dateStr = targetDate.format('DD-MM-YYYY');
        const prevDateStr = targetDate.clone().subtract(1, 'days').format('DD-MM-YYYY');
        
        let events = this.plugin.eventsByDate[dateStr] || [];
        let prevEvents = this.plugin.eventsByDate[prevDateStr] || [];
        
        // Bring in events from the previous day that wrap past midnight into our current selected day
        let crossoverEvents = prevEvents.filter(ev => {
            const t = ev.time ? ev.time.toLowerCase() : '';
            if (t.includes(' to ') || t.includes('-')) {
                const parts = t.includes(' to ') ? t.split(' to ') : t.split('-');
                const sObj = parseTimeObj(parts[0]);
                const eObj = parseTimeObj(parts[1]);
                if(sObj && eObj && (eObj.hour * 60 + eObj.minute) < (sObj.hour * 60 + sObj.minute)) return true;
            }
            return false;
        });

        // Ensure we copy events array so we don't accidentally mutate the master index
        return [...events, ...crossoverEvents];
    }

    renderListViewWrapper(container) {
        const topSection = container.createDiv('cevent-fixed-header');

        const topbar = topSection.createDiv('cevent-list-topbar');
        const now = moment();
        const timeDisplay = topbar.createDiv('cevent-list-time-display');
        const timeText = timeDisplay.createDiv('cevent-list-clock');
        const hourStr = now.format('hh');
        const minStr = now.format('mm');
        const ampm = now.format('A');
        timeText.innerHTML = `<span class="cevent-clock-h">${hourStr}</span><span class="cevent-clock-sep">:</span><span class="cevent-clock-m">${minStr}</span><span class="cevent-clock-ampm">${ampm}</span>`;
        
        const dateText = topbar.createDiv('cevent-list-date-label');
        const displayDate = this.selectedDateObj.isValid() ? this.selectedDateObj.format('ddd, D MMM, YYYY') : moment().format('ddd, D MMM, YYYY');
        dateText.setText(displayDate);

        const headerRight = topbar.createDiv('cevent-list-header-right');
        const calBtn = headerRight.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Go to today' });
        calBtn.innerHTML = SVG.calendar;
        calBtn.onclick = () => { this.selectedDateObj = moment(); this.render(); };

        const maxDots = parseInt(this.plugin.settings.maxDots) || 4;
        const scroller = topSection.createDiv('cevent-horizontal-scroller');
        for (let i = -3; i <= 3; i++) {
            const scrollDayObj = this.selectedDateObj.clone().add(i, 'days');
            const dayCol = scroller.createDiv('cevent-scroll-day');
            if (i === 0) dayCol.addClass('active');

            dayCol.createDiv({ text: scrollDayObj.format('ddd').toUpperCase(), cls: 'day-name' });
            dayCol.createDiv({ text: scrollDayObj.format('D'), cls: 'day-num' });

            const dateStr = scrollDayObj.format('DD-MM-YYYY');
            const eventsForDay = this.plugin.eventsByDate[dateStr] || [];
            if (eventsForDay.length > 0) {
                const dotContainer = dayCol.createDiv('cevent-dot-container');
                dotContainer.style.marginTop = '4px';
                eventsForDay.slice(0, maxDots).forEach(ev => {
                    let dotColor = this.plugin.settings.statusColors.pending;
                    if (ev.status === 'completed') dotColor = this.plugin.settings.statusColors.completed;
                    else if (ev.status === 'closed') dotColor = this.plugin.settings.statusColors.closed;
                    if (ev.color) dotColor = ev.color;

                    if (ev.icon) {
                        const iconDot = dotContainer.createDiv('cevent-event-icon-custom');
                        iconDot.innerHTML = ev.icon.startsWith('<svg') ? ev.icon : `<span>${ev.icon}</span>`;
                        iconDot.style.color = dotColor;
                        if(ev.icon.startsWith('<svg')) iconDot.style.fill = dotColor;
                    } else {
                        const dot = dotContainer.createDiv('cevent-event-dot active');
                        dot.style.background = dotColor;
                    }
                });
                if (eventsForDay.length > maxDots) {
                    dotContainer.createDiv('cevent-event-dot-more').setText(`+${eventsForDay.length - maxDots}`);
                }
            }
            dayCol.onclick = () => { this.selectedDateObj = scrollDayObj; this.render(); };
        }

        const tools = topSection.createDiv('cevent-tools-area');
        const searchWrapper = tools.createDiv('cevent-search-wrapper');
        const searchIconSpan = searchWrapper.createSpan('cevent-search-icon-span');
        searchIconSpan.innerHTML = SVG.search;
        const searchInput = searchWrapper.createEl('input', {
            type: 'text', placeholder: 'Search tasks or notes...', cls: 'cevent-search-input cevent-input-w100'
        });
        searchInput.value = this.searchQuery;

        const controlsRow = tools.createDiv('cevent-controls-row');
        const scopeSelect = controlsRow.createEl('select', { cls: 'cevent-filter-select' });
        ['Selected Date', 'Previous Day', 'Next Day', 'Upcoming'].forEach(opt => {
            const o = scopeSelect.createEl('option', { value: opt, text: opt });
            if (this.timeScope === opt) o.selected = true;
        });
        scopeSelect.onchange = (e) => { this.timeScope = e.target.value; this.render(); };

        const sortSelect = controlsRow.createEl('select', { cls: 'cevent-filter-select' });
        ['Time: Oldest First', 'Time: Newest First', 'Name: A-Z', 'Name: Z-A'].forEach(opt => {
            const o = sortSelect.createEl('option', { value: opt, text: opt });
            if (this.sortMode === opt) o.selected = true;
        });
        sortSelect.onchange = (e) => { this.sortMode = e.target.value; this.routeListRendering(listContainer); };

        const tagSelect = controlsRow.createEl('select', { cls: 'cevent-filter-select' });
        ['All', 'Pending', 'Completed', 'Closed'].forEach(opt => tagSelect.createEl('option', { value: opt.toLowerCase(), text: opt }));

        const availableTags = new Set();
        let baseEvents = this.getBaseEvents();
        baseEvents.forEach(ev => {
            if (ev.tags) ev.tags.split(/\s+/).forEach(t => { if (t.startsWith('#')) availableTags.add(t); });
        });

        if (availableTags.size > 0) {
            const group = tagSelect.createEl('optgroup', { label: 'Tags' });
            Array.from(availableTags).sort().forEach(tag => {
                const o = group.createEl('option', { value: tag, text: tag });
                if (this.listFilter === tag) o.selected = true;
            });
        }
        tagSelect.value = this.listFilter;
        tagSelect.onchange = (e) => { this.listFilter = e.target.value; this.routeListRendering(listContainer); };

        const toggleRow = tools.createDiv('cevent-toggle-row');
        const viewToggle = toggleRow.createDiv('cevent-view-toggle');
        const btnTimeView = viewToggle.createEl('button', { cls: `cevent-toggle-btn ${this.listSubView === 'time' ? 'active' : ''}` });
        btnTimeView.innerHTML = `${SVG.timeview} TimeView`;
        const btnListView = viewToggle.createEl('button', { cls: `cevent-toggle-btn ${this.listSubView === 'list' ? 'active' : ''}` });
        btnListView.innerHTML = `${SVG.listview} ListView`;

        btnTimeView.onclick = () => { this.listSubView = 'time'; this.render(); };
        btnListView.onclick = () => { this.listSubView = 'list'; this.render(); };

        const listContainer = container.createDiv('cevent-dynamic-body');
        this.currentBaseEvents = baseEvents;

        searchInput.oninput = (e) => {
            this.searchQuery = e.target.value;
            this.routeListRendering(listContainer);
        };

        this.routeListRendering(listContainer);
    }

    routeListRendering(container) {
        if (this.listSubView === 'time') {
            this.renderTimeView(container);
        } else {
            this.renderEventList(container);
        }
    }

    /* =========================================================================
       VIEW 2a: TIME VIEW (with Dynamic Range Wrapping & Settings Support)
       ========================================================================= */
    async renderTimeView(container) {
        container.empty();
        const wrapper = container.createDiv('cevent-list-items');
        const events = this.filterAndSortEvents(this.currentBaseEvents);

        const isHalfHour = this.plugin.settings.timeViewHalfHour;
        const gridMode = this.plugin.settings.timeViewGridMode || 'event hour';
        const slotsCount = isHalfHour ? 48 : 24;
        const hourlyMap = {};
        for (let i = 0; i < slotsCount; i++) hourlyMap[i] = [];

        const allDayEvents = [];
        const selectedDateStr = this.selectedDateObj.format('DD-MM-YYYY');

        events.forEach(ev => {
            const t = ev.time ? ev.time.toLowerCase() : '';
            if (!t || t.includes('fullday') || t.includes('all day')) {
                allDayEvents.push(ev);
                return;
            }

            // Wrapping mapping logic for ranges like "XX:XX PM to YY:YY PM"
            if (t.includes(' to ') || t.includes('-')) {
                const parts = t.includes(' to ') ? t.split(' to ') : t.split('-');
                const startObj = parseTimeObj(parts[0]);
                const endObj = parseTimeObj(parts[1]);

                if (startObj && endObj) {
                    const startMins = startObj.hour * 60 + startObj.minute;
                    let endMins = endObj.hour * 60 + endObj.minute;
                    
                    let isCrossover = false;
                    if (endMins < startMins) {
                        endMins += 24 * 60; // Represents wrap to next day
                        isCrossover = true;
                    }

                    let renderStartMins = startMins;
                    let renderEndMins = endMins;

                    if (isCrossover) {
                        if (ev.originalStartDate === selectedDateStr) {
                            renderEndMins = 24 * 60 - 1; // End of current day
                        } else {
                            renderStartMins = 0; // Start of next day
                            renderEndMins = endMins - 24 * 60;
                        }
                    } else if (ev.originalStartDate !== selectedDateStr && !ev.isMultiDay) {
                        return; // Prevent rogue mapping
                    }

                    const step = isHalfHour ? 30 : 60;
                    const renderLimit = renderStartMins === renderEndMins ? renderEndMins : renderEndMins - 1;

                    for (let min = renderStartMins; min <= renderLimit; min += step) {
                        let slotHour = Math.floor(min / 60);
                        if (slotHour >= 24) continue;
                        let slotIdx = isHalfHour ? (slotHour * 2 + (min % 60 >= 30 ? 1 : 0)) : slotHour;
                        
                        if (!hourlyMap[slotIdx].includes(ev)) {
                            ev.isTimeSpan = true; // Flag for styling
                            hourlyMap[slotIdx].push(ev);
                        }
                    }
                    return;
                }
            }

            // Single discrete mapping
            const startObj = parseTimeObj(t);
            if (startObj) {
                if (ev.originalStartDate !== selectedDateStr && !ev.isMultiDay) return;
                ev.isTimeSpan = false;
                let slotIdx = isHalfHour ? (startObj.hour * 2 + (startObj.minute >= 30 ? 1 : 0)) : startObj.hour;
                hourlyMap[slotIdx].push(ev);
                return;
            }

            if (ev.originalStartDate === selectedDateStr || ev.isMultiDay) {
                allDayEvents.push(ev);
            }
        });

        const nowHour = moment().hour();
        const nowMinute = moment().minute();
        const nowAmpm = moment().format('A');

        const table = wrapper.createDiv('cevent-tv-scroll-wrapper');
        const innerTable = table.createDiv('cevent-tv-table');
        const tableAlias = innerTable;

        const headerRow = tableAlias.createDiv('cevent-tv-header-row');
        headerRow.createDiv({ text: 'Time', cls: 'cevent-tv-col-time cevent-tv-col-head' });
        const amHeadEl = headerRow.createDiv({ text: 'AM', cls: 'cevent-tv-col-am cevent-tv-col-head' });
        if (nowAmpm === 'AM') amHeadEl.addClass('highlight');
        const pmHeadEl = headerRow.createDiv({ text: 'PM', cls: 'cevent-tv-col-pm cevent-tv-col-head' });
        if (nowAmpm === 'PM') pmHeadEl.addClass('highlight');

        if (allDayEvents.length > 0) {
            const row = tableAlias.createDiv('cevent-tv-row');
            row.createDiv({ text: 'All Day', cls: 'cevent-tv-col-time cevent-tv-label highlight' });
            const amCol = row.createDiv('cevent-tv-col-am');
            const pmCol = row.createDiv('cevent-tv-col-pm');
            allDayEvents.forEach(ev => this.renderTvCell(amCol, ev));
        }

        const maxPerSlot = parseInt(this.plugin.settings.timeViewMaxPerSlot) || 3;

        for (let displayHr = 12; displayHr <= 23; displayHr++) {
            const amHour = displayHr === 12 ? 0 : displayHr - 12; // 12->0
            const pmHour = displayHr; // 12->12
            const label12 = displayHr === 12 ? 12 : displayHr - 12;

            const renderTableRow = (is30Min) => {
                const minuteStr = is30Min ? '30' : '00';
                const timeLabelText = isHalfHour ? `${label12}:${minuteStr}` : String(label12);
                
                const amSlot = isHalfHour ? (amHour * 2 + (is30Min ? 1 : 0)) : amHour;
                const pmSlot = isHalfHour ? (pmHour * 2 + (is30Min ? 1 : 0)) : pmHour;

                const amEvents = hourlyMap[amSlot] || [];
                const pmEvents = hourlyMap[pmSlot] || [];

                const isCurrentAmSlot = (nowAmpm === 'AM' && nowHour === amHour && (!isHalfHour || (is30Min ? nowMinute >= 30 : nowMinute < 30)));
                const isCurrentPmSlot = (nowAmpm === 'PM' && nowHour === pmHour && (!isHalfHour || (is30Min ? nowMinute >= 30 : nowMinute < 30)));
                const isCurrentRow = isCurrentAmSlot || isCurrentPmSlot;
                const hasEvents = amEvents.length > 0 || pmEvents.length > 0;

                // Feature Update: Hide rows with no events if grid mode is 'event hour'
                if (gridMode === 'event hour' && !isCurrentRow && !hasEvents) {
                    return; 
                }

                const row = tableAlias.createDiv(`cevent-tv-row${isCurrentRow ? ' current-hour' : ''}`);
                row.createDiv({ text: timeLabelText, cls: `cevent-tv-col-time cevent-tv-label${isCurrentRow ? ' highlight' : ''}` });

                // AM Col
                const amCol = row.createDiv(`cevent-tv-col-am${isCurrentAmSlot ? ' current-slot' : ''}`);
                amEvents.slice(0, maxPerSlot).forEach(ev => this.renderTvCell(amCol, ev, ev.isTimeSpan));
                if (amEvents.length > maxPerSlot) {
                    const more = amCol.createDiv('cevent-tv-more');
                    more.setText(`+${amEvents.length - maxPerSlot} more`);
                    more.onclick = () => { this.listSubView = 'list'; this.render(); };
                }

                // PM Col
                const pmCol = row.createDiv(`cevent-tv-col-pm${isCurrentPmSlot ? ' current-slot' : ''}`);
                pmEvents.slice(0, maxPerSlot).forEach(ev => this.renderTvCell(pmCol, ev, ev.isTimeSpan));
                if (pmEvents.length > maxPerSlot) {
                    const more = pmCol.createDiv('cevent-tv-more');
                    more.setText(`+${pmEvents.length - maxPerSlot} more`);
                    more.onclick = () => { this.listSubView = 'list'; this.render(); };
                }
            };

            renderTableRow(false);
            if (isHalfHour) renderTableRow(true);
        }

        if (events.length === 0 && allDayEvents.length === 0 && gridMode === 'event hour') {
            wrapper.createDiv({ text: 'No scheduled events today.', cls: 'cevent-empty-state' });
        }

        // Precision auto-scroll targeting the exact current time slot
        setTimeout(() => {
            const currentTarget = table.querySelector('.current-slot') || table.querySelector('.current-hour');
            if (currentTarget) currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    renderTvCell(container, ev, isSpan = false) {
        let targetColor = this.plugin.settings.statusColors.pending;
        if (ev.status === 'completed') targetColor = this.plugin.settings.statusColors.completed;
        else if (ev.status === 'closed') targetColor = this.plugin.settings.statusColors.closed;
        else if (ev.tags && ev.tags.includes('#important')) targetColor = this.plugin.settings.statusColors.important;
        if (ev.color) targetColor = ev.color;

        const cell = container.createDiv('cevent-tv-cell');
        if (isSpan) cell.addClass('cevent-tv-cell-span');
        
        cell.style.setProperty('--event-border-color', targetColor);
        cell.title = ev.name;
        cell.onclick = () => {
            this.previousView = this.currentView;
            this.selectedEvent = ev;
            this.currentView = 'event';
            this.render();
        };

        // 1. Icon (if has)
        if (ev.icon) {
            const iconSpan = cell.createSpan('cevent-prefix-icon');
            iconSpan.innerHTML = ev.icon.startsWith('<svg') ? ev.icon : `<span>${ev.icon}</span>`;
            iconSpan.style.color = targetColor;
            if (ev.icon.startsWith('<svg')) iconSpan.style.fill = targetColor;
        } else {
            // Default color dot if no custom icon
            const iconEl = cell.createDiv('cevent-tv-cell-icon');
            iconEl.style.background = targetColor;
        }

        // 2. Alarm Icon (if has)
        if (ev.alarm) {
            const alarmSpan = cell.createSpan('cevent-alarm-icon');
            alarmSpan.innerHTML = SVG.alarm;
            alarmSpan.style.color = 'var(--text-muted)';
        }

        // 3. Event Title (truncated)
        const labelEl = cell.createDiv('cevent-tv-cell-label');
        labelEl.setText(ev.name);
    }

    /* =========================================================================
       VIEW 2b: EVENT LIST
       ========================================================================= */
    async renderEventList(listContainer) {
        listContainer.empty();
        const wrapperList = listContainer.createDiv('cevent-list-items');
        const events = this.filterAndSortEvents(this.currentBaseEvents);

        if (events.length === 0) {
            wrapperList.createDiv({ text: 'No events found for this filter.', cls: 'cevent-empty-state' });
            return;
        }

        for (const ev of events) {
            await this.createEventCard(wrapperList, ev);
        }
    }

    /* =========================================================================
       VIEW 3: ALL TASKS - matches screenshot (date headers + colored cards)
       ========================================================================= */
    renderAllTasksView(container) {
        const topSection = container.createDiv('cevent-fixed-header');
        const header = topSection.createDiv('cevent-calendar-header cevent-flex-between');
        const dateContainer = header.createDiv('cevent-month-year-container');
        const dayMonthLabel = dateContainer.createDiv({ cls: 'cevent-header-day-month' });
        dayMonthLabel.setText(this.currentMonthObj.format('D MMMM'));

        const yearLabel = dateContainer.createDiv({ cls: 'cevent-header-year' });
        yearLabel.setText(this.currentMonthObj.format('YYYY'));

        const controls = header.createDiv('cevent-flex-row cevent-calendar-controls');
        const calBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Go to today' });
        calBtn.innerHTML = SVG.calendar;
        calBtn.onclick = () => {
            this.currentMonthObj = moment();
            this.selectedDateObj = moment();
            this.renderAllTasksList(listContainer);
            setTimeout(() => {
                const todayTarget = listContainer.querySelector('.cevent-today-target');
                if (todayTarget) todayTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        };

        const prevBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Previous day' });
        prevBtn.innerHTML = SVG.chevronLeft;
        prevBtn.onclick = () => {
            this.selectedDateObj = (this.selectedDateObj || moment()).clone().subtract(1, 'day');
            this.currentMonthObj = this.selectedDateObj.clone();
            dayMonthLabel.setText(this.currentMonthObj.format('D MMMM'));
            yearLabel.setText(this.currentMonthObj.format('YYYY'));
            this.renderAllTasksList(listContainer);
            setTimeout(() => {
                const targetDateStr = this.selectedDateObj.format('DD-MM-YYYY');
                let found = listContainer.querySelector(`[data-date="${targetDateStr}"]`);
                if (found) found.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else listContainer.scrollTop = 0;
            }, 80);
        };

        const nextBtn = controls.createEl('button', { cls: 'cevent-nav-icon-btn', title: 'Next day' });
        nextBtn.innerHTML = SVG.chevronRight;
        nextBtn.onclick = () => {
            this.selectedDateObj = (this.selectedDateObj || moment()).clone().add(1, 'day');
            this.currentMonthObj = this.selectedDateObj.clone();
            dayMonthLabel.setText(this.currentMonthObj.format('D MMMM'));
            yearLabel.setText(this.currentMonthObj.format('YYYY'));
            this.renderAllTasksList(listContainer);
            setTimeout(() => {
                const targetDateStr = this.selectedDateObj.format('DD-MM-YYYY');
                let found = listContainer.querySelector(`[data-date="${targetDateStr}"]`);
                if (found) found.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else listContainer.scrollTop = listContainer.scrollHeight;
            }, 80);
        };

        const tools = topSection.createDiv('cevent-tools-area');
        const searchWrapper = tools.createDiv('cevent-search-wrapper');
        const searchIconSpan = searchWrapper.createSpan('cevent-search-icon-span');
        searchIconSpan.innerHTML = SVG.search;
        const searchInput = searchWrapper.createEl('input', {
            type: 'text', placeholder: 'Search across all tasks...', cls: 'cevent-search-input cevent-input-w100'
        });
        searchInput.value = this.searchQuery;

        const controlsRow = tools.createDiv('cevent-controls-row');
        const tagSelect = controlsRow.createEl('select', { cls: 'cevent-filter-select' });
        ['All', 'Pending', 'Completed', 'Closed'].forEach(opt => tagSelect.createEl('option', { value: opt.toLowerCase(), text: opt }));

        const availableTags = new Set();
        this.plugin.eventsArray.forEach(ev => {
            if (ev.tags) ev.tags.split(/\s+/).forEach(t => { if (t.startsWith('#')) availableTags.add(t); });
        });

        if (this.listFilter !== 'all' && this.listFilter !== 'pending' && this.listFilter !== 'completed' && this.listFilter !== 'closed' && !availableTags.has(this.listFilter)) {
            this.listFilter = 'all';
        }

        if (availableTags.size > 0) {
            const group = tagSelect.createEl('optgroup', { label: 'Tags' });
            Array.from(availableTags).sort().forEach(tag => {
                const o = group.createEl('option', { value: tag, text: tag });
                if (this.listFilter === tag) o.selected = true;
            });
        }
        tagSelect.value = this.listFilter;

        const listContainer = container.createDiv('cevent-dynamic-body');
        this.renderAllTasksList(listContainer);

        searchInput.oninput = (e) => { this.searchQuery = e.target.value; this.renderAllTasksList(listContainer); };
        tagSelect.onchange = (e) => { this.listFilter = e.target.value; this.renderAllTasksList(listContainer); };
    }

    async renderAllTasksList(listContainer) {
        listContainer.empty();
        const wrapperList = listContainer.createDiv('cevent-list-items');

        const sortedDates = Object.keys(this.plugin.eventsByDate).sort((a, b) => {
            const mA = moment(a, 'DD-MM-YYYY');
            const mB = moment(b, 'DD-MM-YYYY');
            if (mA.isValid() && mB.isValid()) return mA.diff(mB);
            if (mA.isValid()) return -1;
            if (mB.isValid()) return 1;
            return a.localeCompare(b);
        });

        const today = moment().startOf('day');
        let totalDaysRendered = 0;

        for (const dateStr of sortedDates) {
            const dayEvents = this.plugin.eventsByDate[dateStr] || [];
            const filteredGroup = this.filterAndSortEvents(dayEvents);
            if (filteredGroup.length === 0) continue;
            totalDaysRendered++;

            const m = moment(dateStr, 'DD-MM-YYYY');
            const isToday = m.isValid() && m.isSame(today, 'day');

            const dateHeader = wrapperList.createDiv('cevent-date-segment-header');
            dateHeader.dataset.date = dateStr;
            if (isToday) dateHeader.addClass('cevent-today-target');
            const dateBadge = dateHeader.createDiv('cevent-date-badge');
            if (isToday) dateBadge.addClass('is-today');
            dateBadge.setText(isToday ? 'Today' : (m.isValid() ? m.format('ddd,D,MMMM,YYYY') : dateStr));

            const groupContainer = wrapperList.createDiv('cevent-date-group-container');
            for (const ev of filteredGroup) {
                await this.createEventCard(groupContainer, ev);
            }
        }

        if (totalDaysRendered === 0) {
            wrapperList.createDiv({ text: 'No events found.', cls: 'cevent-empty-state' });
        }

        setTimeout(() => {
            const todayTarget = listContainer.querySelector('.cevent-today-target');
            if (todayTarget) todayTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    /* =========================================================================
       HELPER: FILTER & SORT ENGINE
       ========================================================================= */
    parseTimeForSort(timeStr) {
        if (!timeStr) return '23:59';
        const lower = timeStr.toLowerCase();
        if (lower.includes('fullday') || lower.includes('all day')) return '00:00';
        
        let parseTarget = timeStr;
        if (lower.includes(' to ') || lower.includes('-')) {
            parseTarget = lower.includes(' to ') ? lower.split(' to ')[0] : lower.split('-')[0];
        }

        const match = parseTarget.match(/\b((1[0-2]|0?[1-9])(:[0-5][0-9])?\s*[AaPp][Mm]|([01]?[0-9]|2[0-3]):([0-5][0-9]))\b/);
        if (match) {
            const parsed = moment(match[0], ['hh:mm A', 'h:mm A', 'h A', 'ha', 'HH:mm', 'h a', 'H:mm']);
            if (parsed.isValid()) return parsed.format('HH:mm');
        }
        return timeStr;
    }

    filterAndSortEvents(events) {
        let uniqueEvents = Array.from(new Set(events.map(e => e.id))).map(id => events.find(e => e.id === id));
        let filtered = [...uniqueEvents];

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(ev => ev.name.toLowerCase().includes(q) || ev.note.toLowerCase().includes(q));
        }

        if (this.listFilter !== 'all') {
            filtered = filtered.filter(ev => {
                if (this.listFilter === 'pending') return ev.status === 'pending';
                if (this.listFilter === 'completed') return ev.status === 'completed';
                if (this.listFilter === 'closed') return ev.status === 'closed';
                return ev.tags.toLowerCase().includes(this.listFilter.toLowerCase());
            });
        }

        return filtered.sort((a, b) => {
            const timeA = this.parseTimeForSort(a.time);
            const timeB = this.parseTimeForSort(b.time);
            if (this.sortMode === 'Time: Oldest First') return timeA.localeCompare(timeB);
            if (this.sortMode === 'Time: Newest First') return timeB.localeCompare(timeA);
            if (this.sortMode === 'Name: A-Z') return a.name.localeCompare(b.name);
            if (this.sortMode === 'Name: Z-A') return b.name.localeCompare(a.name);
            return 0;
        });
    }

    renderTimePills(container, timeStr) {
        if (!timeStr || timeStr.toLowerCase().includes('fullday') || timeStr.toLowerCase().includes('all day')) {
            container.createDiv({ text: 'FullDay', cls: 'cevent-time-pill empty' });
            return;
        }
        if (timeStr.toLowerCase().includes(' to ') || timeStr.toLowerCase().includes('-')) {
            const delim = timeStr.toLowerCase().includes(' to ') ? ' to ' : '-';
            const parts = timeStr.split(new RegExp(delim, 'i')).map(t => t.trim());
            parts.forEach((part, index) => {
                container.createDiv({ text: part, cls: 'cevent-time-pill' });
                if (index < parts.length - 1) container.createSpan({ text: '→', cls: 'cevent-time-pill-arrow' });
            });
        } else {
            timeStr.split(',').map(t => t.trim()).filter(Boolean).forEach(block => {
                container.createDiv({ text: block, cls: 'cevent-time-pill' });
            });
        }
    }

    /* =========================================================================
       EVENT CARD
       ========================================================================= */
    async createEventCard(listContainer, ev) {
        const item = listContainer.createDiv(`cevent-item status-${ev.status}`);

        let targetColor = this.plugin.settings.statusColors.pending;
        if (ev.status === 'completed') targetColor = this.plugin.settings.statusColors.completed;
        else if (ev.status === 'closed') targetColor = this.plugin.settings.statusColors.closed;
        else if (ev.tags && ev.tags.includes('#important')) targetColor = this.plugin.settings.statusColors.important;
        if (ev.color) targetColor = ev.color;

        item.style.setProperty('--event-border-color', targetColor);

        let statusLabel = ev.status.charAt(0).toUpperCase() + ev.status.slice(1);
        if (ev.tags && ev.tags.includes('#important') && ev.status === 'pending') statusLabel = 'Important';
        if (ev.color && ev.status === 'pending' && !ev.tags.includes('#important')) statusLabel = 'Custom';

        const badge = item.createDiv({ text: statusLabel, cls: `cevent-item-badge status-${ev.status}` });
        badge.style.background = targetColor;

        const titleRow = item.createDiv('cevent-item-title-row');

        const iconWrapper = titleRow.createDiv('cevent-item-status-icon');
        iconWrapper.style.color = targetColor;
        if (ev.status === 'completed') iconWrapper.innerHTML = SVG.check;
        else if (ev.status === 'closed') iconWrapper.innerHTML = SVG.x;
        else if (ev.tags && ev.tags.includes('#important')) iconWrapper.innerHTML = SVG.info;
        else iconWrapper.innerHTML = SVG.warning;

        const titleEl = titleRow.createDiv({ cls: 'cevent-item-title-md' });
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.name, titleEl, ev.file.path, this.plugin);
        } catch (error) {
            titleEl.setText(ev.name);
        }

        if (ev.progress && ev.progress.total > 0) {
            const percent = Math.round((ev.progress.completed / ev.progress.total) * 100);
            const progressWrapper = item.createDiv('cevent-progress-wrapper');
            progressWrapper.createDiv('cevent-progress-text').setText(`${ev.progress.completed}/${ev.progress.total} Tasks (${percent}%)`);
            const barBg = progressWrapper.createDiv('cevent-progress-bg');
            const barFill = barBg.createDiv('cevent-progress-fill');
            barFill.style.width = `${percent}%`;
            barFill.style.backgroundColor = targetColor;
        } else {
            const descText = ev.note ? ev.note : '*No description provided.*';
            const descEl = item.createDiv({ cls: 'cevent-item-desc-md' });
            try {
                await MarkdownRenderer.render(this.plugin.app, descText, descEl, ev.file.path, this.plugin);
            } catch (error) {
                descEl.setText(descText);
            }
        }

        const footer = item.createDiv('cevent-item-footer');
        const timeContainer = footer.createDiv('cevent-item-time-container');
        this.renderTimePills(timeContainer, ev.time);
        footer.createDiv({ text: ev.date || ev.originalStartDate, cls: 'cevent-item-date-label' });

        const indicatorContainer = item.createDiv('cevent-item-indicators');
        if (ev.alarm) {
            const alarmBadge = indicatorContainer.createSpan('cevent-micro-badge alarm');
            alarmBadge.innerHTML = `${SVG.alarm} ${ev.alarm}`;
        }
        if (ev.repeat) {
            const repeatBadge = indicatorContainer.createSpan('cevent-micro-badge');
            repeatBadge.innerHTML = `${SVG.repeat} ${ev.repeat}`;
        }
        if (ev.isMultiDay) {
            indicatorContainer.createSpan({ text: `${ev.originalStartDate} → ${ev.originalEndDate}`, cls: 'cevent-micro-badge highlight' });
        }

        item.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (a) {
                e.preventDefault(); e.stopPropagation();
                const href = a.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) window.open(href, '_blank');
                else if (href) this.plugin.app.workspace.openLinkText(href, ev.file.path, false);
                return;
            }
            this.previousView = this.currentView;
            this.selectedEvent = ev;
            this.currentView = 'event';
            this.render();
        });
    }

    /* =========================================================================
       VIEW 4: EVENT INFO
       ========================================================================= */
    async renderEventInfo(container) {
        const ev = this.selectedEvent;
        if (!ev) {
            this.currentView = this.previousView || 'list';
            this.render();
            return;
        }

        const topSection = container.createDiv('cevent-fixed-header');
        const topbar = topSection.createDiv('cevent-list-topbar cevent-flex-between');

        const backBtn = topbar.createEl('button', { cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small', title: 'Back' });
        backBtn.innerHTML = `${SVG.back} Back`;
        backBtn.onclick = () => { this.currentView = this.previousView || 'list'; this.render(); };

        const openMdBtn = topbar.createEl('button', { cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small', title: 'Open note' });
        openMdBtn.innerHTML = `${SVG.file} Open Note`;
        openMdBtn.onclick = async () => { await this.plugin.app.workspace.getLeaf(false).openFile(ev.file); };

        const scrollArea = container.createDiv('cevent-scrollable-body cevent-info-wrapper');

        let targetColor = this.plugin.settings.statusColors.pending;
        if (ev.status === 'completed') targetColor = this.plugin.settings.statusColors.completed;
        else if (ev.status === 'closed') targetColor = this.plugin.settings.statusColors.closed;
        else if (ev.tags && ev.tags.includes('#important')) targetColor = this.plugin.settings.statusColors.important;
        if (ev.color) targetColor = ev.color;

        const titleRow = scrollArea.createDiv('cevent-info-title-row');

        const iconWrapper = titleRow.createDiv('cevent-item-status-icon cevent-item-icon-xl');
        iconWrapper.style.color = targetColor;
        if (ev.status === 'completed') iconWrapper.innerHTML = SVG.check;
        else if (ev.status === 'closed') iconWrapper.innerHTML = SVG.x;
        else if (ev.tags && ev.tags.includes('#important')) iconWrapper.innerHTML = SVG.info;
        else iconWrapper.innerHTML = SVG.warning;

        const titleHeader = titleRow.createDiv('cevent-info-title-md');
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.name, titleHeader, ev.file.path, this.plugin);
        } catch (e) { titleHeader.setText(ev.name); }
        titleHeader.addEventListener('click', this.linkInterceptor.bind(this, ev.file.path));

        const grid = scrollArea.createDiv('cevent-info-grid');

        const dateStr = ev.isMultiDay ? `${ev.originalStartDate} to ${ev.originalEndDate}` : ev.date;
        grid.createDiv({ cls: 'cevent-info-cell' }).innerHTML = `<strong>Date</strong><br>${dateStr}`;

        const timeCell = grid.createDiv({ cls: 'cevent-info-cell' });
        timeCell.innerHTML = `<strong>Schedule</strong><br>`;
        this.renderTimePills(timeCell.createDiv('cevent-item-time-container'), ev.time);

        if (ev.alarm) {
            grid.createDiv({ cls: 'cevent-info-cell' }).innerHTML = `<strong>Alarm</strong><br>${ev.alarm}`;
        }
        if (ev.color) {
            const colorCell = grid.createDiv('cevent-info-cell');
            colorCell.innerHTML = `<strong>Theme Color</strong>`;
            const colorDot = colorCell.createDiv('cevent-color-preview');
            colorDot.style.backgroundColor = ev.color;
            colorDot.createSpan({ text: ev.color });
        }
        if (ev.repeat) {
            grid.createDiv({ cls: 'cevent-info-cell' }).innerHTML = `<strong>Recurs</strong><br>${ev.repeat}`;
        }

        let progressTextEl = null, progressFillEl = null;
        if (ev.progress && ev.progress.total > 0) {
            const progCell = grid.createDiv('cevent-info-cell cevent-info-full');
            progCell.innerHTML = `<strong>Task Progress</strong>`;
            const progressWrapper = progCell.createDiv('cevent-progress-wrapper');
            const percent = Math.round((ev.progress.completed / ev.progress.total) * 100);
            progressTextEl = progressWrapper.createDiv('cevent-progress-text');
            progressTextEl.setText(`${ev.progress.completed}/${ev.progress.total} Completed`);
            const barBg = progressWrapper.createDiv('cevent-progress-bg');
            progressFillEl = barBg.createDiv('cevent-progress-fill');
            progressFillEl.style.width = `${percent}%`;
            progressFillEl.style.backgroundColor = targetColor;
        }

        const descCell = grid.createDiv('cevent-info-cell cevent-info-full');
        descCell.innerHTML = `<strong>Description &amp; Notes</strong>`;
        const descBody = descCell.createDiv('cevent-info-desc-body');
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.note || '*No description provided.*', descBody, ev.file.path, this.plugin);
        } catch (e) { descBody.setText(ev.note || 'No description.'); }
        descBody.addEventListener('click', this.linkInterceptor.bind(this, ev.file.path));

        descBody.addEventListener('change', async (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                const checkboxes = Array.from(descBody.querySelectorAll('input[type="checkbox"]'));
                const index = checkboxes.indexOf(e.target);
                if (index !== -1) {
                    await this.plugin.toggleEventSubtask(ev, index, e.target.checked);
                    if (ev.progress && progressTextEl && progressFillEl) {
                        ev.progress.completed += e.target.checked ? 1 : -1;
                        const percent = Math.round((ev.progress.completed / ev.progress.total) * 100);
                        progressTextEl.setText(`${ev.progress.completed}/${ev.progress.total} Completed`);
                        progressFillEl.style.width = `${percent}%`;
                    }
                }
            }
        });

        scrollArea.createDiv({ text: 'Status', cls: 'cevent-section-title' });
        const statusActions = scrollArea.createDiv('cevent-actions-grid');

        const btnOpen = statusActions.createEl('button', { cls: `cevent-action-btn btn-open ${ev.status === 'pending' ? 'is-active' : ''}` });
        btnOpen.innerHTML = `${SVG.warning} Pending`;
        const btnDone = statusActions.createEl('button', { cls: `cevent-action-btn btn-don ${ev.status === 'completed' ? 'is-active' : ''}` });
        btnDone.innerHTML = `${SVG.check} Done`;
        const btnCancel = statusActions.createEl('button', { cls: `cevent-action-btn btn-del ${ev.status === 'closed' ? 'is-active' : ''}` });
        btnCancel.innerHTML = `${SVG.x} Cancel`;

        btnOpen.onclick = () => { this.plugin.updateEventStatus(ev, ' '); this.render(); };
        btnDone.onclick = () => { this.plugin.updateEventStatus(ev, 'x'); this.render(); };
        btnCancel.onclick = () => { this.plugin.updateEventStatus(ev, '-'); this.render(); };

        scrollArea.createDiv({ text: 'Tags', cls: 'cevent-section-title' });
        const tagActions = scrollArea.createDiv('cevent-actions-grid');
        const commonTags = new Set(['#important', '#meeting', '#review']);
        Array.from(this.plugin.uniqueTags).slice(0, 7).forEach(t => commonTags.add(t));
        commonTags.forEach(tag => {
            const isActive = ev.tags.includes(tag);
            const tagBtn = tagActions.createEl('button', {
                text: tag.replace('#', ''),
                cls: `cevent-action-btn btn-tag ${isActive ? 'is-active' : ''}`
            });
            tagBtn.onclick = async () => {
                if (isActive) await this.plugin.removeTagFromEvent(ev, tag);
                else await this.plugin.appendTagToEvent(ev, tag);
                this.render();
            };
        });
    }

    linkInterceptor(sourcePath, e) {
        const a = e.target.closest('a');
        if (a) {
            e.preventDefault(); e.stopPropagation();
            const href = a.getAttribute('href');
            if (href && href.startsWith('http')) window.open(href, '_blank');
            else if (href) this.plugin.app.workspace.openLinkText(href, sourcePath, false);
        }
    }
}

/* =========================================================================
   4. SETTINGS TAB
   ========================================================================= */
class CEventPlannerSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'CEvent-Planner Settings' });

        new Setting(containerEl)
            .setName('Default View')
            .setDesc('Which tab to load first.')
            .addDropdown(drop => drop
                .addOption('calendar', 'Calendar')
                .addOption('list', 'Schedule')
                .addOption('allTasks', 'All Tasks')
                .setValue(this.plugin.settings.defaultView)
                .onChange(async (value) => { this.plugin.settings.defaultView = value; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Time View Hour Grid')
            .setDesc('Choose whether the time view displays all 24 hours or only hours that contain events.')
            .addDropdown(dropdown => dropdown
                .addOption('24 hour', '24 Hour Grid')
                .addOption('event hour', 'Only Event Hours')
                .setValue(this.plugin.settings.timeViewGridMode || 'event hour')
                .onChange(async (value) => {
                    this.plugin.settings.timeViewGridMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Block Height')
            .setDesc('CSS height for the code block dashboard (e.g. 800px).')
            .addText(text => text
                .setPlaceholder('800px')
                .setValue(this.plugin.settings.codeBlockHeight)
                .onChange(async (value) => { this.plugin.settings.codeBlockHeight = value; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Max Indicator Dots')
            .setDesc('Max event dots per calendar day.')
            .addText(text => text
                .setPlaceholder('4')
                .setValue(String(this.plugin.settings.maxDots))
                .onChange(async (value) => {
                    const parsed = parseInt(value);
                    if (!isNaN(parsed) && parsed > 0) { this.plugin.settings.maxDots = parsed; await this.plugin.saveSettings(); }
                }));

        new Setting(containerEl)
            .setName('Time View Max Events Per Slot')
            .setDesc('Maximum events shown per hour in Time View before showing "see more".')
            .addText(text => text
                .setPlaceholder('3')
                .setValue(String(this.plugin.settings.timeViewMaxPerSlot || 3))
                .onChange(async (value) => {
                    const parsed = parseInt(value);
                    if (!isNaN(parsed) && parsed > 0) { this.plugin.settings.timeViewMaxPerSlot = parsed; await this.plugin.saveSettings(); }
                }));

        new Setting(containerEl)
            .setName('30-Minute Time Segments')
            .setDesc('Split TimeView rows into 30-minute intervals (e.g., 12:00, 12:30).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.timeViewHalfHour)
                .onChange(async (value) => {
                    this.plugin.settings.timeViewHalfHour = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Reminders')
            .setDesc('Show alarm popups when current time matches an event alarm.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableReminders)
                .onChange(async (value) => {
                    this.plugin.settings.enableReminders = value;
                    await this.plugin.saveSettings();
                    if (value) this.plugin.startReminderService();
                    else this.plugin.stopReminderService();
                }));

        new Setting(containerEl)
            .setName('Alarm Tone')
            .setDesc('Play an audible alarm tone when an event alarm fires (continues until modal is closed).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAlarmTone !== false)
                .onChange(async (value) => {
                    this.plugin.settings.enableAlarmTone = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Alarm Vibration')
            .setDesc('Vibrate the device when an alarm fires (mobile/supported devices; continues until modal is closed).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAlarmVibration !== false)
                .onChange(async (value) => {
                    this.plugin.settings.enableAlarmVibration = value;
                    await this.plugin.saveSettings();
                }));
    }
}

/* =========================================================================
   5. MAIN PLUGIN CLASS
   ========================================================================= */
class CEventPlannerPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        this.fileCache = new Map();
        this.eventsArray = [];
        this.eventsByDate = {};
        this.uniqueTags = new Set();
        this.activeAppInstances = [];
        this.modifyTimeout = null;
        this.reminderInterval = null;
        this.notifiedEvents = new Set();

        this.injectCSS();
        this.addSettingTab(new CEventPlannerSettingTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor('cevent-planner', (source, el, ctx) => {
            const blockApp = new CEventApp(el, this, 'codeblock', this.settings.codeBlockHeight);

            const s = source.toLowerCase();
            if (s.includes("view: 'list'") || s.includes('view: "list"')) blockApp.currentView = 'list';
            if (s.includes("view: 'calendar'") || s.includes('view: "calendar"')) blockApp.currentView = 'calendar';
            if (s.includes("view: 'alltasks'") || s.includes('view: "alltasks"')) blockApp.currentView = 'allTasks';

            blockApp.mount();
            this.activeAppInstances.push(blockApp);
            const renderChild = new MarkdownRenderChild(el);
            ctx.addChild(renderChild);

            renderChild.onunload = () => {
                this.activeAppInstances = this.activeAppInstances.filter(i => i !== blockApp);
            };
        });

        this.app.workspace.onLayoutReady(() => {
            this.scanEntireVault();
            if (this.settings.enableReminders) this.startReminderService();
        });

        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                if (this.modifyTimeout) clearTimeout(this.modifyTimeout);
                this.modifyTimeout = setTimeout(async () => {
                    await this.scanSingleFile(file);
                    this.rebuildEventIndices();
                    this.refreshAllActiveViews();
                }, 300);
            }
        }));

        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (this.fileCache.has(file.path)) {
                this.fileCache.delete(file.path);
                this.rebuildEventIndices();
                this.refreshAllActiveViews();
            }
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (this.fileCache.has(oldPath)) {
                const data = this.fileCache.get(oldPath);
                data.forEach(ev => ev.file = file);
                this.fileCache.set(file.path, data);
                this.fileCache.delete(oldPath);
                this.rebuildEventIndices();
                this.refreshAllActiveViews();
            }
        }));
    }

    onunload() {
        const styleEl = document.getElementById('cevent-live-styles');
        if (styleEl) styleEl.remove();
        if (this.modifyTimeout) clearTimeout(this.modifyTimeout);
        this.stopReminderService();
        this.activeAppInstances = [];
        this.fileCache.clear();
        this.eventsArray = [];
        this.eventsByDate = {};
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    get eventBlockRegex() {
        return /^[ \t]*(?:-[ \t]+)?\[([ xX\-])\] ([^\r\n]+)((?:\r?\n[ \t]+-[ \t]+(?:Date|Time|Alarm|Color|Icon|Repeat|Tag|Id) [^\r\n]*|(?:\r?\n[ \t]*>[ \t]*.*))+)?/gim;
    }

    analyzeProgress(noteText) {
        if (!noteText) return { total: 0, completed: 0 };
        const total = (noteText.match(/- \[[ xX\-]\] /g) || []).length;
        const completed = (noteText.match(/- \[[xX\-]\] /g) || []).length;
        return { total, completed };
    }

    async scanEntireVault() {
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) await this.scanSingleFile(file, false);
        this.rebuildEventIndices();
        this.refreshAllActiveViews();
    }

    async scanSingleFile(file, shouldRebuild = true) {
        const content = await this.app.vault.cachedRead(file);
        const regex = this.eventBlockRegex;
        let match;
        const fileEvents = [];

        while ((match = regex.exec(content)) !== null) {
            const statusChar = match[1];
            let status = 'pending';
            if (statusChar.toLowerCase() === 'x') status = 'completed';
            if (statusChar === '-') status = 'closed';

            const name = match[2].trim();
            const bodyText = match[3] || '';

            let dateStr = '', timeStr = '', alarmStr = '', colorStr = '', iconStr = '', repeatStr = '', tagsStr = '', customIdStr = '';
            const noteLines = [];

            const lines = bodyText.split(/\r?\n/);
            lines.forEach(line => {
                const attrMatch = line.match(/^[ \t]+-[ \t]+(Date|Time|Alarm|Color|Icon|Repeat|Tag|Id)[ \t]+([^\r\n]+)/i);
                if (attrMatch) {
                    const key = attrMatch[1].toLowerCase();
                    const val = attrMatch[2].trim();
                    if (key === 'date') dateStr = val;
                    else if (key === 'time') timeStr = val;
                    else if (key === 'alarm') alarmStr = val;
                    else if (key === 'color') colorStr = val;
                    else if (key === 'icon') iconStr = val;
                    else if (key === 'repeat') repeatStr = val;
                    else if (key === 'tag') tagsStr = val;
                    else if (key === 'id') customIdStr = val;
                } else if (line.trim().startsWith('>')) {
                    const cleaned = line.replace(/^[ \t]*>[ \t]?(\[!NOTE\])?/i, '');
                    if (!line.toLowerCase().includes('[!note]')) noteLines.push(cleaned);
                }
            });

            if (!dateStr) continue;

            const noteText = noteLines.join('\n').trim();
            const eventObj = {
                id: `${file.path}-${statusChar}-${name}-${dateStr}`,
                customId: customIdStr,
                file: file,
                originalMatch: match[0],
                statusChar: statusChar,
                status: status,
                name: name,
                originalDateString: dateStr,
                time: timeStr,
                alarm: alarmStr,
                color: colorStr,
                icon: iconStr,
                repeat: repeatStr,
                tags: tagsStr,
                note: noteText,
                progress: this.analyzeProgress(noteText),
                isProjectedRecurring: false
            };

            if (dateStr.toLowerCase().includes(' to ')) {
                const parts = dateStr.toLowerCase().split(' to ');
                eventObj.originalStartDate = parts[0].trim();
                eventObj.originalEndDate = parts[1].trim();
                eventObj.isMultiDay = true;
            } else {
                eventObj.originalStartDate = dateStr;
                eventObj.originalEndDate = dateStr;
                eventObj.isMultiDay = false;
            }
            eventObj.date = eventObj.originalStartDate;
            fileEvents.push(eventObj);
        }

        if (fileEvents.length > 0) this.fileCache.set(file.path, fileEvents);
        else this.fileCache.delete(file.path);

        if (shouldRebuild) {
            this.rebuildEventIndices();
            this.refreshAllActiveViews();
        }
    }

    rebuildEventIndices() {
        this.eventsArray = [];
        this.eventsByDate = {};
        this.uniqueTags = new Set();

        for (const events of this.fileCache.values()) {
            for (const baseEv of events) {
                if (baseEv.tags) baseEv.tags.split(/\s+/).forEach(t => { if (t.startsWith('#')) this.uniqueTags.add(t); });
                this.eventsArray.push(baseEv);
                this.mapEventToDates(baseEv, baseEv.originalStartDate, baseEv.originalEndDate);
                if (baseEv.repeat) this.generateRecurringEvents(baseEv);
            }
        }
    }

    mapEventToDates(event, startDateStr, endDateStr) {
        const start = moment(startDateStr, 'DD-MM-YYYY');
        const end = moment(endDateStr, 'DD-MM-YYYY');

        if (!start.isValid() || !end.isValid()) {
            if (!this.eventsByDate[startDateStr]) this.eventsByDate[startDateStr] = [];
            this.eventsByDate[startDateStr].push(event);
            return;
        }

        let curr = start.clone();
        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
            const dStr = curr.format('DD-MM-YYYY');
            if (!this.eventsByDate[dStr]) this.eventsByDate[dStr] = [];
            this.eventsByDate[dStr].push(event);
            curr.add(1, 'days');
        }
    }

    generateRecurringEvents(baseEv) {
        const start = moment(baseEv.originalStartDate, 'DD-MM-YYYY');
        if (!start.isValid()) return;

        let rule = baseEv.repeat.toLowerCase();
        let incrementUnit = null;
        if (rule.includes('daily') || rule.includes('day')) incrementUnit = 'days';
        else if (rule.includes('weekly') || rule.includes('week')) incrementUnit = 'weeks';
        else if (rule.includes('monthly') || rule.includes('month')) incrementUnit = 'months';
        else if (rule.includes('yearly') || rule.includes('year')) incrementUnit = 'years';
        if (!incrementUnit) return;

        const endHorizon = moment().add(this.settings.recurringLimitMonths || 12, 'months');
        let nextDate = start.clone().add(1, incrementUnit);

        while (nextDate.isBefore(endHorizon)) {
            const projectedStr = nextDate.format('DD-MM-YYYY');
            const projectedEv = { ...baseEv };
            projectedEv.id = `${baseEv.id}-recur-${projectedStr}`;
            projectedEv.date = projectedStr;
            projectedEv.originalStartDate = projectedStr;
            projectedEv.originalEndDate = projectedStr;
            projectedEv.isMultiDay = false;
            projectedEv.isProjectedRecurring = true;
            projectedEv.status = 'pending';
            projectedEv.statusChar = ' ';

            this.eventsArray.push(projectedEv);
            if (!this.eventsByDate[projectedStr]) this.eventsByDate[projectedStr] = [];
            this.eventsByDate[projectedStr].push(projectedEv);
            nextDate.add(1, incrementUnit);
        }
    }

    refreshAllActiveViews() {
        this.activeAppInstances.forEach(app => {
            if (app.currentView === 'event' && app.selectedEvent) {
                const updatedEvent = this.eventsArray.find(e => e.id === app.selectedEvent.id);
                app.selectedEvent = updatedEvent || null;
                if (!updatedEvent) app.currentView = app.previousView || 'list';
            }
            try { app.render(); } catch(e) { /* DOM may be gone */ }
        });
    }

    /* =========================================================================
       FILE MODIFICATION METHODS (LIVE SYNC)
       ========================================================================= */
    async updateEventDate(eventObj, newDateStr) {
        if (eventObj.isProjectedRecurring) return;
        const content = await this.app.vault.read(eventObj.file);
        const newMatchString = eventObj.originalMatch.replace(`- Date ${eventObj.originalDateString}`, `- Date ${newDateStr}`);
        await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newMatchString));
    }

    async updateEventStatus(eventObj, newStatusChar) {
        if (eventObj.isProjectedRecurring) return;
        if (eventObj.statusChar === newStatusChar) return;
        const content = await this.app.vault.read(eventObj.file);
        const newMatchString = eventObj.originalMatch.replace(`[${eventObj.statusChar}]`, `[${newStatusChar}]`);
        await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newMatchString));
    }

    async appendTagToEvent(eventObj, tagToAdd) {
        if (eventObj.isProjectedRecurring) return;
        if (eventObj.tags && eventObj.tags.includes(tagToAdd)) return;
        const content = await this.app.vault.read(eventObj.file);
        let newMatchString;
        if (eventObj.tags) {
            newMatchString = eventObj.originalMatch.replace(`- Tag ${eventObj.tags}`, `- Tag ${eventObj.tags} ${tagToAdd}`);
        } else {
            const lines = eventObj.originalMatch.split(/\r?\n/);
            lines.splice(1, 0, `  - Tag ${tagToAdd}`);
            newMatchString = lines.join('\n');
        }
        await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newMatchString));
    }

    async removeTagFromEvent(eventObj, tagToRemove) {
        if (eventObj.isProjectedRecurring) return;
        if (!eventObj.tags || !eventObj.tags.includes(tagToRemove)) return;
        const content = await this.app.vault.read(eventObj.file);
        const newTags = eventObj.tags.replace(tagToRemove, '').replace(/\s{2,}/g, ' ').trim();
        const newMatchString = eventObj.originalMatch.replace(`- Tag ${eventObj.tags}`, newTags ? `- Tag ${newTags}` : `- Tag `);
        await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newMatchString));
    }

    async toggleEventSubtask(eventObj, checkboxIndex, isChecked) {
        if (eventObj.isProjectedRecurring) return;
        const content = await this.app.vault.read(eventObj.file);
        let currentSubtaskIdx = -1;
        const lines = eventObj.originalMatch.split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
            if (/- \[[ xX\-]\]/.test(lines[i])) {
                currentSubtaskIdx++;
                if (currentSubtaskIdx === checkboxIndex) {
                    lines[i] = lines[i].replace(/- \[[ xX\-]\]/, isChecked ? '- [x]' : '- [ ]');
                    break;
                }
            }
        }
        const lineEnding = eventObj.originalMatch.includes('\r\n') ? '\r\n' : '\n';
        const newEventString = lines.join(lineEnding);
        if (newEventString !== eventObj.originalMatch) {
            await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newEventString));
        }
    }

    /* =========================================================================
       REMINDER SERVICE
       ========================================================================= */
    startReminderService() {
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        
        this.reminderInterval = setInterval(() => {
            const now = moment();
            this.eventsArray.forEach(ev => {
                if (ev.status !== 'pending' || !ev.alarm || !ev.date) return;
                
                const eventMoment = moment(`${ev.date} ${ev.alarm.trim()}`, [
                    'DD-MM-YYYY hh:mm A', 'DD-MM-YYYY h:mm A', 'DD-MM-YYYY hh:mm a', 'DD-MM-YYYY h:mm a',
                    'DD-MM-YYYY HH:mm', 'DD-MM-YYYY h A', 'DD-MM-YYYY ha'
                ]);
                
                if (!eventMoment.isValid()) return;
                
                if (now.isSame(eventMoment, 'minute')) {
                    const uniqueId = `${ev.id}-${eventMoment.valueOf()}`;
                    if (!this.notifiedEvents.has(uniqueId)) {
                        new ReminderModal(this.app, ev, this).open();
                        new Notice(`⏰ Alarm: ${ev.name} at ${ev.alarm}`, 10000);
                        this.notifiedEvents.add(uniqueId);
                    }
                }
            });
        }, 10000); 
    }

    stopReminderService() {
        if (this.reminderInterval) { clearInterval(this.reminderInterval); this.reminderInterval = null; }
    }

    /* =========================================================================
       6. CSS INJECTION
       ========================================================================= */
    injectCSS() {
        if (document.getElementById('cevent-live-styles')) return;
        const style = document.createElement('style');
        style.id = 'cevent-live-styles';
        style.textContent = `
            /* ===================== ROOT & LAYOUT ===================== */
            .cevent-app-root {
                font-family: var(--font-interface);
                background: var(--background-primary);
                width: 100%; display: flex; flex-direction: column;
                overflow: hidden; height: 100%;
            }
            .cevent-app-root.context-codeblock {
                border: 1px solid var(--background-modifier-border);
                border-radius: 20px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.06);
                margin: 1.5em 0;
                background: var(--background-secondary-alt);
            }

            /* ===================== 3-TAB CHROME ===================== */
            .cevent-tab-chrome {
                display: flex; flex-direction: column; height: 100%; overflow: hidden;
            }
            .cevent-tab-bar {
                display: flex;
                background: var(--background-secondary);
                border-bottom: 1px solid var(--background-modifier-border);
                flex-shrink: 0;
                padding: 0 8px;
            }
            .cevent-tab-btn {
                flex: 1; display: flex; align-items: center; justify-content: center;
                padding: 12px 8px; cursor: pointer;
                border: none; background: transparent;
                color: var(--text-muted);
                border-bottom: 3px solid transparent;
                transition: all 0.2s ease;
                border-radius: 0;
            }
            .cevent-tab-btn:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
            .cevent-tab-btn.active { color: var(--interactive-accent); border-bottom-color: var(--interactive-accent); }
            .cevent-tab-btn svg { pointer-events: none; }

            .cevent-tab-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

            /* ===================== DASHBOARD WRAPPER ===================== */
            .cevent-dashboard-wrapper {
                display: flex; flex-direction: column;
                height: 100%; overflow: hidden; padding: 16px; min-height: 100%;
            }
            .cevent-fixed-header { flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; }
            .cevent-scrollable-body { flex-grow: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; }
            .cevent-dynamic-body { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-top: 6px; padding-right: 6px; padding-bottom: 24px; }
            .cevent-list-items { display: flex; flex-direction: column; gap: 14px; width: 100%; }

            .cevent-dynamic-body::-webkit-scrollbar,
            .cevent-scrollable-body::-webkit-scrollbar,
            .cevent-tab-content::-webkit-scrollbar { width: 5px; }
            .cevent-dynamic-body::-webkit-scrollbar-thumb,
            .cevent-scrollable-body::-webkit-scrollbar-thumb { background: var(--background-modifier-border); border-radius: 10px; }
            .cevent-dynamic-body::-webkit-scrollbar-thumb:hover,
            .cevent-scrollable-body::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

            .cevent-flex-between { display: flex; justify-content: space-between; align-items: center; }
            .cevent-flex-row { display: flex; gap: 8px; align-items: center; }

            /* ===================== CALENDAR HEADER ===================== */
            .cevent-month-year-container { display: flex; flex-direction: column; gap: 0; line-height: 1.1; }
            .cevent-header-day-month { font-size: 2em; font-weight: 700; color: var(--text-normal); letter-spacing: -0.5px; cursor: pointer; }
            .cevent-header-day-month:hover { color: var(--interactive-accent); }
            .cevent-header-year { font-size: 1em; font-weight: 400; color: var(--text-muted); margin-top: 1px; cursor: pointer; }
            .cevent-header-year:hover { color: var(--interactive-accent); }
            .cevent-year-picker { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }

            .cevent-calendar-header { margin-bottom: 4px; }
            .cevent-calendar-controls { gap: 4px; }

            .cevent-nav-icon-btn {
                background: transparent; border: none; width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; color: var(--text-muted); border-radius: 8px; padding: 0;
                transition: all 0.2s ease;
            }
            .cevent-nav-icon-btn:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
            .cevent-month-picker { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }

            /* ===================== LIST VIEW HEADER ===================== */
            .cevent-list-topbar { display: flex; justify-content: space-between; align-items: flex-start; }
            .cevent-list-time-display { display: flex; flex-direction: column; }
            .cevent-list-clock { display: flex; align-items: baseline; gap: 2px; line-height: 1; }
            .cevent-clock-h { font-size: 2.4em; font-weight: 700; color: var(--text-normal); letter-spacing: -1px; }
            .cevent-clock-sep { font-size: 2em; font-weight: 700; color: var(--text-normal); }
            .cevent-clock-m { font-size: 2.4em; font-weight: 700; color: var(--text-normal); }
            .cevent-clock-ampm { font-size: 1em; font-weight: 600; color: var(--text-muted); margin-left: 4px; }
            .cevent-list-date-label { font-size: 0.9em; color: var(--text-muted); margin-top: 2px; }
            .cevent-list-header-right { display: flex; gap: 6px; align-items: center; }

            /* ===================== BUTTONS ===================== */
            .cevent-btn-pill {
                background: var(--interactive-normal); color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 28px; padding: 6px 14px;
                font-size: 0.85em; font-weight: 500; cursor: pointer;
                transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px;
            }
            .cevent-btn-pill:hover { background: var(--interactive-hover); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .cevent-btn-small { font-size: 0.8em; padding: 4px 12px; }
            .cevent-btn-outline { background: transparent; }

            /* ===================== DAY SCROLLER ===================== */
            .cevent-horizontal-scroller {
                display: flex; gap: 8px; overflow-x: auto;
                padding: 6px 2px; scroll-snap-type: x mandatory;
            }
            .cevent-horizontal-scroller::-webkit-scrollbar { height: 3px; }
            .cevent-horizontal-scroller::-webkit-scrollbar-thumb { background: var(--background-modifier-border); border-radius: 10px; }
            .cevent-scroll-day {
                display: flex; flex-direction: column; align-items: center;
                justify-content: flex-start; flex-shrink: 0; min-width: 56px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 14px; padding: 8px 6px;
                text-align: center; cursor: pointer; transition: 0.2s;
                scroll-snap-align: center;
            }
            .cevent-scroll-day:hover { border-color: var(--interactive-accent); transform: translateY(-2px); }
            .cevent-scroll-day.active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
            .cevent-scroll-day .day-name { font-size: 0.65em; text-transform: uppercase; font-weight: 700; opacity: 0.85; }
            .cevent-scroll-day .day-num { font-size: 1.2em; font-weight: bold; margin-top: 2px; }

            /* ===================== SEARCH ===================== */
            .cevent-search-wrapper {
                position: relative; width: 100%;
            }
            .cevent-search-icon-span {
                position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
                color: var(--text-muted); pointer-events: none; display: flex; align-items: center;
            }
            .cevent-search-input {
                width: 100%; background: var(--background-modifier-form-field);
                border: 1px solid var(--background-modifier-border);
                border-radius: 28px; padding: 8px 14px 8px 32px;
                color: var(--text-normal); font-size: 0.85em; outline: none;
                transition: all 0.2s ease; box-sizing: border-box;
            }
            .cevent-search-input:focus { border-color: var(--interactive-accent); box-shadow: 0 0 0 1px var(--interactive-accent); }

            /* ===================== TOOLS AREA ===================== */
            .cevent-tools-area { display: flex; flex-direction: column; gap: 8px; }
            .cevent-controls-row { display: flex; gap: 8px; flex-wrap: wrap; }
            .cevent-filter-select {
                flex: 1; min-width: 100px;
                background: var(--background-modifier-form-field);
                border: 1px solid var(--background-modifier-border);
                border-radius: 28px; padding: 6px 12px;
                color: var(--text-normal); font-size: 0.8em;
                transition: all 0.2s ease; outline: none; cursor: pointer;
            }
            .cevent-filter-select:hover { border-color: var(--interactive-accent); }

            /* VIEW TOGGLE (TimeView / ListView) */
            .cevent-toggle-row { display: flex; }
            .cevent-view-toggle {
                display: flex;
                background: var(--background-secondary);
                border-radius: 28px;
                border: 1px solid var(--background-modifier-border);
                overflow: hidden; padding: 2px;
            }
            .cevent-toggle-btn {
                background: var(--background-primary);
                border: none; padding: 6px 14px;
                font-size: 0.8em; font-weight: 600;
                color: var(--text-muted); cursor: pointer;
                border-radius: 28px; transition: all 0.2s;
                outline: none; display: flex; align-items: center; gap: 4px;
            }
            .cevent-toggle-btn.active { background: var(--background-secondary); color: var(--text-normal); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

            /* ===================== CALENDAR GRID ===================== */
            .cevent-grid {
                display: grid; grid-template-columns: repeat(7, 1fr);
                gap: 6px; margin-top: 8px; padding-bottom: 16px;
            }
            .cevent-day-header {
                text-align: center; font-size: 0.72em; font-weight: 700;
                color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px;
            }
            .cevent-day-wrapper {
                display: flex; flex-direction: column; align-items: center;
                gap: 3px; border-radius: 12px; padding-bottom: 4px; transition: background 0.2s;
            }
            .cevent-day-wrapper.drag-over {
                background: rgba(var(--interactive-accent-rgb), 0.15);
                box-shadow: inset 0 0 0 2px var(--interactive-accent);
            }
            .cevent-week-number { font-size: 0.55em; color: var(--text-faint); height: 10px; }
            .cevent-day {
                width: 34px; height: 34px; display: flex; justify-content: center;
                align-items: center; border-radius: 50%; font-size: 0.9em;
                cursor: pointer; background: var(--background-secondary);
                border: 1px solid transparent; transition: all 0.2s;
            }
            .cevent-day:hover { border-color: var(--interactive-accent); transform: scale(1.1); }
            .cevent-day.faint { color: var(--text-faint); opacity: 0.5; }
            .cevent-day.is-today {
                font-weight: bold; background: rgba(var(--interactive-accent-rgb), 0.1);
                border-color: var(--interactive-accent); color: var(--interactive-accent);
            }
            .cevent-day.selected {
                background: var(--interactive-accent); color: white;
                font-weight: bold; box-shadow: 0 4px 12px rgba(var(--interactive-accent-rgb), 0.4);
            }

            .cevent-dot-container {
                display: flex; gap: 3px; height: 12px;
                align-items: center; justify-content: center; width: 100%; margin-top: 2px;
            }
            .cevent-event-dot {
                width: 7px; height: 7px; border-radius: 50%;
                background: var(--text-muted); flex-shrink: 0; cursor: grab;
            }
            .cevent-event-dot:active { cursor: grabbing; }
            .cevent-event-dot.is-multi-day { width: 12px; border-radius: 4px; }
            .cevent-event-dot-more { font-size: 9px; color: var(--text-muted); font-weight: bold; padding-left: 1px; }

            .cevent-event-icon-custom {
                display: flex; align-items: center; justify-content: center;
                width: 12px; height: 12px; font-size: 10px; flex-shrink: 0;
                cursor: grab;
            }
            .cevent-event-icon-custom svg { width: 10px; height: 10px; }
            .cevent-event-icon-custom:active { cursor: grabbing; }

            /* ===================== TIME VIEW TABLE ===================== */
            .cevent-tv-scroll-wrapper {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                border-radius: 14px;
            }
            .cevent-tv-scroll-wrapper::-webkit-scrollbar { height: 4px; }
            .cevent-tv-scroll-wrapper::-webkit-scrollbar-thumb { background: var(--background-modifier-border); border-radius: 10px; }
            .cevent-tv-table {
                display: flex; flex-direction: column; min-width: 340px; width: 100%;
                border: 2px solid color-mix(in srgb, var(--interactive-accent) 40%, var(--background-modifier-border));
                border-radius: 14px; overflow: hidden;
                background: var(--background-primary);
            }
            
            /* FIXED WIDTH UPDATE FOR GRID COLUMNS */
            .cevent-tv-header-row {
                display: grid; grid-template-columns: 85px minmax(0, 1fr) minmax(0, 1fr);
                background: var(--background-secondary);
                border-bottom: 2px solid color-mix(in srgb, var(--interactive-accent) 40%, var(--background-modifier-border));
            }
            .cevent-tv-row {
                display: grid; grid-template-columns: 85px minmax(0, 1fr) minmax(0, 1fr);
                border-bottom: 1px solid color-mix(in srgb, var(--interactive-accent) 20%, var(--background-modifier-border));
                min-height: 40px;
            }
            
            .cevent-tv-col-head {
                padding: 10px 8px; font-size: 0.85em; font-weight: 700;
                color: var(--text-muted); text-transform: uppercase;
                text-align: center; letter-spacing: 0.5px;
            }
            .cevent-tv-col-head.highlight { color: var(--interactive-accent); }
            
            .cevent-tv-row:last-child { border-bottom: none; }
            .cevent-tv-row.current-hour { background: rgba(var(--interactive-accent-rgb), 0.04); }

            .cevent-tv-col-time {
                display: flex; align-items: flex-start; justify-content: flex-end;
                padding: 10px 10px 10px 4px;
                background: var(--background-secondary);
                border-right: 1px solid var(--background-modifier-border);
            }
            .cevent-tv-label {
                font-size: 0.85em; font-weight: 600; color: var(--text-muted); white-space: nowrap;
            }
            .cevent-tv-label.highlight {
                color: var(--interactive-accent); font-weight: 700;
                background: rgba(var(--interactive-accent-rgb), 0.12);
                border-radius: 6px; padding: 2px 6px;
            }

            .cevent-tv-col-am,
            .cevent-tv-col-pm {
                padding: 6px; display: flex; flex-direction: column; gap: 4px;
                border-right: 1px solid var(--background-modifier-border);
            }
            .cevent-tv-col-pm { border-right: none; }
            .cevent-tv-col-am.current-slot,
            .cevent-tv-col-pm.current-slot {
                background: rgba(255, 152, 0, 0.08);
            }

            .cevent-tv-cell {
                display: flex; align-items: center; gap: 6px;
                padding: 4px 6px; border-radius: 8px; cursor: pointer;
                background: color-mix(in srgb, var(--event-border-color, var(--background-modifier-border)) 12%, var(--background-secondary));
                border-left: 3px solid var(--event-border-color, var(--background-modifier-border));
                transition: all 0.15s;
                min-width: 0; /* Ensures inner flex flex text truncates cleanly */
            }
            
            /* BRIGHT HIGHLIGHT FOR SPANNING EVENTS */
            .cevent-tv-cell-span {
                background: color-mix(in srgb, var(--event-border-color) 25%, var(--background-secondary));
                box-shadow: 0 0 8px color-mix(in srgb, var(--event-border-color) 40%, transparent);
                border: 1px solid color-mix(in srgb, var(--event-border-color) 60%, transparent);
                border-left: 4px solid var(--event-border-color);
                font-weight: bold;
            }

            .cevent-tv-cell:hover { filter: brightness(1.05); transform: translateX(2px); }
            
            .cevent-prefix-icon {
                display: inline-flex; align-items: center; justify-content: center;
                flex-shrink: 0; width: 14px; height: 14px; font-size: 12px;
            }
            .cevent-prefix-icon svg { width: 100%; height: 100%; }
            
            .cevent-alarm-icon {
                display: inline-flex; align-items: center; justify-content: center;
                flex-shrink: 0; width: 12px; height: 12px;
            }
            .cevent-alarm-icon svg { width: 100%; height: 100%; }
            
            .cevent-tv-cell-icon {
                width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
            }
            
            .cevent-tv-cell-label {
                font-size: 0.75em; font-weight: 600; color: var(--text-normal);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
                flex: 1; min-width: 0;
            }
            
            .cevent-tv-more {
                font-size: 0.7em; color: var(--interactive-accent); cursor: pointer;
                padding: 2px 4px; font-weight: 600;
            }
            .cevent-tv-more:hover { text-decoration: underline; }

            /* ===================== EVENT CARDS ===================== */
            .cevent-item {
                background: color-mix(in srgb, var(--event-border-color) 10%, var(--background-secondary));
                border-radius: 14px; padding: 14px;
                position: relative;
                border-left: 5px solid var(--event-border-color);
                cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .cevent-item:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
            .cevent-item.status-completed { opacity: 0.85; }
            .cevent-item.status-closed { opacity: 0.65; filter: grayscale(50%); }

            .cevent-item-badge {
                position: absolute; top: -1px; right: 0;
                font-size: 0.65em; padding: 3px 10px; border-radius: 0 12px 0 10px;
                font-weight: bold; text-transform: capitalize; letter-spacing: 0.3px;
                color: white;
            }

            .cevent-item-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .cevent-item-status-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .cevent-item-status-icon svg { width: 20px; height: 20px; }

            .cevent-item-title-md p, .cevent-info-title-md p { margin: 0; font-weight: 700; color: var(--text-normal); font-size: 1em; line-height: 1.3; }
            .cevent-item-desc-md p { margin: 4px 0 0 0; font-size: 0.82em; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .cevent-item-title-md a, .cevent-item-desc-md a { color: var(--text-accent); text-decoration: none; font-weight: 600; }
            .cevent-item-title-md a:hover, .cevent-item-desc-md a:hover { text-decoration: underline; }

            .cevent-item-footer { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
            .cevent-item-time-container { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
            .cevent-item-date-label { font-size: 0.75em; color: var(--text-muted); margin-left: auto; }

            .cevent-item-indicators { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }

            .cevent-time-pill {
                font-size: 0.72em; font-weight: 600; padding: 3px 8px;
                background: var(--background-primary); color: var(--text-normal);
                border-radius: 28px; border: 1px solid var(--background-modifier-border);
            }
            .cevent-time-pill.empty { background: transparent; border-style: dashed; }
            .cevent-time-pill-arrow { font-size: 0.8em; color: var(--text-muted); }

            .cevent-micro-badge {
                font-size: 0.68em; background: var(--background-modifier-border);
                padding: 3px 7px; border-radius: 28px; color: var(--text-muted);
                font-weight: 600; display: inline-flex; align-items: center; gap: 3px;
            }
            .cevent-micro-badge.highlight { background: rgba(var(--interactive-accent-rgb),0.12); color: var(--interactive-accent); }
            .cevent-micro-badge.alarm { background: rgba(255,152,0,0.12); color: #ff9800; }
            .cevent-micro-badge svg { width: 11px; height: 11px; }

            /* ===================== ALL TASKS DATE HEADERS ===================== */
            .cevent-date-segment-header {
                margin-top: 8px; margin-bottom: 6px;
            }
            .cevent-date-badge {
                display: inline-block;
                background: var(--interactive-accent);
                color: white; font-weight: 700; font-size: 0.9em;
                padding: 5px 16px; border-radius: 8px 8px 0 0;
                border-bottom: 2px solid color-mix(in srgb, var(--interactive-accent) 70%, black);
            }
            .cevent-date-group-container { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }

            /* ===================== PROGRESS BAR ===================== */
            .cevent-progress-wrapper { margin-top: 8px; width: 100%; }
            .cevent-progress-text { font-size: 0.72em; color: var(--text-muted); margin-bottom: 4px; font-weight: bold; text-align: right; }
            .cevent-progress-bg { width: 100%; height: 6px; background: var(--background-modifier-border); border-radius: 28px; overflow: hidden; }
            .cevent-progress-fill { height: 100%; transition: width 0.3s ease; border-radius: 28px; }

            /* ===================== EVENT INFO PAGE ===================== */
            .cevent-info-wrapper { padding: 4px 0; }
            .cevent-info-title-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
            .cevent-item-icon-xl svg { width: 32px !important; height: 32px !important; }
            .cevent-info-title-md p { margin: 0; font-weight: 700; color: var(--text-normal); font-size: 1.3em; line-height: 1.3; }
            .cevent-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
            .cevent-info-cell { background: var(--background-secondary); padding: 14px; border-radius: 14px; font-size: 0.88em; border: 1px solid var(--background-modifier-border); }
            .cevent-info-full { grid-column: span 2; }
            .cevent-color-preview { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 28px; margin-top: 6px; font-weight: bold; color: #fff; }
            .cevent-section-title { font-size: 0.78em; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-top: 18px; margin-bottom: 10px; letter-spacing: 1px; }
            .cevent-actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
            .cevent-action-btn {
                padding: 8px; border-radius: 28px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary); cursor: pointer;
                font-weight: 600; transition: all 0.2s; font-size: 0.8em;
                display: flex; align-items: center; justify-content: center; gap: 4px;
            }
            .cevent-action-btn:hover { background: var(--background-modifier-hover); transform: translateY(-1px); }
            .cevent-action-btn svg { width: 14px; height: 14px; }
            .btn-open.is-active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
            .btn-don.is-active { background: var(--text-success, #588157); color: white; border-color: var(--text-success, #588157); }
            .btn-del.is-active { background: var(--text-error, #AD2831); color: white; border-color: var(--text-error, #AD2831); }
            .btn-tag.is-active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }

            .cevent-list-topbar .cevent-btn-pill svg { width: 12px; height: 12px; }

            .cevent-empty-state {
                text-align: center; padding: 40px 20px; color: var(--text-faint);
                font-style: italic; background: var(--background-secondary);
                border-radius: 14px; border: 1px dashed var(--background-modifier-border);
            }

            .cevent-info-desc-body input[type="checkbox"] {
                cursor: pointer; transform: scale(1.1); margin-right: 8px;
                accent-color: var(--interactive-accent);
            }
/* Ensure the table's container has a defined height and scrolling enabled */

/* Ensure the table's container handles the scrolling context */
.timeview-container {
    max-height: 450px; /* Adjust based on your preferred view height */
    overflow-y: auto;
    position: relative;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
}

/* Ensure the table borders don't glitch during sticky scroll */
.timeview-table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
}

/* Make the table headers sticky and float when scrolling */
.timeview-table thead th {
    position: sticky;
    top: 0;
    /* Uses Obsidian variables to support both light and dark mode themes */
    background-color: var(--background-primary); 
    z-index: 5; 
    /* Simulates the bottom border so it stays visible while floating */
    box-shadow: inset 0 -1px 0 var(--background-modifier-border); 
}

/* Optional: Subtle shadow underneath the header when it floats */
.timeview-table thead th::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -5px;
    height: 5px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0));
    pointer-events: none;
}


        `;
        document.head.appendChild(style);
    }
}

module.exports = CEventPlannerPlugin;