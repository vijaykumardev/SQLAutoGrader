const sqlparser = require('node-sqlparser')
const preparser = require('./pre-parser')
const postparser = require('./postparser')

/**
 * @function simplifyquery(sql)
 * @description creates key-value pairs of all the clause in the sql query
 * @param {JSON} sql - json representation of the query
 * @returns {JSON} 
 */
function simplifyquery(sql){
    return new Promise((resolve,reject)=>{

        sqlJSON = sqlparser.parse(sql)

        var select=from=limit=where=groupby=orderby=distinct = null;
        
        if(sqlJSON.type==='select'){
        
            if(sqlJSON.distinct)
                distinct=true
            
            if(sqlJSON.columns!==null){
            select = sqlJSON.columns.map((item)=>{
                if(item.expr.type==='number'||item.expr.type==='string')
                    return item.expr.value
                return item.expr.column
            }).join(",")
            } //select
            
            if(sqlJSON.from!==null){
            from = sqlJSON.from.map((item)=>{
                return item.table
            }).join(",")
            } //from
        
            where = stringifyconditions(sqlJSON.where)
            
            if(sqlJSON.limit!==null){
            limit = sqlJSON.limit.map((item)=>{
                return item.value
            }).join(",")
            } //limit
            
            if(sqlJSON.groupby!==null){
                groupby = sqlJSON.groupby.map((item)=>{
                    if(item.type==='column_ref'){
                        if(item.table !== '')
                            return item.table+'.'+item.column
                        return item.column
                    }
                }).join(",")
            } //groupby
        
            if(sqlJSON.orderby!==null){
                orderby = sqlJSON.orderby.map((item)=>{
                    if(item.expr.type==='column_ref'){
                        if(item.expr.table !== '')
                            return item.expr.table+'.'+item.expr.column+' '+item.type
                        return item.expr.column+' '+item.type
                    }
                }).join(",")
            } //orderby
        
        }
        
        var queryJSON = {
            select: select,
            from: from,
            where: where,
            groupby: groupby,
            orderby: orderby,
            limit: limit,
            distinct: distinct
        }
        resolve(queryJSON)

    })

} //simplifyquery


/**
 * @function stringifyconditions
 * @param {JSON} whereclause
 * @description  returns the string object of the where JSON 
 * @return {string} 
 */
function stringifyconditions(whereclause){
    if(whereclause!==null){
    if(whereclause.type==='binary_expr'){
        return stringifyconditions(whereclause.left)+' '+whereclause.operator+' '+stringifyconditions(whereclause.right)
    }else if(whereclause.type==='column_ref'){
        if(whereclause.table !== '')
            return whereclause.table+'.'+whereclause.column
        return whereclause.column
    }else if(whereclause.type==='number'){
        return whereclause.value
    }
}
} //stringifyconditions

module.exports = {
    simquery : simplifyquery,
    parse : parseSQL
}

function parseSQL(query, variableStore, storeIndex) {
    return new Promise((resolve,reject)=>{
        var result = {
            query: query,
            store: variableStore,
            index: storeIndex,
            json: null
        }
        preparser.replaceAllString(result).then((result) => {
            console.log('Strings')
            preparser.replaceNotNull(result).then((result) => {
                console.log('NotNull')
                preparser.removeExtraSpaces(result).then((result) => {
                    console.log('ExtraSpace')
                    preparser.replaceFunction(result).then((result) => {
                            console.log('Function')
                        preparser.buildCaseJSON(result).then((result) => {
                            console.log('buildCase')
                            console.log(result)
                            preparser.reduceSubQuery(result).then((result)=>{
                                console.log('reduceQuery:'+result)
                                preparser.buildHavingJSON(result).then((result)=>{
                                    console.log('having')
                                    console.log(result)
                                  postparser.replaceMapValues(result).then((result)=>{
                                      console.log('postparser')
                                      resolve(result)
                                  })
                                }).catch((err)=>{
                                    reject('Error in  buildHavingJSON :'+err)
                                })
                            }).catch((err)=>{
                                reject('Error in  reduceSubQuery:'+err)
                            })
                        }).catch((err)=>{
                            reject('Error in buildCaseJSON:'+err)
                        })
                    }).catch((err)=>{
                        reject('Error in replaceFunction:'+err)
                    })
                }).catch((err)=>{
                    reject('Error in  removeExtraSpaces:'+err)
                })
    
            }).catch((err)=>{
                reject('Error in  replaceNotNULL:'+err)
            })
        }).catch((err) => {
            reject('Error in replaceAllString:' + err)
        })
    })
}

// parseSQL("SELECT	CASE ('released')  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END AS output FROM albums WHERE released BETWEEN 1987 AND '1989'",new Map(),0).then((values)=>{
//     console.log(values)
// })

// parseSQL("SELECT title,CASE ('released')  WHEN 1987 THEN 'before' WHEN 1988 THEN 'same' END AS output FROM albums where released is not null group by title,released having released=1987 or released=1988",new Map(),0).then((values)=>{
//     console.log(values)
// })

// parseSQL("select a.name, al.title, al.released from artists a join artist_album aa on a.id = aa.artist_id join albums al on aa.album_id = al.album_id where al.released is null ",new Map(),0).then((values)=>{ 
//     console.log(JSON.stringify(values.json))
//     console.log(values)
// })

//TODO: Implement inner query
// parseSQL("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS NOT NULL) / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums",new Map(),0).then((values)=>{
//     console.log(values.query)
//     console.log(values.store)
//     console.log(values.json)
//     console.log('---------------')
//     console.log(values.json.columns[0].expr.expr.right.columns[0].expr.expr.right.columns[0].expr.expr.right.columns[0].expr.expr.right)
//     //console.log(JSON.stringify(values.json))
// })

// console.log(sqlparser.parse('select * from albums having album_id=1'))

//console.log(sqlparser.parse('SELECT DISTINCT p.first_name, p.surname FROM people p join credits c on p.peopleid = c.peopleid  join movies m on m.movieid = c.movieid WHERE m.title=rep_string_0 and c.credited_as=rep_string_1  ORDER BY p.first_name, p.surname ASC'))

console.log(sqlparser.parse('select * from vijayv.albums al'))