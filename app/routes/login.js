const express = require('express')
const router = express.Router()
const mysqlconn = require('../scripts/config/mysql')
const postgresconn = require('../scripts/config/postgres')
const readdir = require('../scripts/file/read-directory')

const JSON_PATH='app/public/json/questions/'

router.get('/login', function(req, res) {
  // Get the visitor name set in the cookie 
        if(req.session.user){
        var credential = {
            name:req.body.name,
            password: req.body.password,
            database: req.body.database
        }
        req.session.user=credential
       if(req.body.database==='mysql'){
        mysqlconn(req.body).then((connection)=>{
            res.redirect('mysql')
        }).catch((err)=>{
            res.render('./partials/content/login.ejs',{
                pageTitle: 'Login',
                pageID: 'login',
                message: err
            }) 
        })
        }else {
            postgresconn(req.body).then((connection)=>{
            
            
                res.redirect('postgres')
            }).catch((err)=>{
                res.render('./partials/content/login.ejs',{
                    pageTitle: 'Login',
                    pageID: 'login',
                    message: err
                })
        })
    } } else {
    var message = req.session.message
    req.session.message = null
    // render the page and pass in any flash data if it exists
    res.render('./partials/content/login.ejs',{
        message: message,
        pageTitle: 'Login',
        pageID: 'login'
    }) 
}
})

router.post('/login',(req,res)=>{
    var questions = []
    var credential = {
        name:req.body.name,
        password: req.body.password,
        database: req.body.database
    }
    var message = ''
    req.session.user=credential
    if(req.body.database==='mysql'){
        console.log('inside mysql')
        mysqlconn(req.body).then((connection)=>{
            readdir.readLoadFiles(JSON_PATH).then((contents)=>{ contents.forEach((item)=>{
                    questions.push(JSON.parse(item))
                })
             }).then(()=>{
                 req.session.questions = questions
            res.redirect(req.body.database)
             })
        }).catch((err)=>{
            message = err
    })
    }else if(req.body.database ==='postgres'){
        postgresconn(req.body).then((connection)=>{
            readdir.readLoadFiles(JSON_PATH).then((contents)=>{
                contents.forEach((item)=>{
                    questions.push(JSON.parse(item))
                })
             }).then(()=>{
                 req.session.questions = questions
            res.redirect(req.body.database)
             })
        }).catch((err)=>{
            message = err
    })
    }else{
        message = 'Invalid database selected'
    }
if(message.length>0)
    res.render('./partials/content/login.ejs', { 
    message: message,
    name: req.body.name,
    database: req.body.database,
    password: req.body.password
 })
})


module.exports = router