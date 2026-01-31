// Utilities for data management UI
export function fetchJson(url, options = {}) {
  return fetch(url, options).then(response => {
    if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
    return response.json();
  });
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function zeroPad(number, length = 2) {
  return String(number).padStart(length, '0');
}

export function formatDateTime(date) {
  if (!(date instanceof Date)) return '';
  const timestamp = date.getTime();
  if (isNaN(timestamp)) return '';
  const year = date.getFullYear();
  const month = zeroPad(date.getMonth() + 1);
  const day = zeroPad(date.getDate());
  const hours = zeroPad(date.getHours());
  const minutes = zeroPad(date.getMinutes());
  const seconds = zeroPad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
