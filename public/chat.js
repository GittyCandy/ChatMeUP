const socket = io();
let currentRoom = 'general';
let username = `anon-${Math.random().toString(36).slice(2, 6)}`;
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
  createRoomModal: document.getElementById('createRoomModal'),
  newRoomName: document.getElementById('newRoomName'),
  confirmCreateRoom: document.getElementById('confirmCreateRoom')
};

// Initialize the app
function init() {
  setupEventListeners();
  joinRoom(currentRoom);
  showUsernameModal();
  fetchRoomHistory(currentRoom);
}

// Set up all event listeners
function setupEventListeners() {
  // Room selection
  elements.roomList.addEventListener('click', (e) => {
    if (e.target.classList.contains('room')) {
      const room = e.target.dataset.room;
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

  // Room creation
  elements.createRoomBtn.addEventListener('click', () => {
    elements.createRoomModal.style.display = 'flex';
  });

  elements.confirmCreateRoom.addEventListener('click', createNewRoom);
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
        .forEach(displayMessage);
      scrollToBottom();
    });
}

// Send a message
function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  socket.emit('chatMessage', {
    room: currentRoom,
    user: username,
    message
  });

  elements.messageInput.value = '';
  resetTyping();
}

// Display a message
function displayMessage(msg) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message';

  const isCurrentUser = msg.user === username;
  const messageClass = isCurrentUser ? 'current-user' : '';

  messageElement.innerHTML = `
    <div class="message-header">
      <span class="message-user ${messageClass}">${msg.user}</span>
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
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(resetTyping, 2000);
}

function resetTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit('stopTyping', currentRoom);
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

// Room creation
function createNewRoom() {
  const roomName = elements.newRoomName.value.trim();
  if (!roomName) return;

  // Add new room to UI
  const roomElement = document.createElement('div');
  roomElement.className = 'room';
  roomElement.dataset.room = roomName;
  roomElement.innerHTML = `# ${roomName}`;
  elements.roomList.appendChild(roomElement);

  // Clean up
  elements.newRoomName.value = '';
  elements.createRoomModal.style.display = 'none';
}

// Socket event listeners
socket.on('message', displayMessage);

socket.on('privateMessage', (msg) => {
  if (msg.recipient === socket.id) {
    displayMessage(msg);
  }
});

socket.on('userList', (users) => {
  elements.userList.innerHTML = users.map(user => `
    <div class="user-item">${user}</div>
  `).join('');
  elements.onlineCount.textContent = users.length;
});

socket.on('typing', (user) => {
  elements.typingIndicator.textContent = `${user} is typing...`;
});

socket.on('stoppedTyping', () => {
  elements.typingIndicator.textContent = '';
});

socket.on('messageDeleted', (messageId) => {
  const messageElement = document.querySelector(`.message [data-id="${messageId}"]`);
  if (messageElement) {
    messageElement.closest('.message').remove();
  }
});

socket.on('messageEdited', ({ id, content }) => {
  const messageElement = document.querySelector(`.message [data-id="${id}"]`);
  if (messageElement) {
    messageElement.closest('.message').querySelector('.message-content').textContent = content;
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

function editMessage(msg) {
  elements.messageInput.value = msg.message;
  elements.messageInput.focus();

  // Optional: Add a way to confirm the edit
  const originalSend = elements.sendButton.onclick;
  elements.sendButton.onclick = function() {
    const newContent = elements.messageInput.value.trim();
    if (newContent && newContent !== msg.message) {
      socket.emit('editMessage', {
        messageId: msg.id,
        newContent,
        room: currentRoom
      });
    }
    elements.messageInput.value = '';
    elements.sendButton.onclick = originalSend;
  };
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);