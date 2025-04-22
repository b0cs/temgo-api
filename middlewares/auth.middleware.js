import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret-jwt';

/**
 * Middleware d'authentification
 * Vérifie la validité du token JWT et charge l'utilisateur
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès non autorisé. Token manquant' });
    }

    const token = authHeader.split(' ')[1];

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

/**
 * Middleware de vérification des rôles
 * @param {Array} roles - Liste des rôles autorisés
 */
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès non autorisé. Rôle insuffisant' });
    }

    next();
  };
};

/**
 * Middleware de vérification des permissions
 * @param {Array} requiredPermissions - Liste des permissions requises
 */
export const checkPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }

    const hasAllPermissions = requiredPermissions.every(
      (permission) => req.user.permissions[permission]
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ message: 'Accès non autorisé. Permissions insuffisantes' });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est un super admin
 */
export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Accès réservé aux super administrateurs' });
  }

  next();
}; 