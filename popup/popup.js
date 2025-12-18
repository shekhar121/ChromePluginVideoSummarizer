// Popup UI controller

// DOM Elements
const elements = {
  initial: document.getElementById('initial'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('error-message'),
  summaryContent: document.getElementById('summary-content'),
  videoTitle: document.getElementById('video-title'),
  summaryText: document.getElementById('summary-text'),
  keyPointsList: document.getElementById('key-points-list'),
  timestampsList: document.getElementById('timestamps-list'),
  keyPointsSection: document.getElementById('key-points-section'),
  timestampsSection: document.getElementById('timestamps-section'),
  cacheInfo: document.getElementById('cache-info'),
  popupFooter: document.getElementById('popup-footer'),
  summarizeBtn: document.getElementById('summarize-btn'),
  retryBtn: document.getElementById('retry-btn'),
  copyBtn: document.getElementById('copy-btn'),
  newSummaryBtn: document.getElementById('new-summary-btn')
};

// State
let currentVideoData = null;

/**
 * Show specific view
 */
function showView(viewName) {
  elements.initial.classList.add('hidden');
  elements.loading.classList.add('hidden');
  elements.error.classList.add('hidden');
  elements.summaryContent.classList.add('hidden');
  elements.popupFooter.classList.add('hidden');

  if (viewName === 'initial') {
    elements.initial.classList.remove('hidden');
  } else if (viewName === 'loading') {
    elements.loading.classList.remove('hidden');
  } else if (viewName === 'error') {
    elements.error.classList.remove('hidden');
  } else if (viewName === 'summary') {
    elements.summaryContent.classList.remove('hidden');
    elements.popupFooter.classList.remove('hidden');
  }
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  showView('error');
}

/**
 * Display summary in UI
 */
function displaySummary(data, fromCache = false) {
  currentVideoData = data;

  // Video title
  elements.videoTitle.textContent = data.title || 'YouTube Video Summary';

  // Summary text
  elements.summaryText.textContent = data.summary;

  // Key points
  if (data.key_points && data.key_points.length > 0) {
    elements.keyPointsList.innerHTML = '';
    data.key_points.forEach(point => {
      const li = document.createElement('li');
      li.textContent = point;
      elements.keyPointsList.appendChild(li);
    });
    elements.keyPointsSection.classList.remove('hidden');
  } else {
    elements.keyPointsSection.classList.add('hidden');
  }

  // Timestamps/Topics
  if (data.timestamps && data.timestamps.length > 0) {
    elements.timestampsList.innerHTML = '';
    data.timestamps.forEach(topic => {
      const div = document.createElement('div');
      div.className = 'topic-item';
      div.textContent = topic;
      elements.timestampsList.appendChild(div);
    });
    elements.timestampsSection.classList.remove('hidden');
  } else {
    elements.timestampsSection.classList.add('hidden');
  }

  // Cache info
  if (fromCache) {
    elements.cacheInfo.classList.remove('hidden');
  } else {
    elements.cacheInfo.classList.add('hidden');
  }

  showView('summary');
}

/**
 * Get video info from content script
 */
async function getVideoInfo() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        reject(new Error('No active tab found'));
        return;
      }

      const tab = tabs[0];

      // Check if it's a YouTube video page
      if (!tab.url || !tab.url.includes('youtube.com/watch')) {
        reject(new Error('Please open a YouTube video page'));
        return;
      }

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to communicate with page. Please refresh and try again.'));
          return;
        }

        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        resolve(response);
      });
    });
  });
}

/**
 * Summarize video
 */
async function summarizeVideo() {
  try {
    showView('loading');

    // Get video info from content script
    const videoData = await getVideoInfo();
    currentVideoData = videoData;

    // Check if summary is cached first
    const cacheResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'checkCache', videoId: videoData.videoId },
        (response) => resolve(response)
      );
    });

    if (cacheResponse.success && cacheResponse.data) {
      displaySummary(cacheResponse.data, true);
      return;
    }

    // Generate new summary
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'summarize', data: videoData },
        (response) => resolve(response)
      );
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate summary');
    }

    displaySummary(response.data, false);

  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'An unexpected error occurred');
  }
}

/**
 * Copy summary to clipboard
 */
function copySummaryToClipboard() {
  if (!currentVideoData) return;

  const summaryText = elements.summaryText.textContent;
  const keyPoints = Array.from(elements.keyPointsList.children)
    .map((li, i) => `${i + 1}. ${li.textContent}`)
    .join('\n');

  const fullText = `${elements.videoTitle.textContent}\n\nSummary:\n${summaryText}\n\nKey Points:\n${keyPoints}`;

  navigator.clipboard.writeText(fullText).then(() => {
    // Visual feedback
    const originalText = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = '<span>✓</span> Copied!';
    elements.copyBtn.style.background = '#4caf50';
    elements.copyBtn.style.color = 'white';

    setTimeout(() => {
      elements.copyBtn.innerHTML = originalText;
      elements.copyBtn.style.background = '';
      elements.copyBtn.style.color = '';
    }, 2000);
  });
}

/**
 * Reset to initial view
 */
function resetToInitial() {
  currentVideoData = null;
  showView('initial');
}

// Event Listeners
elements.summarizeBtn.addEventListener('click', summarizeVideo);
elements.retryBtn.addEventListener('click', summarizeVideo);
elements.copyBtn.addEventListener('click', copySummaryToClipboard);
elements.newSummaryBtn.addEventListener('click', resetToInitial);

// Initialize
showView('initial');
