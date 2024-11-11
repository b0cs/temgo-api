import express from 'express';
import connectDB from './db.js';
import dotenv from 'dotenv';
import router from './routers/index.router.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();


app.use("/api", router);


app.listen(3000, () => { 
    console.log('Server is running on http://localhost:3000');
    });