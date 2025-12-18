// Content script to extract video information and transcript from YouTube

/**
 * Extract video ID from YouTube URL
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

/**
 * Get video title
 */
function getVideoTitle() {
  const titleElement = document.querySelector(
    "h1.ytd-watch-metadata yt-formatted-string",
  );
  return titleElement ? titleElement.textContent.trim() : "";
}

/**
 * Wait for ytInitialPlayerResponse to be available
 */
async function waitForPlayerResponse(maxWaitTime = 3000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (
      window.ytInitialPlayerResponse &&
      window.ytInitialPlayerResponse.captions
    ) {
      console.log("ytInitialPlayerResponse is available");
      return true;
    }

    // Wait 100ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("ytInitialPlayerResponse wait timeout");
  return false;
}

/**
 * Get caption tracks from YouTube player config
 */
async function getCaptionTracksFromPlayer() {
  try {
    // Wait for player response to be available
    await waitForPlayerResponse();

    // Try to access YouTube's player response data
    const playerResponse = window.ytInitialPlayerResponse;

    if (playerResponse && playerResponse.captions) {
      const captionTracks =
        playerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;

      if (captionTracks && captionTracks.length > 0) {
        console.log(
          "Found caption tracks in player config:",
          captionTracks.length,
        );
        return captionTracks;
      }
    }

    console.log("No caption tracks found in player config");
    return null;
  } catch (error) {
    console.error("Error getting caption tracks from player:", error);
    return null;
  }
}

/**
 * Wait for YouTube player to be ready
 */
async function waitForYouTubePlayer(maxWaitTime = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    // Check if player is ready by looking for player element
    const player = document.querySelector("#movie_player, .html5-video-player");
    const video = document.querySelector("video");

    if (player && video && video.readyState >= 2) {
      console.log("YouTube player is ready");
      return true;
    }

    // Wait 100ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("YouTube player wait timeout");
  return false;
}

// Get video description (player response preferred, DOM fallback)
async function getVideoDescription() {
  try {
    await waitForPlayerResponse();
    const pr = window.ytInitialPlayerResponse;
    console.log("Player response:", pr);
    const shortDesc = pr?.videoDetails?.shortDescription;
    if (shortDesc && shortDesc.trim().length > 0) {
      return shortDesc.trim();
    }
  } catch (e) {
    // ignore and try DOM fallback
  }

  // DOM fallback selectors (YouTube changes often; try several)
  const selectors = [
    '#description yt-formatted-string', '#snippet', '#expanded',
    '#description', '#snippet yt-core-attributed-string--link-inherit-color',
    'ytd-text-inline-expander yt-formatted-string',
    'ytd-text-inline-expander #description-inline-expander',
    'yt-attributed-string.ytd-watch-metadata'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const txt = (el.innerText || el.textContent || '').trim();
      if (txt) return txt;
    }
  }
  return '';
}

// Get channel name and URL (player response preferred, DOM fallback)
async function getChannelInfo() {
  // Prefer ytInitialPlayerResponse (reliable)
  try {
    await waitForPlayerResponse();
    const pr = window.ytInitialPlayerResponse;
    const name = pr?.videoDetails?.author?.trim() || '';
    const channelId = pr?.videoDetails?.channelId || '';
    const url = channelId ? `https://www.youtube.com/channel/${channelId}` : '';
    if (name || url) {
      return { name, url, channelId };
    }
  } catch (e) {
    // ignore and try DOM fallback
  }

  // DOM fallbacks (try several known locations)
  const candidates = [
    // Common owner block
    'ytd-video-owner-renderer a.yt-simple-endpoint',
    // Channel name container by id
    '#channel-name a',
    // Newer channel name component
    'ytd-channel-name a',
    // Sometimes under owner container
    '#owner-container a.yt-simple-endpoint',
  ];

  for (const sel of candidates) {
    const a = document.querySelector(sel);
    if (a && (a.textContent || '').trim()) {
      const name = a.textContent.trim();
      const href = a.getAttribute('href') || '';
      const url = href ? new URL(href, location.origin).href : '';
      return { name, url, channelId: '' };
    }
  }

  return { name: '', url: '', channelId: '' };
}

/**
 * Fetch transcript using YouTube's internal API
 */
async function fetchTranscript(videoId, retryCount = 0) {
  const maxRetries = 2;

  try {
    // Wait for YouTube player to be ready before fetching transcript
    await waitForYouTubePlayer();

     // Pre-fetch description (non-blocking for transcript flow)
     const description = await getVideoDescription();
     const channelInfo = await getChannelInfo();
     console.log("Video description:", description);
     console.log("Channel info:", channelInfo);
    console.log(
      `Attempting to fetch transcript for video: ${videoId} (attempt ${retryCount + 1})`,
    );

    // Try to get caption tracks from YouTube player config first
    const captionTracks = await getCaptionTracksFromPlayer();
    let languagesToTry = [];
    let preferredTrackUrl = '';

    if (captionTracks && captionTracks.length > 0) {
      // Choose the active/default track or first as fallback
      const preferredTrack =
      captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];

    // Use the signed baseUrl from the player; strip any fmt override
    if (preferredTrack?.baseUrl) {
        preferredTrackUrl = preferredTrack.baseUrl.replace(/&fmt=\w+$/, '');
      console.log("Preferred track URL:", preferredTrackUrl);
    }

    // Also keep a list of available language codes as backup
    languagesToTry = captionTracks.map(t => t.languageCode);
      console.log("Using caption tracks from player:", languagesToTry);
    } else {
      // Fallback to trying common languages
      languagesToTry = ['en','en-US','en-GB','en-CA','en-AU','es','fr','de','it','pt','ja','ko','zh','hi','ar'];
      console.log("No player caption data, trying common languages");
    }

    // Try full, signed baseUrl from the player first
    if (preferredTrackUrl) {
      try {
        const resp = await fetch(preferredTrackUrl);
        if (resp.ok) {
          const xml = await resp.text();
          const doc = new DOMParser().parseFromString(xml, 'text/xml');
          const nodes = doc.getElementsByTagName('text');
          if (nodes.length > 0) {
            const transcriptSegments = Array.from(nodes).map(node => ({
              start: parseFloat(node.getAttribute('start') || '0'),
              duration: parseFloat(node.getAttribute('dur') || '0'),
              text: node.textContent.trim(),
            }));
            //const description = await getVideoDescription();
            //const channelInfo = await getChannelInfo();
            return { transcriptSegments, description, channelInfo };
          }
        }
      } catch (e) {
        console.log('baseUrl fetch failed, falling back to timedtext...', e);
      }
    }

    // Fallback: generic timedtext by language (may be partial on very long videos)
    for (const lang of languagesToTry) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
        const response = await fetch(url);
        if (!response.ok) continue;

        const text = await response.text();
        if (!text || !text.trim()) continue;

        const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('text');
        if (textNodes.length === 0) continue;

        const transcriptSegments = Array.from(textNodes).map(node => ({
          start: parseFloat(node.getAttribute('start') || '0'),
          duration: parseFloat(node.getAttribute('dur') || '0'),
          text: node.textContent.trim(),
        }));
        const description = await getVideoDescription();
        const channelInfo = await getChannelInfo();
        return { transcriptSegments, description, channelInfo };
      } catch (err) {
        console.log(`Failed to fetch timedtext for ${lang}:`, err);
      }
    }

    // Method 1: Use YouTube's timedtext API
    /*for (const lang of languagesToTry) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
        const response = await fetch(url);

        if (response.ok) {
          const text = await response.text();

          // Check if response contains actual transcript data
          if (text && text.trim().length > 0) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const textNodes = xmlDoc.getElementsByTagName("text");

            if (textNodes.length > 0) {
              // Extract both text and timestamps
              const transcriptSegments = Array.from(textNodes).map((node) => ({
                start: parseFloat(node.getAttribute("start") || "0"),
                duration: parseFloat(node.getAttribute("dur") || "0"),
                text: node.textContent.trim(),
              }));

              console.log(
                `Successfully fetched transcript with ${transcriptSegments.length} segments in language: ${lang}`,
              );
              //return transcriptSegments;
              return {
                transcriptSegments,
                description,
                channelInfo,
              };
            }
          }
        }
      } catch (err) {
        console.log(`Failed to fetch transcript for lang ${lang}:`, err);
      }
    }*/

    // Method 2: Try to get transcript from page (if captions are enabled)
    console.log("Trying to get transcript from page UI...");
    const transcriptButton = document.querySelector(
      '[aria-label*="transcript" i], [aria-label*="Show transcript" i]',
    );

    if (transcriptButton) {
      transcriptButton.click();

      // Wait for transcript to load
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const transcriptSegments = document.querySelectorAll(
        "ytd-transcript-segment-renderer",
      );

      if (transcriptSegments.length > 0) {
        const segments = Array.from(transcriptSegments)
          .map((segment) => {
            const textElement = segment.querySelector(".segment-text");
            const timestampElement =
              segment.querySelector(".segment-timestamp");

            let startTime = 0;
            if (timestampElement) {
              // Parse timestamp like "0:30" or "1:25:30" to seconds
              const timeStr = timestampElement.textContent.trim();
              const parts = timeStr.split(":").reverse();
              startTime = parts.reduce(
                (acc, val, idx) => acc + parseInt(val) * Math.pow(60, idx),
                0,
              );
            }

            return {
              start: startTime,
              duration: 0,
              text: textElement ? textElement.textContent.trim() : "",
            };
          })
          .filter((seg) => seg.text.length > 0);

        if (segments.length > 0) {
          console.log(
            "Successfully fetched transcript from page UI with timestamps",
          );
          //return segments;
          return {
            transcriptSegments: segments,
            description,
            channelInfo,
          };
        }
      }
    }

    console.error("No transcript found using any method");

    // Retry logic - if this is the first or second attempt, try again
    if (retryCount < maxRetries) {
      console.log(
        `Retrying transcript fetch (${retryCount + 1}/${maxRetries})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return fetchTranscript(videoId, retryCount + 1);
    }

    throw new Error(
      "No captions/transcript available. This video doesn't have captions enabled. Please try a video with captions.",
    );
  } catch (error) {
    if (error.message.includes("No captions/transcript available")) {
      throw error;
    }

    // Retry on other errors too (like network issues)
    if (retryCount < maxRetries) {
      console.log(
        `Error occurred, retrying... (${retryCount + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchTranscript(videoId, retryCount + 1);
    }

    throw new Error(`Unable to fetch transcript: ${error.message}`);
  }
}

/**
 * Seek YouTube video to specific time
 */
function seekVideo(seconds) {
  try {
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = seconds;
      console.log(`Video seeked to ${seconds} seconds`);
      return true;
    } else {
      console.error("Video element not found");
      return false;
    }
  } catch (error) {
    console.error("Error seeking video:", error);
    return false;
  }
}

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Respond to ping to check if content script is loaded
  if (request.action === "ping") {
    sendResponse({ ready: true });
    return false;
  }

  if (request.action === "seekVideo") {
    const success = seekVideo(request.time);
    sendResponse({ success });
    return false;
  }

  if (request.action === "getVideoInfo") {
    const videoId = getVideoId();

    if (!videoId) {
      sendResponse({
        error: "No video ID found. Please open a YouTube video.",
      });
      return true;
    }

    const title = getVideoTitle();

    // Fetch transcript asynchronously
    fetchTranscript(videoId)
      .then(({transcriptSegments, description, channelInfo}) => {
        // Send both the segments (with timestamps) and plain text
        const plainText = transcriptSegments.map((seg) => seg.text).join(" ");

        sendResponse({
          videoId,
          title,
          transcript: plainText, // Plain text for backend
          transcriptSegments: transcriptSegments, // Timestamped segments
          description,
          channelInfo,
          url: window.location.href,
        });
      })
      .catch((error) => {
        sendResponse({
          error: error.message,
          videoId,
          title,
        });
      });

    return true; // Keep channel open for async response
  }
});

// Export function for sidebar to use
window.ytSummarizerGetVideoInfo = async function () {
  const videoId = getVideoId();

  if (!videoId) {
    return { error: "No video ID found. Please open a YouTube video." };
  }

  const title = getVideoTitle();

  try {
    const {transcriptSegments, description, channelInfo} = await fetchTranscript(videoId);
    const plainText = transcriptSegments.map((seg) => seg.text).join(" ");

    return {
      videoId,
      title,
      transcript: plainText,
      transcriptSegments: transcriptSegments,
      description,
      channelInfo: JSON.stringify(channelInfo) || '{}',
      url: window.location.href,
    };
  } catch (error) {
    return {
      error: error.message,
      videoId,
      title,
    };
  }
};

// Load sidebar
const script = document.createElement("script");
script.src = chrome.runtime.getURL("content/sidebar.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Notify background that content script is loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });
