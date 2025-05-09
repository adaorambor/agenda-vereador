document.addEventListener('DOMContentLoaded', () => {
  // Configurações
  const { jsPDF } = window.jspdf;
  const API_URL = '/api/events';
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  // Elementos DOM
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYearHeader = document.getElementById('month-year');
  const eventsContainer = document.getElementById('events-container');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const generatePdfBtn = document.getElementById('generate-pdf');
  const eventForm = document.getElementById('event-form');

  // Inicialização
  initCalendar();
  loadEvents();

  // ------------ CALENDÁRIO ------------
  function initCalendar() {
    renderCalendar();
    document.getElementById('event-date').valueAsDate = new Date();
  }

  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // Atualiza cabeçalho
    monthYearHeader.textContent = 
      `${firstDay.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

    calendarGrid.innerHTML = '';

    // Dias do mês anterior
    for (let i = startDay - 1; i >= 0; i--) {
      const dayEl = createDayElement(prevMonthDays - i);
      dayEl.classList.add('other-month');
      calendarGrid.appendChild(dayEl);
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEl = createDayElement(day, dateStr);
      calendarGrid.appendChild(dayEl);
    }

    // Dias do próximo mês (para completar grid)
    const totalCells = Math.ceil((daysInMonth + startDay) / 7) * 7;
    const remainingDays = totalCells - (daysInMonth + startDay);
    
    for (let day = 1; day <= remainingDays; day++) {
      const dayEl = createDayElement(day);
      dayEl.classList.add('other-month');
      calendarGrid.appendChild(dayEl);
    }
  }

  function createDayElement(day, dateStr = '') {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    if (day) {
      dayEl.innerHTML = `
        <div class="day-number">${day}</div>
      `;
      if (dateStr) dayEl.dataset.date = dateStr;
    }
    
    return dayEl;
  }

  // ------------ EVENTOS ------------
  async function loadEvents() {
    try {
      eventsContainer.innerHTML = '<p class="loading">Carregando eventos...</p>';
      
      const response = await fetch(
        `${API_URL}?month=${currentMonth + 1}&year=${currentYear}`
      );
      
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      
      const events = await response.json();
      renderEvents(events);
      highlightEventDays(events);
    } catch (error) {
      console.error("Erro:", error);
      eventsContainer.innerHTML = `<p class="error">${error.message}</p>`;
    }
  }

  function renderEvents(events) {
    if (events.length === 0) {
      eventsContainer.innerHTML = '<p>Nenhum evento agendado este mês</p>';
      return;
    }

    eventsContainer.innerHTML = events.map(event => `
      <div class="event-card ${event.type}-card" data-id="${event._id}">
        <button class="delete-event" onclick="deleteEvent('${event._id}')">
          <i class="fas fa-trash"></i>
        </button>
        <h4>${event.title}</h4>
        <span class="event-date">${formatDisplayDate(event.date)}</span>
        <span class="event-type ${event.type}-type">
          ${getTypeIcon(event.type)} ${getTypeName(event.type)}
        </span>
        <p>${event.description || ''}</p>
      </div>
    `).join('');
  }

  function highlightEventDays(events) {
    const eventTypesByDate = {};
    
    events.forEach(event => {
      if (!eventTypesByDate[event.date]) {
        eventTypesByDate[event.date] = new Set();
      }
      eventTypesByDate[event.date].add(event.type);
    });

    document.querySelectorAll('.calendar-day').forEach(day => {
      if (day.dataset.date && eventTypesByDate[day.dataset.date]) {
        day.classList.add('has-event');
        
        const marker = document.createElement('div');
        marker.className = 'event-marker';
        
        eventTypesByDate[day.dataset.date].forEach(type => {
          const dot = document.createElement('span');
          dot.className = `event-dot ${type}-dot`;
          marker.appendChild(dot);
        });
        
        day.appendChild(marker);
      }
    });
  }

  function formatDisplayDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function getTypeIcon(type) {
    const icons = {
      task: '<i class="fas fa-tasks"></i>',
      visit: '<i class="fas fa-building"></i>',
      inspection: '<i class="fas fa-hard-hat"></i>'
    };
    return icons[type] || '';
  }

  function getTypeName(type) {
    const names = {
      task: 'Afazer',
      visit: 'Visita',
      inspection: 'Vistoria'
    };
    return names[type] || '';
  }

  // ------------ EXCLUSÃO ------------
  window.deleteEvent = async function(eventId) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    try {
      const response = await fetch(`${API_URL}/${eventId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Falha ao excluir');
      loadEvents();
    } catch (error) {
      console.error("Erro:", error);
      alert(error.message);
    }
  };

  // ------------ FORMULÁRIO ------------
  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dateInput = document.getElementById('event-date');
    const dateObj = new Date(dateInput.value);
    const dateStr = dateObj.toISOString().split('T')[0];

    const eventData = {
      date: dateStr,
      title: document.getElementById('event-title').value.trim(),
      description: document.getElementById('event-description').value.trim(),
      type: document.getElementById('event-type').value
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) throw new Error('Falha ao salvar');
      
      eventForm.reset();
      loadEvents();
    } catch (error) {
      console.error("Erro:", error);
      alert(error.message);
    }
  });

  // ------------ PDF ------------
  generatePdfBtn.addEventListener('click', generatePdf);

  function generatePdf() {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text(`Agenda do Vereador - ${monthYearHeader.textContent}`, 105, 20, { align: 'center' });
    
    // Eventos
    doc.setFontSize(12);
    let y = 40;
    
    document.querySelectorAll('.event-card').forEach(event => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      const title = event.querySelector('h4').textContent;
      const date = event.querySelector('.event-date').textContent;
      const type = event.querySelector('.event-type').textContent;
      
      doc.text(`${date} - ${type}`, 20, y);
      doc.text(title, 25, y + 7);
      y += 15;
    });
    
    doc.save(`agenda-${currentMonth+1}-${currentYear}.pdf`);
  }

  // ------------ NAVEGAÇÃO ------------
  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateView();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateView();
  });

  function updateView() {
    renderCalendar();
    loadEvents();
  }
});
