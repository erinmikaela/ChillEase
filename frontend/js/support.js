// js/support.js
document.addEventListener('DOMContentLoaded', () => {
  const annList = document.querySelector('.announcement-list');
  const faqList = document.querySelector('.faq-container');
  const chatIcon = document.getElementById('live-chat');
  const chatContainer = document.getElementById('chat-container');
  const chatClose = document.getElementById('chat-close');
  const chatClear = document.getElementById('chat-clear');
  const chatBody = document.getElementById('chat-body');

  async function loadAnnouncements() {
    try {
      const res = await fetch('/api/support/announcements');
      if (!res.ok) throw new Error();
      const rows = await res.json();
      annList.innerHTML = '';
      rows.forEach(a => {
        const div = document.createElement('div');
        div.className = 'announcement-item';
        div.innerHTML = `<i class="fas fa-bullhorn"></i>&nbsp;${a.text}`;
        annList.appendChild(div);
      });
    } catch {
      annList.innerHTML = '<div class="announcement-item">Failed to load announcements</div>';
    }
  }

  async function loadFaqs() {
    try {
      const res = await fetch('/api/support/faqs');
      if (!res.ok) throw new Error();
      const rows = await res.json();
      faqList.innerHTML = '';
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

  const quickOptions = [
    { key:'join',     icon:'fa-sign-in-alt',         label:'Join Queue' },
    { key:'phil',     icon:'fa-hospital-symbol',     label:'PhilHealth Help' },
    { key:'work',     icon:'fa-clock',               label:'Work Hours' },
    { key:'contact',  icon:'fa-envelope',            label:'Contact Us' },
    { key:'profile',  icon:'fa-user-edit',           label:'Update Profile' },
    { key:'schedule', icon:'fa-calendar-check',      label:'Book Slot' },
    { key:'notify',   icon:'fa-bell',                label:'Notify Me' },
    { key:'stock',    icon:'fa-pills',               label:'Stock Status' },
    { key:'faq',      icon:'fa-question-circle',     label:'View FAQs' },
    { key:'news',     icon:'fa-bullhorn',            label:'View News' },
    { key:'login',    icon:'fa-sign-in-alt',         label:'Login Help' },
    { key:'register', icon:'fa-user-plus',           label:'Sign Up' },
    { key:'reset',    icon:'fa-key',                 label:'Reset Pass' },
    { key:'urgent',   icon:'fa-exclamation-triangle',label:'Urgent Care' },
    { key:'api',      icon:'fa-code',                label:'API Docs' },
    { key:'secure',   icon:'fa-shield-alt',          label:'Data Safety' },
    { key:'billing',  icon:'fa-file-invoice-dollar', label:'Billing FAQ' },
    { key:'feedback', icon:'fa-comment-dots',        label:'Send Feedback' },
    { key:'status',   icon:'fa-server',              label:'System Status' },
    { key:'support',  icon:'fa-clock',               label:'Support Hours' },
    { key:'other',    icon:'fa-question',            label:'Other Query' }
  ];
  const knowledgeBase = {
    join:    'Click “Join Queue” on your dashboard to enter.',
    phil:    'Enter your PhilHealth number at signup to verify.',
    work:    'We operate 8 AM–5 PM Mon–Fri and 8 AM–12 PM Sat.',
    contact: 'Email support.queueease@gmail.com for help.',
    profile: 'Go to Dashboard > Profile to update your info.',
    schedule:'Use “Book Slot” under Appointments to schedule.',
    notify:  'Toggle Notify Me in Settings for alerts.',
    stock:   'Stock Status shows live availability.',
    faq:     'FAQs are listed above in the FAQ section.',
    news:    'Latest news in Announcements panel.',
    login:   'Click “Forgot Password” on login screen.',
    register:'Tap “Sign Up” on homepage to register.',
    reset:   'Use “Reset Pass” link for password reset.',
    urgent:  'Call our hotline for urgent assistance.',
    api:     'See API Docs at https://api.queueease.com/docs.',
    secure:  'We use encryption to secure your data.',
    billing: 'Billing queries? See Billing FAQ section.',
    feedback:'Send feedback to feedback@queueease.com.',
    status:  'Check System Status at https://status.queueease.com.',
    support: 'Support Hours: 8 AM–5 PM Mon–Fri.',
    other:   'Email support.queueease@gmail.com if unsure.'
  };

  chatIcon.addEventListener('click', () => {
    chatContainer.classList.remove('hidden');
    renderOptions(false);
  });
  chatClose.addEventListener('click', () => chatContainer.classList.add('hidden'));
  chatClear.addEventListener('click', () => {
    chatBody.innerHTML = '<div class="message agent greeting"><i class="fas fa-robot"></i>&nbsp;&nbsp;Hello! I’m QueueEase Bot. Choose an option:<span class="timestamp">— now</span></div>';
    renderOptions(false);
  });

  let expanded = false;
  function renderOptions(exp) {
    expanded = exp;
    const old = chatBody.querySelector('.message.options');
    if (old) old.remove();
    const bubble = document.createElement('div');
    bubble.className = 'message options agent';
    const count = exp ? quickOptions.length : 5;
    quickOptions.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (i >= count ? ' hidden' : '');
      btn.dataset.key = opt.key;
      btn.innerHTML = `<i class="fas ${opt.icon}"></i>&nbsp;&nbsp;${opt.label}`;
      bubble.appendChild(btn);
    });
    const toggle = document.createElement('button');
    toggle.className = 'toggle-btn';
    toggle.innerHTML = exp
      ? '<i class="fas fa-chevron-up"></i>&nbsp;Show Less'
      : '<i class="fas fa-chevron-down"></i>&nbsp;Show More';
    bubble.appendChild(toggle);
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  chatBody.addEventListener('click', e => {
    if (e.target.matches('.option-btn')) {
      const label = e.target.textContent.trim();
      const key = e.target.dataset.key;
      appendUser(label);
      setTimeout(() => appendAgent(knowledgeBase[key] || knowledgeBase.other), 300);
    } else if (e.target.matches('.toggle-btn')) {
      renderOptions(!expanded);
    }
  });

  function appendMessage(type, text) {
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    const icon = document.createElement('i');
    icon.className = `fas ${type==='agent'?'fa-robot':'fa-user'}`;
    const ts = document.createElement('span');
    ts.className = 'timestamp';
    ts.textContent = `— ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
    msg.appendChild(icon);
    msg.appendChild(document.createTextNode(' ' + text));
    msg.appendChild(ts);
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function appendAgent(txt) { appendMessage('agent', txt); renderOptions(false); }
  function appendUser(txt) { appendMessage('user', txt); }
});
