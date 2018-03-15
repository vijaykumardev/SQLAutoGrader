var sqlparse = require('node-sqlparser');
var stringify = require('node-sqlparser').stringify;
const preparse = require('./pre-parser')
const jsonframework = require('./jsonframework')


/**
 * @function printMap
 * @description prints the key value pairs of Map
* @param {Map} subVar 
 */
function printMap(subVar){
 subVar.forEach((value,key,Map)=>{
//     try{
     console.log(key+":"+value)
//     // if((/select/i.exec(value.slice(1,-1)))
         console.log(parseSQL(value))
//     // }
    // }catch(err){
    //     console.log(err)
    // }
})
}
console.log(parse('select * from albums'))