const mysql = require('../database/mysqlconnect')

function getRowsCount(user,query){
    return new Promise((resolve,reject)=>{
        mysql.connectExecute(user,`select count(*) count from (${query}) tableA`).then((result)=>{
            resolve(result.result[0].count)
        })
    })
}

module.exports = 
{
    getRowsCount: getRowsCount
}

getRowsCount({name:'vijayv',password:'4JqcY8Tw',database:'mysql'},'select title at, released ar from albums a where a.released % 4 = 0').then((result)=>{
    console.log(result)
})