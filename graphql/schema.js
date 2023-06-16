//helper function to build a GraphQLSchema directly from a source document.
const { buildSchema } = require('graphql')
/*Query and its return type. If we use 'String!', makes String mandatory, now if we don't return one, we'll get an error. No need of ','
Defining schema. This is a basic schema that sends 'hello' query to get back some text defined in resolver.
'Input' keyword for data used as input
[]! means an array must be returned, but it can have null elements.
[Post!]! means an array must be returned and it can't have null elements. All elements must be of type Post.
Added currPg as argument in posts to allow pagination
'post' query will take an id of type ID, and will return a post at the end*/
module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        imageUrl: String!
        content: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        email: String!    
        password: String! 
        name: String! 
        status: String! 
        posts: [Post!]!
    }

    type Posts {
        posts: [Post!]!
        totalPosts: Int!
    }

    type authData {
        token: String!
        userId: String!
    }

    input userData {
        email: String!
        password: String!
        name: String!
    }

    input postData {
        title: String!
        imageUrl: String!
        content: String!
    }

    type rootQuery {
        login(email: String!, password: String!): authData!
        posts(currPg: Int!): Posts!
        post(id: ID!): Post!
        user: User!
    }

    type rootMutation {
        createUser(userInput: userData): User!
        createPost(postInput: postData): Post!
        updatePost(id: ID!, postInput: postData!): Post!
        deletePost(id: ID!): Boolean
        updateStatus(status: String!): User!
    }
    
    schema {
        query: rootQuery
        mutation: rootMutation
    }
`)