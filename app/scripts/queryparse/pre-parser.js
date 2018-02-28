const sqlparser = require('node-sqlparser')

const havingTemplate = "select 1 from dual where 1=1 and "
const havingEnd = /(window|order by|limit|offset|fetch|for|limit|procedure|into outfile|for update|lock in share mode)/i
const stringReplaceVal = 'rep_string'
const notNullReplaceVal = 'rep_not_null'


var havingJSON = JSON.parse('{"having":null}')

module.exports = {
    buildHavingJSON : buildHavingJSON,
    findHaving : findHaving
}

/**@function buildHavingJSON
 * @description Converts the having clause to where genrating the JSON then adding that to having JSON
 * Uses ('node-sqlparser').parse and ('node-sqlparser').stringify libraries
 * @param inVar {string} - having clause condition
 * @return havingJSON {JSON} - JSON format of the having condition
 * @example buildHavingJSON('album_id=21')
 */
function buildHavingJSON(inVar){
    var astObj = sqlparser.parse(havingTemplate+inVar)
    
    //having clause is generated in right side after first where condition
    havingJSON.having=astObj.where.right
    return havingJSON
}


/**@function findHaving
 * @description Identifies an having statement in the inner query and returns the where clause
 * @param inVar {string} - sql query
 * @return {string} - having clause
 * global variable havingEnd {RegEx} - identify the end of having clause
 * @example findHaving("SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id HAVING count(id) >= 5")
 */
function findHaving(inVar){
    //identify and replace all strings
    var temp =replaceAllString(inVar) 
    var havingStart = temp.search(/(having)/i)+'having'.length
    var havingEnd = temp.search(havingEnd)
    if(havingEnd!=-1)
    return temp.slice(havingStart)
    else
    return temp.slice(havingStart,havingEnd)
}
//simplify.module.buildHavingJSON
//console.log(buildHavingJSON(findHaving("SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id HAVING count(id) >= 5")))

/**
 * @function replaceAllString
 * @description removes all strings in the query with a_string
 * @param {string} inVar - input query
 * @return {string} - query with all string replaced with variable rep_string
 * global variable - stringReplaceVal {string} constant value 'rep_string'
 * @example replaceAllString("select * from albums where album_title='2001 The Odessy'")
 */
function replaceAllString(inVar){
    return inVar.replace(/'[^']*'/g,stringReplaceVal)
}

/**
 * @function replaceNotNull
 * @description removes all not null comparision statment with 'rep_not_null'
 * @param {string} inVar - input query
 * @return {string} - input replaced all is not null statement with 'rep_not_null'
 * global variable - notNullReplaceVal {string} constant value 'rep_not_null'
 * @example replaceNotNull('select * from albums where released is not null')
 */
function replaceNotNull(inVar){
    return replaceAllString(inVar).replace(/(not null)/i,notNullReplaceVal)
}

//console.log(replaceNotNull('select * from albums where released is not null'))

//console.log(sqlparser.parse('SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id'))
var parsed = sqlparser.parse('SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id')
var having = buildHavingJSON(findHaving('SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id HAVING count(id) >= 5'))
parsed.having = having.having
//console.log(parsed)
const caseJSON = /case\s.*when\s.*then\s.*end/i
//console.log(caseJSON.exec("SELECT	CASE (released)  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END AS output FROM albums WHERE released BETWEEN 1987 AND 1989"))
//CASE (released)  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END


console.log(selectClause.exec("SELECT	CASE (released)  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END AS output albums WHERE released BETWEEN 1987 AND 1989"))