const mysql = require('mysql')

/** @function establishconnection
* @description Creates and returns mysql connection object
* @param {json} - request object containing the database connection details
* @returns - mysql connection object
**/
function establishconnection(params){
    return new Promise((resolve,reject)=>{
        var pool = mysql.createConnection({
            host : 'mysql.cis.ksu.edu',
            user : params.name,
            password : params.password,
            database : params.name
        })
        resolve(pool)
    })
}

/**
 * @function executequery
 * @description Executes query in mysql database and returns result as rows or error message as json object
 * @param {string} query - A query that needs to be executed in database 
 * @param {any} connection - Mysql connection object
 * @returns {json} - database execution result
 */
function executequery(query,connection){
    return new Promise((resolve,reject)=>{
        var returnVal = {}
        connection.query(query,(err,rows,fields)=>{
            if(err){
                 returnVal = {
                query : query,
                err : true,
                result : err,
                fields : null
                 }
                
           }else{
               returnVal = {
                   query: query,
                   err: false,
                   result: rows,
                   fields: fields
               }
           }
           resolve(returnVal)
        })
    })
}

// function runInMySQL(params){
//     return new Promise((resolve,reject)=>{
//         var pool = mysql.createConnection({  
//             host     : 'mysql.cis.ksu.edu',  
//             user     : params.name,  
//             password : params.password,  
//             database : params.name   
//             })
        
//         var returnVal = {}
//             pool.query(params.query, function(err, rows, fields)   
//             {  
                
//                 if (err){
//                     returnVal = {
//                         'query' : params.query,
//                         'err' : true,
//                         'result' : err,
//                         'fields' : null
//                     }
//                 } else{
//                 returnVal = {
//                     'query' : params.query,
//                     'err' : false,
//                     'result' : rows,
//                     'fields' : fields
//                 }
//                 }
//                 resolve(returnVal)
//             })
    
//     }) 
// }

module.exports = {
    establishconnection :establishconnection,
    executequery: executequery
}