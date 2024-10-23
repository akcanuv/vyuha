// Initialize the PDF.js viewer
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultUrl = '';
    const fileInput = document.getElementById('file-input');
  
    fileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      const fileURL = URL.createObjectURL(file);
      PDFViewerApplication.open(fileURL);
    });
  
    // Initialize PDF.js viewer
    PDFViewerApplication.initialize({
      // Any necessary configurations
    });
  
    PDFViewerApplication.initializedPromise.then(() => {
      PDFViewerApplication.open(defaultUrl);
    });
  });
  
  // Chat functionality
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');
  
  sendButton.addEventListener('click', async function () {
    const message = chatInput.value.trim();
    if (!message) return;
  
    // Get the selected text from the PDF viewer
    const snippet = window.getSelection().toString();
  
    // Display user's message
    addChatMessage('User', message);
  
    // Clear input
    chatInput.value = '';
  
    // Send to backend
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, snippet }),
      });
      const data = await response.json();
      if (data.reply) {
        addChatMessage('Gaudi', data.reply);
      } else {
        addChatMessage('Gaudi', 'Sorry, I could not process your request.');
      }
    } catch (error) {
      console.error(error);
      addChatMessage('Gaudi', 'Error communicating with the server.');
    }
  });
  
  function addChatMessage(sender, text) {
    const messageElem = document.createElement('div');
    messageElem.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatMessages.appendChild(messageElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }