import { createRemoteJWKSet, jwtVerify } from 'jose';

const authURL = process.env.BETTER_AUTH_URL;

if (!authURL) {
  throw new Error('BETTER_AUTH_URL environment variable is missing');
}

const JWKS = createRemoteJWKSet(new URL('/api/auth/jwks', authURL));

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication token is required.',
      });
    }

    const token = authHeader.split(' ')[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authURL,
      audience: authURL,
    });

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
};

export default verifyToken;
