const socket = io();
let currentRoom = 'general';
let username = `anon-${Math.random().toString(36).slice(2, 6)}`;
let encryptionKey = '';
let userAvatar = 'user-secret';
let isTyping = false;
let typingTimeout;

// DOM Elements
const elements = {
  roomList: document.getElementById('roomList'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
  currentRoom: document.getElementById('currentRoom'),
  typingIndicator: document.getElementById('typingIndicator'),
  userList: document.getElementById('userList'),
  onlineCount: document.getElementById('onlineCount'),
  usernameDisplay: document.getElementById('usernameDisplay'),
  usernameInput: document.getElementById('usernameInput'),
  confirmUsername: document.getElementById('confirmUsername'),
  changeUsername: document.getElementById('changeUsername'),
  usernameModal: document.getElementById('usernameModal'),
  createRoomBtn: document.getElementById('createRoomBtn'),
  closeModal: document.querySelector('.close-modal'),
  avatarOptions: document.querySelectorAll('.avatar-option')
};

// Initialize the app
function init() {
  setupEventListeners();
  joinRoom(currentRoom);
  fetchEncryptionKey();
  fetchRoomHistory(currentRoom);

  // Show welcome message
  setTimeout(() => {
    document.querySelector('.welcome-message').classList.add('animate__fadeOut');
    setTimeout(() => {
      document.querySelector('.welcome-message').style.display = 'none';
    }, 500);
  }, 3000);
}

// Fetch encryption key from server
function fetchEncryptionKey() {
  fetch('/api/encryption-key')
    .then(res => res.json())
    .then(data => {
      encryptionKey = data.key;
    });
}

// Encrypt message before sending
function encryptMessage(message) {
  if (!encryptionKey) return message;
  return CryptoJS.AES.encrypt(message, encryptionKey).toString();
}

// Decrypt received message
function decryptMessage(encryptedMessage) {
  if (!encryptionKey) return encryptedMessage;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8) || '[Encrypted Message]';
  } catch (e) {
    console.error('Decryption error:', e);
    return '[Unable to decrypt]';
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Room selection
  elements.roomList.addEventListener('click', (e) => {
    const roomElement = e.target.closest('.room');
    if (roomElement) {
      const room = roomElement.dataset.room;
      joinRoom(room);
    }
  });

  // Message sending
  elements.sendButton.addEventListener('click', sendMessage);
  elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Typing indicators
  elements.messageInput.addEventListener('input', handleTyping);

  // Username management
  elements.changeUsername.addEventListener('click', showUsernameModal);
  elements.confirmUsername.addEventListener('click', setUsername);
  elements.closeModal.addEventListener('click', () => {
    elements.usernameModal.style.display = 'none';
  });

  // Avatar selection
  elements.avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
      elements.avatarOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      userAvatar = option.dataset.avatar;
    });
  });

  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target === elements.usernameModal) {
      elements.usernameModal.style.display = 'none';
    }
  });
}

// Join a room
function joinRoom(room) {
  // Leave current room
  socket.emit('leaveRoom', currentRoom);

  // Update UI
  document.querySelector('.room.active')?.classList.remove('active');
  document.querySelector(`.room[data-room="${room}"]`).classList.add('active');
  elements.currentRoom.textContent = room;

  // Clear messages and join new room
  elements.messages.innerHTML = '';
  currentRoom = room;
  socket.emit('joinRoom', room);
}

// Fetch room history
function fetchRoomHistory(room) {
  fetch(`/api/messages`)
    .then(res => res.json())
    .then(messages => {
      messages
        .filter(msg => msg.room === room && !msg.isPrivate)
        .forEach(msg => {
          // Decrypt each message before displaying
          const decryptedMsg = {
            ...msg,
            message: decryptMessage(msg.encryptedMessage)
          };
          displayMessage(decryptedMsg);
        });
      scrollToBottom();
    });
}

// Send a message
function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  // Encrypt the message before sending
  const encryptedMessage = encryptMessage(message);

  socket.emit('chatMessage', {
    room: currentRoom,
    encryptedMessage
  });

  elements.messageInput.value = '';
  resetTyping();
}

// Display a message
function displayMessage(msg) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message animate__animated animate__fadeInUp';

  const isCurrentUser = msg.user === username;
  const messageClass = isCurrentUser ? 'current-user' : '';

  messageElement.innerHTML = `
    <div class="message-header">
      <div class="message-user ${messageClass}">
        <i class="fas fa-${userAvatar}"></i>
        <span>${msg.user}</span>
      </div>
      <span class="message-time" title="${new Date(msg.time).toLocaleString()}">
        ${formatTime(msg.time)}
      </span>
      ${isCurrentUser ? `
        <div class="message-actions">
          <button class="message-action edit-btn" data-id="${msg.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="message-action delete-btn" data-id="${msg.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      ` : ''}
    </div>
    <div class="message-content">${msg.message}</div>
  `;

  elements.messages.appendChild(messageElement);
  scrollToBottom();

  // Add event listeners for message actions
  if (isCurrentUser) {
    messageElement.querySelector('.delete-btn').addEventListener('click', () => {
      socket.emit('deleteMessage', { messageId: msg.id, room: currentRoom });
    });

    messageElement.querySelector('.edit-btn').addEventListener('click', () => {
      editMessage(msg);
    });
  }
}

// Handle typing indicators
function handleTyping() {
  if (!isTyping) {
    isTyping = true;
    socket.emit('startTyping', currentRoom);
    elements.typingIndicator.classList.add('active');
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(resetTyping, 2000);
}

function resetTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit('stopTyping', currentRoom);
    elements.typingIndicator.classList.remove('active');
  }
}

// Username management
function showUsernameModal() {
  elements.usernameModal.style.display = 'flex';
  elements.usernameInput.value = username;
  elements.usernameInput.focus();
}

function setUsername() {
  const newUsername = elements.usernameInput.value.trim() || username;
  if (newUsername.length > 20) {
    alert('Username must be 20 characters or less');
    return;
  }

  username = newUsername;
  elements.usernameDisplay.textContent = username;
  elements.usernameModal.style.display = 'none';
  socket.emit('setUsername', username);
}

// Socket event listeners
socket.on('encryptionKey', (key) => {
  encryptionKey = key;
});

socket.on('message', (encryptedMsg) => {
  // Decrypt the message before displaying
  const decryptedMsg = {
    ...encryptedMsg,
    message: decryptMessage(encryptedMsg.encryptedMessage)
  };
  displayMessage(decryptedMsg);
});

socket.on('userList', (users) => {
  elements.userList.innerHTML = users.map(user => `
    <div class="user-item">
      <i class="fas fa-${userAvatar}"></i>
      <span>${user}</span>
    </div>
  `).join('');
  elements.onlineCount.textContent = users.length;
});

socket.on('typing', (user) => {
  if (user !== username) {
    elements.typingIndicator.textContent = `${user} is typing...`;
    elements.typingIndicator.classList.add('active');
  }
});

socket.on('stoppedTyping', () => {
  elements.typingIndicator.classList.remove('active');
});

socket.on('userJoined', (user) => {
  if (user !== username) {
    showSystemMessage(`${user} joined the room`);
  }
});

socket.on('userLeft', (user) => {
  if (user !== username) {
    showSystemMessage(`${user} left the room`);
  }
});

socket.on('messageDeleted', (messageId) => {
  const messageElement = document.querySelector(`.message [data-id="${messageId}"]`);
  if (messageElement) {
    messageElement.closest('.message').classList.add('animate__fadeOut');
    setTimeout(() => {
      messageElement.closest('.message').remove();
    }, 300);
  }
});

// Helper functions
function formatTime(timestamp) {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diff = now - messageTime;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return messageTime.toLocaleDateString();
}

function scrollToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function showSystemMessage(text) {
  const systemMsg = document.createElement('div');
  systemMsg.className = 'system-message animate__animated animate__fadeIn';
  systemMsg.textContent = text;
  elements.messages.appendChild(systemMsg);
  scrollToBottom();

  setTimeout(() => {
    systemMsg.classList.add('animate__fadeOut');
    setTimeout(() => systemMsg.remove(), 500);
  }, 3000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);