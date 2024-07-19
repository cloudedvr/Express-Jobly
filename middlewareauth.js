const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../expressError');

function authenticateJWT(req, res, next) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    res.locals.user = jwt.verify(token, 'SECRET_KEY');
    return next();
  } catch (err) {
    return next();
  }
}

function ensureAdmin(req, res, next) {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin) {
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

function ensureCorrectUserOrAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    if (!(user && (user.isAdmin || user.username === req.params.username))) {
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureAdmin,
  ensureCorrectUserOrAdmin
};
