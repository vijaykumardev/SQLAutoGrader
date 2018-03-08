const express = require('express')
const router = express.Router()
const cookie = require('cookie')

const mysqlconnect = require('../scripts/database/mysqlconnect')
const parsesql = require('../scripts/queryparse/parsesql')

router.get('/mysql',(req,res)=>{
    if(req.session.user && req.session.user.database==='mysql'){
    res.render('index',{
        pageTitle: 'MySQL',
        pageID: 'mysql',
        name: req.session.user.name
    })
}else{
    //res.cookie('message','Please enter login details', { maxAge: 60, httpOnly: true }) // maxAge is 4 hours
    req.session.message = 'Please enter login details'
    res.redirect('login')
}
})

router.post('/mysql',(req,res)=>{
    console.log(req.session.user)
    console.log(req.body.query)
    if(req.body.query===undefined && !req.session.user){
        res.render('index',{
            pageTitle: 'MySQL',
            pageID: 'mysql',
            name: req.session.user.name
        })
    } else if( req.session.user &&req.session.user.database==='mysql'){
        var credential = {
            name: req.cookies.name,
            password: req.cookies.password,
            database: req.cookies.database
        }
        mysqlconnect.establishconnection(req.session.user).then((connection)=>{
            mysqlconnect.executequery(req.body.query,connection).then((result)=>{
                //parsesql.simquery(req.body.query).then((jsonquery)=>{
                    res.render('index',{
                        pageTitle: 'Mysql result',
                        pageID: 'mysql-result',
                        name: req.body.name,
                        query: req.body.query,
                        err: result.err,
                        result: result.result,
                        fields: result.fields//,
                        //jsonquery: jsonquery
                    }) 
                //})
    
            })
        })
        } else{
        res.cookie('warning','Redirecting from mysql page', { maxAge: 60, httpOnly: true }) // maxAge is 4 hours
        res.cookie('message','Please enter login details', { maxAge: 14400, httpOnly: true }) // maxAge is 4 hours
        res.redirect('login')
        }
})

module.exports = router