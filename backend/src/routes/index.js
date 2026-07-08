import express from 'express';
import apiV1Routes from './v1/index.js';

const router = express.Router();

router.use('/v1', apiV1Routes);

export default router;
