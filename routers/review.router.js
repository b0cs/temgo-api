import express from "express";
import { authMiddleware } from '../middleware/auth.middleware.js';

const reviewRouter = express.Router();

// Routes publiques
reviewRouter.get('/:clusterId', authMiddleware, async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    if (!clusterId) {
      return res.status(400).json({ message: 'ID du cluster requis' });
    }
    
    // Pour le moment, retourner des données fictives
    // À remplacer par une vraie implémentation
    const mockReviews = generateMockReviews(clusterId);
    
    res.status(200).json(mockReviews);
  } catch (error) {
    console.error('Erreur lors de la récupération des avis:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des avis', error: error.message });
  }
});

// Fonction qui génère des avis fictifs
function generateMockReviews(clusterId) {
  const reviews = [];
  
  for (let i = 0; i < 20; i++) {
    const isPositive = Math.random() > 0.3;
    reviews.push({
      id: `review_${i}`,
      clusterId,
      clientId: `client_${Math.floor(Math.random() * 100)}`,
      clientName: isPositive ? 
        (Math.random() > 0.5 ? 'Jean Dupont' : 'Marie Martin') : 
        'Paul Leroy',
      clientImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      serviceId: `service_${Math.floor(Math.random() * 5)}`,
      serviceName: ['Coupe femme', 'Coloration', 'Barbe', 'Shampoing', 'Coiffure homme'][Math.floor(Math.random() * 5)],
      rating: isPositive ? (4 + Math.floor(Math.random() * 2)) : (1 + Math.floor(Math.random() * 2)),
      comment: isPositive ? 
        'Excellent service, je suis très satisfait(e) du résultat !' : 
        'Temps d\'attente trop long, je suis déçu.',
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in the last 30 days
    });
  }
  
  return reviews;
}

export default reviewRouter;