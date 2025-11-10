const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }
};

const userOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'user' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ 
      error: 'Access denied. User authentication required.' 
    });
  }
};

module.exports = { adminOnly, userOrAdmin };