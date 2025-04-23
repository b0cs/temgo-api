import express from "express";
import { addCluster, getAllClusters, getAllServices, updateCluster, getClusterById } from "../controllers/cluster.controller.js";

const clusterRouter = express.Router();

// GET route for cluster
clusterRouter.get("/", getAllClusters);

// Route pour récupérer un cluster par son ID
clusterRouter.get("/:clusterId", getClusterById);

clusterRouter.post("/service", addCluster);

clusterRouter.get("/service/:clusterId", getAllServices);

// Route pour mettre à jour un cluster
clusterRouter.put('/:clusterId', updateCluster);

export default clusterRouter;