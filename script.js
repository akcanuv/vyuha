// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// Initialize variables
const fileInput = document.getElementById('file-input');
const pdfCanvas = document.getElementById('pdf-canvas');
const ctx = pdfCanvas.getContext('2d');
const pdfOverlayCanvas = document.getElementById('pdf-overlay-canvas');
const overlayCtx = pdfOverlayCanvas.getContext('2d');
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let snippet = '';

const viewerContainer = document.getElementById('viewerContainer');

// Buttons and page info
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

// Store extracted image data
let extractedImageBase64 = null;

// Variables for new elements
const imageContainer = document.getElementById('image-container');
const enlargedImage = document.getElementById('enlarged-image');
const backToPdfButton = document.getElementById('back-to-pdf-button');
const saveExampleButton = document.getElementById('save-example-button');
const pdfContainer = document.getElementById('pdf-container');

// Ensure the image container is hidden initially
imageContainer.style.display = 'none';

// Initialize chat history with the system message
const chatHistory = [
  {
    role: 'system',
    content: "This model assists users with reading, interpreting, and explaining engineering drawings from PDF or image files. Using computer vision, Gaudi analyzes the visuals of the drawings, including symbols, dimensions, and annotations, rather than relying solely on extracted text. It identifies and associates dimensions with relevant sections of the drawing and explains key details such as tolerances, material specifications, and technical annotations. Gaudi avoids making assumptions and ensures that every interpretation is based on accurate visual analysis. It emphasizes clarity and precision, and it will prompt users for clarification when needed to ensure accuracy in its interpretations. Gaudi communicates in a technical and formal style, aligning with industry standards for engineering professionals."
  }
];

// Load PDF
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    alert('Please upload a PDF file.');
    return;
  }

  const fileReader = new FileReader();
  fileReader.onload = function () {
    const typedarray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedarray).promise.then((pdfDoc_) => {
      pdfDoc = pdfDoc_;
      pageCountSpan.textContent = pdfDoc.numPages;
      pageNum = 1;
      renderPage(pageNum);
    });
  };
  fileReader.readAsArrayBuffer(file);
});

// Render the page
function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: scale });
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;

    // Set overlay canvas dimensions
    pdfOverlayCanvas.width = pdfCanvas.width;
    pdfOverlayCanvas.height = pdfCanvas.height;

    // Scale the canvas display size
    const outputScale = window.devicePixelRatio || 1;
    pdfCanvas.style.width = (viewport.width / outputScale) + 'px';
    pdfCanvas.style.height = (viewport.height / outputScale) + 'px';
    pdfOverlayCanvas.style.width = pdfCanvas.style.width;
    pdfOverlayCanvas.style.height = pdfCanvas.style.height;

    // Adjust the viewer container size
    viewerContainer.style.width = '100%';
    viewerContainer.style.height = '100%';

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };
    const renderTask = page.render(renderContext);

    renderTask.promise.then(() => {
      pageRendering = false;
      pageNumSpan.textContent = pageNum;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
}

// Queue rendering of the next page
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

// Previous page
prevPageBtn.addEventListener('click', () => {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
});

// Next page
nextPageBtn.addEventListener('click', () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
});

// Zoom in
zoomInBtn.addEventListener('click', () => {
  scale += 0.25;
  queueRenderPage(pageNum);
});

// Zoom out
zoomOutBtn.addEventListener('click', () => {
  if (scale <= 0.5) return;
  scale -= 0.25;
  queueRenderPage(pageNum);
});

// Drawing functionality
let isDrawing = false;
let startX, startY, currentX, currentY;

pdfOverlayCanvas.addEventListener('mousedown', function(e) {
  isDrawing = true;
  const rect = pdfOverlayCanvas.getBoundingClientRect();
  startX = (e.clientX - rect.left) * (pdfOverlayCanvas.width / rect.width);
  startY = (e.clientY - rect.top) * (pdfOverlayCanvas.height / rect.height);
});

pdfOverlayCanvas.addEventListener('mousemove', function(e) {
  if (!isDrawing) return;
  const rect = pdfOverlayCanvas.getBoundingClientRect();
  currentX = (e.clientX - rect.left) * (pdfOverlayCanvas.width / rect.width);
  currentY = (e.clientY - rect.top) * (pdfOverlayCanvas.height / rect.height);

  // Clear the overlay canvas
  overlayCtx.clearRect(0, 0, pdfOverlayCanvas.width, pdfOverlayCanvas.height);

  // Draw the rectangle
  overlayCtx.beginPath();
  overlayCtx.rect(startX, startY, currentX - startX, currentY - startY);
  overlayCtx.lineWidth = 2;
  overlayCtx.strokeStyle = 'red';
  overlayCtx.stroke();
});

pdfOverlayCanvas.addEventListener('mouseup', function(e) {
  if (!isDrawing) return;
  isDrawing = false;
  const rect = pdfOverlayCanvas.getBoundingClientRect();
  currentX = (e.clientX - rect.left) * (pdfOverlayCanvas.width / rect.width);
  currentY = (e.clientY - rect.top) * (pdfOverlayCanvas.height / rect.height);

  // Extract the image
  extractImage();

  // Clear the overlay canvas
  overlayCtx.clearRect(0, 0, pdfOverlayCanvas.width, pdfOverlayCanvas.height);
});

function extractImage() {
  // Calculate the rectangle coordinates
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  if (width === 0 || height === 0) {
    alert('Please select a valid area.');
    return;
  }

  // Get the image data from the pdfCanvas
  const imageData = ctx.getImageData(x, y, width, height);

  // Create a new canvas to hold the extracted image
  const extractedCanvas = document.createElement('canvas');
  extractedCanvas.width = width;
  extractedCanvas.height = height;
  const extractedCtx = extractedCanvas.getContext('2d');

  // Put the image data into the new canvas
  extractedCtx.putImageData(imageData, 0, 0);

  // Convert the canvas to a data URL (base64)
  const dataURL = extractedCanvas.toDataURL('image/png');

  // Extract the base64 data by removing the prefix
  const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');

  // Assign the base64-encoded image to 'snippet'
  snippet = base64Data;

  // Show the enlarged image
  showImageContainer(dataURL);
}

// Function to show the image container and hide the PDF
function showImageContainer(dataURL) {
  // Set the source of the enlarged image
  enlargedImage.src = dataURL;

  // Hide the PDF container
  pdfContainer.classList.add('hidden');

  // Show the image container
  imageContainer.style.display = 'flex'; // Use 'flex' to enable flexbox layout
}

// Function to go back to PDF view
backToPdfButton.addEventListener('click', function() {
  // Hide the image container
  imageContainer.style.display = 'none';

  // Show the PDF container
  pdfContainer.classList.remove('hidden');

  // Clear the extracted image data
  extractedImageBase64 = null;

  // Re-render the page to reset the canvas dimensions
  renderPage(pageNum);
});

// Chat functionality
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const clearChatBtn = document.getElementById('clear-chat');

// Function to create a new chat message
function createChatMessage(text, isGaudi = false, content = null) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('chat-message');

  const messageText = document.createElement('div');
  messageText.classList.add('message-text');

  // Do not display image messages in chat window
  if (content && typeof content === 'object' && content.type === 'image_url') {
    // Do not display the image or any placeholder
    // You can optionally add a placeholder text if you want
  } else {
    messageText.textContent = text;
    messageContainer.appendChild(messageText);
  }

  // Add edit controls if the message is from Gaudi
  if (isGaudi) {
    const editControls = document.createElement('div');
    editControls.classList.add('edit-controls');

    const editButton = document.createElement('button');
    editButton.classList.add('edit-button');
    editButton.textContent = '✏️ Edit';
    editControls.appendChild(editButton);

    messageContainer.appendChild(editControls);

    // Add click event for editing
    editButton.addEventListener('click', () => editMessage(messageContainer, messageText, editControls));
  }

  // Only append messageContainer if it has content
  if (messageContainer.children.length > 0) {
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Store the message in chat history and get its index
  const role = isGaudi ? 'assistant' : 'user';
  let messageIndex;
  if (content) {
    chatHistory.push({ role, content });
    messageIndex = chatHistory.length - 1;
  } else {
    chatHistory.push({ role, content: text });
    messageIndex = chatHistory.length - 1;
  }

  // Store the message index in the message container for later reference
  messageContainer.dataset.messageIndex = messageIndex;
}

// Function to edit a message
function editMessage(messageContainer, messageText, editControls) {
  const originalText = messageText.textContent;
  const inputField = document.createElement('textarea');
  inputField.classList.add('edit-input');
  inputField.value = originalText;

  const saveButton = document.createElement('button');
  saveButton.textContent = '💾 Save';
  saveButton.classList.add('save-button');

  const cancelButton = document.createElement('button');
  cancelButton.textContent = '❌ Cancel';
  cancelButton.classList.add('cancel-button');

  // Clear existing message content and add edit input and buttons
  messageContainer.innerHTML = '';
  messageContainer.appendChild(inputField);
  messageContainer.appendChild(saveButton);
  messageContainer.appendChild(cancelButton);

  // Save changes
  saveButton.addEventListener('click', () => {
    messageText.textContent = inputField.value;
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageText);
    messageContainer.appendChild(editControls);

    // Update the chatHistory
    const messageIndex = parseInt(messageContainer.dataset.messageIndex);
    if (!isNaN(messageIndex)) {
      const message = chatHistory[messageIndex];
      if (message) {
        message.content = inputField.value;
      }
    }
  });

  // Cancel editing
  cancelButton.addEventListener('click', () => {
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageText);
    messageContainer.appendChild(editControls);
  });
}

// Function to clear the chat
clearChatBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  // Reset chat history to only include the system message
  chatHistory.splice(1); // Remove all elements after the first (system) message
});

// Function to send a message to the server
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message && !snippet) return; // Ensure either message or snippet is present

  if (message) {
    createChatMessage(message, false); // User message
  }

  // If there's an image snippet, create an image message
  if (snippet) {
    const imageContent = {
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,' + snippet,
        detail: 'auto'
      }
    };
    // Do not display the image in the chat window, but store it in chatHistory
    createChatMessage('', false, imageContent);
  }

  // Prepare the payload
  const payload = {
    message,
    snippet, // Include the image data if available
  };

  // Send to backend
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.reply) {
      createChatMessage(data.reply, true); // Display Gaudi's actual response and make it editable
    } else {
      createChatMessage('Sorry, I could not process your request.', true); // Display fallback response and make it editable
    }
  } catch (error) {
    console.error(error);
    createChatMessage('Error communicating with the server.', true); // Display error message and make it editable
  }

  chatInput.value = ''; // Clear input
  snippet = ''; // Clear the snippet after sending
}

// Event listener for sending a message
sendButton.addEventListener('click', () => {
  sendMessage();
});

// Allow pressing Enter to send a message
chatInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendButton.click();
  }
});

// Event listener for SAVE EXAMPLE button
saveExampleButton.addEventListener('click', saveExample);

// Function to save the current image and chat as a JSON file
function saveExample() {
  // Create the JSON object
  const dataToSave = { messages: chatHistory };

  // Convert to JSON string with indentation for readability
  const jsonString = JSON.stringify(dataToSave, null, 2);

  // Create a Blob with the content
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create a link to download the file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'example.json';

  // Trigger the download
  link.click();

  // Clean up
  URL.revokeObjectURL(link.href);
}