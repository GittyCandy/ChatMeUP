const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return purify.sanitize(input.trim());
}

function isValidUsername(username) {
  return typeof username === 'string' && username.length >= 2 && username.length <= 20;
}

module.exports = {
  sanitizeInput,
  isValidUsername
};