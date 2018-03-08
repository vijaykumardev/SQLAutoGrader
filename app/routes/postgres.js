var express = require('express')
var router = express.Router()
const fs = require('fs')

const pgconnect = require('../scripts/database/pgconnect')
const parsesql = require('../scripts/queryparse/parsesql')

router.get('/postgres',(req,res)=>{
    res.render('index',{
        pageTitle: 'Postgres SQL',
        pageID: 'postgres',
        name: req.session.user.name
    })
})

router.post('/postgres',(req,res)=>{
    pgconnect.establishconnection(req.session.user).then((connection)=>{
        pgconnect.executequery(req.body.query,connection).then((result)=>{
                res.render('index',{
                    pageTitle: 'Postgres result',
                    pageID: 'postgres-result',
                    name: req.session.user.name,
                    query: req.body.query,
                    err: result.err,
                    result: result.result,
                    fields: result.fields
                }) 
        })
    }).catch((err)=>{
        res.render('index',{
            pageTitle: 'Postgres result',
            pageID: 'postgres-result',
            err:true,
            user: req.session.user.name,
            query: req.body.query,
            result: 'Error while connecting to datbase '+req.body.database+'\n'+err
        })
    }) // implement reject case
})

module.exports = router