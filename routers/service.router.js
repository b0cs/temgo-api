import express from "express";
import { addService, getAllServices } from "../controllers/cluster.controller.js";

const serviceRouter = express.Router();

serviceRouter.get("/:clusterId", getAllServices);
serviceRouter.post("/:clusterId", addService);

export default serviceRouter;