var express = require('express')
var router = express.Router()
const fs = require('fs')

const mysqlconnect = require('../scripts/database/mysqlconnect')
const parsesql = require('../scripts/queryparse/parsesql')

router.get('/mysql',(req,res)=>{
    res.render('index',{
        pageTitle: 'MySQL',
        pageID: 'mysql'
    })
})

router.post('/mysql',(req,res)=>{
    mysqlconnect.establishconnection(req.body).then((connection)=>{
        mysqlconnect.executequery(req.body.query,connection).then((result)=>{
            parsesql.simquery(req.body.query).then((jsonquery)=>{
                res.render('index',{
                    pageTitle: 'Mysql result',
                    pageID: 'mysql-result',
                    user: req.body.name,
                    query: req.body.query,
                    err: result.err,
                    result: result.result,
                    fields: result.fields,
                    jsonquery: jsonquery
                }) 
            })

        })
    })
})

//     mysqlConnect.runMySQLQuery(req.body).then((values)=>{
//         parsesql.simquery(values.query).then((jsonquery)=>{
//         if(req.body.query1!=undefined){
//             parsesql.simquery(req.body.query1).then((jsonquery1)=>{
//                 console.log(jsonquery1)
//                 res.render('index',{
//                     pageTitle: 'MySQL result',
//                     pageID: 'mysql-result',
//                     user: req.body.name,
//                     query: values.query,
//                     query1: req.body.query1,
//                     err: values.err,
//                     result:values.result,
//                     fields:values.fields,
//                     jsonquery: jsonquery,
//                     jsonquery1: jsonquery1
//                 })
    
//             })
//         }else{
//             res.render('index',{
//                 pageTitle: 'MySQL result',
//                 pageID: 'mysql-result',
//                 user: req.body.name,
//                 query: values.query,
//                 err: values.err,
//                 result:values.result,
//                 fields:values.fields,
//                 jsonquery: jsonquery
//             })
//         }
        
        
//         })
        
//     })
    
// })

module.exports = router