document.addEventListener("DOMContentLoaded", function () {
    // --- CATEGORY DROPDOWN ---
    const selected = document.getElementById("selectedCategory");
    const optionsBox = document.getElementById("dropdownOptions");
    const hiddenInput = document.getElementById("categoryInput");
  
    if (selected && optionsBox && hiddenInput) {
      selected.addEventListener("click", () => {
        optionsBox.classList.toggle("show");
        selected.classList.toggle("open");
      });
  
      optionsBox.querySelectorAll("li").forEach(option => {
        option.addEventListener("click", () => {
          const value = option.getAttribute("data-value");
          selected.querySelector("span").innerText = value;
          hiddenInput.value = value;
          optionsBox.classList.remove("show");
          selected.classList.remove("open");
        });
      });
  
      document.addEventListener("click", function (e) {
        if (!document.getElementById("categoryDropdown").contains(e.target)) {
          optionsBox.classList.remove("show");
          selected.classList.remove("open");
        }
      });
    }
  
    // --- SCREENSHOT UPLOAD PREVIEW ---
    const uploadBox = document.getElementById("uploadBox");
    const fileInput = document.getElementById("screenshot");
    const fileNameDisplay = document.getElementById("fileName");
    const previewContainer = document.getElementById("imagePreviewContainer");
  
    if (uploadBox && fileInput && fileNameDisplay && previewContainer) {
      const updatePreview = (file) => {
        if (!file || !file.type.startsWith("image/")) {
          previewContainer.innerHTML = "<p style='color: red;'>Not an image file.</p>";
          return;
        }
  
        const reader = new FileReader();
        reader.onload = (e) => {
          previewContainer.innerHTML = `<img src="${e.target.result}" alt="Screenshot Preview" />`;
        };
        reader.readAsDataURL(file);
      };
  
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) {
          fileNameDisplay.textContent = `Selected file: ${file.name}`;
          updatePreview(file);
        } else {
          fileNameDisplay.textContent = '';
          previewContainer.innerHTML = '';
        }
      });
  
      uploadBox.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadBox.classList.add("hovered");
      });
  
      uploadBox.addEventListener("dragleave", () => {
        uploadBox.classList.remove("hovered");
      });
  
      uploadBox.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadBox.classList.remove("hovered");
  
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
          fileInput.files = droppedFiles;
          fileNameDisplay.textContent = `Selected file: ${droppedFiles[0].name}`;
          updatePreview(droppedFiles[0]);
        }
      });
    }
  
    // --- CAPTCHA & CONFIRMATION ---
    const submitButton = document.querySelector(".btn-submit");
    const reportForm = document.getElementById("reportForm");
  
    const captchaModal = document.getElementById("captchaModal");
    const captchaCanvas = document.getElementById("captchaCanvas");
    const captchaInput = document.getElementById("captchaInput");
    const captchaConfirmBtn = document.getElementById("captchaConfirmBtn");
    const captchaCloseBtn = document.getElementById("captchaCloseBtn");
  
    const confirmationBox = document.getElementById("confirmation");
    const refIdEl = document.getElementById("refId");
    const countdownEl = document.getElementById("countdown");
  
    const ctx = captchaCanvas?.getContext("2d");
    let currentCaptcha = "";
  
    function generateCaptcha() {
      if (!ctx) return;
      ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      currentCaptcha = Array.from({ length: 7 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
      ctx.font = "24px Poppins";
      ctx.fillStyle = "#12372A";
      ctx.fillText(currentCaptcha, 20, 32);
    }
  
    function getLocalDateTimeISO() {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now - offset).toISOString().slice(0, 19).replace('T', ' ');
      return localISOTime;
    }
  
    if (submitButton && captchaModal && reportForm) {
      submitButton.addEventListener("click", function (e) {
        e.preventDefault();
  
        const requiredFields = [
          document.getElementById("categoryInput"),
          document.getElementById("subject"),
          document.getElementById("description"),
        ];
  
        const isSeveritySelected = document.querySelector('input[name="severity"]:checked');
  
        const allValid = requiredFields.every(input => input && input.value.trim() !== "") && isSeveritySelected;
  
        if (!allValid) {
          alert("Please complete all required fields before submitting.");
          return;
        }
  
        generateCaptcha();
        captchaModal.classList.remove("hidden");
      });
  
      captchaConfirmBtn.addEventListener("click", () => {
        const input = captchaInput.value.trim().toUpperCase();
        if (input !== currentCaptcha) {
          alert("Incorrect code. Try again.");
          generateCaptcha();
          captchaInput.value = "";
          return;
        }
  
        const userId = localStorage.getItem("id");
        if (!userId) {
          alert("User not logged in. Please log in again.");
          return;
        }
  
        const data = {
          user_id: userId,
          category: document.getElementById("categoryInput").value,
          severity: document.querySelector('input[name="severity"]:checked')?.value,
          subject: document.getElementById("subject").value,
          description: document.getElementById("description").value,
          occurred_at: getLocalDateTimeISO(),
        };
  
        fetch("/api/reports/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
          .then(res => res.json())
          .then(resData => {
            captchaModal.classList.add("hidden");
            reportForm.classList.add("hidden");
            confirmationBox.classList.remove("hidden");
  
            // ✅ Use real backend report_id
            const reportId = resData.report_id;
            refIdEl.textContent = `#${String(reportId).padStart(4, '0')}`;
            confirmationBox.scrollIntoView({ behavior: "smooth" });
  
            let timeLeft = 15;
            countdownEl.textContent = timeLeft;
            const countdown = setInterval(() => {
              timeLeft--;
              countdownEl.textContent = timeLeft;
  
              if (timeLeft <= 0) {
                clearInterval(countdown);
                window.location.href = "user-dashboard.html";
              }
            }, 1000);
          })
          .catch(error => {
            alert("Something went wrong. Try again.");
            console.error("Submission error:", error);
            captchaInput.value = "";
            generateCaptcha();
          });
      });
  
      captchaCloseBtn.addEventListener("click", () => {
        captchaModal.classList.add("hidden");
        captchaInput.value = "";
      });
    }
  });
  