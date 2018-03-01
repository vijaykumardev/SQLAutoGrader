const mysql = require('pg')

/** @function establishconnection
* @description Creates and returns pg connection object
* @param {json} - request object containing the database connection details
* @returns {json} - pg connection object and end connection object
**/
function establishconnection(params){
    return new Promise((resolve,reject)=>{
        var pgcon = {
            host : 'postgresql.cis.ksu.edu',
            user : params.name,
            password : params.password,
            database : params.name,
            port: 5432
        }
        
        var pool = new pg.Pool(pgcon)
        connection.connect((err,client,done)=>{
            if(err) reject(err)
            else
            resolve({
                execute: client,
                endconnection: done
            })
        })
    })
}

/**
 * @function executequery
 * @description Executes query in pg database and returns result as rows or error message as json object
 * @param {string} query - A query that needs to be executed in database 
 * @param {json} connection - pg connection object and end connection object
 * @returns {json} - database execution result
 */
function executequery(query,connection){
    return new Promise((resolve,reject)=>{
        var returnVal = {}


            connection.execute.query(query,(err,result,fields)=>{
                connection.endconnection()
                if(err){
                    returnVal = {
                   query : query,
                   err : true,
                   result : err.sqlMessage,
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


module.exports = {
    establishconnection :establishconnection,
    executequery: executequery
}