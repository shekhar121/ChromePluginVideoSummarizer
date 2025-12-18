// Side panel UI controller

// DOM Elements
const elements = {
  notYoutube: document.getElementById("not-youtube"),
  initial: document.getElementById("initial"),
  loading: document.getElementById("loading"),
  loadingText: document.getElementById("loading-text"),
  error: document.getElementById("error"),
  errorMessage: document.getElementById("error-message"),
  errorHelp: document.getElementById("error-help"),
  summaryContent: document.getElementById("summary-content"),
  transcriptContent: document.getElementById("transcript-content"),
  transcriptVideoTitle: document.getElementById("transcript-video-title"),
  summaryVideoTitle: document.getElementById("summary-video-title"),
  summaryText: document.getElementById("summary-text"),
  transcriptText: document.getElementById("transcript-text"),
  keyPointsList: document.getElementById("key-points-list"),
  keyExamplesList: document.getElementById("key-examples-list"),
  keyQuotesList: document.getElementById("key-quotes-list"),
  keyReferencesList: document.getElementById("key-references-list"),
  timestampsList: document.getElementById("timestamps-list"),
  keyPointsSection: document.getElementById("key-points-section"),
  keyExamplesSection: document.getElementById("key-examples-section"),
  keyQuotesSection: document.getElementById("key-quotes-section"),
  keyReferencesSection: document.getElementById("key-references-section"),
  timestampsSection: document.getElementById("timestamps-section"),
  cacheInfo: document.getElementById("cache-info"),
  sidepanelFooter: document.getElementById("sidepanel-footer"),
  summarizeBtn: document.getElementById("summarize-btn"),
  summarizeBtnAiGenerated: document.getElementById("summarize-btn-ai-generated"),
  originalTranscriptBtn: document.getElementById("original-transcript-btn"),
  retryBtn: document.getElementById("retry-btn"),
  copyBtn: document.getElementById("copy-btn"),
  newSummaryBtn: document.getElementById("new-summary-btn"),
};

// State
let currentVideoData = null;
let isAiGeneratedSummary = false;

/**
 * Show specific view
 */
function showView(viewName) {
  elements.notYoutube.classList.add("hidden");
  elements.initial.classList.add("hidden");
  elements.loading.classList.add("hidden");
  elements.error.classList.add("hidden");
  elements.summaryContent.classList.add("hidden");
  elements.sidepanelFooter.classList.add("hidden");
  elements.transcriptContent.classList.add("hidden");
  elements.originalTranscriptBtn.classList.add("hidden");
  elements.summarizeBtn.classList.add("hidden");
  elements.summarizeBtnAiGenerated.classList.add("hidden");

  if (viewName === "not-youtube") {
    elements.notYoutube.classList.remove("hidden");
  } else if (viewName === "initial") {
    elements.initial.classList.remove("hidden");
  } else if (viewName === "loading") {
    elements.loading.classList.remove("hidden");
  } else if (viewName === "error") {
    elements.error.classList.remove("hidden");
  } else if (viewName === "summary") {
    elements.summaryContent.classList.remove("hidden");
    elements.sidepanelFooter.classList.remove("hidden");
    elements.originalTranscriptBtn.classList.remove("hidden");
    if(isAiGeneratedSummary){
      elements.summarizeBtnAiGenerated.classList.add("hidden");
      elements.summarizeBtn.classList.add("hidden");
    } else {
      elements.summarizeBtn.classList.remove("hidden");
      //elements.summarizeBtnAiGenerated.classList.add("hidden");
    }
  } else if (viewName === "transcript-content") {
    elements.transcriptContent.classList.remove("hidden");
    elements.sidepanelFooter.classList.remove("hidden");
    if(isAiGeneratedSummary){
      elements.summarizeBtnAiGenerated.classList.remove("hidden");
      elements.summarizeBtn.classList.add("hidden");
    } else {
      elements.summarizeBtn.classList.remove("hidden");
      elements.summarizeBtnAiGenerated.classList.add("hidden");
    }
  }
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorMessage.textContent = message;

  // Show troubleshooting tips if it's a transcript-related error
  if (
    message.toLowerCase().includes("transcript") ||
    message.toLowerCase().includes("caption") ||
    message.toLowerCase().includes("subtitle")
  ) {
    elements.errorHelp.classList.remove("hidden");
  } else {
    elements.errorHelp.classList.add("hidden");
  }

  showView("error");
}

async function loadTranscript(){
  //chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    //const tab = tabs[0];
    //showView("loading");

    console.log('I am here in the sidepanel');
    const videoData = await getVideoInfo();
    console.log('videoData', videoData);
    if (videoData.videoId) {
      currentVideoData = videoData;
      // Video title
      elements.transcriptVideoTitle.classList.remove("hidden");
      elements.transcriptVideoTitle.textContent = videoData.title || "YouTube Video Summary";

      // Summary text
      //elements.transcriptText.classList.remove("hidden");
      elements.transcriptText.innerHTML = videoData.transcript;
      showView("transcript-content");
      elements.summarizeBtn.classList.remove("hidden");
      elements.summarizeBtnAiGenerated.classList.add("hidden");
    } else {
      showView("error");
      elements.errorMessage.textContent = "No video found";
    }
    //showView("initial");
  //});
}

/**
 * Display summary in UI
 */
function displaySummary(data, fromCache = false) {
  //currentVideoData = data;

  // Video title
  elements.summaryVideoTitle.textContent = data.title || "YouTube Video Summary";

  // Summary text
  elements.summaryText.innerHTML = data.summary;

  // Key points
  if (data.key_takeaways && data.key_takeaways.length > 0) {
    elements.keyPointsList.innerHTML = "";
    data.key_takeaways.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      elements.keyPointsList.appendChild(li);
    });
    elements.keyPointsSection.classList.remove("hidden");
  } else {
    elements.keyPointsSection.classList.add("hidden");
  }

  // Key examples
  if (data.notable_examples && data.notable_examples.length > 0) {
    elements.keyExamplesList.innerHTML = "";
    data.notable_examples.forEach((example) => {
      const li = document.createElement("li");
      li.textContent = example;
      elements.keyExamplesList.appendChild(li);
    });
    elements.keyExamplesSection.classList.remove("hidden");
  } else {
    elements.keyExamplesSection.classList.add("hidden");
  }

  // Key quotes
  if (data.notable_quotes && data.notable_quotes.length > 0) {
    elements.keyQuotesList.innerHTML = "";
    data.notable_quotes.forEach((quote) => {
      const li = document.createElement("li");
      li.textContent = quote;
      elements.keyQuotesList.appendChild(li);
    });
    elements.keyQuotesSection.classList.remove("hidden");
  } else {
    elements.keyQuotesSection.classList.add("hidden");
  }

  // Key references
  if (data.notable_references && data.notable_references.length > 0) {
    elements.keyReferencesList.innerHTML = "";
    data.notable_references.forEach((reference) => {
      const li = document.createElement("li");
      li.textContent = reference;
      elements.keyReferencesList.appendChild(li);
    });
    elements.keyReferencesSection.classList.remove("hidden");
  } else {
    elements.keyReferencesSection.classList.add("hidden");
  }

  // Timestamps/Topics
  if (data.summaries && data.summaries.length > 0) {
    console.log("Timestamps data:", data.summaries);
    elements.timestampsList.innerHTML = "";
    data.summaries.forEach((item) => {
      console.log("Processing timestamp item:", item, "Type:", typeof item);
      const div = document.createElement("div");
      div.className = "topic-item";

      // Check if timestamp is an object with time and topic
      if (typeof item === "object" && item.start !== undefined && item.summary) {
        console.log(
          "Creating clickable timestamp for:",
          item.summary,
          "at",
          item.start,
        );
        //const timestamp = formatTimestamp(item.end_sec);
        const timestampSpan = document.createElement("span");
        timestampSpan.className = "timestamp-time";
        let takeaway = item.takeaway || '' ;
        if(takeaway && takeaway.trim() !== ''){
          takeaway = " <p>[" + takeaway + "]</p>";
        }
        timestampSpan.innerHTML = item.start + " - " + item.end + takeaway; //timestamp;

        const topicSpan = document.createElement("div");
        topicSpan.className = "timestamp-topic";
        topicSpan.textContent = item.summary;

        div.appendChild(timestampSpan);
        div.appendChild(topicSpan);
          // Key points
        if (item.key_takeaways && item.key_takeaways.length > 0) {
          const keyPointsList = document.createElement("ul");
          keyPointsList.className = "points-list";
          item.key_takeaways.forEach((point, index) => {
            const li = document.createElement("li");
            li.className = "key-point-item";
            li.textContent = point;
            li.dataset.index = index;
            keyPointsList.appendChild(li);
          });
          div.appendChild(keyPointsList);
        }

        // Make it clickable
        div.style.cursor = "pointer";
        div.dataset.start = item.start;
        isAiGeneratedSummary = true;
        /*div.addEventListener("click", () => {
          console.log("Timestamp clicked! Seeking to:", item.start);
          seekToTimestamp(item.start);
        });*/
        if (typeof item === "object" &&  item.key_points && item.key_points.length > 0) {
          const keyPointsList = document.createElement("ul");
          keyPointsList.className = "points-list";
          item.key_points.forEach((point, index) => {
            const li = document.createElement("li");
            li.className = "key-point-item";
            li.textContent = point;
            li.dataset.index = index;
            keyPointsList.appendChild(li);
          });
          const keyPointsListTitle = document.createElement("h3");
          keyPointsListTitle.className = "section-title";
          keyPointsListTitle.innerHTML = "<span class='section-icon'>✨</span> Key Points";
          div.appendChild(keyPointsListTitle);
          div.appendChild(keyPointsList);
        } else {
          div.style.cursor = "default";
        }
      } else {
        // Fallback for old format (plain strings)
        console.log("Using old format (string) for:", item);
        div.textContent = item;
      }

      elements.timestampsList.appendChild(div);
    });
    elements.timestampsSection.classList.remove("hidden");
  } else {
    elements.timestampsSection.classList.add("hidden");
  }

  // Cache info
  if (fromCache) {
    //elements.cacheInfo.classList.remove("hidden");
  } else {
    //elements.cacheInfo.classList.add("hidden");
  }

  showView("summary");
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}

/**
 * Seek to timestamp in YouTube video
 */
async function seekToTimestamp(seconds) {
  try {
    const tab = await getCurrentTab();

    if (!tab || !tab.id) {
      console.error("No active tab found");
      return;
    }

    // Send message to content script to seek the video
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "seekVideo",
        time: seconds,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error seeking video:", chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log(`Successfully seeked to ${seconds}s`);
        }
      },
    );
  } catch (error) {
    console.error("Error in seekToTimestamp:", error);
  }
}

/**
 * Get current active tab
 */
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/**
 * Ensure content script is injected
 */
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script first
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null); // Content script not loaded
        } else {
          resolve(response);
        }
      });
    });

    // If content script responded, it's already loaded
    if (response) {
      return true;
    }

    // Content script not loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content/content.js"],
    });

    // Wait a bit for the script to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error("Error injecting content script:", error);
    return false;
  }
}

/**
 * Get video info from content script
 */
async function getVideoInfo() {
  const tab = await getCurrentTab();

  if (!tab) {
    throw new Error("No active tab found");
  }

  // Check if it's a YouTube video page
  if (!tab.url || !tab.url.includes("youtube.com/watch")) {
    throw new Error("Please open a YouTube video page");
  }

  // Ensure content script is loaded
  const injected = await ensureContentScript(tab.id);
  if (!injected) {
    throw new Error(
      "Failed to initialize extension on this page. Please refresh and try again.",
    );
  }

  // Send message to content script
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: "getVideoInfo" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(
          new Error(
            "Failed to communicate with page. Please refresh and try again.",
          ),
        );
        return;
      }

      if (response && response.error) {
        //reject(new Error(response.error));
        //transcript not available
        elements.errorMessage.textContent = "Something went wrong";
        elements.errorHelp.classList.remove("hidden");
        showView("error");
        return;
      }

      resolve(response);
    });
  });
}

/**
 * Summarize video
 */
async function summarizeVideo() {
  try {
    showView("loading");

    // Get video info from content script
    const videoData = await getVideoInfo();
    currentVideoData = videoData;

    // Check if summary is cached first
    const cacheResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "checkCache", videoId: videoData.videoId },
        (response) => resolve(response),
      );
    });

    if (cacheResponse.success && cacheResponse.data) {
      displaySummary(cacheResponse.data, true);
      return;
    }

    // Generate new summary
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "summarize", data: videoData },
        (response) => resolve(response),
      );
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to generate summary");
    }

    displaySummary(response.data, false);
  } catch (error) {
    console.error("Error:", error);
    showError(error.message || "An unexpected error occurred");
  }
}

async function summarizeFromPopup() {
  showView("loading");
  elements.loadingText.innerHTML = "Generating summary - Powered by VerbAI";
  // Get video info from content script
  //const videoData = await getVideoInfo();
  const videoData = currentVideoData;
  const payload = {
    videoId: videoData.videoId,
    title: videoData.title,
    url: videoData.url,
    transcript: videoData.transcript,
    description: videoData.description,
    channel_info: videoData.channelInfo,
    transcript_segments: videoData.transcriptSegments.map(s => ({
      start: Math.floor(Number(s.start) || 0),
      text: s.text || s.caption || ''
    }))
  };
console.log('payload', payload);

   // Generate new summary
   const response = await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "summarize", data: payload },
      (response) => resolve(response),
    );
  });

  if (!response.success) {
    //throw new Error(response.error || "Failed to generate summary");
    elements.errorMessage.textContent = response.error || "Failed to generate summary";
    elements.errorHelp.classList.remove("hidden");
    showView("error");
    return;
  }

  displaySummary(response.data, false);
  //displaySummary(data, false);
  showView("summary");
}

function isElementVisibleById(id) {
  const element = document.getElementById(id);
  if (!element) {
    return false; // Element not found
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
/**
 * Copy summary to clipboard
 */
function copySummaryToClipboard() {
  if (!currentVideoData) return;

  const summaryText = elements.summaryText.textContent;
  const keyPoints = Array.from(elements.keyPointsList.children)
    .map((li, i) => `${i + 1}. ${li.textContent}`)
    .join("\n");
  let fullText = '';
  if(isAiGeneratedSummary && isElementVisibleById('original-transcript-btn')){
    fullText = `${elements.summaryVideoTitle.textContent}\n\nSummary:\n${summaryText}\n\n`;
  } else {
    fullText = `${currentVideoData.title}\n\nSummary:\n${currentVideoData.transcript}\n\n`;
  }
  //const fullText = `${elements.summaryVideoTitle.textContent}\n\nSummary:\n${summaryText}\n\nKey Points:\n${keyPoints}`;

  navigator.clipboard.writeText(fullText).then(() => {
    // Visual feedback
    const originalText = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = "<span>✓</span> Copied!";
    elements.copyBtn.style.background = "#4caf50";
    elements.copyBtn.style.color = "white";

    setTimeout(() => {
      elements.copyBtn.innerHTML = originalText;
      elements.copyBtn.style.background = "";
      elements.copyBtn.style.color = "";
    }, 2000);
  });
}

/**
 * Reset to initial view
 */
function resetToInitial() {
  currentVideoData = null;
  showView("initial");
}

/**
 * Check if current tab is a YouTube video page
 */
async function checkCurrentPage() {
  try {
    const tab = await getCurrentTab();

    if (!tab || !tab.url) {
      showView("not-youtube");
      return false;
    }

    // Check if it's a YouTube video page (not just youtube.com)
    const isYouTubeVideo = tab.url.includes("youtube.com/watch");

    if (isYouTubeVideo) {
      showView("initial");
      showView("loading");
      loadTranscript();
      return true;
    } else {
      showView("not-youtube");
      return false;
    }
  } catch (error) {
    console.error("Error checking current page:", error);
    showView("not-youtube");
    return false;
  }
}

/**
 * Listen for tab changes to update the view
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log(`Tab ${tabId} URL changed to: ${changeInfo.url}`);
    //checkCurrentPage();
  }
  if (changeInfo.status === "complete") {
    console.log(`Tab ${tabId} finished loading.`);
    checkCurrentPage();
  }
});


chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`Tab ${activeInfo.tabId} in window ${activeInfo.windowId} is now active.`);
  checkCurrentPage();
});

// Event Listeners
elements.summarizeBtn.addEventListener("click", summarizeFromPopup);
elements.originalTranscriptBtn.addEventListener("click", function(){
  showView("transcript-content");
});
elements.summarizeBtnAiGenerated.addEventListener("click", function(){
  showView("summary");
  //summarizeFromPopup();
});
elements.retryBtn.addEventListener("click", summarizeFromPopup);
elements.copyBtn.addEventListener("click", copySummaryToClipboard);
//elements.newSummaryBtn.addEventListener("click", resetToInitial);

// Initialize - check current page
checkCurrentPage();
