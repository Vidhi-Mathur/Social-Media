const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
   //Getting value of authorization header
  const authHeader = req.get('Authorization');
  //If not set, set to false to handle it inside resolver
  if (!authHeader) {
     req.isAuth = false
     return next()
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    //Check if extracted token matches the private key
    decodedToken = jwt.verify(token, 'somesupersecretsecret');
  } catch (err) {
    req.isAuth = false
    return next()
  }
  if (!decodedToken) {
    req.isAuth = false
    return next()
  }
  //Accessing the userId 
  req.userId = decodedToken.userId;
  req.isAuth = true
  next();
};

