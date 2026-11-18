const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function read(file) {
  ensureDir();
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function write(file, data) {
  ensureDir();
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return 1;
  }
  const max = list.reduce((acc, item) => {
    const id = item && typeof item.id === 'number' ? item.id : 0;
    return id > acc ? id : acc;
  }, 0);
  return max + 1;
}

module.exports = { read, write, nextId };