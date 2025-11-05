import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import GlassCard from '../components/ui/GlassCard';
import GlassButton from '../components/ui/GlassButton';
import ProgressBar from '../components/ui/ProgressBar';
import SchedulingWizard from '../components/SchedulingWizard';
import { Upload, CheckCircle } from 'lucide-react';

export default function UploadScheduler() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
    setProgress(0);
    setReady(false);
    // Simulate upload progress for prototype
    let v = 0;
    const interval = setInterval(() => {
      v = Math.min(100, v + Math.random() * 20);
      setProgress(v);
      if (v >= 100) {
        clearInterval(interval);
        setReady(true);
        toast.success("Your video is getting ready to be edited. You'll be notified when it's ready to post.");
      }
    }, 400);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'video/*': [] } });

  const handleSchedule = (data) => {
    toast.success(`Scheduled on ${data.platforms.join(', ')} for ${data.date} ${data.time}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-3">Upload your video</h2>
          <div
            {...getRootProps()}
            className={`mt-3 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-white/30 bg-white/20'} hover:bg-white/30`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-blue-600" />
            <p className="mt-3 text-gray-700">Drag & drop your video here, or click to select</p>
            <p className="text-xs text-gray-500">Supported: MP4, AVI, MOV, WMV, FLV, WebM, MKV</p>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{files[0].name}</span>
              </div>
              <ProgressBar value={progress} label="Upload progress" />
            </div>
          )}
        </GlassCard>

        <div>
          <h2 className="text-xl font-semibold mb-3">Schedule your post</h2>
          <SchedulingWizard onSchedule={handleSchedule} />
          <div className="mt-4 flex justify-end">
            <GlassButton disabled={!ready} onClick={() => toast.success('Video ready! In-app notification will appear on next login.')}>Finish</GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}