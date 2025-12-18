// Background service worker for API communication and side panel management

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Set up side panel behavior on installation
 */
chrome.runtime.onInstalled.addListener(() => {
  // Enable side panel to open when extension icon is clicked
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

/**
 * Handle extension icon click - open side panel
 */
chrome.action.onClicked.addListener((tab) => {
  // Open side panel for the current window
  chrome.sidePanel
    .open({ windowId: tab.windowId })
    .catch((error) => console.error("Error opening side panel:", error));
});

/**
 * Send transcript to backend for summarization
 */
async function summarizeVideo(videoData) {
  try {
    const response = await fetch(`${API_BASE_URL}/summerize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(videoData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate summary");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling summarize API:", error);
    throw error;
  }
}

/**
 * Check if summary already exists
 */
async function checkCachedSummary(videoId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/summarize/?video_id=${videoId}`,
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    return null;
  } catch (error) {
    console.error("Error checking cached summary:", error);
    return null;
  }
}

/**
 * Listen for messages from popup or content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);

  if (request.action === "summarize") {
    console.log("Starting summarization for video:", request.data?.videoId);

    (async () => {
      try {
        const summary = await summarizeVideo(request.data);
        console.log("Summarization successful");
        sendResponse({ success: true, data: summary });
      } catch (error) {
        console.error("Summarization failed:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep channel open for async response
  }

  if (request.action === "checkCache") {
    console.log("Checking cache for video:", request.videoId);

    (async () => {
      try {
        const summary = await checkCachedSummary(request.videoId);
        if (summary) {
          console.log("Cache hit!");
          sendResponse({ success: true, data: summary });
        } else {
          console.log("Cache miss");
          sendResponse({ success: false, data: null });
        }
      } catch (error) {
        console.error("Cache check failed:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }

  if (request.action === "contentScriptLoaded") {
    console.log("Content script loaded on:", sender.tab?.url);
    return false;
  }

  console.warn("Unknown action:", request.action);
  return false;
});
