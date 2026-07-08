import express from 'express';
import recordingController from '../../controllers/recording.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { uploadRecording } from '../../middlewares/upload.js';
import { validate, validateQuery, paginationValidation, recordingValidation } from '../../utils/validators.js';

const router = express.Router();

router.use(authenticate);

router.get('/', validateQuery(paginationValidation.listRecordings), recordingController.listRecordings.bind(recordingController));
router.get('/rooms/:roomCode', validateQuery(paginationValidation.listRecordings), recordingController.listRoomRecordings.bind(recordingController));
router.post('/rooms/:roomCode/record/start', recordingController.startLiveKitRecording.bind(recordingController));
router.post('/rooms/:roomCode/record/stop', recordingController.stopLiveKitRecording.bind(recordingController));
router.get('/rooms/:roomCode/record/status', recordingController.getLiveKitRecordingStatus.bind(recordingController));
router.post('/:roomCode', uploadRecording, validate(recordingValidation.create), recordingController.uploadRecording.bind(recordingController));
router.get('/:recordingId', recordingController.getRecording.bind(recordingController));
router.patch('/:recordingId', validate(recordingValidation.update), recordingController.updateRecording.bind(recordingController));
router.delete('/:recordingId', recordingController.deleteRecording.bind(recordingController));

export default router;
