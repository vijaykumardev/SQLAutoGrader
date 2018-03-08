const mysql = require('mysql')

function authenticateUser(params){
    return new Promise((resolve,reject)=>{
var connectionObj = {
     host : 'mysql.cis.ksu.edu',
    user : params.name,
    password : params.password,
    database : params.name
}

var connection = mysql.createConnection(connectionObj)

connection.connect((err)=>{
    if (err)
    reject(err)
    resolve(connection)
})
    })
}

// create the model for users and expose it to our app
module.exports = authenticateUser
