const { validationResult} = require('express-validator')
const fs = require('fs')
const path = require('path')
const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')

exports.getPost = async(req, res, next) => {
  const postId = req.params.postId
  const post = await Post.findById(postId).populate('creator')
  try{
     //Undefined post
     if(!post){
      //Thrown error instead of despite being inside 'then' block (where we use 'next'). But this is done so that catch block will receive that error
            const error = new Error('Could not find post')
            error.statusCode = 404
            throw error
            }
        res.status(200).json({post: post})
  }
  catch(err) {
      if(!err.statusCode){
       err.statusCode = 500
      }
      next(err)
   }
}

exports.updatePost = async(req, res, next) => {
  const postId = req.params.postId
  const errors = validationResult(req);
    //Errors exist
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;
    }
  const title = req.body.title
  let imageUrl = req.body.image
  const content = req.body.content
  //Picked another file to replace image
  if(req.file){
    imageUrl = req.file.path.replace("\\" ,"/")
  }
  if(!imageUrl){
    const error = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }
  try{
  //Finding and updating in database, if exist
  const post = await Post.findById(postId).populate('creator')
    //Undefined post
    if(!post){
      const error = new Error('Could not find post')
      error.statusCode = 404
      //Thrown error instead of despite being inside 'then' block (where we use 'next'). But this is done so that catch block will receive that error
      throw error
      }
//Now simply can't access through post.creator as now populated 'creator', so now have to access like below
      if(post.creator._id.toString() !== req.userId){
        const error = new Error('Not Authorized')
        error.statusCode = 403
        throw error
      }
      //Updated image, so delete from folder using clearImage()
      if(imageUrl !== post.imageUrl){
        clearImage(post.imageUrl)
      }
      post.title = title,
      post.imageUrl = imageUrl,
      post.content = content
      const result = await post.save()
      //access established connection
      io.getIO().emit('posts', { action: 'update', post: result })
      res.status(200).json({message: 'Posts updated successfully', post: result})
    }
    catch(err) {
  if(!err.statusCode){
   err.statusCode = 500
  }
  //Reaches the next error handling express middleware
  next(err)
}
}

exports.deletePost = async(req, res, next) => {
const postId = req.params.postId
try{
const post = await Post.findById(postId)
    //Undefined post
  if(!post){
    const error = new Error('Could not find post')
    error.statusCode = 404
    throw error
    }
    if(post.creator.toString() !== req.userId){
      const error = new Error('Not Authorized')
      error.statusCode = 403
      throw error
    }
    //Remove image
    clearImage(post.imageUrl)
    const result = await Post.findByIdAndRemove(postId)
    const user = await User.findById(req.userId)
  user.posts.pull(postId)
  await user.save()
  io.getIO().emit('posts', { action: 'delete', post: postId })
  res.status(200).json({message: 'Post deleted successfully', posts: user})
  }
 catch(err) {
  if(!err.statusCode){
   err.statusCode = 500
  }
  next(err)
}
}

exports.getPosts = async(req, res, next) => {
//Stored in query page/ 1 as default
const currentPage = req.query.page || 1
const perPage = 3
try{
const totalPosts = await Post.find().countDocuments()
//sort in descending way, means latest post at top
const posts = await Post.find().skip((currentPage - 1) * perPage).limit(perPage).populate('creator').sort({createdAt: -1})
//Returning a json response, along with right headers set and status as success. Here it is posts[], containing a title and content
  res.status(200).json({message: 'Posts fetched successfully', posts: posts, totalItems: totalPosts})
}
catch(err) {
  if(!err.statusCode){
   err.statusCode = 500
  }
  //Reaches the next error handling express middleware
  next(err)
}
}

exports.postPost = async(req, res, next) => {
    const errors = validationResult(req);
    //Errors exist
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;
    }
    if(!req.file){
      const error = new Error('No image provided');
      error.statusCode = 422;
      throw error;
    }
    //Data to be parsed from incoming request
    const title = req.body.title;
    const imageUrl = req.file.path.replace("\\" ,"/");
    const content = req.body.content;
    let creator;
    const post = new Post({
    //Now no need to assign id/ createAt as timestamps will do
      title: title,
      imageUrl: imageUrl,
      content: content,
      creator: req.userId
    });
    //Saves this document in model automatically
    try{
    const result = await post.save()
    //Find the user
    const user = await User.findById(req.userId)
        //Find all posts of returned user
        user.posts.push(post)
        await user.save()
        //send a message to all connected users, for event 'posts'
        io.getIO().emit('posts', {
          action: 'create',
          post: {...post.doc, creator: {_id: req.userId, name: user.name}}
        })
        //To create a post in database, and 201 indicates success and creation of resource
        res.status(201).json({
          message: 'Post created successfully!',
          post: post,
          creator: { _id: user._id, name: user.name}
      })
    }
    catch(err) {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        //Reaches the next error handling express middleware
        next(err);
      }
  };

//Deletes an image. We use it when updating to remove the old image before adding the new one.
const clearImage = filePath => {
  //.. = controller -> root folder -> images
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};