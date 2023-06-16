/*Synchronous code executes tasks sequentially, one after another, while asynchronous code allows tasks to be executed concurrently and independently. Through using async await, even though the code looks synchronous and  it is still asynchronous and non-blocking.
When encountering an await expression, it waits for the promise to resolve (or reject) before continuing the execution of the enclosing async function. However, during this waiting period, the event loop is not blocked, and other functions or tasks can continue executing. While it may appear that await blocks further execution, it doesn't actually block the entire program. It pauses the execution of the current function but allows other code outside that function to continue running. */

const { validationResult} = require('express-validator')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
exports.signup = async(req, res, next) => {
    const errors = validationResult(req);
    //Errors exist
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed.');
      error.statusCode = 422;
      error.data = errors.array()
      throw error;
    }
    const email = req.body.email
    const name = req.body.name
    const password = req.body.password
    const hashed = await bcrypt.hash(password, 12)
    try{
        const user = new User({
            email: email,
            password: hashed,
            name: name
        })
    const result = await user.save()
    res.status(201).json({message: 'User created', userId: result._id})
    }
    catch(err) {
        if(!err.statusCode){
         err.statusCode = 500
        }
        next(err)
      }
}

exports.login = async(req, res, next) => {
    const email = req.body.email
    const name = req.body.name
    const password = req.body.password
    let loadedUser;
    const user = await User.findOne({ email: email})
    try{
        if(!user){
            const error = new Error('Can\'t find user with given mail');
            error.statusCode = 401;
            throw error;
        }
        loadedUser = user
        const isEqual = await bcrypt.compare(password, user.password)
        if(!isEqual){
            const error = new Error('Wrong Password');
            error.statusCode = 422;
            throw error;
        }
        //Creates a new signature and packs that into a new json web token. Here we put mail and id into token
        const token = jwt.sign({
            email: loadedUser.email,
            userId: loadedUser._id.toString()
//Private key used for signing, known to server and can't fake it to client. Also setting expire time of token
        }, 'somesupersecretsecret', {expiresIn: '1h'})
        res.status(200).json({token: token, userId: loadedUser._id.toString()})
    }
    catch(err) {
        if(!err.statusCode){
         err.statusCode = 500
        }
        next(err)
      }
    
}