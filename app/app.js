//"use strict";

// Port defintion

const PORT = 3100;

// Import the HTTP library
const express = require('express')
const  bodyParser = require('body-parser')
const qs = require('querystring');
var app = express()
//const http1 = require('http')
// Import the fs filesystem
const fs = require('fs');
const mysql = require('mysql')
const pg = require('pg')
const reload = require('reload')

//const homepage = require('./view/homepage')
//const head = require('./view/head')
//const finalScript = require('./scripts/append')

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

pg.defaults.ssl = true;

const TYPE_TITLE = 'TITLE'
const TYPE_BODY = 'BODY'
const TYPE_ERROR = 'ERROR'
// Import user defined javascript functions
//const cMysql = require('./connectMySQL');


var makeTable = function makeHTMLTable(rows,fields){
    //console.log('Inside makeTable')
    //console.log(rows)
   var table_body = ''
    for(var i in rows){
        table_body += '<tr>'
    for(var j in rows[i])
        table_body +='<td>'+rows[i][j]+'</td>'
    table_body +='</tr>'
}  

var table_header = '<tr>'+fields.map((item)=>{ '<th>'+item.name+'</th>'}).join("")+'</tr>'
for(var j in rows[0])
    table_header += '<th>'+j+'</th>'
table_header += '</tr>'
var table = '<table class="table table-bordered" class="success" >'+table_header+table_body+'</table>'
return table
}

function emitMessage(res,type,message,hint,position){
if(type==TYPE_TITLE){
    res.write('<h2><a href="#">'+message+'</h2></a>')
    io.emit('message','<h2><a href="#">'+message+'</h2></a>')
}else if(type==TYPE_BODY){
    res.write('<div>'+message+'</div>')    
    io.emit('message','<div>'+message+'</div>')
}
else if(type==TYPE_ERROR){
    res.write('<div><p style="color:red;">Error:'+message+'<br>Suggesstion:'+hint+'<br>Error at column:'+position+'</p></div>')
    io.emit('message','<div><p style="color:red;">Error:'+message+'<br>Suggesstion:'+hint+'<br>Error at column:'+position+'</p></div>')
}
}

function runInMySQL(query,MySQLcon,res){
    return new Promise((resolve,reject)=>{
    MySQLcon.query(query, function(err, rows, fields)   
    {  
        var returnVal = '<h2><a href="#">'+query+'</h2></a> \n'
        if (err){
            returnVal += '<div><p style="color:red;">Error:'+err+'</p></div> \n'
            resolve(returnVal)
        } else{
        returnVal += makeTable(rows,fields)
        resolve(returnVal)
        }
    });
}) 
}

function runInPostgres(query,pool,res){

    return new Promise((resolve,reason)=>{pool.connect((err,client,done)=>{
        var returnVal = '<h2><a href="#">'+query+'</h2></a> \n'
        if(err) {
            returnVal = '<div><p style="color:red;">Error:'+err.message+'<br>Suggesstion:'+err.hint+'<br>Error at column:'+err.position+'</p></div>'
            return resolve(returnVal)
        }else{
    
        client.query(query, (err,rows,fields)=>{
            done()
            if(err){
                returnVal = '<div><p style="color:red;">Error:'+err.message+'<br>Suggesstion:'+err.hint+'<br>Error at column:'+err.position+'</p></div>'
                return resolve(returnVal)
            }else{
                returnVal += makeTable(rows.rows,fields)
                return resolve(returnVal)
            }
        })
    }
    })
})
}

function loadFile(params,res){

    var filename = String(params.filename)
    var database = String(params.database)
    var name = String(params.name)
    var password = String(params.password)
    var pool = ''
    var returnVal = '<html><body>'
    var promise = []
    console.log(filename)
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
                    //returnVal += '<h2><a href="#">'+item+'</h2></a> \n'
                    returnVal += item
                    //console.log(item)
                    return returnVal
                }).then(function(value){
                    console.log('final')
        console.log(value)
        res.send(value+'</body></html>')
                })
                  
            }
            })
              
        }  
        // else{
        //     returnVal += '<h4>File '+filename+' does not exists</h4>'
        //     res.statusCode=200
        // console.log(returnVal)
        // res.end(returnVal+'</body></html>')
        // }
        
    })
    // res.statusCode=200
    //     console.log(returnVal)
    //     res.end(returnVal+'</body></html>')
}

app.set('port',process.env.PORT||3546)
app.set('view engine','ejs')
app.set('views','app/views')

app.locals.siteTitle = 'Autograder'

app.use(express.static('app/public'))
app.use(require('./routes/index'))
app.use(require('./routes/mysql'))
app.use(require('./routes/postgres'))

//  // Start listening on port 80
 var server = app.listen(app.get('port'),()=>{
    console.log('server is listening on port',app.get('port'))
})

reload(app)