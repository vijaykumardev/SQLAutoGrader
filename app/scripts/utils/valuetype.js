//RegExp constants
const boolRegExp = /^(true|false)$/i
//const stringRegExp = /'[^']+'/
const nullRegExp = /^null$/i
//const columnRegExp = /[0-9a-zA-Z_.$]+/
const stringRegExp = /^[0-9a-zA-Z_.$]+$/
const numberRegExp = /^[0-9\.]+$/
const notNullRegExp = /^not null$/i

/**
 * @function checkValueType
 * @description check the type of the value stored in a variable
 * @param {string} value 
 * @return {"null"|"bool"|"number"|"column_ref"|"string"} returns the type of value stored in the variable
 */
function checkValueType(identifier){
    console.log(numberRegExp.exec(identifier))
    console.log(stringRegExp.exec(identifier))
    if(nullRegExp.exec(identifier))
            return 'null'
        else if(notNullRegExp.exec(identifier))
            return 'not null'
        else if(boolRegExp.exec(identifier))
            return 'bool'
        else if(numberRegExp.exec(identifier))
            return 'number'
        //else if(columnRegExp.exec(identifier))
        //    return 'column_ref'
        //TODO: all words even without quotation marks are considered as string, this should be manipulated in JSON in post-parsing step
        else if(stringRegExp.exec(identifier))
            return 'string'
    return 'string'
}

module.exports={
    checkValueType:checkValueType
}