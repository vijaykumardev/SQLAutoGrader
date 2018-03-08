const mysqlconnect = require('../database/mysqlconnect')
const pgconnect = require('../database/pgconnect')

/**
 * @function runMultipleQuries
 * @description For each queries in the input creates a promise list of execution in database
 * @param {string[]} data - a list of queries
 * @param {string} database - database name
 * @param {any} connection - database connection object
 * @returns {array} list of promises
 */
function runMultipleQuries(data,database,connection){
    return new Promise((resolve,reject)=>{
        var eachquery = data.split('\n')
        var promise = []
        if(database === 'mysql'){
            promise = eachquery.map((item)=>{
                return mysqlconnect.executequery(item,connection)
            })
        }else if(database==='postgres'){
            promise = eachquery.map((item) =>{
                return pgconnect.executequery(item,connection)
            })
        }else {
            reject('Invalid database '+database+' provided')
        }
        resolve(promise)
    })
}

module.exports = {
    runMultipleQuries: runMultipleQuries
}
/*
    var promise = []
    fs.exists(filename, (exists) => {
        if(exists) {
            fs.readFile(filename,"utf8",(err,data)=>{
                if(err){ 
                returnVal = returnVal += '<h4>File opening error'+err+'</h4>'
                }else{
                var data1 = data.split('\n')
                if(database==='mysql'){

                pool = mysql.createConnection({  
                    host     : 'mysql.cis.ksu.edu',  
                    user     : name,  
                    password : password,  
                    database : name   
                    });
                    promise = data1.map((item)=>{
                        return runInMySQL(item,pool)
                    })

                }else if(database==='postgres'){

                    var PGcon = {  
                        host     : 'postgresql.cis.ksu.edu',  
                        port     : 5432,
                        user     : name,  
                    password : password,  
                    database : name   
                      }
                    pool = new pg.Pool(PGcon)
                    promise = data1.map((item)=>{
                        return runInPostgres(item,pool)
                    }).join("")
                }else{
                    returnVal += '<h4>'+database+' is not a valid database </h4>'
                }
                Promise.all(promise).then(function(item){
                    returnVal += item
                    return returnVal
                }).then(function(value){
        console.log(value)
                })
                  
            }
            })
              
        }
        
    })
}
*/