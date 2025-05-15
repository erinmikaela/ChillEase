document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('reportBody');
  
    fetch('/api/reports/all')
      .then(response => response.json())
      .then(data => {
        tbody.innerHTML = '';
  
        if (!Array.isArray(data) || data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8">No reports found.</td></tr>`;
          return;
        }
  
        data.forEach((report) => {
          if (report.acknowledged === 1) return;
  
          const row = document.createElement('tr');
          row.setAttribute('data-id', report.id);
  
          row.innerHTML = `
            <td>${String(report.id).padStart(4, '0')}</td>
            <td>
              ${report.full_name}<br />
              <small>${report.email || '—'}</small>
            </td>
            <td>${report.category}</td>
            <td>${report.severity}</td>
            <td>${new Date(report.submitted_at).toLocaleString()}</td>
            <td class="wrap-text">${report.subject}</td>
            <td class="wrap-text">${report.description}</td>
            <td>
              <button class="ack-btn red" data-id="${report.id}" data-user="${report.user_id}" data-email="${report.email}" data-name="${report.full_name}">
                Acknowledge
              </button>
            </td>
          `;
  
          tbody.appendChild(row);
        });
  
        // Handle Acknowledge
        document.querySelectorAll('.ack-btn').forEach(button => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const email = button.getAttribute('data-email');
            const name = button.getAttribute('data-name');
            const rowToHide = document.querySelector(`tr[data-id="${id}"]`);
  
            button.classList.remove('red');
            button.classList.add('green');
            button.textContent = 'Acknowledged';
  
            // Update in DB
            fetch(`/api/reports/acknowledge/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' }
            })
              .then(res => res.json())
              .then(() => {
                if (rowToHide) {
                  rowToHide.classList.add('highlight');
                  setTimeout(() => {
                    rowToHide.classList.add('fade-out');
                    setTimeout(() => {
                      rowToHide.remove();
                    }, 1000);
                  }, 10000);
                }
  
                // ✅ Send Email to User
                sendEmailNotification(email, name, 'Your report has been acknowledged by the admin. Thank you!');
              })
              .catch(err => {
                console.error('Acknowledge failed:', err);
                alert('Failed to acknowledge. Please try again.');
              });
          });
        });
      })
      .catch(error => {
        console.error('Error loading reports:', error);
        tbody.innerHTML = `<tr><td colspan="8">Failed to load reports.</td></tr>`;
      });
  
    // ✅ EmailJS Email Notification
    async function sendEmailNotification(toEmail, fullName, message) {
      console.log("Preparing to send email to:", toEmail);
      try {
        const response = await emailjs.send(
          "service_dr57nut",
          "template_5tl23ye",
          {
            to_email: toEmail,
            name: fullName,
            message: message,
          }
        );
        console.log("Email sent successfully:", response);
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }
  });
  