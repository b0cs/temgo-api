import express from "express";
import { bookAppointment, getAppointmentsByCluster, getAppointmentsByMember, getAllAppointmentsByDay } from "../controllers/appointment.controller.js";


const appointmentRouter = express.Router();

appointmentRouter.post("/create", bookAppointment)

appointmentRouter.get("/:clusterId", getAppointmentsByCluster)

appointmentRouter.get("/info/:memberId", getAppointmentsByMember)

appointmentRouter.get("/:clusterId/:date", getAllAppointmentsByDay)



export default appointmentRouter;