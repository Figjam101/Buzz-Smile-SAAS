require('dotenv').config();
const { notifyVideoQueued } = require('../services/discordWebhookService');

(async () => {
  const result = await notifyVideoQueued({
    user: { name: 'Webhook Tester', email: 'tester@example.com' },
    video: { _id: 'test123', title: 'Test Video' },
    jobId: `job_${Date.now()}`
  });
  console.log('Discord webhook test result:', result);
})();