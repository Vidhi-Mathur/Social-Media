const mongoose = require('mongoose')
const schema = mongoose.Schema

const user = new schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'I am new here'
    },
    posts: [{
        type: schema.Types.ObjectId,
        ref: 'Post'
    }]
})

module.exports = mongoose.model('User', user)