const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../util/file');

//Need a method for every query/ resolver
module.exports = {
    /*args have input field 'userInput', email, name and password. 
    METHOD 1: using args simply as to extract like args.userInput.email
    METHOD 2: using destructuring to get 'userInput' out of args as to extract like args.email*/
    createUser: async function({ userInput }, req) {
    const errors = []
    if(!validator.isEmail(userInput.email)){
        //Errors[] contains message, locations, path and data
        errors.push({message: 'Invalid E-Mail'})
    }
    if(validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, {min: 5})){
        errors.push({message: 'Password too short'})
    }
    if(errors.length > 0){
        const error = new Error('Invalid input')
        //error consists of data field that contains errors[] and status code as 422
        error.data = errors
        error.code = 422
        throw error
    }
    //Already existing user
    const existingUser = await User.findOne({email: userInput.email})
    if(existingUser){
        const error = new Error('User already exist')
        throw error
    }
    const hashed = await bcrypt.hash(userInput.password, 12)
    const user = new User({
        email: userInput.email,
        password: hashed,
        name: userInput.name
    })
    const createdUser = await user.save()
//...createdUser._doc/ ...createdUser.toObject() used instead of ...createdUser as not to copy the metadata attached and just the properties 
    return { ...createdUser._doc, _id: createdUser._id.toString() }
    },

    login: async function({email, password}) {
        const user = await User.findOne({email: email})
        if(!user){
            const error = new Error('User not found')
            error.code = 401
            throw error
        }
    const isEqual = await bcrypt.compare(password, user.password)
    if(!isEqual){
            const error = new Error('Incorrect Password')
            error.code = 401
            throw error
    }
    const token = jwt.sign({
        email: user.email,
        userId: user._id.toString()
//Private key used for signing, known to server and can't fake it to client. Also setting expire time of token
    }, 'somesupersecretsecret', {expiresIn: '1h'})
    return {token: token, userId: user._id.toString()}
    },

    createPost: async function({postInput},  req){
    if(!req.isAuth){
        const error = new Error('Not Authenticated')
        error.code = 401
        throw error
    }
    const errors = [];
    if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})){
        errors.push({message: 'Invalid Title'})
    }
    if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})){
        errors.push({message: 'Invalid Content'})
    }
    if (errors.length > 0) {
        const error = new Error('Invalid Input');
        error.data = errors
        error.code = 422
        throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
        const error = new Error('Invalid User');
        error.data = errors
        error.code = 401
        throw error
    }
    const post = new Post({
          title: postInput.title,
          imageUrl: postInput.imageUrl,
          content: postInput.content,
          creator: user
        });
    const createdPost = await post.save()
    //Push post to list of posts
    user.posts.push(createdPost)
    await user.save()
    //Add post to specific user
    return { ...createdPost._doc, 
        _id: createdPost._id.toString(), 
        createdAt: createdPost.createdAt.toISOString(),
        updatedAt: createdPost.updatedAt.toISOString()
    }
    },

    posts: async function({ currPg }, req) {
    if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
    }
if(!currPg){
    currPg = 1;
}
const perPage = 2
const totalPosts = await Post.find().countDocuments()
//sort in descending way, means latest post at top
const posts = await Post.find().skip((currPg - 1) * perPage).limit(perPage).populate('creator').sort({createdAt: -1})
//posts will not be returned like posts: posts as contain fields like _id/ createdAt that holds data formats not understood by graphql, so instead used map here
    return {posts: posts.map(p => {
        return {
            ...p._doc,
            _id: p._id.toString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString()
        }
    }), totalPosts: totalPosts}
    },

    post: async function({ id }, req) {
        if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }
        const post = await Post.findById(id).populate('creator')
        if(!post){
            const error = new Error('No post found!')
            error.code = 404
            throw error
        }
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },

    updatePost: async function({ id, postInput }, req) {
    if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
    }
    const post = await Post.findById(id).populate('creator')
    if(!post){
        const error = new Error('No post found!')
        error.code = 404
        throw error
    }
    if(post.creator._id.toString() !== req.userId){
        const error = new Error('Not Authorized')
        error.statusCode = 403
        throw error
    }
    const errors = [];
    if(validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})){
        errors.push({message: 'Invalid Title'})
    }
    if(validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})){
        errors.push({message: 'Invalid Content'})
    }
    if (errors.length > 0) {
        const error = new Error('Invalid Input');
        error.data = errors
        error.code = 422
        throw error
    }
    //Updating
    post.title = postInput.title
    if(postInput.imageUrl !== 'undefined'){
        post.imageUrl = postInput.imageUrl
    }
    post.content = postInput.content
    const updatedPost = await post.save()
    return {
        ...updatedPost._doc,
        _id: updatedPost._id.toString(),
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString()
    }
    },

    deletePost: async function({ id }, req) {
    if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
    } 
    const post = await Post.findById(id)   
    if(!post){
        const error = new Error('No post found!')
        error.code = 404
        throw error
    }
    //As we are not populating the 'creator', creator isn't object with _id, but is _id itself stored in post
    if(post.creator.toString() !== req.userId){
        const error = new Error('Not Authorized')
        error.statusCode = 403
        throw error
    }
    //Remove image
    clearImage(post.imageUrl)
    await Post.findByIdAndRemove(id)
    const user = await User.findById(req.userId)
    user.posts.pull(id)
    await user.save()
    return true
    },

//General query without any argument, so don't retrieve anything for the currently logged in user and return a 'User' object here
    user: async function(args, req) {
    if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
        const error = new Error('User Not Found')
        error.code = 404
        throw error
    }
    return { ...user._doc, _id: user._id.toString() }
    },

    updateStatus: async function({status}, req) {
        if(!req.isAuth){
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
    }
    const user = await User.findById(req.userId)
    if(!user){
        const error = new Error('User Not Found')
        error.code = 404
        throw error
    }    
    //Set user status to what received in argument
    user.status = status
    await user.save()
    return { ...user._doc, _id: user._id.toString() }
    }
}