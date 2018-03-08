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
                result : err.sqlMessage,
                fields : null
                 }
                
           }else{
               console.log(rows[0].id)
               var fieldnames = []
                  //Extract field name from the fields object
                  for(var i =0; i < fields.length;i++)
                  fieldnames[i] = fields[i].name
               //var fieldnames = 
               returnVal = {
                   query: query,
                   err: false,
                   result: rows,
                   fields: fieldnames
               }
           }
           resolve(returnVal)
        })
    })
}


module.exports = {
    establishconnection :establishconnection,
    executequery: executequery
}