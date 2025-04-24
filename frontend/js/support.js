// frontend/js/support.js

document.addEventListener('DOMContentLoaded', () => {
    const chatIcon      = document.getElementById('live-chat');
    const chatContainer = document.getElementById('chat-container');
    const chatClose     = document.getElementById('chat-close');
    const chatBody      = document.getElementById('chat-body');
    const chatInput     = document.getElementById('chat-input-field');
    const chatSend      = document.getElementById('chat-send');
  
    // Open chat window
    chatIcon.addEventListener('click', () => {
      chatContainer.classList.remove('hidden');
      chatInput.focus();
    });
  
    // Close chat window
    chatClose.addEventListener('click', () => {
      chatContainer.classList.add('hidden');
    });
  
    // Show a three dot typing indicator
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
  
    // Append a message bubble (user or agent)
    function appendMessage(type, text) {
      const msg = document.createElement('div');
      msg.className = `message ${type}`;
      const icon = document.createElement('i');
      icon.className = type === 'agent'
        ? 'fas fa-robot'
        : 'fas fa-user';
      msg.appendChild(icon);
      msg.appendChild(document.createTextNode(' ' + text));
      chatBody.appendChild(msg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  
    // Send message handler
    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      appendMessage('user', text);
      chatInput.value = '';
  
      // Simulate agent typing
      const typingElem = showTyping();
      setTimeout(() => {
        typingElem.remove();
        appendMessage('agent', 'Thank you we will get back to you shortly');
      }, 1000);
    }
  
    // Event listeners
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendMessage();
    });
  });
  