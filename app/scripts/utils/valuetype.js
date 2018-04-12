//User defined files
const preparser = require('../queryparse/pre-parser')
//TODO: use from a file
const stringReplaceVal = 'rep_string_'

//RegExp constants
const boolRegExp = /^(true|false)$/i
const stringRegExp = /'[^']+'/
const nullRegExp = /^null$/i
const columnRegExp = /[0-9a-zA-Z_.$]+/
//const stringRegExp = /^[0-9a-zA-Z_.$]+$/
const numberRegExp = /^[0-9\.]+$/
const notNullRegExp = /^not null$/i

/**
 * @function checkValueType
 * @description check the type of the value stored in a variable
 * @param {String} identifier 
 * @return {"null"|"bool"|"number"|"column_ref"|"string"} returns the type of value stored in the variable
 */
function checkValueType(identifier){
        if(nullRegExp.exec(identifier))
            return 'null'
        else if(notNullRegExp.exec(identifier))
            return 'not null'
        else if(boolRegExp.exec(identifier))
            return 'bool'
        else if(numberRegExp.exec(identifier))
            return 'number'
        else if(stringRegExp.exec(identifier))
            return 'string'
        //If the value is of extended sql JSON type
        else if(columnRegExp.exec(identifier))
            return 'column_ref'
        else if(identifier==='*')
            return 'star'
        
        
    return 'NONE'
}

module.exports={
    checkValueType:checkValueType
}