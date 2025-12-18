import os
import json
from typing import List, Dict, Any
import math
from flask import Flask, request, jsonify, make_response
from dotenv import load_dotenv, find_dotenv
import pymysql
import pymysql.cursors

from openai import OpenAI

# -------- Config --------
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

app = Flask(__name__)

# Load .env if present (server-side only)
_env_path = find_dotenv(usecwd=True)
# Only load if found; environment variables take precedence
if _env_path:
    load_dotenv(_env_path)

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set on the server. Configure it in the environment or .env file.")
    _client = OpenAI(api_key=api_key)
    return _client


def call_openai_json(prompt: str) -> Dict[str, Any]:
    client = get_client()
    resp = client.chat.completions.create(
        model=MODEL,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are VerbAI — an expert AI summarizer that creates clear, timestamped summaries of videos for students and professionals. "
                    "You return data in structured JSON. Do not include explanations outside of the JSON object."
                )
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=1800
    )
    content = resp.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"raw": content}


def get_db():
    return pymysql.connect(
        host=os.getenv('DB_HOST', '127.0.0.1'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'verbai'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def db_fetch_video_by_id(conn, video_id: str):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM videodata WHERE video_id=%s LIMIT 1", (video_id,))
        return cur.fetchone()


def db_increment_called(conn, row_id: int):
    with conn.cursor() as cur:
        cur.execute("UPDATE videodata SET called = called + 1 WHERE id=%s", (row_id,))


def db_insert_video(conn, payload: dict, ai_json: dict):
    video_id = payload.get('videoId') or ''
    video_title = payload.get('title') or ''
    description = payload.get('description') or ''
    transcript = payload.get('transcript') or ''
    transcript_segments_raw = payload.get('transcript_segments_original') or payload.get('transcript_segments') or []

    # Normalize channel_info (accept camelCase/snake_case; parse string)
    raw_channel = payload.get('channel_info') or payload.get('channelInfo')
    if isinstance(raw_channel, str):
        try:
            raw_channel = json.loads(raw_channel)
        except Exception:
            raw_channel = None
    channel_info = raw_channel or {
        'name': payload.get('channelName') or '',
        'url': payload.get('channelUrl') or '',
        'channelId': payload.get('channelId') or ''
    }
    if not isinstance(channel_info, dict):
        channel_info = {}
    app.logger.debug("db_insert_video channel_info: %s", channel_info)

    ai_summary = ai_json.get('summary') or ai_json.get('concise_summary') or ''

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO videodata
            (video_id, video_title, description, transcript, transcript_json, ai_summary, ai_summaries_json, channel_info, status, called)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s, %s, %s)
            """,
            (
                video_id,
                video_title,
                description,
                transcript,
                json.dumps(transcript_segments_raw, ensure_ascii=False),
                ai_summary,
                json.dumps(ai_json, ensure_ascii=False),
                json.dumps(channel_info, ensure_ascii=False),
                1,
                1,
            ),
        )
        return cur.lastrowid


@app.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return resp


@app.before_request
def log_request_info():
    try:
        headers = dict(request.headers)
        body = request.get_data(cache=True, as_text=True)[:2000]
        app.logger.debug('Method: %s', request.method)
        app.logger.debug('Path: %s', request.path)
        app.logger.debug('Query: %s', request.query_string.decode('utf-8', 'ignore'))
        app.logger.debug('Accepts: %s', str(request.accept_mimetypes))
        app.logger.debug('Headers: %s', headers)
        app.logger.debug('Body: %s', body)
    except Exception as e:
        app.logger.warning('Request logging failed: %s', e)


# -------- Long-video friendly chunked summarization helpers --------
def choose_block_size(total_seconds: int) -> int:
    """Return an equal-partition block size based on total duration.

    - ~<= 60 min → 4 sections
    - 60120 min → 6 sections
    - 120-180 min → 8 sections
    - > 180 min → 10 sections

    The returned block size is ceil(total_seconds / sections).
    """
    if total_seconds <= 1800:
        sections = 2
    elif total_seconds <= 3600:
        sections = 4
    elif total_seconds <= 2 * 3600:
        sections = 6
    elif total_seconds <= 3 * 3600:
        sections = 8
    else:
        sections = 10
    return int(math.ceil(total_seconds / max(1, sections)))


def build_time_blocks(segments: List[Dict[str, Any]], block_size: int) -> List[Dict[str, Any]]:
    segs = sorted(segments or [], key=lambda s: s.get("start", 0))
    if not segs:
        return []
    total_seconds = int(max(s.get("start", 0) for s in segs))
    blocks = []
    start_idx = 0
    n = len(segs)
    while start_idx < n:
        block_start = segs[start_idx]["start"]
        # cap last block at total duration to avoid overshoot (e.g., 138 → not 150)
        block_end = min(block_start + block_size, total_seconds)
        texts = []
        j = start_idx
        # include segments that start strictly before block_end; last block will cap to total_seconds
        while j < n and segs[j]["start"] < block_end:
            if segs[j].get("text"):
                texts.append(segs[j]["text"])
            j += 1
        if texts:
            start_m, start_s = divmod(int(block_start), 60)
            end_m, end_s = divmod(int(block_end), 60)
            blocks.append({
                "start_sec": block_start,
                "end_sec": block_end,
                "start": f"{start_m}:{start_s:02d}",
                "end": f"{end_m}:{end_s:02d}",
                "text": " ".join(texts).strip(),
            })
        # advance to first index not yet included
        start_idx = j if j > start_idx else start_idx + 1
        # if we are at the end and did not cover up to total_seconds, break safely
        if start_idx >= n:
            break
    # If we created no blocks (e.g., sparse), create a single block spanning total_seconds
    if not blocks:
        start_m, start_s = 0, 0
        end_m, end_s = divmod(total_seconds, 60)
        blocks.append({
            "start_sec": 0,
            "end_sec": total_seconds,
            "start": f"{start_m}:{start_s:02d}",
            "end": f"{end_m}:{end_s:02d}",
            "text": " ".join([s.get("text", "") for s in segs]).strip(),
        })
    return blocks


def summarize_block_json(block_text: str, start: str, end: str) -> Dict[str, Any]:
    prompt = f"""
Return JSON summarizing this transcript block from {start} to {end}.

Fields:
- summary: 3-6 sentences
- takeaway: 1 sentence
- key_points: 3-5 short bullets
- important_quotes: ["..."]
- important_examples: ["..."]
- important_references: ["..."]

Transcript:
\"\"\"{block_text}\"\"\"
""".strip()
    return call_openai_json(prompt)


def synthesize_overall_json(block_summaries: List[Dict[str, Any]], title: str, style: str, description: str, transcript: str) -> Dict[str, Any]:
    blocks_json = json.dumps(block_summaries, ensure_ascii=False)
    prompt = f"""
You are an expert video content summarizer who creates clear, engaging, and structured summaries from YouTube video transcripts.
You are given:
- Video Title: "{title}"
- Description: "{description}"
- User selected summary style: "{style}"
- Transcript:
\"\"\"{transcript}\"\"\"

The transcript is divided into time-based segments.
For each segment:
1. Include the start and end time,
2. Write a concise summary (100-150 words) from the transcript covering the main points, insights, and transitions in that block.
3. Understand the video deeply and summarize it in a way that is valuable, concise, and engaging to readers.
4. Include all major ideas, insights, quotes, and key takeaways.
5. End with a brief one-line takeaway for that section.
6. Avoid clickbait. Be clear and intelligent.
7. Match the tone to the topic (e.g., serious, educational, uplifting, insightful, etc.)
8. Return output strictly as JSON in this format: DON't send raw text, only JSON.
Video Title: "{title}"
Description: "{description}"
User selected summary style: "{style}"
Transcript:
\"\"\"{transcript}\"\"\"

The transcript is divided into time-based segments.
For each segment:
1. Include the start and end time,
2. Write a concise summary (100-150 words) from the transcript covering the main points, insights, and transitions in that block.
3. Keep factual accuracy, quotes, and examples when relevant, avoid filler, and focus on educational or actionable insights
4. End with a brief one-line takeaway for that section.
5. Highlight special mentions, guest names, quotes, or references.
6. Write in a natural, human tone — as if explaining to a curious learner.
7. Return output strictly as JSON in this format: DON't send raw text, only JSON.

Return this JSON object:
{{
  "title": "...",
  "style": "...",
  "summary": "A concise 2-3 paragraphs summary of the full video, including the main points, insights, and transitions."
  "key_takeaways": [
    "Point 1...",
    "Point 2...",
    "Point 3..."
  ],
  "notable_examples": [
    "Example 1...",
    "Example 2...",
    "Example 3..."
  ],
  "notable_references": [
    "Reference 1...",
    "Reference 2...",
    "Reference 3..."
  ],
  "notable_quotes": [
    "\"Quote 1\" - Speaker",
    "\"Quote 2\" - Speaker"
  ],
  "summaries": [
    {{
    "start": "0:00",
    "end": "15:00",
    "summary": "...",
    "takeaway": "...",
    "key_takeaways": ["..."],
    "notable_quotes": ["..."],
    "notable_examples": ["..."],
    "notable_references": ["..."]
    }}
]

}}

Tone:
- Balanced, insightful, and easy to follow.
- Avoid filler phrases.
- Keep the content factual, structured, and educational.

Use the given per-block summaries as input (do not invent timestamps). Preserve the same start/end for each block.

Per-block summaries:
{blocks_json}
""".strip()
    return call_openai_json(prompt)


@app.route("/api/summerize", methods=["POST", "OPTIONS"])
def summerize():
    if request.method == "OPTIONS":
        return make_response("", 204)

    data = request.get_json(silent=True) or {}
    video_id = data.get("videoId") or ""
    title = data.get("title") or ""
    url = data.get("url") or ""
    description = data.get("description") or ""
    transcript = data.get("transcript") or ""
    style = data.get("style", "paragraph")
    transcript_segments_raw = data.get("transcript_segments") or []

    # Normalize channel info from request (accept both keys; parse string)
    raw_channel = data.get("channel_info") or data.get("channelInfo")
    if isinstance(raw_channel, str):
        try:
            raw_channel = json.loads(raw_channel)
        except Exception:
            raw_channel = None
    channel_info = raw_channel or {
        "name": data.get("channelName") or "",
        "url": data.get("channelUrl") or "",
        "channelId": data.get("channelId") or ""
    }

    if not video_id:
        return jsonify({"error": "videoId is required"}), 400

    # 1) Check cache
    try:
        conn = get_db()
        row = db_fetch_video_by_id(conn, video_id)
        if row:
            db_increment_called(conn, row["id"])
            try:
                cached_json = json.loads(row.get("ai_summaries_json") or "{}")
            except Exception:
                cached_json = {}
            if "title" not in cached_json:
                cached_json["title"] = row.get("video_title") or title
            if "style" not in cached_json:
                cached_json["style"] = style
            # Optionally update missing channel_info if request has it
            try:
                if channel_info and channel_info != {}:
                    existing_raw = row.get("channel_info")
                    if not existing_raw or str(existing_raw).strip() in ("", "null", "NULL", "{}"):
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE videodata SET channel_info=%s WHERE id=%s",
                                (json.dumps(channel_info, ensure_ascii=False), row["id"]),
                            )
            except Exception as e:
                app.logger.warning("Channel info update on cache hit failed: %s", e)
            cached_json["_cache"] = True
            return jsonify(cached_json)
    except Exception as e:
        app.logger.warning("DB cache read failed: %s", e)

    # 2) No cache: need transcript segments
    if not transcript_segments_raw:
        return jsonify({"error": "Transcript data is required"}), 400

    # Normalize segments to seconds/text
    normalized_segments: List[Dict[str, Any]] = []
    for s in transcript_segments_raw:
        try:
            start = int(float(s.get("start", 0)))
        except Exception:
            start = 0
        text = s.get("text") or s.get("caption") or ""
        if text:
            normalized_segments.append({"start": start, "text": text})

    if not normalized_segments:
        return jsonify({"error": "Transcript data is required"}), 400

    # Build blocks
    total_seconds = int(max(s["start"] for s in normalized_segments))
    block_size = choose_block_size(total_seconds)
    blocks = build_time_blocks(normalized_segments, block_size)
    app.logger.debug("blocks=%s block_size=%s", len(blocks), block_size)

    # Summarize each block separately
    timestamped_summaries = []
    for blk in blocks:
        blk_result = summarize_block_json(blk["text"], blk["start"], blk["end"])
        timestamped_summaries.append({
            "start": blk["start"],
            "end": blk["end"],
            "start_sec": blk["start_sec"],
            "end_sec": blk["end_sec"],
            "summary": blk_result.get("summary", ""),
            "key_points": blk_result.get("key_points", []),
        })

    # Synthesize final JSON
    result = synthesize_overall_json(timestamped_summaries, title=title, style=style, description=description, transcript=transcript)
    if "title" not in result:
        result["title"] = title
    if "style" not in result:
        result["style"] = style
    # Ensure summaries are present; if not, inject ours
    if "summaries" not in result or not isinstance(result["summaries"], list) or not result["summaries"]:
        result["summaries"] = [
            {
                "start": s["start"],
                "end": s["end"],
                "summary": s["summary"],
                "takeaway": "",
                "key_points": s["key_points"],
                "important_topics": [],
                "important_quotes": [],
                "important_examples": [],
                "important_references": []
            }
            for s in timestamped_summaries
        ]

    # 3) Insert into DB (best-effort)
    try:
        conn = get_db()
        db_insert_video(
            conn,
            {
                "videoId": video_id,
                "title": title,
                "description": description,
                "transcript": transcript,
                "transcript_segments_original": transcript_segments_raw,
                "channel_info": channel_info,
            },
            result,
        )
    except Exception as e:
        app.logger.warning("DB insert failed: %s", e)

    return jsonify(result)


if __name__ == "__main__":
    # Run:  set OPENAI_API_KEY=sk-...  &&  python app3.py
    app.run(debug=True)


