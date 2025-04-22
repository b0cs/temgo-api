import express from 'express';
import { exportData, downloadExport } from '../controllers/export.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt';

const exportRouter = express.Router();

// Middleware personnalisé pour la vérification du token pour la route de téléchargement
// Permet d'utiliser soit un token dans l'en-tête soit un token dans l'URL
const verifyTokenForDownload = async (req, res, next) => {
  try {
    let token;
    
    // Vérifier d'abord l'en-tête d'autorisation
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Sinon, vérifier s'il y a un token dans les paramètres de requête
    else if (req.query.token) {
      token = req.query.token;
    }
    
    // Si aucun token n'est trouvé, retourner une page HTML de redirection
    if (!token) {
      const fileName = req.params.fileName;
      const redirectHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirection vers le téléchargement</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding-top: 50px;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h2 {
              color: #333;
            }
            p {
              color: #666;
              margin-bottom: 20px;
            }
            .loading {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 3px solid rgba(0,0,0,0.3);
              border-radius: 50%;
              border-top-color: #007bff;
              animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
          <script>
            // Cette fonction sera exécutée lorsque la page Web sera chargée
            window.onload = function() {
              // Demander à l'application mobile le token d'authentification
              // Pour le moment, nous allons juste rediriger l'utilisateur vers la page d'authentification
              setTimeout(function() {
                window.location.href = '/api/auth/login?redirectTo=/api/exports/download/${fileName}';
              }, 2000);
            };
          </script>
        </head>
        <body>
          <div class="container">
            <h2>Authentification requise</h2>
            <p>Pour télécharger ce fichier, vous devez être connecté.</p>
            <div class="loading"></div>
            <p>Redirection vers la page de connexion...</p>
          </div>
        </body>
        </html>
      `;
      
      return res.status(401).send(redirectHtml);
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé ou token invalide' });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez l\'administrateur' });
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      cluster: user.cluster
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    res.status(500).json({ message: 'Erreur d\'authentification: ' + error.message });
  }
};

// Appliquer la vérification du token à toutes les routes d'exportation sauf celle de téléchargement
exportRouter.use(/^(?!.*\/download\/).*/i, verifyToken);

// Route pour exporter des données
exportRouter.post('/generate/:clusterId', exportData);

// Route pour télécharger un fichier exporté avec middleware spécifique
exportRouter.get('/download/:fileName', verifyTokenForDownload, downloadExport);

export default exportRouter; 