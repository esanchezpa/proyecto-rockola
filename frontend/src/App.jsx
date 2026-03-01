import React, { useEffect } from 'react';
import useRockolaStore from './store/useRockolaStore';
import useKeyManager from './hooks/useKeyManager';
import Layout from './components/Layout';
import AudioPage from './components/AudioPage';
import VideoPage from './components/VideoPage';
import KaraokePage from './components/KaraokePage';
import GenrePage from './components/GenrePage';
import YouTubePage from './components/YouTubePage';
import ConfigPage from './components/ConfigPage';
import { searchYouTube } from './api/rockolaApi';
import './index.css';

export default function App() {
  useKeyManager(); // Global key event listener
  const activeTab = useRockolaStore((s) => s.activeTab);
  const ytLoaded = useRockolaStore((s) => s.ytLoaded);
  const setYtData = useRockolaStore((s) => s.setYtData);

  // Pre-fetch YouTube data on app startup
  useEffect(() => {
    if (!ytLoaded) {
      searchYouTube('')
        .then((data) => {
          setYtData(data.trending || [], data.musicVideos || []);
        })
        .catch(() => { });
    }
  }, [ytLoaded, setYtData]);

  const renderPage = () => {
    switch (activeTab) {
      case 'audio': return <AudioPage />;
      case 'video': return <VideoPage />;
      case 'karaoke': return <KaraokePage />;
      case 'genero': return <GenrePage />;
      case 'top': return <AudioPage />;
      case 'youtube': return <YouTubePage />;
      case 'config': return <ConfigPage />;
      default: return <AudioPage />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}

