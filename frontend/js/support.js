document.addEventListener('DOMContentLoaded', () => {
    const annList = document.querySelector('.announcement-list');
    const faqList = document.querySelector('.faq-container');
  
    // Load announcements from /api/support/announcements
    async function loadAnnouncements() {
      try {
        const res = await fetch('/api/support/announcements');
        if (!res.ok) throw new Error();
        const rows = await res.json();
        annList.innerHTML = ''; // clear
        rows.forEach(a => {
          const div = document.createElement('div');
          div.className = 'announcement-item';
          div.innerHTML = `<i class="fas fa-bullhorn"></i> ${a.text}`;
          annList.appendChild(div);
        });
      } catch {
        annList.innerHTML = '<div class="announcement-item">Failed to load announcements</div>';
      }
    }
  
    // Load FAQs from /api/support/faqs
    async function loadFaqs() {
      try {
        const res = await fetch('/api/support/faqs');
        if (!res.ok) throw new Error();
        const rows = await res.json();
        faqList.innerHTML = ''; // clear
        rows.forEach(f => {
          const card = document.createElement('div');
          card.className = 'faq-card';
          card.innerHTML = `
            <i class="fas fa-question-circle icon"></i>
            <div class="faq-content">
              <h4>${f.question}</h4>
              <blockquote>${f.answer}</blockquote>
            </div>`;
          faqList.appendChild(card);
        });
      } catch {
        faqList.innerHTML = '<div class="faq-card">Failed to load FAQs</div>';
      }
    }
  
    loadAnnouncements();
    loadFaqs();
  
    // — your existing live-chat code below (unchanged) —
  
    const chatIcon      = document.getElementById('live-chat');
    const chatContainer = document.getElementById('chat-container');
    const chatClose     = document.getElementById('chat-close');
    const chatBody      = document.getElementById('chat-body');
    const chatInput     = document.getElementById('chat-input-field');
    const chatSend      = document.getElementById('chat-send');
  
    chatIcon.addEventListener('click', () => {
      chatContainer.classList.remove('hidden');
      chatInput.focus();
    });
    chatClose.addEventListener('click', () => {
      chatContainer.classList.add('hidden');
    });
  
    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'typing';
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typing.appendChild(dot);
      }
      chatBody.appendChild(typing);
      chatBody.scrollTop = chatBody.scrollHeight;
      return typing;
    }
  
    function appendMessage(type, text) {
      const msg = document.createElement('div');
      msg.className = `message ${type}`;
      const icon = document.createElement('i');
      icon.className = type === 'agent' ? 'fas fa-robot' : 'fas fa-user';
      msg.appendChild(icon);
      msg.appendChild(document.createTextNode(' ' + text));
      chatBody.appendChild(msg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  
    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      appendMessage('user', text);
      chatInput.value = '';
  
      // typing indicator
      const typingElem = showTyping();
      setTimeout(() => {
        typingElem.remove();
        appendMessage('agent', 'Thank you – we’ll get back to you shortly.');
      }, 1000);
    }
  
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendMessage();
    });
  });
  