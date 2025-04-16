import express from "express";
import { addCluster, getAllClusters, getAllServices } from "../controllers/cluster.controller.js";

const clusterRouter = express.Router();

// GET route for cluster
clusterRouter.get("/", getAllClusters);

clusterRouter.post("/service/:clusterId", addCluster);

clusterRouter.get("/service/:clusterId", getAllServices);

export default clusterRouter;