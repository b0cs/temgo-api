import express from "express";
import { addCluster, getAllClusters } from "../controllers/cluster.controller.js";

const clusterRouter = express.Router();

// GET route for cluster
clusterRouter.get("/", getAllClusters);

// POST route for creating a new cluster
clusterRouter.post("/", addCluster);

export default clusterRouter;