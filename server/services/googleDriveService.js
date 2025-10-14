const { google } = require('googleapis');

const createOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || `http://localhost:${process.env.PORT || 5000}/api/google-drive/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const getAuthUrl = (state) => {
  const oauth2Client = createOAuthClient();
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
  ];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: state || undefined,
  });
};

const setCredentialsFromUser = (user) => {
  const oauth2Client = createOAuthClient();
  if (user?.integrations?.googleDrive?.accessToken) {
    oauth2Client.setCredentials({
      access_token: user.integrations.googleDrive.accessToken,
      refresh_token: user.integrations.googleDrive.refreshToken,
      expiry_date: user.integrations.googleDrive.expiryDate ? new Date(user.integrations.googleDrive.expiryDate).getTime() : undefined,
    });
  }
  return oauth2Client;
};

const listFiles = async (user, pageSize = 10) => {
  const auth = setCredentialsFromUser(user);
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.list({
    pageSize,
    fields: 'files(id, name, mimeType, size, modifiedTime)'
  });
  return res.data.files || [];
};

const uploadFile = async (user, filePath, fileName, mimeType) => {
  const fs = require('fs');
  const auth = setCredentialsFromUser(user);
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = { name: fileName };
  if (user?.integrations?.googleDrive?.folderId) {
    fileMetadata.parents = [user.integrations.googleDrive.folderId];
  }

  const media = {
    mimeType,
    body: fs.createReadStream(filePath)
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name'
  });
  return res.data;
};

module.exports = {
  createOAuthClient,
  getAuthUrl,
  listFiles,
  uploadFile,
};