const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function downloadFFmpeg() {
  console.log('🔧 Installing FFmpeg for macOS...');
  
  const ffmpegDir = path.join(__dirname, '../ffmpeg-bin');
  const ffmpegPath = path.join(ffmpegDir, 'ffmpeg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(ffmpegDir)) {
    fs.mkdirSync(ffmpegDir, { recursive: true });
  }
  
  // FFmpeg static build URL for macOS
  const ffmpegUrl = 'https://evermeet.cx/ffmpeg/getrelease/zip';
  const zipPath = path.join(ffmpegDir, 'ffmpeg.zip');
  
  try {
    console.log('📥 Downloading FFmpeg...');
    
    // Download FFmpeg
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      
      const downloadFile = (url) => {
         https.get(url, (response) => {
           // Handle redirects
           if (response.statusCode === 302 || response.statusCode === 301) {
             file.close();
             fs.unlinkSync(zipPath);
             const redirectUrl = response.headers.location;
             // Handle relative URLs
             const fullUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://evermeet.cx${redirectUrl}`;
             downloadFile(fullUrl);
             return;
           }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }
          
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      };
      
      downloadFile(ffmpegUrl);
    });
    
    console.log('📦 Extracting FFmpeg...');
    
    // Extract the zip file
    execSync(`cd "${ffmpegDir}" && unzip -o ffmpeg.zip`, { stdio: 'inherit' });
    
    // Make it executable
    execSync(`chmod +x "${ffmpegPath}"`, { stdio: 'inherit' });
    
    // Clean up zip file
    fs.unlinkSync(zipPath);
    
    // Test the installation
    console.log('🧪 Testing FFmpeg installation...');
    const version = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' });
    console.log('✅ FFmpeg installed successfully!');
    console.log('Version info:', version.split('\n')[0]);
    
    return ffmpegPath;
    
  } catch (error) {
    console.error('❌ Failed to install FFmpeg:', error.message);
    
    // Fallback: try to use system ffmpeg if available
    try {
      execSync('which ffmpeg', { stdio: 'ignore' });
      console.log('🔄 Using system FFmpeg as fallback');
      return 'ffmpeg';
    } catch {
      throw new Error('FFmpeg installation failed and no system FFmpeg found');
    }
  }
}

if (require.main === module) {
  downloadFFmpeg()
    .then((path) => {
      console.log(`✅ FFmpeg ready at: ${path}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Installation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { downloadFFmpeg };