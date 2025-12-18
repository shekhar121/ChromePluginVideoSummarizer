// Sidebar UI Controller for YouTube Summarizer

class YouTubeSummarizerSidebar {
  constructor() {
    this.sidebar = null;
    this.floatBtn = null;
    this.isOpen = false;
    this.currentVideoData = null;
  }

  /**
   * Safely set content (avoids TrustedHTML issues)
   */
  setContent(element, content) {
    element.textContent = '';
    if (typeof content === 'string') {
      element.textContent = content;
    } else {
      element.appendChild(content);
    }
  }

  /**
   * Initialize sidebar
   */
  init() {
    this.createFloatingButton();
    this.createSidebar();
  }

  /**
   * Create floating button
   */
  createFloatingButton() {
    this.floatBtn = document.createElement('button');
    this.floatBtn.className = 'yt-summarizer-float-btn';
    this.floatBtn.textContent = '📝';
    this.floatBtn.title = 'Summarize Video';
    this.floatBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.floatBtn);
  }

  /**
   * Create sidebar HTML
   */
  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'yt-summarizer-sidebar';

    // Create structure using DOM methods to avoid TrustedHTML issues
    const header = document.createElement('div');
    header.className = 'yt-summarizer-header';

    const headerTop = document.createElement('div');
    headerTop.className = 'yt-summarizer-header-top';

    const title = document.createElement('h1');
    title.className = 'yt-summarizer-title';
    const logo = document.createElement('span');
    logo.className = 'yt-summarizer-logo';
    logo.textContent = '📝';
    title.appendChild(logo);
    title.appendChild(document.createTextNode(' AI Summary'));

    const closeBtn = document.createElement('button');
    closeBtn.className = 'yt-summarizer-close';
    closeBtn.id = 'yt-summarizer-close';
    closeBtn.textContent = '×';

    headerTop.appendChild(title);
    headerTop.appendChild(closeBtn);

    const subtitle = document.createElement('p');
    subtitle.className = 'yt-summarizer-subtitle';
    subtitle.textContent = 'Powered by OpenAI';

    header.appendChild(headerTop);
    header.appendChild(subtitle);

    const content = document.createElement('div');
    content.className = 'yt-summarizer-content';
    content.id = 'yt-summarizer-content';

    const actions = document.createElement('div');
    actions.className = 'yt-summarizer-actions';
    actions.id = 'yt-summarizer-actions';
    actions.style.display = 'none';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'yt-summarizer-btn yt-summarizer-btn-secondary';
    copyBtn.id = 'yt-summarizer-copy';
    copyBtn.textContent = '📋 Copy';

    const newBtn = document.createElement('button');
    newBtn.className = 'yt-summarizer-btn yt-summarizer-btn-primary';
    newBtn.id = 'yt-summarizer-new';
    newBtn.textContent = '🔄 New Summary';

    actions.appendChild(copyBtn);
    actions.appendChild(newBtn);

    this.sidebar.appendChild(header);
    this.sidebar.appendChild(content);
    this.sidebar.appendChild(actions);

    document.body.appendChild(this.sidebar);

    // Event listeners
    closeBtn.addEventListener('click', () => this.close());
    copyBtn.addEventListener('click', () => this.copySummary());
    newBtn.addEventListener('click', () => this.showInitial());
  }

  /**
   * Toggle sidebar
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open sidebar
   */
  open() {
    this.sidebar.classList.add('open');
    this.isOpen = true;

    // Show initial state or start summarizing
    if (!this.currentVideoData) {
      this.showInitial();
    }
  }

  /**
   * Close sidebar
   */
  close() {
    this.sidebar.classList.remove('open');
    this.isOpen = false;
  }

  /**
   * Show initial state with summarize button
   */
  showInitial() {
    const content = document.getElementById('yt-summarizer-content');
    content.innerHTML = `
      <div style="padding: 40px 20px; text-align: center;">
        <div style="font-size: 80px; margin-bottom: 20px;">🎥</div>
        <h2 style="font-size: 22px; color: #202020; margin-bottom: 15px;">
          Ready to Summarize
        </h2>
        <p style="font-size: 14px; color: #606060; line-height: 1.6; margin-bottom: 30px;">
          Click the button below to generate an AI-powered summary of this video with key points and insights.
        </p>
        <button class="yt-summarizer-btn yt-summarizer-btn-primary"
                id="yt-summarizer-start"
                style="width: auto; padding: 15px 40px;">
          ✨ Generate Summary
        </button>
      </div>
    `;

    document.getElementById('yt-summarizer-start').addEventListener('click', () => {
      this.startSummarization();
    });

    document.getElementById('yt-summarizer-actions').style.display = 'none';
  }

  /**
   * Show loading state
   */
  showLoading() {
    const content = document.getElementById('yt-summarizer-content');
    content.innerHTML = `
      <div class="yt-summarizer-loading">
        <div class="yt-summarizer-spinner"></div>
        <p class="yt-summarizer-loading-text">Generating AI summary...</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">This may take a few seconds</p>
      </div>
    `;
    document.getElementById('yt-summarizer-actions').style.display = 'none';
  }

  /**
   * Show error
   */
  showError(message) {
    const content = document.getElementById('yt-summarizer-content');
    content.innerHTML = `
      <div class="yt-summarizer-error">
        <div class="yt-summarizer-error-icon">⚠️</div>
        <p class="yt-summarizer-error-message">${message}</p>
        <button class="yt-summarizer-btn yt-summarizer-btn-primary"
                id="yt-summarizer-retry">
          🔄 Try Again
        </button>
      </div>
    `;

    document.getElementById('yt-summarizer-retry').addEventListener('click', () => {
      this.startSummarization();
    });

    document.getElementById('yt-summarizer-actions').style.display = 'none';
  }

  /**
   * Display summary
   */
  displaySummary(data, fromCache = false) {
    this.currentVideoData = data;

    const content = document.getElementById('yt-summarizer-content');

    let html = `
      <div class="yt-summarizer-video-info">
        <h2 class="yt-summarizer-video-title">${data.title || 'YouTube Video'}</h2>
        <div class="yt-summarizer-video-meta">
          <span class="yt-summarizer-meta-item">📊 ${data.views_count || 0} views</span>
          ${fromCache ? '<span class="yt-summarizer-cache-badge">⚡ From Cache</span>' : ''}
        </div>
      </div>

      <div class="yt-summarizer-section">
        <h3 class="yt-summarizer-section-title">
          <span class="yt-summarizer-section-icon">📄</span>
          Summary
        </h3>
        <div class="yt-summarizer-summary-text">${data.summary}</div>
      </div>
    `;

    if (data.key_points && data.key_points.length > 0) {
      html += `
        <div class="yt-summarizer-section">
          <h3 class="yt-summarizer-section-title">
            <span class="yt-summarizer-section-icon">✨</span>
            Key Points
          </h3>
          <ul class="yt-summarizer-points-list">
            ${data.key_points.map(point => `
              <li class="yt-summarizer-point">
                <span class="yt-summarizer-point-icon">•</span>
                <span>${point}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    if (data.timestamps && data.timestamps.length > 0) {
      html += `
        <div class="yt-summarizer-section">
          <h3 class="yt-summarizer-section-title">
            <span class="yt-summarizer-section-icon">🎯</span>
            Topics Covered
          </h3>
          <div>
            ${data.timestamps.map(topic => `
              <div class="yt-summarizer-timestamp">
                <span class="yt-summarizer-timestamp-icon">▸</span>
                <span>${topic}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
    document.getElementById('yt-summarizer-actions').style.display = 'flex';
  }

  /**
   * Start summarization process
   */
  async startSummarization() {
    try {
      this.showLoading();

      // Get video info from main content script
      const videoData = await window.ytSummarizerGetVideoInfo();

      if (!videoData || videoData.error) {
        throw new Error(videoData?.error || 'Failed to get video information');
      }

      // Check cache first
      const cacheResponse = await this.checkCache(videoData.videoId);
      if (cacheResponse) {
        this.displaySummary(cacheResponse, true);
        return;
      }

      // Generate new summary
      const summary = await this.generateSummary(videoData);
      this.displaySummary(summary, false);

    } catch (error) {
      console.error('Summarization error:', error);
      this.showError(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Check cache
   */
  async checkCache(videoId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'checkCache', videoId },
        (response) => {
          if (response?.success && response.data) {
            resolve(response.data);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Generate summary
   */
  async generateSummary(videoData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'summarize', data: videoData },
        (response) => {
          if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Failed to generate summary'));
          }
        }
      );
    });
  }

  /**
   * Copy summary to clipboard
   */
  copySummary() {
    if (!this.currentVideoData) return;

    const text = `${this.currentVideoData.title}\n\nSummary:\n${this.currentVideoData.summary}\n\nKey Points:\n${this.currentVideoData.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById('yt-summarizer-copy');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copied!';
      copyBtn.style.background = '#4caf50';
      copyBtn.style.color = 'white';

      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
      }, 2000);
    });
  }
}

// Initialize sidebar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ytSummarizerSidebar = new YouTubeSummarizerSidebar();
    window.ytSummarizerSidebar.init();
  });
} else {
  window.ytSummarizerSidebar = new YouTubeSummarizerSidebar();
  window.ytSummarizerSidebar.init();
}
