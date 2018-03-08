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
const mysqlCase = /case\s.*when\s.*then\s.*end/i
const caseStart = /case\s+([0-9a-zA-Z.$_]*)\s+when/i
const caseWhenThen = /(when\s+[0-9a-zA-Z._$]*\s+then\s+[0-9a-zA-Z._$]*\s+)/gi
const caseWhenThenEach = /when\s+([0-9a-zA-Z._$]*)\s+then\s+([0-9a-zA-Z._$]*)\s+/i
const caseElse = /else\s+([0-9a-zA-Z._$]*)\send/i
const wordSQL = /[0-9,a-z,A-Z$_]*/
const functionCall = /([0-9a-zA-Z$_.]*)\((\s*[0-9a-zA-Z$_.]*\s*,\s*)*\s*([0-9a-zA-Z$_.]*){1}\s*\)/g

//JSON variable
var havingJSON = JSON.parse('{"having":null}')

module.exports = {
    buildHavingJSON : buildHavingJSON,
    findHaving : findHaving,
    stringReplaceVal : stringReplaceVal
}

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
function buildHavingJSON(inVar,variableStore,storeIndex){
    var astObj = sqlparser.parse(havingTemplate+inVar)
    
    //having clause is generated in right side after first where condition
    havingJSON.having=astObj.where.right
    replaceString = stringReplaceVal+storeIndex++
    variableStore.set(replaceString,jsonframework.identifier(str))
    inVar = inVar.replace(str,replaceString)
    return havingJSON
}


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
    //identify and replace all strings
    var temp = inVar //replaceAllString(inVar) 
    var havingStart = temp.search(/(having)/i)+'having'.length
    var havingEnd = temp.search(havingEndRegExp)
    if(havingEnd!=-1)
    return temp.slice(havingStart)
    else
    return temp.slice(havingStart,havingEnd)
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
function replaceAllString(inVar,variableStore,storeIndex){
    var strs = inVar.match(/'[^']*'/g)
    var replaceString = ''
    for(var str of strs){
        replaceString = stringReplaceVal+storeIndex++
        variableStore.set(replaceString,jsonframework.identifier(str))
        inVar = inVar.replace(str,replaceString)
    }
    
    return {
        result: inVar,
        store:variableStore,
        index:storeIndex
    }
}

/**
 * @function replaceNotNull
 * @description removes all not null comparision statment with 'rep_not_null'
 * @param {string} inVar - input query
 * @param {Map<string,string>} variableStore - stores the not null value replaced in store for later retrival
 * @return {JSON} - input replaced all is not null statement with 'rep_not_null' and the updated map containing the variable and string replaced
 * global variable - notNullReplaceVal {string} constant value 'rep_not_null'
 * @requires this function should be called after replaceAllString
 * @example replaceNotNull('select * from albums where released is not null',new Map())
 * 
 * { result: 'select * from albums where released is rep_not_null',
  store: Map { 'rep_not_null' => { type: 'not null', value: 'not null' } } }
 */
function replaceNotNull(inVar,variableStore){
    if(!variableStore.has(notNullReplaceVal))
        variableStore.set(notNullReplaceVal,jsonframework.identifier('not null'))
    return { result: inVar.replace(/(not null)/i,notNullReplaceVal),
             store:variableStore
            }
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

function buildCaseJSON(caseClause){
    //extracting the value from case value when statement
    let caseMatchStart = caseClause.match(caseStart)
    let caseCondResult = []

    //extract each condition and result values
    for(let each of caseClause.match(caseWhenThen)){
        let eachMatch = each.match(caseWhenThenEach)
        //Condition part of the clause in index 1 respectively result part in index 2
        if(eachMatch)
            caseCondResult.push({condition:eachMatch[1],result:eachMatch[2]})
    }
    let caseMatchElse = caseClause.match(caseElse)
    //caseMatchStart and caseMatchElse if the match is found then the value at index one is passed else passed null value
    return jsonframework.caseStatement(caseCondResult,(caseMatchStart?caseMatchStart[1]:null),(caseMatchElse?caseMatchElse[1]:null))
}


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
function replaceFunction(inVar,variableStore,storeIndex){
   var replaceStr = replaceAllString(inVar,variableStore,storeIndex)
   var functionJSON = ''
   inVar = replaceStr.result
   variableStore = replaceStr.store
   storeIndex = replaceStr.index
   var strs = inVar.match(functionCall)
   for(let func of strs){
    replaceString = stringReplaceVal+storeIndex++
    functionJSON = buildFunctionJSON(func)
    variableStore.set(replaceString,functionJSON)
    inVar = inVar.replace(func,replaceString)
    }
return {
    result: inVar,
    store:variableStore,
    index:storeIndex
}
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

