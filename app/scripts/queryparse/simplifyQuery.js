var parse = require('node-sqlparser').parse;
var stringify = require('node-sqlparser').stringify;
const preparse = require('./pre-parser')
const jsonframework = require('./jsonframework')

const paranSearch = /\([^)]*\)/

/**@function removeSpace
 * remove unwanted addtional spaces
 * @param {string} inVar - input string contain string
 * @return {string} - string with trimmed spaces
 */
function removeSpace(inVar){
    return inVar.replace(/\s\s+/g, ' ').replace(/[ ]*\([ ]*/ig,'\(')
}

/**@function parseSQL 
 * @description Parse the given query into JSON format
 * @param inVar {string} - input query
 * @return {JSON} - JSON format of the output if parsed else an empty JSON
*/
function parseSQL(inVar){
    //If query is enclosed inside a paranthesis then it is removed
    if(/^(.*)$/.inVar)
        inVar=inVar.slice(1,-1)
    try{
        return parse(inVar)
    }catch(err){
        try{
            //checking if the query can be parsed as a function
            return parse('select '+inVar)
        }catch(err){
        console.log(err)
        return {}
        }
    }
}

/**@function reduceSubQuery
 * @description Searches all inner query and functions and simplifies main query
 * @param {string} inVar - query as string
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
function reduceSubQuery(inVar,variableStore,storeIndex){
    var res = paranSearch.exec(inVar)
    var repVal=''
    var before=''
    var subRes=''
    var parsedSQL = {}
    while(res){
    subRes = res[0].slice(res[0].lastIndexOf("(")) 
    if(subRes){
        repVal=preparse.stringReplaceVal+storeIndex
        
        if(!/^\(select/i.exec(subRes)){
            before=inVar.slice(inVar.lastIndexOf(' ',inVar.indexOf(subRes))+1,inVar.indexOf(subRes))
            if(!/(select|where|from|group by|having|order by|limit)/i.exec(before))
                subRes=before+subRes
            else
                repVal=' '+repVal
            }
            parsedSQL = parseSQL(subRes)
            variableStore.set(repVal,/^\(select/i.exec(subRes)?jsonframework.innerQuery(parsedSQL):parsedSQL.columns)
            storeIndex++
        inVar=inVar.replace(subRes,repVal)
    }
    res=paranSearch.exec(inVar)
    }
    
    return {
                result:inVar,
                store:variableStore,
                index:storeIndex
    }
}


console.log(reduceSubQuery(removeSpace("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS 'NOT NULL') / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums"),new Map(),0))

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
