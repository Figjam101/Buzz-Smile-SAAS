const axios = require('axios');

async function sendDiscordWebhook(payload = {}) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { ok: false, reason: 'missing_webhook_url' };
  try {
    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: err?.message || 'request_failed' };
  }
}

function buildVideoQueuedPayload({ user, video, jobId }) {
  const username = user?.name || user?.email || 'Unknown User';
  const title = video?.title || video?.filename || `Video ${video?._id}`;
  return {
    content: `📹 A video was requested for editing`,
    embeds: [
      {
        title: 'Video Queued For Editing',
        color: 5814783,
        fields: [
          { name: 'User', value: String(username), inline: true },
          { name: 'Video', value: String(title), inline: true },
          { name: 'Video ID', value: String(video?._id || ''), inline: false },
          { name: 'Job ID', value: String(jobId || ''), inline: false },
          { name: 'Status', value: 'queued', inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function notifyVideoQueued({ user, video, jobId }) {
  const payload = buildVideoQueuedPayload({ user, video, jobId });
  return await sendDiscordWebhook(payload);
}

module.exports = {
  notifyVideoQueued,
};