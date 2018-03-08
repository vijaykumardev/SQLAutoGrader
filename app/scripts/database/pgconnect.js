const pg = require('pg')
const PORT = 5432
pg.defaults.ssl = true;

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
            port: PORT
        }
        
        var pool = new pg.Pool(pgcon)
        pool.connect((err,client,done)=>{
            if(err) reject(err.message+'\n'+err.hint+'\n'+'Error found at position '+err.position)
            else{
                var connection = {
                    execute: client,
                    endconnection: done
                }
                resolve(connection)
            }            
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


            connection.execute.query(query,(err,result)=>{
                connection.endconnection()
                if(err){
                   returnVal = {
                   query : query,
                   err : true,
                   result : err.message+'\n'+err.hint+'\n'+'Error found at position '+err.position,
                   fields : null
                    }
                   
              }else{
                  console.log(result.rows)
                  var fields = []
                  //Extract field name from the fields object
                  for(var i =0;i<result.fields.length;i++)
                    fields[i] = result.fields[i].name
                  returnVal = {
                      query: query,
                      err: false,
                      result: result.rows,
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