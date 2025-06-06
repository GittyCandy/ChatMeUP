// public/chat.js

const socket = io();

// UI references
const roomListEl = document.getElementById('roomList');
const createRoomBtn = document.getElementById('createRoomBtn');
const newRoomInput = document.getElementById('newRoomInput');

const currentRoomNameEl = document.getElementById('currentRoomName');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const messagesListEl = document.getElementById('messages');

const userNameInput = document.getElementById('userNameInput');
const passphraseInput = document.getElementById('passphraseInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// State
let currentRoom = null;
let passphrase = null;         // AES passphrase for this room
let localUserId = null;        // Unique per-browser-client
let localUserName = '';

// Load or generate a persistent userId
if (localStorage.getItem('anonChatUserId')) {
  localUserId = localStorage.getItem('anonChatUserId');
} else {
  localUserId = 'u-' + Math.random().toString(36).slice(2, 9);
  localStorage.setItem('anonChatUserId', localUserId);
}

// Helper: add room to sidebar (if not already)
function addRoomToList(room) {
  if ([...roomListEl.children].some(li => li.textContent === room)) return;
  const li = document.createElement('li');
  li.textContent = room;
  li.addEventListener('click', () => joinRoom(room));
  roomListEl.appendChild(li);
}

// Switch “active” class on sidebar
function highlightActiveRoom() {
  [...roomListEl.children].forEach(li => {
    li.classList.toggle('active', li.textContent === currentRoom);
  });
}

// Join (or create) a room
function joinRoom(room) {
  if (!room || room.trim() === '') return;
  // If already in a room, leave it
  if (currentRoom) {
    socket.emit('leaveRoom', currentRoom);
  }
  currentRoom = room;
  highlightActiveRoom();
  currentRoomNameEl.textContent = `# ${currentRoom}`;

  // Prompt for passphrase (never stored in server)
  passphrase = prompt(`Enter passphrase for room "${currentRoom}":`, '') || '';
  passphraseInput.value = passphrase;

  // Clear UI
  messagesListEl.innerHTML = '';

  // Notify server
  socket.emit('joinRoom', currentRoom);

  // Fetch existing messages from the REST endpoint
  fetch('/api/messages')
    .then(res => res.json())
    .then(allMsgs => {
      // Filter by this room
      const roomMsgs = allMsgs.filter(m => m.room === currentRoom);
      // Decrypt & display each
      roomMsgs.forEach(m => {
        try {
          const bytes = CryptoJS.AES.decrypt(m.ciphertext, passphrase);
          const plaintext = bytes.toString(CryptoJS.enc.Utf8);
          if (!plaintext) throw new Error('Decryption failed');
          showMessage({
            id: m.id,
            user: m.user,
            userId: m.userId,
            text: plaintext,
            time: m.time,
          });
        } catch {
          // If decryption fails, show a placeholder
          showMessage({
            id: m.id,
            user: m.user,
            userId: m.userId,
            text: '[Unable to decrypt message]',
            time: m.time,
          });
        }
      });
    });
}

// Leave room
leaveRoomBtn.addEventListener('click', () => {
  if (!currentRoom) return;
  socket.emit('leaveRoom', currentRoom);
  currentRoom = null;
  passphrase = null;
  currentRoomNameEl.textContent = '—';
  messagesListEl.innerHTML = '';
  highlightActiveRoom();
});

// Create/join button
createRoomBtn.addEventListener('click', () => {
  const newRoom = newRoomInput.value.trim();
  if (!newRoom) return;
  addRoomToList(newRoom);
  newRoomInput.value = '';
  joinRoom(newRoom);
});

// Send a new message
sendBtn.addEventListener('click', () => {
  if (!currentRoom) {
    alert('Join a room first.');
    return;
  }
  const rawText = messageInput.value.trim();
  if (!rawText) return;

  localUserName = userNameInput.value.trim() || `anon-${localUserId.slice(-4)}`;

  // Encrypt the message content with AES (client-side)
  const ciphertext = CryptoJS.AES.encrypt(rawText, passphrase).toString();

  // Build the message object
  const msgObj = {
    id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    room: currentRoom,
    user: localUserName,
    userId: localUserId,
    ciphertext,
    time: new Date().toISOString(),
  };

  // Emit to server
  socket.emit('chatMessage', msgObj);

  // Locally show your own plaintext version
  showMessage({
    id: msgObj.id,
    user: msgObj.user,
    userId: msgObj.userId,
    text: rawText,
    time: msgObj.time,
  });

  messageInput.value = '';
});

// When a new message arrives via socket
socket.on('newMessage', m => {
  // Only show if it’s for this room
  if (m.room !== currentRoom) return;
  // Attempt to decrypt
  let plaintext;
  try {
    const bytes = CryptoJS.AES.decrypt(m.ciphertext, passphrase);
    plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error('Bad passphrase');
  } catch {
    plaintext = '[Unable to decrypt]';
  }
  showMessage({
    id: m.id,
    user: m.user,
    userId: m.userId,
    text: plaintext,
    time: m.time,
  });
});

// When a message is deleted
socket.on('messageDeleted', msgId => {
  const el = document.getElementById(msgId);
  if (el) el.remove();
});

// Render a single message in the list
function showMessage({ id, user, userId, text, time }) {
  // Create <li>
  const li = document.createElement('li');
  li.id = id;

  // Meta line (username + timestamp)
  const metaDiv = document.createElement('div');
  metaDiv.classList.add('msg-meta');
  metaDiv.textContent = `[${new Date(time).toLocaleTimeString()}] ${user}`;

  // Text line
  const textDiv = document.createElement('div');
  textDiv.classList.add('msg-text');
  textDiv.textContent = text;

  li.appendChild(metaDiv);
  li.appendChild(textDiv);

  // If this client is the author, add a delete button
  if (userId === localUserId) {
    const delBtn = document.createElement('button');
    delBtn.classList.add('delete-btn');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this message?')) {
        // Emit to server
        socket.emit('deleteMessage', id);
        // Also fire REST DELETE (optional, since server socket handler updates the file)
        fetch(`/api/messages/${id}`, { method: 'DELETE' });
      }
    });
    li.appendChild(delBtn);
  }

  messagesListEl.appendChild(li);
  // Auto-scroll
  messagesListEl.scrollTop = messagesListEl.scrollHeight;
}

// On page load: you can prepopulate a “General” room
addRoomToList('general');
