const verificarToken = (req, res, next) => next();
const verificarAdmin = (req, res, next) => next();

module.exports = {
  verificarToken,
  verificarAdmin
};
