const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Configure ffmpeg and ffprobe paths with robust fallbacks
try {
  if (process.env.NODE_ENV === 'production') {
    const envFfmpeg = process.env.FFMPEG_PATH;
    const envFfprobe = process.env.FFPROBE_PATH;
    if (envFfmpeg) {
      ffmpeg.setFfmpegPath(envFfmpeg);
      ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
    } else {
      try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        ffmpeg.setFfmpegPath(installer.path);
        const derivedProbe = installer.path.replace('ffmpeg', 'ffprobe');
        if (fs.existsSync(derivedProbe)) {
          ffmpeg.setFfprobePath(derivedProbe);
        } else {
          ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
        }
      } catch (e) {
        ffmpeg.setFfmpegPath('ffmpeg');
        ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
      }
    }
  } else {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch (error) {
  const fallbackPath = path.join(__dirname, '../../ffmpeg-bin/ffmpeg');
  if (fs.existsSync(fallbackPath)) {
    ffmpeg.setFfmpegPath(fallbackPath);
  } else {
    ffmpeg.setFfmpegPath('ffmpeg');
  }
}

function extractThumbnail(videoPath) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(__dirname, '../uploads/thumbnails');

    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (e) {
        return reject(new Error(`Failed to create thumbnails directory: ${e.message}`));
      }
    }

    const outputPath = path.join(outputDir, `${path.basename(videoPath, path.extname(videoPath))}.png`);

    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timemarks: ['5'], // Capture a thumbnail at 5 seconds
        filename: path.basename(outputPath),
        folder: outputDir,
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

// Get video duration in seconds using ffprobe via fluent-ffmpeg
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    try {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) return reject(err);
        const seconds = Math.floor((data && data.format && data.format.duration) ? data.format.duration : 0);
        resolve(Number.isFinite(seconds) ? seconds : 0);
      });
    } catch (e) {
      resolve(0);
    }
  });
}

// Generate a single JPEG thumbnail at a sensible timestamp
// Falls back gracefully if duration cannot be probed
async function generateOptimalThumbnail(videoPath, idForName) {
  const outputDir = path.join(__dirname, '../uploads/thumbnails');

  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (e) {
      throw new Error(`Failed to create thumbnails directory: ${e.message}`);
    }
  }

  // Determine a good timemark: midpoint capped at 30s, fallback to 5s
  let timeMarkSeconds = 5;
  try {
    const duration = await getVideoDuration(videoPath);
    if (duration && duration > 0) {
      timeMarkSeconds = Math.max(1, Math.min(30, Math.floor(duration / 2)));
    }
  } catch (_) {
    // keep fallback
  }

  const fileBase = idForName ? String(idForName) : path.basename(videoPath, path.extname(videoPath));
  const outputPath = path.join(outputDir, `${fileBase}.jpg`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .frames(1)
      .seekInput(timeMarkSeconds)
      .outputOptions([
        '-q:v 3' // reasonable JPEG quality
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = { extractThumbnail, getVideoDuration, generateOptimalThumbnail };