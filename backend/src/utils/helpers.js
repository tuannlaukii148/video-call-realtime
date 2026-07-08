import { v4 as uuidv4 } from 'uuid';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});


export async function generatePresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 giờ
  });
}

export const generateRoomCode = () => {
  // Format: abc-xyz-def
  const uuidPart = uuidv4().split('-')[0];
  const part1 = Math.random().toString(36).substring(2, 5);
  const part2 = Math.random().toString(36).substring(2, 5);
  const part3 = Math.random().toString(36).substring(2, 5);
  return `${part1}-${part2}-${part3}-${uuidPart.substring(0, 3)}`;
};

export const generateSocketEventName = (namespace, action) => {
  return `${namespace}:${action}`;
};

export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return Math.floor((endTime - startTime) / 1000); // in seconds
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

export default {
  generateRoomCode,
  generateSocketEventName,
  calculateDuration,
  formatDuration,
  generatePresignedUrl
};
