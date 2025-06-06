const socket = io();
let currentRoom = 'general';

const roomSelect = document.getElementById('roomSelect');
const messageInput = document.getElementById('message');
const userInput = document.getElementById('user');
const messagesList = document.getElementById('messages');

roomSelect.addEventListener('change', () => {
  currentRoom = roomSelect.value;
  messagesList.innerHTML = '';
  socket.emit('joinRoom', currentRoom);
  fetch(`/api/messages`)
    .then(res => res.json())
    .then(data => {
      data.filter(msg => msg.room === currentRoom)
          .forEach(showMessage);
    });
});

function sendMessage() {
  const message = messageInput.value.trim();
  const user = userInput.value.trim() || `anon-${Math.random().toString(36).slice(2, 6)}`;
  if (!message) return;

  socket.emit('chatMessage', { room: currentRoom, user, message });
  messageInput.value = '';
}

socket.on('message', showMessage);

function showMessage({ user, message, time }) {
  const li = document.createElement('li');
  li.textContent = `[${new Date(time).toLocaleTimeString()}] ${user}: ${message}`;
  messagesList.appendChild(li);
}
