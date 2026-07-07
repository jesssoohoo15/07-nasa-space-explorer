// NASA APOD API setup
const API_KEY = 'hhwLCVpWpNBESFw92BTVylEDjpIabQxS6UJzZ4Hi';
const API_URL = 'https://api.nasa.gov/planetary/apod';

// Find our date picker inputs and other elements on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const button = document.querySelector('button');
const gallery = document.getElementById('gallery');
const factSection = document.getElementById('spaceFact');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

/* ---------- Random space fact ---------- */

// A collection of fun space facts — one is chosen at random each page load
const spaceFacts = [
  'One day on Venus is longer than one year on Venus — it rotates slower than it orbits the Sun.',
  'Neutron stars are so dense that a single teaspoon of one would weigh about 4 billion tons.',
  'The Sun makes up about 99.86% of all the mass in our solar system.',
  'There are more stars in the universe than grains of sand on all of Earth\'s beaches.',
  'The footprints left by Apollo astronauts on the Moon could last millions of years — there\'s no wind to blow them away.',
  'Jupiter\'s Great Red Spot is a storm bigger than Earth that has raged for at least 350 years.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  'Saturn is so light for its size that it would float in water — if you could find a bathtub big enough.',
  'The International Space Station travels at about 17,500 mph, orbiting Earth every 90 minutes.',
  'A year on Mercury is just 88 Earth days long.',
  'The Milky Way and the Andromeda galaxy are on course to collide — in about 4.5 billion years.',
  'Olympus Mons on Mars is the tallest volcano in the solar system, nearly three times the height of Mount Everest.'
];

// Pick a random fact and display it above the gallery
function showRandomFact() {
  const randomIndex = Math.floor(Math.random() * spaceFacts.length);
  factSection.innerHTML = `<strong>🌌 Did You Know?</strong> ${spaceFacts[randomIndex]}`;
}

// Run once when the page loads
showRandomFact();

/* ---------- Date helpers ---------- */

// Get today's date as a "YYYY-MM-DD" string in the user's LOCAL timezone.
// (We can't use toISOString() here — it converts to UTC, which is what
// caused the date picker to think "today" was tomorrow.)
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* ---------- Fetching ---------- */

// Fetch images when the button is clicked
button.addEventListener('click', () => {
  const startDate = startInput.value;
  let endDate = endInput.value;

  // Make sure both dates are selected
  if (!startDate || !endDate) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">📅</div>
        <p>Please choose both a start and end date.</p>
      </div>
    `;
    return;
  }

  // NASA has no images for future dates, so if the end date is
  // past today, clamp it back to today. (Works with a simple string
  // comparison because YYYY-MM-DD strings sort in date order.)
  const today = getTodayString();
  if (endDate > today) {
    endDate = today;
    endInput.value = today; // update the picker so the user sees the fix
  }

  // Also catch a start date after the end date before hitting the API
  if (startDate > endDate) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">📅</div>
        <p>Your start date is after your end date. Please pick an earlier start date.</p>
      </div>
    `;
    return;
  }

  fetchImages(startDate, endDate);
});

// Fetch APOD data from NASA's API for the given date range
async function fetchImages(startDate, endDate) {
  // Show a loading message while we wait for the API.
  // This appears instantly, then displayGallery() replaces it
  // once the data has arrived.
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">🔄</div>
      <p>Loading space photos…</p>
    </div>
  `;

  try {
    // thumbs=true asks NASA to include a thumbnail_url for video entries
    const url = `${API_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;
    const response = await fetch(url);

    // If the API returns an error (bad dates, rate limit, etc.), handle it
    if (!response.ok) {
      throw new Error(`API request failed (status ${response.status})`);
    }

    const data = await response.json();
    displayGallery(data);
  } catch (error) {
    console.error('Error fetching APOD data:', error);
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <p>Something went wrong fetching the images. Please check your dates and try again.</p>
      </div>
    `;
  }
}

/* ---------- Gallery ---------- */

// Build the gallery from the array of APOD entries
function displayGallery(items) {
  // Clear out the loading message / old results
  gallery.innerHTML = '';

  // Handle an empty result just in case
  if (!Array.isArray(items) || items.length === 0) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🔭</div>
        <p>No images found for that date range.</p>
      </div>
    `;
    return;
  }

  // Show newest photos first
  items.reverse();

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';

    // Some days APOD is a video instead of an image.
    // The .card-image wrapper clips the hover-zoom effect.
    let mediaHTML;
    if (item.media_type === 'image') {
      mediaHTML = `
        <div class="card-image">
          <img src="${item.url}" alt="${item.title}" />
        </div>
      `;
    } else if (item.media_type === 'video') {
      // thumbs=true gives us a video thumbnail; fall back to the logo
      const thumb = item.thumbnail_url || 'img/nasa-worm-logo.png';
      mediaHTML = `
        <div class="card-image">
          <img src="${thumb}" alt="Video: ${item.title}" />
          <span class="video-badge">🎬 VIDEO</span>
        </div>
      `;
    } else {
      // Unknown media type — skip this entry
      return;
    }

    card.innerHTML = `
      ${mediaHTML}
      <p><strong>${item.title}</strong> — ${item.date}</p>
    `;

    // Open the modal with this item's full details when the card is clicked
    card.addEventListener('click', () => {
      openModal(item);
    });

    gallery.appendChild(card);
  });
}

/* ---------- Modal ---------- */

// Grab the modal elements (added to index.html)
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

// Fill the modal with one APOD item's details and show it
function openModal(item) {
  let mediaHTML;
  if (item.media_type === 'image') {
    // Use the HD image if NASA provides one, otherwise the standard one
    const bigImage = item.hdurl || item.url;
    mediaHTML = `<img src="${bigImage}" alt="${item.title}" class="modal-image" />`;
  } else {
    // For videos: embed the player AND give a clear clickable link
    mediaHTML = `
      <iframe src="${item.url}" class="modal-video" allowfullscreen></iframe>
      <a href="${item.url}" target="_blank" rel="noopener" class="video-link">
        ▶ Watch on YouTube ↗
      </a>
    `;
  }

  modalBody.innerHTML = `
    ${mediaHTML}
    <h2 class="modal-title">${item.title}</h2>
    <p class="modal-date">${item.date}</p>
    <p class="modal-explanation">${item.explanation}</p>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden'; // stop the page behind from scrolling
}

// Hide the modal and clear its contents
function closeModal() {
  modal.classList.remove('open');
  modalBody.innerHTML = '';
  document.body.style.overflow = '';
}

// Three easy ways to close: the ✕ button, clicking the dark backdrop, or pressing Escape
modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  // Only close if the click was on the backdrop itself, not the content
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});