//library imports
const sqlparser = require('node-sqlparser')

//user defined script file imports
const valueType = require('../utils/valuetype')
const jsonframework = require('./jsonframework')

//string constants
const havingTemplate = "select 1 from dual where 1=1 and "
const stringReplaceVal = 'rep_string_'
const notNullReplaceVal = 'rep_not_null'
const havingReplaceVal = 'rep_having_'

//RegExp constants
const havingEndRegExp = /(window|order by|limit|offset|fetch|for|limit|procedure|into outfile|for update|lock in share mode|$)/i
const caseRegExp = /case\s.*when\s.*then\s.*end/i
const caseStart = /case\s+\({0,1}([0-9a-zA-Z.$_]*)\){0,1}\s+when/i
const caseWhenThen = /(when\s+[0-9a-zA-Z._$]*\s+then\s+[0-9a-zA-Z._$]*\s+)/gi
const caseWhenThenEach = /when\s+([0-9a-zA-Z._$]*)\s+then\s+([0-9a-zA-Z._$]*)\s+/i
const caseElse = /else\s+([0-9a-zA-Z._$]*)\send/i
const wordSQL = /[0-9,a-z,A-Z$_]*/
const functionCall = /([0-9a-zA-Z$_.]*)\((\s*[0-9a-zA-Z$_.]*\s*,\s*)*\s*([0-9a-zA-Z$_.]*){1}\s*\)/g
const notNullRegExp = /\s+(not null)[)]?\s+/i
const stringRegExp = /'[^']*'/g
const paranSearch = /\([^)]*\)/

//JSON variable
var havingJSON = JSON.parse('{"having":null}')

module.exports = {
    buildHavingJSON : buildHavingJSON,
    findHaving : findHaving,
    replaceAllString : replaceAllString,
    replaceNotNull : replaceNotNull,
    replaceFunction : replaceFunction,
    buildCaseJSON : buildCaseJSON,
    removeExtraSpaces : removeExtraSpaces,
    reduceSubQuery : reduceSubQuery,
    stringReplaceVal : stringReplaceVal,
    notNullReplaceVal : notNullReplaceVal
}

/**@function removeSpaces
 * remove unwanted addtional spaces
 * @param {string} inVar - input query
 * @param {Map<string,JSON>}  variableStore - stores the string value replaced in store for later retrival
 * @param {number} storeIndex - sequence counter for replaced variable name
 * @return {string} - json consists of query with with trimmed spaces, store and index counter value
 */
function removeExtraSpaces(result){
    return new Promise((resolve,reject)=>{

        result.query = result.query.replace(/\s\s+/g, ' ').replace(/\([ ]*/ig,'\(')

        resolve(result)
    })
}

/**@function parseSQL 
 * @description Parse the given query into JSON format
 * @param inVar {string} - input query
 * @return {JSON} - JSON format of the output if parsed else an empty JSON
*/
function parseSQL(inVar){

if(/^\(?select/i.exec(inVar)){
    return sqlparser.parse(inVar)
    
}else {
    return sqlparser.parse('select '+inVar).columns[0]
}

}

/**@function reduceSubQuery
 * @description Searches all inner query and functions and simplifies main query
 * @param {string} inVar - input query
 * @param {Map<string,JSON>}  variableStore - stores the string value replaced in store for later retrival
 * @param {number} storeIndex - sequence counter for replaced variable name
 * @return {JSON} inVar - json consists of query string with all inner queries replaced with variable rep_string, store and index counter value
 * @requires run replaceFunction before running this
 * @example console.log(reduceSubQuery(removeSpace("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS 'NOT NULL') / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums"),new Map(),0))
 * 
 * SELECT rep_string_4 AS avgAlbums
{ result: 'SELECT rep_string_4 AS avgAlbums',
  store:
   Map {
     'rep_string_0' => 'COUNT(album_id)',
     'rep_string_1' => '(SELECT rep_string_0 FROM albums WHERE released IS \'NOT NULL\')',
     'rep_string_2' => 'COUNT(DISTINCT released)',
     'rep_string_3' => '(SELECT rep_string_2 FROM albums)',
     ' rep_string_4' => '(rep_string_1 /rep_string_3)' },
  index: 5 }
 */
function reduceSubQuery(result){
    return new Promise((resolve,reject)=>{
        var res = paranSearch.exec(result.query)
        var before=''
        var subRes=''
        var parsedSQL = {}
if(res){
    while(res){
        subRes = res[0].slice(res[0].lastIndexOf("(")) 
        if(subRes){
            
            //TODO: The logic is working but simplify it
            if(!/^\(\s*select/i.exec(subRes)){
                before=result.query.slice(result.query.lastIndexOf(' ',result.query.indexOf(subRes))+1,result.query.indexOf(subRes))
                if(!/(select|where|from|group by|having|order by|limit)/i.exec(before))
                    subRes=before+subRes
                }
                console.log('before:'+subRes)
                parsedSQL = parseSQL(subRes)
                console.log('after:'+parsedSQL)
                //TODO: identify is the subRes has having expression remove having expression and call parseSQL and append having JSON in its place
                console.log(subRes+':'+JSON.stringify(parsedSQL))
            addToStore(subRes,result,/^\(\s*select/i.exec(subRes)?jsonframework.innerQuery(parsedSQL):parsedSQL).then((value)=>{
                result = value
            })
            console.log(result)
        }
        res=paranSearch.exec(result.query)
        }
}
        
        resolve(result)
    })

}
//console.log(reduceSubQuery(removeSpace("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS 'NOT NULL') / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums"),new Map(),0))


/**@function buildHavingJSON
 * @description Converts the having clause to where genrating the JSON then adding that to having JSON
 * Uses ('node-sqlparser').parse and ('node-sqlparser').stringify libraries
 * @param inVar {string} - having clause condition
 * @return havingJSON {JSON} - JSON format of the having condition
 * @example buildHavingJSON('album_id=21')
 * 
 * { having:
   { type: 'binary_expr',
     operator: '>=',
     left: { type: 'column_ref', table: '', column: 'album_id' },
     right: { type: 'number', value: 21 } } }
 */
//TODO: use this function once whole sql json is build
function buildHavingJSON(result){
    return new Promise((resolve,reject)=>{
        findHaving(result.query).then((havingExp)=>{
            if(havingExp !== null){
                var astObj = sqlparser.parse(havingTemplate+havingExp.having)
                //parse the query removing having query
                sqlJSON = parseSQL(havingExp.query)
    
                //add new having key for the query
                sqlJSON.having=astObj.where.right

            }else{
                sqlJSON = parseSQL(result.query)
            }
            result.json = sqlJSON
            resolve(result)
        })
    })
}

//buildHavingJSON('SELECT COUNT(album_id) AS collabAlbums FROM artist_album HAVING count(album_id) > 1',new Map(),0)
//console.log(sqlparser.parse(havingTemplate+' count(album_id) > 1'))

/**@function findHaving
 * @description Identifies an having statement in the inner query and returns the where clause
 * @param inVar {string} - sql query
 * @return {string} - having clause
 * @requires call replaceAllString before calling this function
 * global variable havingEnd {RegEx} - identify the end of having clause
 * @example findHaving("SELECT id, COUNT(id) FROM artists JOIN artist_album ON artist_id = id JOIN albums ON albums.album_id = artist_album.album_id GROUP BY id HAVING count(id) >= 5")
 * 
 * count(id) >= 5
 */
function findHaving(inVar){
    return new Promise((resolve,reject)=>{
        //identify and replace all strings
    if(inVar.match(/\shaving\s/i)){
        var temp = inVar 
        var havingStart = temp.search(/(having)/i)+'having'.length
        var havingStartLen = temp.search(/(having)/i)
        var havingEnd = temp.search(havingEndRegExp)
        // if having is the last expression in the sql query
        var replacedString = ''
        if(havingEnd!=-1){
            replacedString = temp.slice(havingStart)
            temp = temp.replace(temp.substring(havingStartLen),'')    
        }
        else {
            replacedString = (temp.slice(havingStart,havingEnd))
            temp = temp.replace(temp.substring(havingStartLen,havingEnd),'')    
        }
        resolve({ query: temp,having: replacedString})
    }
    else{
        resolve(null)
    }
    })
    
}


//TODO: add comments
function addToStore(searchValue,result,buildJSON){
    return new Promise((resolve,reject)=>{
        var replaceString = stringReplaceVal+result.index++
        result.store = result.store.set(replaceString,buildJSON)
        result.query = result.query.replace(searchValue,replaceString)
        resolve(result)
    })
}


/**
 * @function replaceAllString
 * @description removes all strings in the query with a_string
 * @param {string} inVar - input query
 * @param {Map<string,JSON>}  variableStore - stores the string value replaced in store for later retrival
 * @param {number} storeIndex - sequence counter for replaced variable name
 * @return {string} - json consists of query with all string replaced with variable rep_string, store and index counter value
 * global variable - stringReplaceVal {string} constant value 'rep_string'
 * @example replaceAllString("select * from albums where album_title='2001 The Odessy'",new Map(),0)
 * 
 * { result: 'select * from albums where album_title=rep_string_0',
  store:
   Map {
     'rep_string_0' => { type: 'string', value: '\'2001 The Odessy\'' } },
  index: 1 }
 */
function replaceAllString(result){
    return new Promise((resolve,reject)=>{
        var strs = result.query.match(stringRegExp)
        //If any string is present in the query replaces it
        if(strs){
            strs.forEach((item)=>{
                addToStore(item,result,jsonframework.identifier(item)).then((value)=>{
                    result = value
                    resolve(result)
                })
            })
        }else{
        resolve(result)
        }
        
    })
}

/**
 * @function replaceNotNull
 * @description removes all not null comparision statment with 'rep_not_null'
 * @param {string} inVar - input query
 * @param {Map<string,string>} variableStore - stores the not null value replaced in store for later retrival
 * @param {number} storeIndex - sequence counter for replaced variable name
 * @return {JSON} - input replaced all is not null statement with 'rep_not_null' and the updated map containing the variable and string replaced
 * global variable - notNullReplaceVal {string} constant value 'rep_not_null'
 * @requires this function should be called after replaceAllString
 * @example replaceNotNull('select * from albums where released is not null',new Map())
 * 
 * { result: 'select * from albums where released is rep_not_null',
  store: Map { 'rep_not_null' => { type: 'not null', value: 'not null' } } }
 */
function replaceNotNull(result){
    return new Promise((resolve,reject)=>{
        var notNull = notNullRegExp.exec(result.query)
        if(notNull){
            addToStore(notNull[1],result,jsonframework.identifier('not null')).then((value)=>{
                result = value
                resolve(result)
            })
        }else{
            resolve(result)
        }

    })
}


/**
 * @function buildCaseJSON
 * @description converts the case statement in string to json format
 * @param {string} caseClause - case statement extract from the query
 * @return {JSON}
 * @example buildCaseJSON('SELECT CASE released  WHEN 1987 THEN rep_string_9 WHEN 1988 THEN rep_string_10 WHEN 1989 THEN rep_string_11 END AS output albums WHERE released BETWEEN 1987 AND 1989','released',null)
 * 
 *   { type: 'case_expr',
                value:
                {   value: { type: 'string', value: 'released' },
                    cond_result: [ 
                                    { conditon: { type: 'number', value: 1998 },
                                        result: { type: 'string', value: 'before' } },
                                    { conditon: { type: 'number', value: 1999 },
                                        result: { type: 'string', value: 'current' } },
                                    { conditon: { type: 'number', value: 2000 },
                                        result: { type: 'string', value: 'after' } } 
                                ],
                    default: null } } 
 */ 
function buildCaseJSON(result){
    return new Promise((resolve,reject)=>{

    var searchCase = result.query.match(caseRegExp)

    if(searchCase){
        //TODO: Implement the for loop to work for any number of case statements
        for(let eachCase of searchCase){
            //extracting the value from case value when statement
            let caseMatchStart = eachCase.match(caseStart)
            console.log(eachCase)
            let caseCondResult = []
            
            //extract each condition and result values
            for(let each of eachCase.match(caseWhenThen)){
                let eachMatch = each.match(caseWhenThenEach)
                //(when <eachMatch[1]> then <eachMatch[2]>) Condition part of the clause in index 1 respectively result part in index 2
                if(eachMatch)
                    caseCondResult.push({condition:eachMatch[1],result:eachMatch[2]})
            }
            let caseMatchElse = eachCase.match(caseElse)
            //caseMatchStart and caseMatchElse if the match is found then the value at index one is passed else passed null value
            //TODO: use addToStore for the generated JSON for case
            addToStore(eachCase,result,jsonframework.caseStatement(caseCondResult,(caseMatchStart?caseMatchStart[1]:null),(caseMatchElse?caseMatchElse[1]:null))).then((value)=>{
                result = value
                resolve(result)
            })

        }
    }else{
    resolve(result)
    }

    })
}

//console.log('SELECT CASE released  WHEN 1987 THEN rep_string_9 WHEN 1988 THEN rep_string_10 WHEN 1989 THEN rep_string_11 else what END AS output albums WHERE released BETWEEN 1987 AND 1989'.match(mysqlCase))


/**
 * @function replaceFunction
 * @description removes all function call in the query with a variable name
 * @param {string} inVar - input query
 * @param {Map<string,string>} variableStore - stores the function call replaced in store for later retrival
 * @return {JSON} - input replaced all function calls and the updated map containing the variable and string replaced
 * @requires replaceString {string} global constant value 'rep_string_'
 * @requires replaceAllString - replaces the string in the query with a value
 * @requires functionCall {RegExp} global constant to identify function calls /([0-9a-zA-Z$_]*)\((\s*[0-9a-zA-Z$_]*\s*,\s*)*\s*([0-9a-zA-Z$_]*){1}\s*\)/g
 * @example replaceFunction("SELECT	CASE released  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END AS output albums WHERE released BETWEEN 1987 AND 1989",new Map(),0)
 * 
 * { result: 'SELECT\tCASE released  WHEN 1987 THEN rep_string_9 WHEN 1988 THEN rep_string_10 WHEN 1989 THEN rep_string_11 END AS output albums WHERE released BETWEEN 1987 AND 1989',
  store:
   Map {
     'rep_string_0' => '\' | \'',
     'rep_string_1' => '\' | \'',
     'rep_string_2' => '\'before\'',
     'rep_string_3' => '\' | \'',
     'rep_string_4' => '\' | \'',
     'rep_string_5' => '\'same\'',
     'rep_string_6' => '\' | \'',
     'rep_string_7' => '\' | \'',
     'rep_string_8' => '\'after\'',
     'rep_string_9' => { type: 'expr_func', name: 'CONCAT', args: [Array] },
     'rep_string_10' => { type: 'expr_func', name: 'CONCAT', args: [Array] },
     'rep_string_11' => { type: 'expr_func', name: 'CONCAT', args: [Array] } },
  index: 12 }
 */
function replaceFunction(result){
    return new Promise((resolve,reject)=>{
    var functionJSON = ''

   var strs =  result.query.match(functionCall)
   if(strs){
    strs.forEach((item)=>{
        addToStore(item,result,buildFunctionJSON(item)).then((value)=>{
            result = value
            resolve(result)
        })
        })
   }else{
    resolve(result)
   }
    })
}

/**
 * @function buildFunctionJSON
 * converts the function call in string to json format
 * @param {string} functionClause string containing the function call
 * @return {JSON} 
 * @example buildFunctionJSON("CONCAT(title, ' | ', released, ' | ', 'before')")
 * @result - { type: 'expr_func',
  name: 'CONCAT',
  args:
   [ { type: 'string', value: 'title' },
     { type: 'string', value: '\' | \'' },
     { type: 'string', value: 'released' },
     { type: 'string', value: '\' | \'' },
     { type: 'string', value: '\'before\'' } ] }
 */
function buildFunctionJSON(functionClause){
    // CONCAT(title, rep_string_0, released, rep_string_1, rep_string_2) = <functionName>(<functionParams>)
    var functionName = functionClause.substring(0,functionClause.indexOf('('))
    var functionParams = functionClause.substring(functionClause.indexOf('(')+1,functionClause.indexOf(')')).split(/\s*,\s*/)
    return jsonframework.functionCall(functionName,functionParams)
}
