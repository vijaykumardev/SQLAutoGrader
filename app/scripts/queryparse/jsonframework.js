//user defined script file imports
const valuetype = require('../utils/valuetype')

//RegExp constant
const columnTableRegExp = /([0-9a-zA-Z_$]+)\.([0-9a-zA-Z_$]+)/

/**
 * @function caseStatement
 * @description - builds the json format of case statement
 * @param {Array} conditionResult - array of json types containing the condition and result values for case when statment
 * @param {string} value - contains value from case value when statement, null if the value is not present case statement
 * @param {string} result - contains value from else value end statment, null if the value is not present case statement
 * @returns {JSON} - case statement in json format
 * @example caseStatement([{condition:1998,result:'before'},{condition:1999,result:'current'},{condition:2000,result:'after'}],'released',null)
 * @result - { type: 'case_expr',
  value:
   { value: { type: 'string', value: 'released' },
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
function caseStatement(conditionResult,value,result){
    var condition = []
    for(let each of conditionResult)
        condition.push({condition:identifier(each.condition),result:identifier(each.result)})
    return {type : 'case_expr',value: {value:(value==null)?null:identifier(value),cond_result:condition,default:(result===null)?null:identifier(result)}}
}


/**
 * @function functionCall
 * @description - builds the json format of function call
 * @param {string} functionName
 * @param {Array} functionParams - list of function parameters
 * @returns {JSON} - function call in json format
 * @example functionCall('CONCAT',['title','rep_string_0','released','rep_string_1','rep_string_2'])
 * @result - { type: 'expr_func',
  name: 'CONCAT',
  args:
   [ { type: 'string', value: 'title' },
     { type: 'number', value: 'rep_string_0' },
     { type: 'string', value: 'released' },
     { type: 'number', value: 'rep_string_1' },
     { type: 'number', value: 'rep_string_2' } ] }
 */
function functionCall(functionName,functionParams){
    var args = []
    for(let each of functionParams)
        args.push(identifier(each))
    return {type: 'expr_func', name: functionName, args: args }
}

/**
 * 
 * @param {JSON} query json format of inner query
 * @return {JSON} json type of inner query
 * @example innerQuery('select * from albums')
 * 
 * { type: 'inner_query', value: 'select * from albums' }
 */
function innerQuery(query){
    return {type: 'inner_query',value:query}
}

/**
 * @function identifier
 * @description checks the identity type and builds the json type
 * @param {string} identity containing number, word, boolean, null as a string type
 * @return {JSON} JSON containing the type of identifier and it's value
 * @requires checkValueType function
 * @example - identifier('1998')
 * @result { type: 'number', value: '1998' }
 * @example - identifier("'before'")
 * @result { type: 'string', value: '\'before\'' }
 */
function identifier(identity){
    var type = valuetype.checkValueType(identity)
    if(type==='number'||type==='string'||type==='bool'||type==='null'||type==='not null'){
        return {type:type,value:identity}
    }else if(type==='column_ref'){
        var columnWithTable = columnTableRegExp.exec(identity)
        if(columnWithTable){
            var table = columnWithTable[1]
            var column = columnWithTable[2]
            return {type:type,table:table,column:column}

        }else {
            return {type:type,table:'',column:identity}
        }
    } else {
        throw `Error: type cannot be determined in identifier parameter ${identity} method 
        at ./apps/scripts/queryparse/jsonframework.js`
    }
}

module.exports = {
    caseStatement : caseStatement,
    functionCall : functionCall,
    innerQuery : innerQuery,
    identifier : identifier
}

console.log(columnTableRegExp.exec('album.album_id'))