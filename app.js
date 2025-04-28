import authRouter from './routers/auth.router.js';
import staffRouter from './routers/staff.router.js';
import appointmentsRouter from './routers/appointment.router.js';
import clientRouter from './routers/client.router.js';

// Routes
app.use('/api/auth', authRouter);
app.use('/api/staff', staffRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/clients', clientRouter); 