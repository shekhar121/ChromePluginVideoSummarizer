// Sidebar UI Controller for YouTube Summarizer (TrustedHTML-safe version)

class YouTubeSummarizerSidebar {
  constructor() {
    this.sidebar = null;
    this.floatBtn = null;
    this.isOpen = false;
    this.currentVideoData = null;
  }

  /**
   * Create element with text
   */
  createElement(tag, className, text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  /**
   * Clear and set content
   */
  clearAndAppend(parent, ...children) {
    parent.textContent = '';
    children.forEach(child => {
      if (typeof child === 'string') {
        parent.appendChild(document.createTextNode(child));
      } else {
        parent.appendChild(child);
      }
    });
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
    this.floatBtn = this.createElement('button', 'yt-summarizer-float-btn', '📝');
    this.floatBtn.title = 'Summarize Video';
    this.floatBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.floatBtn);
  }

  /**
   * Create sidebar structure
   */
  createSidebar() {
    this.sidebar = this.createElement('div', 'yt-summarizer-sidebar');

    // Header
    const header = this.createElement('div', 'yt-summarizer-header');
    const headerTop = this.createElement('div', 'yt-summarizer-header-top');
    const title = this.createElement('h1', 'yt-summarizer-title');
    title.appendChild(this.createElement('span', 'yt-summarizer-logo', '📝'));
    title.appendChild(document.createTextNode(' AI Summary'));

    const closeBtn = this.createElement('button', 'yt-summarizer-close', '×');
    closeBtn.id = 'yt-summarizer-close';
    closeBtn.addEventListener('click', () => this.close());

    headerTop.appendChild(title);
    headerTop.appendChild(closeBtn);
    header.appendChild(headerTop);
    header.appendChild(this.createElement('p', 'yt-summarizer-subtitle', 'Powered by OpenAI'));

    // Content
    const content = this.createElement('div', 'yt-summarizer-content');
    content.id = 'yt-summarizer-content';

    // Actions
    const actions = this.createElement('div', 'yt-summarizer-actions');
    actions.id = 'yt-summarizer-actions';
    actions.style.display = 'none';

    const copyBtn = this.createElement('button', 'yt-summarizer-btn yt-summarizer-btn-secondary', '📋 Copy');
    copyBtn.id = 'yt-summarizer-copy';
    copyBtn.addEventListener('click', () => this.copySummary());

    const newBtn = this.createElement('button', 'yt-summarizer-btn yt-summarizer-btn-primary', '🔄 New Summary');
    newBtn.id = 'yt-summarizer-new';
    newBtn.addEventListener('click', () => this.showInitial());

    actions.appendChild(copyBtn);
    actions.appendChild(newBtn);

    this.sidebar.appendChild(header);
    this.sidebar.appendChild(content);
    this.sidebar.appendChild(actions);
    document.body.appendChild(this.sidebar);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    console.log('Opening sidebar...');
    this.sidebar.classList.add('open');
    this.isOpen = true;

    // Always show initial state when opening
    this.showInitial();
  }

  close() {
    this.sidebar.classList.remove('open');
    this.isOpen = false;
  }

  /**
   * Show initial state
   */
  showInitial() {
    console.log('Showing initial state...');
    const content = document.getElementById('yt-summarizer-content');

    if (!content) {
      console.error('Content element not found!');
      return;
    }

    this.currentVideoData = null;

    const container = this.createElement('div', '');
    container.style.cssText = 'padding: 40px 20px; text-align: center; display: block !important; visibility: visible !important; opacity: 1 !important;';

    const icon = this.createElement('div', '', '🎥');
    icon.style.cssText = 'font-size: 80px !important; margin-bottom: 20px !important; display: block !important; visibility: visible !important;';

    const title = this.createElement('h2', '', 'Ready to Summarize');
    title.style.cssText = 'font-size: 22px !important; color: #202020 !important; margin-bottom: 15px !important; display: block !important; visibility: visible !important; font-weight: 600 !important;';

    const desc = this.createElement('p', '', 'Click the button below to generate an AI-powered summary of this video with key points and insights.');
    desc.style.cssText = 'font-size: 14px !important; color: #606060 !important; line-height: 1.6 !important; margin-bottom: 30px !important; display: block !important; visibility: visible !important;';

    const btn = this.createElement('button', 'yt-summarizer-btn yt-summarizer-btn-primary', '✨ Generate Summary');
    btn.style.cssText = 'width: auto !important; padding: 15px 40px !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important; background: #ff0000 !important; color: white !important; border: none !important; cursor: pointer !important; font-size: 14px !important; font-weight: 600 !important; border-radius: 8px !important;';
    btn.addEventListener('click', () => {
      console.log('Generate Summary clicked');
      this.startSummarization();
    });

    container.appendChild(icon);
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(btn);

    this.clearAndAppend(content, container);

    const actions = document.getElementById('yt-summarizer-actions');
    if (actions) {
      actions.style.display = 'none';
    }

    console.log('Initial state displayed');
    console.log('Content children:', content.children.length);
    console.log('Container:', container);
    console.log('Content element:', content);
  }

  /**
   * Show loading
   */
  showLoading() {
    const content = document.getElementById('yt-summarizer-content');
    const container = this.createElement('div', 'yt-summarizer-loading');

    const spinner = this.createElement('div', 'yt-summarizer-spinner');
    const text = this.createElement('p', 'yt-summarizer-loading-text', 'Generating AI summary...');
    const subtext = this.createElement('p', '', 'This may take a few seconds');
    subtext.style.cssText = 'font-size: 12px; color: #999; margin-top: 10px;';

    container.appendChild(spinner);
    container.appendChild(text);
    container.appendChild(subtext);

    this.clearAndAppend(content, container);
    document.getElementById('yt-summarizer-actions').style.display = 'none';
  }

  /**
   * Show error
   */
  showError(message) {
    const content = document.getElementById('yt-summarizer-content');
    const container = this.createElement('div', 'yt-summarizer-error');

    const icon = this.createElement('div', 'yt-summarizer-error-icon', '⚠️');
    const msg = this.createElement('p', 'yt-summarizer-error-message', message);
    const btn = this.createElement('button', 'yt-summarizer-btn yt-summarizer-btn-primary', '🔄 Try Again');
    btn.addEventListener('click', () => this.startSummarization());

    container.appendChild(icon);
    container.appendChild(msg);
    container.appendChild(btn);

    this.clearAndAppend(content, container);
    document.getElementById('yt-summarizer-actions').style.display = 'none';
  }

  /**
   * Display summary
   */
  displaySummary(data, fromCache = false) {
    this.currentVideoData = data;
    const content = document.getElementById('yt-summarizer-content');
    const container = this.createElement('div', '');

    // Video info
    const videoInfo = this.createElement('div', 'yt-summarizer-video-info');
    const videoTitle = this.createElement('h2', 'yt-summarizer-video-title', data.title || 'YouTube Video');
    const videoMeta = this.createElement('div', 'yt-summarizer-video-meta');
    const views = this.createElement('span', 'yt-summarizer-meta-item', `📊 ${data.views_count || 0} views`);
    videoMeta.appendChild(views);

    if (fromCache) {
      const cache = this.createElement('span', 'yt-summarizer-cache-badge', '⚡ From Cache');
      videoMeta.appendChild(cache);
    }

    videoInfo.appendChild(videoTitle);
    videoInfo.appendChild(videoMeta);
    container.appendChild(videoInfo);

    // Summary section
    const summarySection = this.createElement('div', 'yt-summarizer-section');
    const summaryTitle = this.createElement('h3', 'yt-summarizer-section-title');
    summaryTitle.appendChild(this.createElement('span', 'yt-summarizer-section-icon', '📄'));
    summaryTitle.appendChild(document.createTextNode(' Summary'));
    const summaryText = this.createElement('div', 'yt-summarizer-summary-text', data.summary);
    summarySection.appendChild(summaryTitle);
    summarySection.appendChild(summaryText);
    container.appendChild(summarySection);

    // Key points
    if (data.key_points && data.key_points.length > 0) {
      const pointsSection = this.createElement('div', 'yt-summarizer-section');
      const pointsTitle = this.createElement('h3', 'yt-summarizer-section-title');
      pointsTitle.appendChild(this.createElement('span', 'yt-summarizer-section-icon', '✨'));
      pointsTitle.appendChild(document.createTextNode(' Key Points'));

      const pointsList = this.createElement('ul', 'yt-summarizer-points-list');
      data.key_points.forEach(point => {
        const li = this.createElement('li', 'yt-summarizer-point');
        li.appendChild(this.createElement('span', 'yt-summarizer-point-icon', '•'));
        li.appendChild(this.createElement('span', '', point));
        pointsList.appendChild(li);
      });

      pointsSection.appendChild(pointsTitle);
      pointsSection.appendChild(pointsList);
      container.appendChild(pointsSection);
    }

    // Timestamps
    if (data.timestamps && data.timestamps.length > 0) {
      const timestampsSection = this.createElement('div', 'yt-summarizer-section');
      const timestampsTitle = this.createElement('h3', 'yt-summarizer-section-title');
      timestampsTitle.appendChild(this.createElement('span', 'yt-summarizer-section-icon', '🎯'));
      timestampsTitle.appendChild(document.createTextNode(' Topics Covered'));

      const timestampsContainer = this.createElement('div', '');
      data.timestamps.forEach(topic => {
        const item = this.createElement('div', 'yt-summarizer-timestamp');
        item.appendChild(this.createElement('span', 'yt-summarizer-timestamp-icon', '▸'));
        item.appendChild(this.createElement('span', '', topic));
        timestampsContainer.appendChild(item);
      });

      timestampsSection.appendChild(timestampsTitle);
      timestampsSection.appendChild(timestampsContainer);
      container.appendChild(timestampsSection);
    }

    this.clearAndAppend(content, container);
    document.getElementById('yt-summarizer-actions').style.display = 'flex';
  }

  /**
   * Start summarization
   */
  async startSummarization() {
    try {
      this.showLoading();

      const videoData = await window.ytSummarizerGetVideoInfo();
      if (!videoData || videoData.error) {
        throw new Error(videoData?.error || 'Failed to get video information');
      }

      // Check cache
      const cacheResponse = await this.checkCache(videoData.videoId);
      if (cacheResponse) {
        this.displaySummary(cacheResponse, true);
        return;
      }

      // Generate new
      const summary = await this.generateSummary(videoData);
      this.displaySummary(summary, false);
    } catch (error) {
      console.error('Summarization error:', error);
      this.showError(error.message || 'An unexpected error occurred');
    }
  }

  async checkCache(videoId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'checkCache', videoId },
        (response) => resolve(response?.success && response.data ? response.data : null)
      );
    });
  }

  async generateSummary(videoData) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'summarize', data: videoData },
        (response) => response?.success ? resolve(response.data) : reject(new Error(response?.error || 'Failed to generate summary'))
      );
    });
  }

  copySummary() {
    if (!this.currentVideoData) return;

    const text = `${this.currentVideoData.title}\n\nSummary:\n${this.currentVideoData.summary}\n\nKey Points:\n${this.currentVideoData.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      const copyBtn = document.getElementById('yt-summarizer-copy');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      copyBtn.style.background = '#4caf50';
      copyBtn.style.color = 'white';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
      }, 2000);
    });
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ytSummarizerSidebar = new YouTubeSummarizerSidebar();
    window.ytSummarizerSidebar.init();
  });
} else {
  window.ytSummarizerSidebar = new YouTubeSummarizerSidebar();
  window.ytSummarizerSidebar.init();
}
