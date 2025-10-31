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

module.exports = { extractThumbnail };