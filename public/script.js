document.addEventListener('DOMContentLoaded', function() {
    // Configurações
    const { jsPDF } = window.jspdf;
    const API_URL = '/api/events';
    const API_HEADERS = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${'uu1gu%#2le!^-fb!8gv*=h_oyu11e+@r0w74n6h)crxm^(dtd+p'}` // Substitua pela mesma chave do .env
    };
  
    // Elementos DOM
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const addEventButton = document.getElementById('add-event');
    const generatePdfButton = document.getElementById('generate-pdf');
    const eventsContainer = document.getElementById('events-container');
    
    // Elementos do formulário
    const eventDateInput = document.getElementById('event-date');
    const eventTitleInput = document.getElementById('event-title');
    const eventDescriptionInput = document.getElementById('event-description');
    const eventTypeInput = document.getElementById('event-type');
    
    // Estado da aplicação
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // Inicialização
    initCalendar();
    loadEvents();
    
    // Event Listeners
    prevMonthButton.addEventListener('click', showPreviousMonth);
    nextMonthButton.addEventListener('click', showNextMonth);
    addEventButton.addEventListener('click', addNewEvent);
    generatePdfButton.addEventListener('click', generatePdf);
    
    // Funções do calendário
    function initCalendar() {
      updateMonthDisplay();
      renderCalendar();
      // Configurar data atual no formulário
      const today = new Date();
      eventDateInput.value = formatDate(today);
    }
    
    function updateMonthDisplay() {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    function renderCalendar() {
      calendarGrid.innerHTML = '';
      
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startingDay = firstDay.getDay();
      const daysInMonth = lastDay.getDate();
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      
      // Calcular total de células necessárias (sempre múltiplo de 7)
      const totalCells = Math.ceil((daysInMonth + startingDay) / 7) * 7;
      
      let dayCounter = 1;
      let nextMonthDayCounter = 1;
      
      for (let i = 0; i < totalCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (i < startingDay) {
          // Dias do mês anterior
          const prevMonthDay = prevMonthLastDay - (startingDay - i - 1);
          dayElement.innerHTML = `<div class="day-number other-month">${prevMonthDay}</div>`;
          dayElement.classList.add('other-month');
        } else if (dayCounter <= daysInMonth) {
          // Dias do mês atual
          dayElement.innerHTML = `<div class="day-number">${dayCounter}</div>`;
          
          // Adicionar atributo de data para referência
          const dateStr = formatDate(new Date(currentYear, currentMonth, dayCounter));
          dayElement.dataset.date = dateStr;
          
          dayCounter++;
        } else {
          // Dias do próximo mês
          dayElement.innerHTML = `<div class="day-number other-month">${nextMonthDayCounter}</div>`;
          dayElement.classList.add('other-month');
          nextMonthDayCounter++;
        }
        
        calendarGrid.appendChild(dayElement);
      }
    }
    
    function showPreviousMonth() {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      updateMonthDisplay();
      renderCalendar();
      loadEvents();
    }
    
    function showNextMonth() {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      updateMonthDisplay();
      renderCalendar();
      loadEvents();
    }
    
    // Funções de eventos
    async function loadEvents() {
      try {
        eventsContainer.innerHTML = '<p class="loading">Carregando eventos...</p>';
        
        const response = await fetch(`${API_URL}?month=${currentMonth + 1}&year=${currentYear}`, {
          headers: API_HEADERS
        });
        
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const events = await response.json();
        displayEvents(events);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        eventsContainer.innerHTML = `<p class="error">Erro ao carregar eventos: ${error.message}</p>`;
      }
    }
    
    function displayEvents(events) {
      // Limpar indicadores de eventos existentes
      document.querySelectorAll('.event-indicator').forEach(el => el.remove());
      
      // Agrupar eventos por data
      const eventsByDate = {};
      events.forEach(event => {
        if (!eventsByDate[event.date]) {
          eventsByDate[event.date] = [];
        }
        eventsByDate[event.date].push(event);
      });
      
      // Adicionar indicadores ao calendário
      document.querySelectorAll('.calendar-day:not(.other-month)').forEach(dayElement => {
        const date = dayElement.dataset.date;
        if (eventsByDate[date]) {
          const eventTypes = {
            task: 0,
            visit: 0,
            inspection: 0
          };
          
          eventsByDate[date].forEach(event => {
            eventTypes[event.type]++;
          });
          
          let indicatorsHtml = '<div class="event-indicator">';
          
          if (eventTypes.task > 0) {
            indicatorsHtml += `<span class="event-dot task-dot" title="${eventTypes.task} afazer(s)"></span>`;
          }
          if (eventTypes.visit > 0) {
            indicatorsHtml += `<span class="event-dot visit-dot" title="${eventTypes.visit} visita(s)"></span>`;
          }
          if (eventTypes.inspection > 0) {
            indicatorsHtml += `<span class="event-dot inspection-dot" title="${eventTypes.inspection} vistoria(s)"></span>`;
          }
          
          indicatorsHtml += '</div>';
          dayElement.innerHTML += indicatorsHtml;
        }
      });
      
      // Exibir lista de eventos
      displayEventsList(events);
    }
    
    function displayEventsList(events) {
      if (events.length === 0) {
        eventsContainer.innerHTML = '<p>Nenhum evento agendado para este mês.</p>';
        return;
      }
      
      // Ordenar eventos por data
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      eventsContainer.innerHTML = '';
      
      events.forEach(event => {
        const eventCard = document.createElement('div');
        let typeClass = '';
        let typeText = '';
        let icon = '';
        
        switch (event.type) {
          case 'task':
            typeClass = 'task-card';
            typeText = 'Afazer';
            icon = '<i class="fas fa-tasks"></i>';
            break;
          case 'visit':
            typeClass = 'visit-card';
            typeText = 'Visita';
            icon = '<i class="fas fa-building"></i>';
            break;
          case 'inspection':
            typeClass = 'inspection-card';
            typeText = 'Vistoria';
            icon = '<i class="fas fa-hard-hat"></i>';
            break;
        }
        
        eventCard.className = `event-card ${typeClass}`;
        eventCard.dataset.id = event._id;
        
        const dateObj = new Date(event.date);
        const formattedDate = dateObj.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });
        
        eventCard.innerHTML = `
          <button class="delete-event" data-id="${event._id}" title="Excluir evento">
            <i class="fas fa-times"></i>
          </button>
          <span class="event-date">${formattedDate}</span>
          <span class="event-type ${event.type}-type">${icon} ${typeText}</span>
          <h4>${event.title}</h4>
          <p>${event.description || 'Sem descrição'}</p>
        `;
        
        eventsContainer.appendChild(eventCard);
      });
      
      // Adicionar listeners para botões de exclusão
      document.querySelectorAll('.delete-event').forEach(button => {
        button.addEventListener('click', function() {
          if (confirm('Tem certeza que deseja excluir este evento?')) {
            deleteEvent(this.dataset.id);
          }
        });
      });
    }
    
    async function addNewEvent() {
      const title = eventTitleInput.value.trim();
      const description = eventDescriptionInput.value.trim();
      const date = eventDateInput.value;
      const type = eventTypeInput.value;
      
      if (!title || !date) {
        alert('Por favor, preencha pelo menos o título e a data do evento.');
        return;
      }
      
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({
            date,
            title,
            description,
            type
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao adicionar evento');
        }
        
        const newEvent = await response.json();
        
        // Limpar formulário
        eventTitleInput.value = '';
        eventDescriptionInput.value = '';
        eventDateInput.value = formatDate(new Date());
        
        // Recarregar eventos
        loadEvents();
        
        // Feedback visual
        addEventButton.innerHTML = '<i class="fas fa-check"></i> Evento Adicionado!';
        setTimeout(() => {
          addEventButton.innerHTML = '<i class="fas fa-save"></i> Salvar Evento';
        }, 2000);
        
      } catch (error) {
        console.error('Erro ao adicionar evento:', error);
        alert(`Erro ao adicionar evento: ${error.message}`);
      }
    }
    
    async function deleteEvent(eventId) {
      try {
        const response = await fetch(`${API_URL}/${eventId}`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao excluir evento');
        }
        
        // Recarregar eventos
        loadEvents();
        
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert(`Erro ao excluir evento: ${error.message}`);
      }
    }
    
    function generatePdf() {
      const doc = new jsPDF();
      
      // Configurações do PDF
      doc.setProperties({
        title: `Agenda do Vereador - ${currentMonthElement.textContent}`,
        subject: 'Agenda Mensal',
        author: 'Sistema de Agenda',
        keywords: 'agenda, vereador, eventos',
        creator: 'Sistema de Agenda para Vereador'
      });
      
      // Título
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(`Agenda do Vereador`, 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(currentMonthElement.textContent, 105, 28, { align: 'center' });
      
      // Data de geração
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 35, { align: 'center' });
      
      // Eventos
      doc.setFontSize(12);
      doc.setTextColor(40);
      
      let y = 45;
      const eventCards = document.querySelectorAll('.event-card');
      
      if (eventCards.length === 0) {
        doc.text('Nenhum evento agendado para este mês.', 20, y);
      } else {
        doc.setFont(undefined, 'bold');
        doc.text('Eventos Agendados:', 20, y);
        y += 8;
        
        eventCards.forEach((card, index) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          
          const date = card.querySelector('.event-date').textContent;
          const type = card.querySelector('.event-type').textContent.replace(/[^a-zA-Z]/g, '');
          const title = card.querySelector('h4').textContent;
          const description = card.querySelector('p').textContent;
          
          // Tipo do evento
          doc.setFont(undefined, 'bold');
          doc.setTextColor(40);
          doc.text(`${index + 1}. ${type}: ${title}`, 20, y);
          y += 7;
          
          // Data
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100);
          doc.text(`Data: ${date}`, 20, y);
          y += 7;
          
          // Descrição
          if (description && description !== 'Sem descrição') {
            const splitDesc = doc.splitTextToSize(description, 170);
            doc.text('Descrição:', 20, y);
            y += 7;
            doc.text(splitDesc, 25, y);
            y += 7 * splitDesc.length;
          }
          
          y += 5;
        });
      }
      
      // Salvar PDF
      doc.save(`agenda_vereador_${currentMonth + 1}_${currentYear}.pdf`);
    }
    
    // Funções auxiliares
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  });
