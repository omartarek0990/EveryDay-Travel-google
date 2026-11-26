import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Self-hosted fonts: only the unicode-range files a page actually uses are downloaded.
import '@fontsource-variable/cairo/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';

createRoot(document.getElementById('root')!).render(<App />);
