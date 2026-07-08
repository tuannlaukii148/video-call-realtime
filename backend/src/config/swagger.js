import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Project Backend API',
      version: '1.0.0',
      description: 'Real-time video meeting system with WebRTC and chat',
      contact: {
        name: 'tuannlaukii148',
        email: 'team@meetingproject.local',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development Server',
      },
      {
        url: 'https://api.meetingproject.com/api/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            full_name: { type: 'string' },
            avatar: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            room_code: { type: 'string' },
            host_id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['waiting', 'active', 'ended'] },
            settings: { type: 'object' },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            room_id: { type: 'string' },
            sender_id: { type: 'string' },
            sender_name: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['text', 'system', 'file'] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Rooms',
        description: 'Meeting room management',
      },
      {
        name: 'History',
        description: 'Chat and audit log history',
      },
      {
        name: 'Health',
        description: 'Health check',
      },
    ],
  },
  apis: [
    './src/routes/**/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
