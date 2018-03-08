var express = require('express')
var router = express.Router()

const loadfile = require('../scripts/file/loadfile')
const runqueries = require('../scripts/utils/runqueries')
const mysql = require('../scripts/database/mysqlconnect')
const pg = require('../scripts/database/pgconnect')

router.get('/',(req,res)=>{
    //app.set('user',req.body.user)
    //app.set('password',req.body.password)
    res.render('index',{
        pageTitle: 'Homepage',
        pageID: 'home'
    })
})

router.post('/',function (req,res){
    var result = []
    loadfile.loadFile(req.body.filename).then((data)=>{
        var establishconnection = null
        if(req.body.database==='mysql'){
            establishconnection = mysql.establishconnection
        } else if(req.body.database === 'postgres') {
            establishconnection = pg.establishconnection
        }
        //TODO use establishconnection for single execution
            establishconnection(req.body).then((connection)=>{
                runqueries.runMultipleQuries(data,req.body.database,connection).then((promises)=>{
                    Promise.all(promises).then((item)=>{
                        //TODO Call parse query function parsesql.simquery when function is working
                        result.push(item)
                        return result
                    }).then((result)=>{
                        //send result of all execution to front end through response object
                        res.render('index',{
                            pageTitle: 'Queries Result',
                            pageID: 'queries-result',
                            result: result
                        })
                    }) //Promise.all
                }).catch((databaseinvaliderr)=>{
                    result += {
                        query: null,
                        err: true,
                        result: databaseinvaliderr,
                        fields: null
                    }
                }) //runqueries.runMultipleQuries
            }) //mysql.establishconnection
    }).catch((err)=>{
        // if file does not exists
        result = {
            query:null,
            err: true,
            result: err,
            fields: null
        }
    }) //loadfile

    
    
})

module.exports = router