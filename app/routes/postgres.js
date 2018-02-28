var express = require('express')
var router = express.Router()

router.get('/postgres',(req,res)=>{
    var fs = req.app.get('fs')
    res.end(fs.readFileSync('app/public/html/execute.html'))
})

router.post('/postgres',(req,res)=>{
    pool = mysql.createConnection({  
        host     : 'mysql.cis.ksu.edu',  
        user     : 'vijayv',  
        password : '4JqcY8Tw',  
        database : 'vijayv'   
        })
    var query = 'SELECT title, released FROM albums WHERE released % 4 = 0'
    pool.query(query, function(err, rows, fields)   
    {  
        var returnVal = '<h2><a href="#">'+query+'</h2></a> \n'
        if (err){
            returnVal += '<div><p style="color:red;">Error:'+err+'</p></div> \n'
            res.send(returnVal)
        } else{
        returnVal += makeTable(rows,fields)
        res.send(returnVal)
        }
    });
})

module.exports = router