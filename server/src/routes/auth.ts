// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Joi from 'joi';

const router: Router = Router();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Demo login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;

    // Demo credentials (in real app, check against database)
    const demoCredentials = [
      { email: 'courier@aamira.com', password: 'courier123', role: 'courier' },
      { email: 'dispatcher@aamira.com', password: 'dispatcher123', role: 'dispatcher' }
    ];

    const user = demoCredentials.find(u => u.email === email);
    if (!user || password !== user.password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.email,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        email: user.email,
        role: user.role
      },
      expiresIn: '24h'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed'
    });
  }
});

// Get API token for courier devices
router.post('/api-token', async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  
  if (!deviceId) {
    return res.status(400).json({
      error: 'Device ID required'
    });
  }

  // In real app, validate device and generate secure token
  const apiToken = `token_${deviceId}_${Date.now()}`;
  
  res.json({
    apiToken,
    deviceId,
    expiresIn: '30d'
  });
});

export { router as authRoutes };