const sqlparser = require('node-sqlparser')
const preparser = require('./pre-parser')
const postparser = require('./postparser')
const compareResult = require('../evaluate/compare-result')



module.exports = {
    parse : parseSQL
}

/**
 * @function parseSQL
 * @description Takes an SQL query and converts into a JSON form
 * @param {String} query an SQL query
 * @param {Map<String,String>} variableStore A dictionary to store replacable values
 * @param {Number} storeIndex counter for a dictionary
 * @returns {JSON} JSON representation of the input query
 * @example parseSQL("SELECT title,CASE ('released')  WHEN 1987 THEN 'before' WHEN 1988 THEN 'same' END AS output FROM albums where released is not null group by title,released having released=1987 or released=1988",new Map(),0)
 */
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
                    console.log(result)
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
//     console.log(values.json)
//     var solutionSQL = "select distinct title, released, case released when x - 1 then 'before' when x then 'same' else 'after' end compared_to_me from albums where released between x-1 and x+1"
//     parseSQL(solutionSQL,new Map(),0).then((result)=>{
//         compareResult.checkOutput(values.json,result.json).then((values)=>{
//             console.log(values)
//         })
//     })
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

console.log(sqlparser.parse('select count(*) from vijayv.albums al where artist=5'))