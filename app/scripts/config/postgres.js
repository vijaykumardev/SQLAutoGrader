const pg = require('pg')
const PORT = 5432
pg.defaults.ssl = true

function authenticateUser(params){
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

// create the model for users and expose it to our app
module.exports = authenticateUser