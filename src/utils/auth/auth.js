const authorization = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      res.redirect('/');
      return res.status(401).send({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      if (req.user.role === 'admin') {
        return res.redirect('/admin');
      } else if (req.user.role === 'user') {
        return res.redirect('/user');
      }
      return res.status(403).send({ error: 'No role permissions' });
    }
    next();
  };
};
module.exports = {
  authorization,
};
