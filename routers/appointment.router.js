import express from "express";
import { bookAppointment, getAppointmentsByCluster, getAppointmentsByMember } from "../controllers/appointment.controller.js";


const appointmentRouter = express.Router();

appointmentRouter.post("/create", bookAppointment)

appointmentRouter.get("/:clusterId", getAppointmentsByCluster)

appointmentRouter.get("/info/:memberId", getAppointmentsByMember)



export default appointmentRouter;