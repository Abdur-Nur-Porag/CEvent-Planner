const { Plugin, MarkdownRenderer, moment, PluginSettingTab, Setting, TFile, Notice, MarkdownRenderChild, Modal } = require('obsidian');

/* =========================================================================
   1. SETTINGS & DEFAULTS
   ========================================================================= */
const DEFAULT_SETTINGS = {
    defaultView: 'calendar', 
    defaultSort: 'Time: Oldest First',
    codeBlockHeight: '800px', 
    maxDots: 4, 
    enableReminders: true, 
    recurringLimitMonths: 12, 
    statusColors: {
        pending: '#006D77',
        completed: '#588157',
        closed: '#AD2831',
        important: '#003566'
    }
};

/* =========================================================================
   2. CUSTOM MODAL FOR REMINDERS (ALARM DIALOG)
   ========================================================================= */
class ReminderModal extends Modal {
    constructor(app, event, plugin) {
        super(app);
        this.event = event;
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('cevent-reminder-modal');

        const header = contentEl.createEl('h2', { text: '⏰ Event Reminder' });
        header.style.color = 'var(--interactive-accent)';
        header.style.textAlign = 'center';
        header.style.marginTop = '0';

        const title = contentEl.createEl('h3', { text: this.event.name });
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';

        const details = contentEl.createDiv();
        details.style.background = 'var(--background-secondary)';
        details.style.padding = '15px';
        details.style.borderRadius = '8px';
        details.style.marginBottom = '20px';
        details.style.border = '1px solid var(--background-modifier-border)';

        details.createEl('p', { text: `📅 Date: ${this.event.date}` }).style.margin = '0 0 8px 0';
        details.createEl('p', { text: `🕒 Time: ${this.event.time ? this.event.time.split(',')[0].trim() : 'All Day'}` }).style.margin = '0';

        if (this.event.note) {
            details.createEl('hr').style.margin = '15px 0';
            const noteDiv = details.createDiv();
            noteDiv.createEl('strong', { text: 'Description:' });
            const noteBody = noteDiv.createDiv();
            noteBody.style.marginTop = '8px';
            noteBody.style.padding = '10px';
            noteBody.style.background = 'var(--background-primary)';
            noteBody.style.borderRadius = '4px';
            noteBody.style.whiteSpace = 'pre-wrap';
            noteBody.style.fontSize = '0.9em';
            noteBody.setText(this.event.note);
        }

        const btnContainer = contentEl.createDiv();
        btnContainer.style.display = 'flex';
        btnContainer.style.flexWrap = 'wrap';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '8px';

        const completeBtn = btnContainer.createEl('button', { text: '✅ Complete' });
        completeBtn.style.backgroundColor = 'var(--text-success)';
        completeBtn.style.color = 'white';
        completeBtn.onclick = async () => {
            await this.plugin.updateEventStatus(this.event, 'x');
            new Notice(`Marked "${this.event.name}" as complete!`);
            this.close();
        };

        const viewAppBtn = btnContainer.createEl('button', { text: '🔍 View Details', cls: 'mod-cta' });
        viewAppBtn.onclick = () => {
            if (this.plugin.activeAppInstances.length > 0) {
                const app = this.plugin.activeAppInstances[0];
                app.selectedEvent = this.event;
                app.previousView = app.currentView;
                app.currentView = 'event';
                app.render();
                new Notice("Opened event details in your dashboard container.");
            } else {
                // Easy open fallback dashboard overlay frame
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
        openNoteBtn.onclick = async () => {
            this.close();
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(this.event.file);
        };

        const dismissBtn = btnContainer.createEl('button', { text: '✕ Dismiss' });
        dismissBtn.onclick = () => this.close();
    }

    onClose() {
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
        if (this.customHeight) {
            this.rootEl.style.height = this.customHeight;
        }
        this.render();
    }

    render() {
        this.rootEl.empty();
        const wrapper = this.rootEl.createDiv('cevent-dashboard-wrapper');

        switch (this.currentView) {
            case 'calendar': this.renderCalendar(wrapper); break;
            case 'list': this.renderListView(wrapper); break;
            case 'allTasks': this.renderAllTasksView(wrapper); break;
            case 'event': this.renderEventInfo(wrapper); break;
            default: this.renderListView(wrapper);
        }
    }

    /* =========================================================================
       VIEW 1: CALENDAR
       ========================================================================= */
    renderCalendar(container) {
        const topSection = container.createDiv('cevent-fixed-header');
        const header = topSection.createDiv('cevent-calendar-header cevent-flex-between');
        
        const dateContainer = header.createDiv('cevent-month-year-container');
        dateContainer.createSpan({ text: this.currentMonthObj.format('MMMM YYYY') });
        
        const datePicker = dateContainer.createEl('input', { type: 'month', cls: 'cevent-month-picker' });
        datePicker.value = this.currentMonthObj.format('YYYY-MM');
        datePicker.onchange = (e) => {
            if (e.target.value) {
                this.currentMonthObj = moment(e.target.value, 'YYYY-MM');
                this.render();
            }
        };

        const controls = header.createDiv('cevent-flex-row cevent-calendar-controls');
        
        const iconList = controls.createSpan({ text: '📝 List', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small', title: 'List View' });
        iconList.onclick = () => { this.currentView = 'list'; this.render(); };

        const iconAll = controls.createSpan({ text: '📋 All Tasks', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small', title: 'Timeline View' });
        iconAll.onclick = () => { this.currentView = 'allTasks'; this.render(); };

        const btnToday = controls.createEl('button', { text: 'Today', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        btnToday.onclick = () => {
            this.currentMonthObj = moment();
            this.selectedDateObj = moment();
            this.timeScope = 'Selected Date';
            this.render();
        };

        const iconCalendar = controls.createSpan({ text: '📅', cls: 'cevent-btn-icon', title: 'Select Month', style: 'cursor: pointer;' });
        iconCalendar.onclick = () => datePicker.showPicker && datePicker.showPicker();

        const scrollArea = container.createDiv('cevent-scrollable-body');
        const grid = scrollArea.createDiv('cevent-grid');
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
            dayWrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                dayWrapper.addClass('drag-over');
            });
            dayWrapper.addEventListener('dragleave', () => {
                dayWrapper.removeClass('drag-over');
            });
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
                    const dot = dotContainer.createDiv(ev.icon ? 'cevent-event-icon active' : 'cevent-event-dot active');
                    
                    if (ev.icon) {
                        dot.setText(ev.icon);
                    } else {
                        let dotColor = this.plugin.settings.statusColors.pending;
                        if (ev.status === 'completed') dotColor = this.plugin.settings.statusColors.completed;
                        else if (ev.status === 'closed') dotColor = this.plugin.settings.statusColors.closed;
                        else if (ev.tags && ev.tags.includes('#important')) dotColor = this.plugin.settings.statusColors.important;
                        
                        if (ev.color) dotColor = ev.color;
                        dot.style.background = dotColor;
                    }

                    if (ev.isMultiDay) dot.addClass('is-multi-day');

                    if(!ev.isProjectedRecurring) { 
                        dot.draggable = true;
                        dot.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', ev.id);
                            dot.style.opacity = '0.5';
                        });
                        dot.addEventListener('dragend', () => {
                            dot.style.opacity = '1';
                        });
                    } else {
                        dot.title = "Recurring Event (Cannot drag)";
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
       VIEW 2: LIST VIEW
       ========================================================================= */
    getBaseEvents() {
        if (this.timeScope === 'Upcoming') {
            return this.plugin.eventsArray.filter(e => {
                const eventDate = moment(e.originalStartDate, 'DD-MM-YYYY');
                return eventDate.isValid() && eventDate.isAfter(moment(), 'day');
            });
        } else if (this.timeScope === 'Next Day') {
            const nextStr = moment().add(1, 'days').format('DD-MM-YYYY');
            return this.plugin.eventsByDate[nextStr] || [];
        } else if (this.timeScope === 'Previous Day') {
            const prevStr = moment().subtract(1, 'days').format('DD-MM-YYYY');
            return this.plugin.eventsByDate[prevStr] || [];
        } else {
            return this.plugin.eventsByDate[this.selectedDateObj.format('DD-MM-YYYY')] || [];
        }
    }

    renderListView(container) {
        const topSection = container.createDiv('cevent-fixed-header');
        
        const topbar = topSection.createDiv('cevent-list-topbar cevent-flex-between');
        const dateDisplay = topbar.createDiv('cevent-month-year-container');
        
        let headerText = this.selectedDateObj.isValid() ? this.selectedDateObj.format('MMMM YYYY') : 'Invalid Date';
        if (this.timeScope !== 'Selected Date') headerText = this.timeScope;
        dateDisplay.setText(headerText);
        
        const controls = topbar.createDiv('cevent-calendar-controls cevent-flex-row');

        const btnToday = controls.createEl('button', { text: 'Today', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        btnToday.onclick = () => {
            this.currentMonthObj = moment();
            this.selectedDateObj = moment();
            this.timeScope = 'Selected Date';
            this.render();
        };

        const iconCalendar = controls.createSpan({ text: '📅 Calendar', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        iconCalendar.onclick = () => { this.currentView = 'calendar'; this.render(); };

        const iconAll = controls.createSpan({ text: '📋 All Tasks', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        iconAll.onclick = () => { this.currentView = 'allTasks'; this.render(); };

        const maxDots = parseInt(this.plugin.settings.maxDots) || 4; 

        if (this.timeScope === 'Selected Date') {
            const scroller = topSection.createDiv('cevent-horizontal-scroller');
            for (let i = -3; i <= 3; i++) {
                const scrollDayObj = this.selectedDateObj.clone().add(i, 'days');
                const dayCol = scroller.createDiv('cevent-scroll-day');
                if (i === 0) dayCol.addClass('active');
                
                dayCol.createDiv({ text: scrollDayObj.format('ddd'), cls: 'day-name' });
                dayCol.createDiv({ text: scrollDayObj.format('D'), cls: 'day-num' });
                
                const dateStr = scrollDayObj.format('DD-MM-YYYY');
                const eventsForDay = this.plugin.eventsByDate[dateStr] || [];
                
                if (eventsForDay.length > 0) {
                    const dotContainer = dayCol.createDiv('cevent-dot-container');
                    dotContainer.style.marginTop = '4px';
                    
                    eventsForDay.slice(0, maxDots).forEach(ev => {
                        const dot = dotContainer.createDiv(ev.icon ? 'cevent-event-icon active' : 'cevent-event-dot active');
                        if (ev.icon) {
                            dot.setText(ev.icon);
                        } else {
                            let dotColor = this.plugin.settings.statusColors.pending;
                            if (ev.status === 'completed') dotColor = this.plugin.settings.statusColors.completed;
                            else if (ev.status === 'closed') dotColor = this.plugin.settings.statusColors.closed;
                            else if (ev.tags && ev.tags.includes('#important')) dotColor = this.plugin.settings.statusColors.important;
                            if (ev.color) dotColor = ev.color;
                            dot.style.background = dotColor;
                        }
                    });

                    if (eventsForDay.length > maxDots) {
                       dotContainer.createDiv('cevent-event-dot-more').setText(`+${eventsForDay.length - maxDots}`);
                    }
                }

                dayCol.onclick = () => {
                    this.selectedDateObj = scrollDayObj;
                    this.render();
                };
            }
        }

        const tools = topSection.createDiv('cevent-tools-area');
        const searchInput = tools.createEl('input', { 
            type: 'text', placeholder: '🔍 Search tasks or notes...', cls: 'cevent-search-input cevent-input-w100' 
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
        sortSelect.onchange = (e) => { this.sortMode = e.target.value; this.renderEventList(listContainer); };

        let baseEvents = this.getBaseEvents();
        
        searchInput.oninput = (e) => {
            this.searchQuery = e.target.value;
            this.renderEventList(listContainer);
        };

        const availableTags = new Set();
        baseEvents.forEach(ev => {
            if (ev.tags) ev.tags.split(/\s+/).forEach(t => { if (t.startsWith('#')) availableTags.add(t); });
        });

        if (this.listFilter !== 'all' && this.listFilter !== 'pending' && this.listFilter !== 'completed' && this.listFilter !== 'closed' && !availableTags.has(this.listFilter)) {
            this.listFilter = 'all';
        }

        const tagSelect = controlsRow.createEl('select', { cls: 'cevent-filter-select' });
        ['All', 'Pending', 'Completed', 'Closed'].forEach(opt => tagSelect.createEl('option', { value: opt.toLowerCase(), text: opt }));
        
        if (availableTags.size > 0) {
            const group = tagSelect.createEl('optgroup', { label: 'Active Tags' });
            Array.from(availableTags).sort().forEach(tag => {
                const optEl = group.createEl('option', { value: tag, text: tag });
                if (this.listFilter === tag) optEl.selected = true;
            });
        }
        tagSelect.value = this.listFilter;
        tagSelect.onchange = (e) => { this.listFilter = e.target.value; this.renderEventList(listContainer); };

        const listContainer = container.createDiv('cevent-list-items');
        this.currentBaseEvents = baseEvents;
        this.renderEventList(listContainer);
    }

    /* --- HELPER: FILTER & SORT ENGINE --- */
    filterAndSortEvents(events) {
        let uniqueEvents = Array.from(new Set(events.map(e => e.id)))
            .map(id => events.find(e => e.id === id));

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

    /* =========================================================================
       VIEW 3: ALL TASKS / TIMELINE (UPDATED FOR START TO END DATE SPANNING)
       ========================================================================= */
    renderAllTasksView(container) {
        const topSection = container.createDiv('cevent-fixed-header');
        
        const topbar = topSection.createDiv('cevent-list-topbar cevent-flex-between');
        const dateDisplay = topbar.createDiv('cevent-month-year-container');
        dateDisplay.setText('All Tasks Timeline');
        
        const controls = topbar.createDiv('cevent-calendar-controls cevent-flex-row');
        const iconCalendar = controls.createSpan({ text: '📅 Calendar', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        iconCalendar.onclick = () => { this.currentView = 'calendar'; this.render(); };

        const iconList = controls.createSpan({ text: '📝 List', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small' });
        iconList.onclick = () => { this.currentView = 'list'; this.render(); };

        const tools = topSection.createDiv('cevent-tools-area');
        const searchInput = tools.createEl('input', { 
            type: 'text', placeholder: '🔍 Search across all tasks...', cls: 'cevent-search-input cevent-input-w100' 
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
            const group = tagSelect.createEl('optgroup', { label: 'Active Tags' });
            Array.from(availableTags).sort().forEach(tag => {
                const optEl = group.createEl('option', { value: tag, text: tag });
                if (this.listFilter === tag) optEl.selected = true;
            });
        }
        tagSelect.value = this.listFilter;
        
        const listContainer = container.createDiv('cevent-list-items');
        this.renderAllTasksList(listContainer);

        searchInput.oninput = (e) => { this.searchQuery = e.target.value; this.renderAllTasksList(listContainer); };
        tagSelect.onchange = (e) => { this.listFilter = e.target.value; this.renderAllTasksList(listContainer); };
    }

    async renderAllTasksList(listContainer) {
        listContainer.empty();
        
        // Grab chronological list of mapped index dates
        const sortedDates = Object.keys(this.plugin.eventsByDate).sort((a, b) => {
            const momentA = moment(a, 'DD-MM-YYYY');
            const momentB = moment(b, 'DD-MM-YYYY');
            if (momentA.isValid() && momentB.isValid()) return momentA.diff(momentB);
            if (momentA.isValid()) return -1;
            if (momentB.isValid()) return 1;
            return a.localeCompare(b);
        });

        let totalDaysRendered = 0;

        for (const dateStr of sortedDates) {
            const dayEvents = this.plugin.eventsByDate[dateStr] || [];
            const filteredGroup = this.filterAndSortEvents(dayEvents);

            if (filteredGroup.length === 0) continue;
            totalDaysRendered++;

            const dateHeader = listContainer.createDiv('cevent-date-segment-header');
            const m = moment(dateStr, 'DD-MM-YYYY');
            const titleText = m.isValid() ? m.format('MMMM Do, YYYY [(]dddd[)]') : dateStr;
            dateHeader.setText(titleText);

            const groupContainer = listContainer.createDiv('cevent-date-group-container');
            for (const ev of filteredGroup) {
                await this.createEventCard(groupContainer, ev);
            }
        }

        if (totalDaysRendered === 0) {
            listContainer.createDiv({ text: 'No events found.', cls: 'cevent-empty-state' });
        }
    }

    /* =========================================================================
       HELPER: CARD CREATION ENGINE
       ========================================================================= */
    parseTimeForSort(timeStr) {
        if (!timeStr) return '23:59';
        const match = timeStr.match(/\b((1[0-2]|0?[1-9]):([0-5][0-9])\s*([AaPp][Mm])|([01]?[0-9]|2[0-3]):([0-5][0-9]))\b/);
        if (match) {
            const parsed = moment(match[0], ['hh:mm A', 'HH:mm', 'h:mm A']);
            if (parsed.isValid()) return parsed.format('HH:mm');
        }
        return timeStr; 
    }

    renderTimePills(container, timeStr) {
        if (!timeStr) {
            container.createDiv({ text: 'All Day', cls: 'cevent-time-pill empty' });
            return;
        }
        const timeBlocks = timeStr.split(',').map(t => t.trim()).filter(Boolean);
        timeBlocks.forEach(block => container.createDiv({ text: block, cls: 'cevent-time-pill' }));
    }

    async createEventCard(listContainer, ev) {
        const item = listContainer.createDiv(`cevent-item status-${ev.status}`);
        
        let targetColor = this.plugin.settings.statusColors.pending;
        if (ev.status === 'completed') targetColor = this.plugin.settings.statusColors.completed;
        else if (ev.status === 'closed') targetColor = this.plugin.settings.statusColors.closed;
        else if (ev.tags && ev.tags.includes('#important')) targetColor = this.plugin.settings.statusColors.important;
        if (ev.color) targetColor = ev.color;

        item.style.setProperty('--event-border-color', targetColor);

        const headerRow = item.createDiv('cevent-item-header-row');
        const timeContainer = headerRow.createDiv('cevent-item-time-container');
        this.renderTimePills(timeContainer, ev.time);

        const indicatorContainer = headerRow.createDiv('cevent-item-indicators');
        if (ev.repeat) indicatorContainer.createSpan({text: `🔄 ${ev.repeat}`, cls: 'cevent-micro-badge'});
        if (ev.isMultiDay) indicatorContainer.createSpan({text: `📅 ${ev.originalStartDate} ➞ ${ev.originalEndDate}`, cls: 'cevent-micro-badge highlight'});

        const titleRow = item.createDiv('cevent-item-title-row');
        if (ev.icon) titleRow.createSpan({text: ev.icon, cls: 'cevent-item-icon-lg'});
        
        const titleEl = titleRow.createDiv({ cls: 'cevent-item-title-md' });
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.name, titleEl, ev.file.path, this.plugin);
        } catch (error) {
            titleEl.setText(ev.name);
        }
        
        if (ev.progress && ev.progress.total > 0) {
            const progressWrapper = item.createDiv('cevent-progress-wrapper');
            const percent = Math.round((ev.progress.completed / ev.progress.total) * 100);
            progressWrapper.createDiv('cevent-progress-text').setText(`${ev.progress.completed}/${ev.progress.total} Tasks (${percent}%)`);
            const barBg = progressWrapper.createDiv('cevent-progress-bg');
            const barFill = barBg.createDiv('cevent-progress-fill');
            barFill.style.width = `${percent}%`;
            barFill.style.backgroundColor = targetColor;
        } else {
            const descText = ev.note ? ev.note : "*No description provided.*";
            const descEl = item.createDiv({ cls: 'cevent-item-desc-md' });
            try {
                await MarkdownRenderer.render(this.plugin.app, descText, descEl, ev.file.path, this.plugin);
            } catch (error) {
                 descEl.setText(descText);
            }
        }

        const badgeCls = ev.status === 'pending' ? 'pending' : (ev.status === 'completed' ? 'completed' : 'closed');
        const badge = item.createDiv({ text: ev.status.charAt(0).toUpperCase() + ev.status.slice(1), cls: `cevent-item-badge ${badgeCls}` });
        
        badge.style.backgroundColor = targetColor;
        badge.style.color = '#ffffff';

        item.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (a) {
                e.preventDefault(); e.stopPropagation();
                const href = a.getAttribute('href');
                if (href.startsWith('http://') || href.startsWith('https://')) window.open(href, '_blank');
                else this.plugin.app.workspace.openLinkText(href, ev.file.path, false);
                return;
            }
            this.previousView = this.currentView;
            this.selectedEvent = ev;
            this.currentView = 'event';
            this.render();
        });
    }

    async renderEventList(listContainer) {
        listContainer.empty();
        const events = this.filterAndSortEvents(this.currentBaseEvents);

        if (events.length === 0) {
            listContainer.createDiv({ text: 'No events found for this filter.', cls: 'cevent-empty-state' });
            return;
        }

        for (const ev of events) {
            await this.createEventCard(listContainer, ev);
        }
    }


    /* =========================================================================
       VIEW 4: EVENT INFO (WITH LIVE CHECKBOX UPDATES)
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
        
        const btnOpenMd = topbar.createEl('button', { text: '📄 Open Note', cls: 'cevent-btn-pill cevent-btn-outline cevent-btn-small', title: 'Open the markdown file containing this event' });
        btnOpenMd.onclick = async () => {
            const leaf = this.plugin.app.workspace.getLeaf(false);
            await leaf.openFile(ev.file);
        };
        
        const closeBtn = topbar.createSpan({ text: '✕ Back', cls: 'cevent-btn-icon', style: 'font-size:0.9em; padding: 4px 8px; border-radius: 4px; background: var(--background-modifier-hover); cursor:pointer;' });
        closeBtn.onclick = () => { this.currentView = this.previousView || 'list'; this.render(); };

        const scrollArea = container.createDiv('cevent-scrollable-body cevent-info-wrapper');

        const titleRow = scrollArea.createDiv('cevent-info-title-row');
        if (ev.icon) titleRow.createSpan({text: ev.icon, cls: 'cevent-item-icon-xl'});
        const titleHeader = titleRow.createDiv('cevent-info-title-md');
        
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.name, titleHeader, ev.file.path, this.plugin);
        } catch (e) {
            titleHeader.setText(ev.name);
        }

        titleHeader.addEventListener('click', this.linkInterceptor.bind(this, ev.file.path));

        const grid = scrollArea.createDiv('cevent-info-grid');
        
        const dateStr = ev.isMultiDay ? `${ev.originalStartDate} to ${ev.originalEndDate}` : ev.date;
        grid.createDiv({ cls: 'cevent-info-cell' }).innerHTML = `<strong>Date</strong><br>${dateStr}`;
        
        const timeCell = grid.createDiv({ cls: 'cevent-info-cell' });
        timeCell.innerHTML = `<strong>Time</strong><br>`;
        this.renderTimePills(timeCell.createDiv('cevent-item-time-container'), ev.time);
        
        if (ev.color) {
            const colorCell = grid.createDiv('cevent-info-cell');
            colorCell.innerHTML = `<strong>Theme Color</strong>`;
            const colorDot = colorCell.createDiv('cevent-color-preview');
            colorDot.style.backgroundColor = ev.color;
            colorDot.createSpan({ text: ev.color, cls: 'cevent-color-text' });
        }

        if (ev.repeat) {
            const repeatCell = grid.createDiv('cevent-info-cell');
            repeatCell.innerHTML = `<strong>Recurs</strong><br>🔄 ${ev.repeat}`;
        }

        let progressTextEl = null;
        let progressFillEl = null;

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
            progressFillEl.style.backgroundColor = ev.color || this.plugin.settings.statusColors.pending;
        }

        const descCell = grid.createDiv('cevent-info-cell cevent-info-full');
        descCell.innerHTML = `<strong>Description & Notes</strong>`;
        const descBody = descCell.createDiv('cevent-info-desc-body');
        
        try {
            await MarkdownRenderer.render(this.plugin.app, ev.note || '*No extra description provided.*', descBody, ev.file.path, this.plugin);
        } catch (e) {
            descBody.setText(ev.note || 'No extra description provided.');
        }
        
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
        
        scrollArea.createDiv({ text: 'Event Lifecycle Status', cls: 'cevent-section-title' });
        const statusActions = scrollArea.createDiv('cevent-actions-grid');
        
        const btnOpen = statusActions.createEl('button', { text: '🔄 Pending', cls: `cevent-action-btn btn-open ${ev.status === 'pending' ? 'is-active' : ''}` });
        const btnDone = statusActions.createEl('button', { text: '✅ Done', cls: `cevent-action-btn btn-don ${ev.status === 'completed' ? 'is-active' : ''}` });
        const btnCancel = statusActions.createEl('button', { text: '🚫 Cancel', cls: `cevent-action-btn btn-del ${ev.status === 'closed' ? 'is-active' : ''}` });

        btnOpen.onclick = () => { this.plugin.updateEventStatus(ev, ' '); this.render(); };
        btnDone.onclick = () => { this.plugin.updateEventStatus(ev, 'x'); this.render(); };
        btnCancel.onclick = () => { this.plugin.updateEventStatus(ev, '-'); this.render(); };

        scrollArea.createDiv({ text: 'Contextual Tags', cls: 'cevent-section-title' });
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
            if (href.startsWith('http')) window.open(href, '_blank');
            else this.plugin.app.workspace.openLinkText(href, sourcePath, false);
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
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'CEvent-Planner Advanced Settings'});

        new Setting(containerEl)
            .setName('Default Block View')
            .setDesc('Which view should load first when the code block initializes?')
            .addDropdown(drop => drop
                .addOption('calendar', 'Calendar Grid')
                .addOption('list', 'List / Timeline')
                .addOption('allTasks', 'All Tasks Timeline')
                .setValue(this.plugin.settings.defaultView)
                .onChange(async (value) => {
                    this.plugin.settings.defaultView = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Code Block Height')
            .setDesc('Default CSS height for the inline block dashboard (e.g. 800px).')
            .addText(text => text
                .setPlaceholder('800px')
                .setValue(this.plugin.settings.codeBlockHeight)
                .onChange(async (value) => {
                    this.plugin.settings.codeBlockHeight = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Indicator Dots')
            .setDesc('Maximum number of event dots to show on a calendar day before grouping into a + indicator.')
            .addText(text => text
                .setPlaceholder('4')
                .setValue(String(this.plugin.settings.maxDots))
                .onChange(async (value) => {
                    let parsed = parseInt(value);
                    if (!isNaN(parsed) && parsed > 0) {
                        this.plugin.settings.maxDots = parsed;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Enable Reminders')
            .setDesc('Trigger system popups when the current time matches an event time.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableReminders)
                .onChange(async (value) => {
                    this.plugin.settings.enableReminders = value;
                    await this.plugin.saveSettings();
                    if(value) this.plugin.startReminderService();
                    else this.plugin.stopReminderService();
                }));
    }
}

/* =========================================================================
   5. MAIN PLUGIN CLASS (ENGINE & PARSING)
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

        this.registerMarkdownCodeBlockProcessor("cevent-planner", (source, el, ctx) => {
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
            if(this.settings.enableReminders) this.startReminderService();
        });

        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                if (this.modifyTimeout) clearTimeout(this.modifyTimeout);
                this.modifyTimeout = setTimeout(async () => {
                    await this.scanSingleFile(file);
                    this.rebuildEventIndices();
                    this.refreshAllActiveViews();
                }, 500); 
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
    
    // NEW structural regex block to identify complete events safely regardless of properties order
    get eventBlockRegex() {
        return /^[ \t]*(?:-[ \t]+)?\[([ xX\-])\] ([^\r\n]+)((?:\r?\n[ \t]+-[ \t]+(?:Date|Time|Color|Icon|Repeat|Tag) [^\r\n]*|(?:\r?\n[ \t]*>[ \t]*.*))+)?/gim;
    }

    analyzeProgress(noteText) {
        if (!noteText) return { total: 0, completed: 0 };
        const total = (noteText.match(/- \[[ xX\-]\] /g) || []).length;
        const completed = (noteText.match(/- \[[xX\-]\] /g) || []).length;
        return { total, completed };
    }

    async scanEntireVault() {
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            await this.scanSingleFile(file, false);
        }
        this.rebuildEventIndices();
        this.refreshAllActiveViews();
    }

    // NEW sequence-agnostic syntax parser engine
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
            
            let dateStr = '';
            let timeStr = '';
            let colorStr = '';
            let iconStr = '';
            let repeatStr = '';
            let tagsStr = '';
            let noteLines = [];
            
            const lines = bodyText.split(/\r?\n/);
            lines.forEach(line => {
                const attrMatch = line.match(/^[ \t]+-[ \t]+(Date|Time|Color|Icon|Repeat|Tag)[ \t]+([^\r\n]+)/i);
                if (attrMatch) {
                    const key = attrMatch[1].toLowerCase();
                    const val = attrMatch[2].trim();
                    if (key === 'date') dateStr = val;
                    else if (key === 'time') timeStr = val;
                    else if (key === 'color') colorStr = val;
                    else if (key === 'icon') iconStr = val;
                    else if (key === 'repeat') repeatStr = val;
                    else if (key === 'tag') tagsStr = val;
                } else if (line.trim().startsWith('>')) {
                    const cleanedNoteLine = line.replace(/^[ \t]*>[ \t]?(\[!NOTE\])?/i, '');
                    if (!line.toLowerCase().includes('[!note]')) {
                        noteLines.push(cleanedNoteLine);
                    }
                }
            });

            if (!dateStr) continue; 

            const noteText = noteLines.join('\n').trim();

            const eventObj = {
                id: `${file.path}-${statusChar}-${name}-${dateStr}`,
                file: file,
                originalMatch: match[0],
                statusChar: statusChar, 
                status: status,
                name: name,
                originalDateString: dateStr,
                time: timeStr,
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

        if (fileEvents.length > 0) {
            this.fileCache.set(file.path, fileEvents);
        } else {
            this.fileCache.delete(file.path);
        }

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
                if (baseEv.tags) {
                    baseEv.tags.split(/\s+/).forEach(t => {
                        if (t.startsWith('#')) this.uniqueTags.add(t);
                    });
                }
                
                this.eventsArray.push(baseEv);
                this.mapEventToDates(baseEv, baseEv.originalStartDate, baseEv.originalEndDate);

                if (baseEv.repeat) {
                    this.generateRecurringEvents(baseEv);
                }
            }
        }
    }

    mapEventToDates(event, startDateStr, endDateStr) {
        const start = moment(startDateStr, 'DD-MM-YYYY');
        const end = moment(endDateStr, 'DD-MM-YYYY');
        
        if (!start.isValid() || !end.isValid()) {
            if(!this.eventsByDate[startDateStr]) this.eventsByDate[startDateStr] = [];
            this.eventsByDate[startDateStr].push(event);
            return;
        }

        let curr = start.clone();
        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
            const dStr = curr.format('DD-MM-YYYY');
            if(!this.eventsByDate[dStr]) this.eventsByDate[dStr] = [];
            this.eventsByDate[dStr].push(event);
            curr.add(1, 'days');
        }
    }

    generateRecurringEvents(baseEv) {
        const start = moment(baseEv.originalStartDate, 'DD-MM-YYYY');
        if(!start.isValid()) return;

        let rule = baseEv.repeat.toLowerCase();
        let incrementValue = 1;
        let incrementUnit = null;

        if (rule.includes('daily') || rule.includes('day')) incrementUnit = 'days';
        else if (rule.includes('weekly') || rule.includes('week')) incrementUnit = 'weeks';
        else if (rule.includes('monthly') || rule.includes('month')) incrementUnit = 'months';
        else if (rule.includes('yearly') || rule.includes('year')) incrementUnit = 'years';
        
        if (!incrementUnit) return; 

        const endHorizon = moment().add(this.settings.recurringLimitMonths || 12, 'months');
        let nextDate = start.clone().add(incrementValue, incrementUnit);

        while(nextDate.isBefore(endHorizon)) {
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
            if(!this.eventsByDate[projectedStr]) this.eventsByDate[projectedStr] = [];
            this.eventsByDate[projectedStr].push(projectedEv);

            nextDate.add(incrementValue, incrementUnit);
        }
    }

    refreshAllActiveViews() {
        this.activeAppInstances.forEach(app => {
            if (app.currentView === 'event' && app.selectedEvent) {
                const updatedEvent = this.eventsArray.find(e => e.id === app.selectedEvent.id);
                app.selectedEvent = updatedEvent || null;
                if(!updatedEvent) app.currentView = app.previousView || 'list';
            }
            app.render();
        });
    }

    /* =========================================================================
       FILE MODIFICATION METHODS (LIVE UPDATES)
       ========================================================================= */
    async updateEventDate(eventObj, newDateStr) {
        if (eventObj.isProjectedRecurring) return; 
        const content = await this.app.vault.read(eventObj.file);
        
        const originalDateLine = `- Date ${eventObj.originalDateString}`;
        const newDateLine = `- Date ${newDateStr}`;
        
        const newMatchString = eventObj.originalMatch.replace(originalDateLine, newDateLine);
        await this.app.vault.modify(eventObj.file, content.replace(eventObj.originalMatch, newMatchString));
    }

    async updateEventStatus(eventObj, newStatusChar) {
        if (eventObj.isProjectedRecurring) return; 
        if (eventObj.statusChar === newStatusChar) return;
        const content = await this.app.vault.read(eventObj.file);
        
        const originalStatusTag = `[${eventObj.statusChar}]`;
        const newStatusTag = `[${newStatusChar}]`;
        const newMatchString = eventObj.originalMatch.replace(originalStatusTag, newStatusTag);
        
        const newContent = content.replace(eventObj.originalMatch, newMatchString);
        await this.app.vault.modify(eventObj.file, newContent);
    }

    async appendTagToEvent(eventObj, tagToAdd) {
        if (eventObj.isProjectedRecurring) return;
        if (eventObj.tags && eventObj.tags.includes(tagToAdd)) return;
        const content = await this.app.vault.read(eventObj.file);
        let newMatchString;
        
        if (eventObj.tags) {
            const originalTagLine = `- Tag ${eventObj.tags}`;
            const newTagLine = `- Tag ${eventObj.tags} ${tagToAdd}`;
            newMatchString = eventObj.originalMatch.replace(originalTagLine, newTagLine);
        } else {
            // Safe flexible appending trick
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
        
        const originalTagLine = `- Tag ${eventObj.tags}`;
        const newTags = eventObj.tags.replace(tagToRemove, '').replace(/\s{2,}/g, ' ').trim();
        const newTagLine = newTags ? `- Tag ${newTags}` : ''; 
        
        const newMatchString = eventObj.originalMatch.replace(originalTagLine, newTagLine === '' ? `- Tag ` : newTagLine);
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
       BACKGROUND REMINDER SYSTEM 
       ========================================================================= */
    startReminderService() {
        if(this.reminderInterval) clearInterval(this.reminderInterval);
        
        this.reminderInterval = setInterval(() => {
            const now = moment();
            
            this.eventsArray.forEach(ev => {
                if (ev.status !== 'pending') return;
                if (ev.time && ev.originalStartDate) {
                    const firstTime = ev.time.split(',')[0].trim();
                    const eventMoment = moment(`${ev.originalStartDate} ${firstTime}`, ['DD-MM-YYYY hh:mm A', 'DD-MM-YYYY h:mm A', 'DD-MM-YYYY HH:mm', 'DD-MM-YYYY H:mm']);
                    
                    if (eventMoment.isValid()) {
                        const diffSeconds = now.diff(eventMoment, 'seconds');
                        
                        if (diffSeconds >= 0 && diffSeconds < 60) {
                            const uniqueId = `${ev.id}-${eventMoment.valueOf()}`;
                            if (!this.notifiedEvents.has(uniqueId)) {
                                new ReminderModal(this.app, ev, this).open();
                                new Notice(`⏰ Task Reminder: ${ev.name}\nTime: ${firstTime}`, 10000);
                                this.notifiedEvents.add(uniqueId);
                            }
                        }
                    }
                }
            });
        }, 30000); 
    }

    stopReminderService() {
        if(this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
    }

    /* =========================================================================
       6. CSS INJECTION ENGINE (POLISHED AND SCOPED)
       ========================================================================= */
    injectCSS() {
        if (!document.getElementById('cevent-live-styles')) {
            const style = document.createElement('style');
            style.id = 'cevent-live-styles';
            style.textContent = `
                .cevent-dashboard { padding: 0 !important; overflow: hidden; height: 100%; }
                
                .cevent-app-root { 
                    font-family: var(--font-interface); background-color: var(--background-primary);
                    width: 100%; display: flex; flex-direction: column; overflow: hidden; height: 100%;
                }
                
                .cevent-app-root.context-codeblock { 
                    border: 1px solid var(--background-modifier-border); 
                    border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
                    margin: 1.5em 0; background: var(--background-secondary-alt);
                }

                .cevent-dashboard-wrapper { 
                    display: flex; flex-direction: column; height: 100%; overflow: hidden; padding: 12px; min-height: 100%;
                }

                .cevent-fixed-header { flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; }
                .cevent-scrollable-body { flex-grow: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; }
                
                .cevent-list-items { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-top: 8px; padding-right: 6px; padding-bottom: 24px; }

                .cevent-list-items::-webkit-scrollbar, .cevent-scrollable-body::-webkit-scrollbar { width: 6px; }
                .cevent-list-items::-webkit-scrollbar-thumb, .cevent-scrollable-body::-webkit-scrollbar-thumb { background: var(--background-modifier-border); border-radius: 10px; }
                .cevent-list-items::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

                .cevent-flex-between { display: flex; justify-content: space-between; align-items: center; }
                .cevent-flex-row { display: flex; gap: 8px; align-items: center; }
                .cevent-month-year-container { font-weight: bold; font-size: 1.2em; color: var(--text-normal); position: relative; }
                
                .cevent-btn-pill { background: var(--interactive-normal); color: var(--text-normal); border: 1px solid var(--background-modifier-border); border-radius: 24px; padding: 4px 12px; font-size: 0.85em; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .cevent-btn-pill:hover { background: var(--interactive-hover); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
                .cevent-btn-small { font-size: 0.75em; padding: 3px 10px; }
                
                .cevent-month-picker { position: absolute; opacity: 0; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }

                .cevent-micro-badge { font-size: 0.7em; background: var(--background-modifier-border); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); font-weight: 600;}
                .cevent-micro-badge.highlight { background: rgba(var(--interactive-accent-rgb), 0.15); color: var(--interactive-accent); border: 1px solid rgba(var(--interactive-accent-rgb), 0.3);}

                .cevent-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 10px; padding-bottom: 20px;}
                .cevent-day-header { text-align: center; font-size: 0.75em; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
                .cevent-day-wrapper { display: flex; flex-direction: column; align-items: center; gap: 2px; border-radius: 8px; padding-bottom: 4px; transition: background 0.2s;}
                
                .cevent-day-wrapper.drag-over { background: rgba(var(--interactive-accent-rgb), 0.15); box-shadow: inset 0 0 0 2px var(--interactive-accent); }

                .cevent-week-number { font-size: 0.6em; color: var(--text-faint); height: 12px; }
                .cevent-day { width: 34px; height: 34px; display: flex; justify-content: center; align-items: center; border-radius: 50%; font-size: 0.9em; cursor: pointer; background: var(--background-secondary); border: 1px solid transparent; transition: all 0.2s; position: relative;}
                .cevent-day:hover { border-color: var(--interactive-accent); transform: scale(1.05); }
                .cevent-day.faint { color: var(--text-faint); opacity: 0.6; }
                .cevent-day.is-today { font-weight: bold; background: rgba(var(--interactive-accent-rgb), 0.1); border-color: var(--interactive-accent); color: var(--interactive-accent); }
                .cevent-day.selected { background: var(--interactive-accent); color: white; font-weight: bold; box-shadow: 0 4px 10px rgba(var(--interactive-accent-rgb), 0.4); }
                
                .cevent-dot-container { display: flex; gap: 2px; height: 14px; align-items: center; justify-content: center; width: 100%; margin-top: 2px;}
                .cevent-event-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; cursor: grab;}
                .cevent-event-dot:active { cursor: grabbing; }
                .cevent-event-dot.is-multi-day { width: 12px; border-radius: 4px; }
                
                .cevent-event-icon { font-size: 10px; line-height: 1; cursor: grab; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                .cevent-event-icon:active { cursor: grabbing; }

                .cevent-event-dot-more { font-size: 9px; color: var(--text-muted); line-height: 1; font-weight: bold; padding-left: 2px;}

                .cevent-horizontal-scroller { display: flex; gap: 8px; overflow-x: auto; padding: 6px 4px; scroll-snap-type: x mandatory; }
                .cevent-horizontal-scroller::-webkit-scrollbar { height: 4px; }
                .cevent-scroll-day { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex-shrink: 0; min-width: 50px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: 8px; text-align: center; cursor: pointer; transition: 0.2s; scroll-snap-align: center; }
                .cevent-scroll-day:hover { border-color: var(--interactive-accent); }
                .cevent-scroll-day.active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
                .cevent-scroll-day .day-name { font-size: 0.7em; text-transform: uppercase; font-weight: 600; opacity: 0.8; }
                .cevent-scroll-day .day-num { font-size: 1.1em; font-weight: bold; margin-top: 2px; }

                .cevent-controls-row { display: flex; gap: 8px; flex-wrap: wrap; }
                .cevent-filter-select, .cevent-search-input { flex: 1; min-width: 110px; background: var(--background-modifier-form-field); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; color: var(--text-normal); font-size: 0.85em; transition: all 0.2s ease; outline: none; }
                .cevent-search-input { width: 100%; cursor: text; }
                .cevent-filter-select:hover, .cevent-search-input:focus { border-color: var(--interactive-accent); box-shadow: 0 0 0 1px var(--interactive-accent-hover); }

                .cevent-date-segment-header { font-weight: 700; padding: 12px 0 6px 0; border-bottom: 2px solid var(--background-modifier-border); color: var(--text-accent); font-size: 1.05em; margin-top: 10px; position: sticky; top: -1px; background: var(--background-primary); z-index: 10; }
                .context-codeblock .cevent-date-segment-header { background: var(--background-secondary-alt); }
                .cevent-date-group-container { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; margin-bottom: 16px;}

                .cevent-item { 
                    background: color-mix(in srgb, var(--event-border-color) 12%, var(--background-secondary));
                    border-radius: 12px; 
                    padding: 14px; 
                    position: relative; 
                    border-left: 4px solid var(--event-border-color); 
                    cursor: pointer; 
                    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s; 
                }
                .cevent-item:hover { 
                    transform: translateY(-2px); 
                    box-shadow: 0 6px 14px rgba(0,0,0,0.12); 
                    filter: brightness(1.05); 
                }
                .cevent-item.status-completed { opacity: 0.85; }
                .cevent-item.status-closed { opacity: 0.65; filter: grayscale(50%); }

                .cevent-item-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;}
                .cevent-item-time-container { display: flex; flex-wrap: wrap; gap: 6px; }
                .cevent-item-indicators { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;}

                .cevent-time-pill { font-size: 0.75em; font-weight: 600; padding: 3px 8px; background: rgba(var(--text-muted-rgb), 0.1); color: var(--text-muted); border-radius: 12px; letter-spacing: 0.3px; border: 1px solid var(--background-modifier-border); }
                .cevent-time-pill.empty { background: transparent; border-style: dashed; }

                .cevent-item-title-row { display: flex; align-items: center; gap: 8px; }
                .cevent-item-icon-lg { font-size: 1.3em; line-height: 1; }
                
                .cevent-item-title-md p, .cevent-info-title-md p { margin: 0; font-weight: 600; color: var(--text-normal); font-size: 1.05em; line-height: 1.3; }
                .cevent-item-desc-md p { margin: 6px 0 0 0; font-size: 0.85em; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                .cevent-item-title-md a, .cevent-item-desc-md a, .cevent-info-desc-body a { color: var(--text-accent); text-decoration: none; font-weight: 500; cursor: pointer;}
                .cevent-item-title-md a:hover, .cevent-item-desc-md a:hover, .cevent-info-desc-body a:hover { text-decoration: underline; }

                .cevent-progress-wrapper { margin-top: 10px; width: 100%;}
                .cevent-progress-text { font-size: 0.75em; color: var(--text-muted); margin-bottom: 4px; font-weight: bold; text-align: right;}
                .cevent-progress-bg { width: 100%; height: 6px; background: var(--background-modifier-border); border-radius: 4px; overflow: hidden; }
                .cevent-progress-fill { height: 100%; transition: width 0.3s ease; }

                .cevent-item-badge { 
                    position: absolute; top: -8px; right: -8px; 
                    font-size: 0.65em; padding: 4px 8px; border-radius: 12px; 
                    font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3); border: 2px solid var(--background-secondary);
                }

                .cevent-info-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px;}
                .cevent-item-icon-xl { font-size: 2em; line-height: 1; }   

                .cevent-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
                .cevent-info-cell { background: var(--background-secondary); padding: 12px; border-radius: 8px; font-size: 0.9em; border: 1px solid var(--background-modifier-border);}
                .cevent-info-full { grid-column: span 2; }
                
                .cevent-color-preview { display: inline-flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 4px; margin-top: 6px; font-weight:bold; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);}
                
                .cevent-section-title { font-size: 0.8em; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-top: 20px; margin-bottom: 10px; letter-spacing: 1px; }
                .cevent-actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
                
                .cevent-action-btn { padding: 8px; border-radius: 6px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); cursor: pointer; font-weight: 500; transition: all 0.2s; font-size: 0.85em; }
                .cevent-action-btn:hover { background: var(--background-modifier-hover); box-shadow: 0 2px 4px rgba(0,0,0,0.05);}
                
                .btn-open.is-active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
                .btn-don.is-active { background: var(--text-success); color: white; border-color: var(--text-success); }
                .btn-del.is-active { background: var(--text-error); color: white; border-color: var(--text-error); }
                .btn-tag.is-active { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }

                .cevent-empty-state { text-align: center; padding: 40px 20px; color: var(--text-faint); font-style: italic; background: var(--background-secondary); border-radius: 8px; border: 1px dashed var(--background-modifier-border); }
                
                .cevent-info-desc-body input[type="checkbox"] { cursor: pointer; transform: scale(1.1); margin-right: 8px;}
            `;
            document.head.appendChild(style);
        }
    }
}

module.exports = CEventPlannerPlugin;