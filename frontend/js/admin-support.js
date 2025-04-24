document.addEventListener('DOMContentLoaded', () => {
    const annList    = document.getElementById('announcement-list');
    const addAnnForm = document.getElementById('add-ann-form');
    const addAnnText = document.getElementById('add-ann-text');
  
    const faqList    = document.getElementById('faq-container');
    const addFaqForm = document.getElementById('add-faq-form');
    const addFaqQ    = document.getElementById('add-faq-q');
    const addFaqA    = document.getElementById('add-faq-a');
  
    // Load and render announcements
    async function loadAnnouncements() {
      try {
        const res  = await fetch('/api/admin/support/announcements');
        const data = await res.json();
        annList.innerHTML = data.map(a => `
          <div class="announcement-item admin-item" data-id="${a.id}">
            <i class="fas fa-bullhorn"></i>
            <span class="text">${a.text}</span>
            <div class="admin-controls">
              <i class="fas fa-edit edit-ann" title="Edit"></i>
              <i class="fas fa-trash delete-ann" title="Delete"></i>
            </div>
          </div>`).join('');
        attachAnnEvents();
      } catch {
        annList.textContent = 'Failed to load announcements';
      }
    }
  
    // Load and render FAQs
    async function loadFaqs() {
      try {
        const res  = await fetch('/api/admin/support/faqs');
        const data = await res.json();
        faqList.innerHTML = data.map(f => `
          <div class="faq-card admin-item" data-id="${f.id}">
            <i class="fas fa-question-circle icon"></i>
            <div class="faq-content">
              <h4 class="question">${f.question}</h4>
              <blockquote class="answer">${f.answer}</blockquote>
            </div>
            <div class="admin-controls">
              <i class="fas fa-edit edit-faq" title="Edit"></i>
              <i class="fas fa-trash delete-faq" title="Delete"></i>
            </div>
          </div>`).join('');
        attachFaqEvents();
      } catch {
        faqList.textContent = 'Failed to load FAQs';
      }
    }
  
    // Add delete & edit handlers for announcements
    function attachAnnEvents() {
      document.querySelectorAll('.delete-ann').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.closest('.admin-item').dataset.id;
          await fetch(`/api/admin/support/announcements/${id}`, { method: 'DELETE' });
          loadAnnouncements();
        };
      });
      document.querySelectorAll('.edit-ann').forEach(btn => {
        btn.onclick = () => {
          const item = btn.closest('.admin-item');
          const textEl = item.querySelector('.text');
          const orig = textEl.textContent;
          const input = document.createElement('input');
          input.value = orig;
          input.className = 'edit-input';
          item.insertBefore(input, textEl);
          textEl.style.display = 'none';
          btn.style.display = 'none';
  
          const save = document.createElement('i');
          save.className = 'fas fa-check save-ann';
          save.title = 'Save';
          const cancel = document.createElement('i');
          cancel.className = 'fas fa-times cancel-ann';
          cancel.title = 'Cancel';
          item.querySelector('.admin-controls').prepend(cancel, save);
  
          save.onclick = async () => {
            const newText = input.value.trim();
            if (!newText) return;
            await fetch(`/api/admin/support/announcements/${item.dataset.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ text: newText })
            });
            loadAnnouncements();
          };
          cancel.onclick = () => loadAnnouncements();
        };
      });
    }
  
    // Add delete & edit handlers for FAQs
    function attachFaqEvents() {
      document.querySelectorAll('.delete-faq').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.closest('.admin-item').dataset.id;
          await fetch(`/api/admin/support/faqs/${id}`, { method: 'DELETE' });
          loadFaqs();
        };
      });
      document.querySelectorAll('.edit-faq').forEach(btn => {
        btn.onclick = () => {
          const item = btn.closest('.admin-item');
          const qEl = item.querySelector('.question');
          const aEl = item.querySelector('.answer');
          const origQ = qEl.textContent;
          const origA = aEl.textContent;
  
          const qInput = document.createElement('input');
          qInput.value = origQ;
          qInput.className = 'edit-input';
          const aInput = document.createElement('input');
          aInput.value = origA;
          aInput.className = 'edit-input';
  
          const fc = item.querySelector('.faq-content');
          fc.prepend(aInput, qInput);
          qEl.style.display = aEl.style.display = 'none';
          btn.style.display = 'none';
  
          const save = document.createElement('i');
          save.className = 'fas fa-check save-faq';
          save.title = 'Save';
          const cancel = document.createElement('i');
          cancel.className = 'fas fa-times cancel-faq';
          cancel.title = 'Cancel';
          item.querySelector('.admin-controls').prepend(cancel, save);
  
          save.onclick = async () => {
            const newQ = qInput.value.trim();
            const newA = aInput.value.trim();
            if (!newQ || !newA) return;
            await fetch(`/api/admin/support/faqs/${item.dataset.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ question: newQ, answer: newA })
            });
            loadFaqs();
          };
          cancel.onclick = () => loadFaqs();
        };
      });
    }
  
    // Form submissions
    addAnnForm.onsubmit = async e => {
      e.preventDefault();
      await fetch('/api/admin/support/announcements', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ text: addAnnText.value.trim() })
      });
      addAnnText.value = '';
      loadAnnouncements();
    };
    addFaqForm.onsubmit = async e => {
      e.preventDefault();
      await fetch('/api/admin/support/faqs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          question: addFaqQ.value.trim(),
          answer: addFaqA.value.trim()
        })
      });
      addFaqQ.value = '';
      addFaqA.value = '';
      loadFaqs();
    };
  
    loadAnnouncements();
    loadFaqs();
  });
  