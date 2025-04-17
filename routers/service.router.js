import express from "express";
import { addService, getServices, getServicesByCluster, updateService, deleteService } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const serviceRouter = express.Router();

// Routes publiques
serviceRouter.get("/cluster/:clusterId", getServicesByCluster);

// Routes protégées par authentification
serviceRouter.use(authMiddleware);
serviceRouter.get("/:clusterId", getServices);
serviceRouter.post("/", addService);
serviceRouter.put("/:serviceId", updateService);
serviceRouter.delete("/:serviceId", deleteService);

export default serviceRouter;