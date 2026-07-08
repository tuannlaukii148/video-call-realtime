// Middleware to verify Google ID token and attach google user info to req
import logger from '../utils/logger.js';

export async function verifyGoogleToken(req, res, next) {
  try {
    const idToken = req.body.id_token || req.headers.authorization?.replace('Bearer ', '');
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing id_token' });
    }

    // Use Google's tokeninfo endpoint to validate the token
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(tokenInfoUrl);
    if (!resp.ok) {
      const txt = await resp.text();
      logger.warn('Google token verification failed', txt);
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const data = await resp.json();

    // tokeninfo returns fields like email, email_verified, name, picture, aud, sub
    req.googleUser = {
      email: data.email,
      email_verified: data.email_verified === 'true' || data.email_verified === true,
      name: data.name,
      picture: data.picture,
      sub: data.sub,
      issuer: data.iss,
    };

    next();
  } catch (error) {
    logger.error('Google verify middleware error:', error);
    return res.status(500).json({ success: false, message: 'Google verification error' });
  }
}

export default verifyGoogleToken;
