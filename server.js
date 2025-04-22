import express from 'express';
import connectDB from './db.js';
import dotenv from 'dotenv';
import router from './routers/index.router.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuration pour __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de débogage pour afficher toutes les requêtes
app.use((req, res, next) => {
  console.log(`🔍 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // En mode debug, afficher plus d'informations
  if (process.env.NODE_ENV === 'debug') {
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    // Intercepter la réponse pour logger également ce qui est renvoyé
    const oldSend = res.send;
    res.send = function(data) {
      console.log('Response:', data);
      oldSend.apply(res, arguments);
    };
  }
  
  next();
});

// Configuration pour servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

connectDB();

app.use("/api", router);

// Middleware pour capturer les erreurs 404
app.use((req, res) => {
  console.log(`⚠️ Route non trouvée: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route non trouvée: ${req.method} ${req.url}` });
});

app.listen(9000, () => { 
    console.log('Server is running on http://localhost:9000');
});