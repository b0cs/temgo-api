import path from 'path';
import { fileURLToPath } from 'url';

import imageRoutes from './routes/image.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/images', imageRoutes); 