//Will create routes and controllers to separate data, but not views as we'll not render it, but just exchange data
const express = require('express')
const path = require('path')
const app = express()
const mongoose = require('mongoose')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const graphqlHTTP = require('express-graphql').graphqlHTTP
const schema = require('./graphql/schema')
const resolver = require('./graphql/resolvers')
const auth = require('./middleware/auth')
const { clearImage } = require('./util/file')
require('dotenv').config().parsed
const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.mjodwc6.mongodb.net/${process.env.MONGO_DB}`

//Configures for local storage system, specified 2 functions now handles files for every incoming request
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        //If null, means no error so can tell multer to store it into 'images' folder
            cb(null, 'images')
    },
    filename: (req, file, cb) => {
    /*To ensure not to overwrite 2 files with same name, we combine the unique hash value of file with 'filename' and original file name*/
    //Can also use snapshot of time to ensure uniqueness
    cb(null, Date.now() + '-' + file.originalname)
}
})

//If image type is png/jpg/jpeg store it. Otherwise, no need to store
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' ||file.mimetype === 'image/jpeg'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };


/*Earlier initialized it through urlencoded, which was great for data formats/ requests that hold data in the format of 'xwww form url encoded' and default if submitted through form post request. Here we have no form data, so using json method to parse json data from incoming requests. This is good for 'application/json' and data will be appended to the request that reaches our server
 But here instead of bodyParser.json(), used express.json()*/
//Returns middleware that only parses json and only looks at requests where the Content-Type header matches the type option, to extract it to the body 
app.use(express.json())

//single() returns middleware that processes a single file associated with the given form field 'image'.
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))

/*Cors stands for cross origin resource sharing and by default, not allowed by browsers.
So if we have our client in the server and running in the same domain like localhost3000, the port being part of the domain, if they run on the same server, we can send requests and responses. We rendered html files on the server and therefore they were served by the same server as we send or requests
But if both run on different domains like the client on localhost 4000 we'll get a cors error because it's a security mechanism provided by the browser that we can't share resources across domains, across servers, across origins
To overwrite for some applications, like her we need to tell the browser that runs on codepen to accept the response sent by our server. We can't solve it through browser side js code, but that on the server.
So, we just need to set some special headers for all domains through '*'*/
app.use((req, res, next) => {
    //Important to set as otherwise may not allow client to set certain information
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if(req.method === 'OPTIONS'){
        return res.sendStatus(200)
    }
    next()
}) 

//Run on every request that reaches the graphql endpoint, but it won't deny the request if token is absent. It will just set 'isAuth' to false
app.use(auth)
//Serving images statically
app.use(express.static(path.join('public', 'images')));


//To upload image(/ data) through graphql, it works only on json data. What we'll implement is to set an endpoint where we can send image and then let that endpoint store the image and return the path to the image and then send another request with that path to the image and other data to your graphql endpoint
app.put('/post-image', (req, res, next) => {
    if(!req.isAuth){
        throw new Error('Not Authenticated')
    }
    if(!req.file){
        return res.status(200).json({message: 'No files provided!'})
    }
    //Remove the old and store new image
    if(req.body.oldPath){
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({message: 'File stored!', filePath: req.file.path.replace(/\\/g, "/")})
})


//Configuring middleware, new two items to work, schema and roorValue
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: true,
    // Receives the error detected by graphql & allows to return our own format
    customFormatErrorFn(err){
//The original error thrown from a field resolver during execution. GraphQL wraps the original error in a GraphQLError class so it can add some additional GraphQL specific information to the properties on the error object. They keep the most commonly used properties like "message" on the top-level error object, but if you want to access things like the code or data properties we added ourselves, you'll have to access the original error object via err.originalError, and not by err.originalError.message
        if(!err.originalError){
            return err;
        }
        const data = err.originalError.data
        const message = err.message || 'An error occured'
        const code = err.originalError.code || '500'
        return { message: message, status: code, data: data }
    }
}))

app.use((error, req, res, next) => {
    console.log(error)
    const status = error.status || 500
    const message = error.message
    const data = error.data
    res.status(status).json({message: message, data: data})
})

//Connecting to mongodb atlas server
mongoose.connect(MONGODB_URI)
.then(result => {
    app.listen(process.env.PORT || 8080)
})
.catch(err => {
    console.log(err)
    
})

