import User from '../models/user.model.js';
import Cluster from '../models/cluster.model.js';
import Member from '../models/member.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'votre-secret-jwt',
    { expiresIn: '7d' }
  );
};

// Générer un refresh token avec une plus longue durée de vie
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'votre-secret-jwt',
    { expiresIn: '30d' }
  );
};

/**
 * Inscription d'un nouvel établissement (admin)
 * Endpoint uniquement accessible par super admin
 */
export const registerCluster = async (req, res) => {
  try {
    const {
      clusterName,
      location,
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPhone,
      services = []
    } = req.body;

    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Générer un mot de passe aléatoire pour l'admin
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Créer un nouveau cluster
    const newCluster = new Cluster({
      name: clusterName,
      location: location,
      services: services
    });

    const savedCluster = await newCluster.save();

    // Créer l'utilisateur admin pour ce cluster
    const newAdmin = new User({
      email: adminEmail,
      password: tempPassword, // Sera hashé par le middleware du modèle
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: adminPhone,
      role: 'admin',
      cluster: savedCluster._id
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Établissement et administrateur créés avec succès',
      cluster: {
        id: savedCluster._id,
        name: savedCluster.name
      },
      admin: {
        email: adminEmail,
        password: tempPassword // Inclure le mot de passe temporaire dans la réponse
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'établissement: ' + error.message });
  }
};

/**
 * Rafraîchir le token d'accès à l'aide du refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token requis' });
    }
    
    try {
      // Vérifier le refresh token
      const decoded = jwt.verify(
        refreshToken, 
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'votre-secret-jwt'
      );
      
      // Trouver l'utilisateur
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }
      
      // Vérifier si l'utilisateur est actif
      if (!user.isActive) {
        return res.status(403).json({ message: 'Compte désactivé' });
      }
      
      // Générer un nouveau access token
      const accessToken = generateToken(user._id);
      
      // Générer un nouveau refresh token (rotation des tokens)
      const newRefreshToken = generateRefreshToken(user._id);
      
      res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Refresh token invalide' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Refresh token expiré' });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du rafraîchissement du token: ' + error.message });
  }
};

/**
 * Connexion utilisateur
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier que l'email et le mot de passe sont fournis
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }
    
    // Vérifier d'abord si l'email correspond à un membre (client) dans la collection Member
    const Member = mongoose.model('Member');
    const isMember = await Member.findOne({ email });
    
    if (isMember) {
      // Si c'est un membre (client), refuser l'accès à l'application Business
      return res.status(403).json({
        message: 'Cette application est réservée aux professionnels. Veuillez utiliser l\'application Temgo Client.',
        isClient: true
      });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email }).populate('cluster', 'name location type');
    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json({ message: 'Compte désactivé. Contactez l\'administrateur' });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token JWT
    const token = generateToken(user._id);
    
    // Générer un refresh token
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      accessToken: token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        cluster: user.cluster
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la connexion: ' + error.message });
  }
};

/**
 * Créer un employé (par admin ou manager)
 */
export const createEmployee = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, role = 'employee', cluster: requestedCluster, permissions: requestedPermissions } = req.body;
    
    // L'ID du cluster est celui spécifié dans la requête ou, par défaut, celui de l'utilisateur connecté
    const clusterId = requestedCluster || req.user.cluster;
    
    // Vérifier que l'utilisateur connecté a les droits pour créer un employé
    if (!req.user.permissions.canManageEmployees) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour créer un employé' });
    }
    
    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Générer un mot de passe aléatoire
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    // Créer le nouvel employé
    const newEmployeeData = {
      email,
      password: tempPassword, // Sera haché par le middleware du modèle
      firstName,
      lastName,
      phone,
      role,
      cluster: clusterId,
      createdBy: req.user ? req.user.id : null
    };
    
    // Ajouter les permissions si elles sont spécifiées
    if (requestedPermissions) {
      newEmployeeData.permissions = requestedPermissions;
    }
    
    const newEmployee = new User(newEmployeeData);
    
    await newEmployee.save();
    
    res.status(201).json({
      message: 'Employé créé avec succès',
      employee: {
        id: newEmployee._id,
        email: newEmployee.email,
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        role: newEmployee.role,
        password: tempPassword, // Renvoyer le mot de passe temporaire pour la première connexion
        cluster: newEmployee.cluster,
        permissions: newEmployee.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'employé: ' + error.message });
  }
};

/**
 * Obtenir tous les employés d'un établissement
 */
export const getEmployees = async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits pour voir les employés
    if (!req.user.permissions.canManageEmployees) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour voir les employés' });
    }
    
    // Récupérer les employés du même établissement
    const employees = await User.find({ 
      cluster: req.user.cluster,
      _id: { $ne: req.user.id } // Ne pas inclure l'utilisateur connecté
    }).select('-password -resetPasswordToken -resetPasswordExpires');
    
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des employés: ' + error.message });
  }
};

/**
 * Modifier un employé
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive, permissions } = req.body;
    
    // Vérifier que l'utilisateur a les droits pour modifier des employés
    if (!req.user.permissions.canManageEmployees) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour modifier cet employé' });
    }
    
    // Trouver l'employé
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }
    
    // Vérifier que l'employé appartient au même établissement
    if (employee.cluster.toString() !== req.user.cluster.toString()) {
      return res.status(403).json({ message: 'Vous n\'avez pas les droits pour modifier cet employé' });
    }
    
    // Mettre à jour les champs
    if (firstName) employee.firstName = firstName;
    if (lastName) employee.lastName = lastName;
    if (phone) employee.phone = phone;
    if (role && req.user.role === 'admin') employee.role = role; // Seul l'admin peut changer le rôle
    if (isActive !== undefined) employee.isActive = isActive;
    if (permissions && req.user.role === 'admin') employee.permissions = permissions;
    
    await employee.save();
    
    res.status(200).json({
      message: 'Employé mis à jour avec succès',
      employee: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        isActive: employee.isActive,
        permissions: employee.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'employé: ' + error.message });
  }
};

/**
 * Changer son propre mot de passe
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Les mots de passe actuels et nouveaux sont requis' });
    }
    
    // Trouver l'utilisateur
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du changement de mot de passe: ' + error.message });
  }
};

/**
 * Demande de réinitialisation de mot de passe
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }
    
    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      // Pour des raisons de sécurité, ne pas indiquer si l'email existe ou non
      return res.status(200).json({ message: 'Si cet email existe, un lien de réinitialisation sera envoyé' });
    }
    
    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
    
    await user.save();
    
    // URL de réinitialisation (à adapter selon votre frontend)
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    // Retourner directement le token et l'URL
    res.status(200).json({ 
      message: 'Token de réinitialisation généré avec succès',
      token: resetToken,
      resetURL: resetURL,
      expiresIn: '1 heure'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation: ' + error.message });
  }
};

/**
 * Réinitialisation de mot de passe avec token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }
    
    // Trouver l'utilisateur avec ce token et non expiré
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe: ' + error.message });
  }
};

/**
 * Obtenir les informations de l'utilisateur connecté
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('cluster', 'name location type');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des informations: ' + error.message });
  }
};

/**
 * Créer un administrateur sans requérir d'authentification préalable (pour les tests et l'initialisation)
 * Cette fonction devrait être sécurisée ou désactivée en production
 */
export const createAdmin = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, password, cluster: clusterId, permissions } = req.body;
    
    if (!email || !firstName || !lastName || !clusterId) {
      return res.status(400).json({ message: 'Email, prénom, nom et cluster sont requis' });
    }
    
    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    // Vérifier si le cluster existe
    const clusterExists = await Cluster.findById(clusterId);
    if (!clusterExists) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Utiliser le mot de passe fourni ou en générer un aléatoire
    const userPassword = password || crypto.randomBytes(8).toString('hex');
    
    // Créer le nouvel administrateur
    const newAdminData = {
      email,
      password: userPassword, // Sera haché par le middleware du modèle
      firstName,
      lastName,
      phone,
      role: 'admin', // Toujours créer avec le rôle admin
      cluster: clusterId
    };
    
    // Ajouter les permissions si elles sont spécifiées, sinon utiliser les permissions d'admin par défaut
    if (permissions) {
      newAdminData.permissions = permissions;
    }
    
    const newAdmin = new User(newAdminData);
    
    await newAdmin.save();
    
    res.status(201).json({
      message: 'Administrateur créé avec succès',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: newAdmin.role,
        password: userPassword, // Renvoyer le mot de passe pour la première connexion
        cluster: newAdmin.cluster,
        permissions: newAdmin.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'administrateur: ' + error.message });
  }
}; 