var parse = require('node-sqlparser').parse;
var stringify = require('node-sqlparser').stringify;

var subVar = new Map()
var subVarIndex=0
var mJSONformat = new Map()
var paranSearch = /\([^)]*\)/

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

/**@function indexSearch
 * @description Searches all inner query and functions and simplifies main query
 * @param {string} inVar - query as string
 * @return {string} inVar - string with all inner queries removed with alias name which is stored in mapVar variable
 */
function indexSearch(inVar){
    var res = paranSearch.exec(inVar)
    var repVal=''
    var before=''
    var subRes=''
    while(res){
    subRes = res[0].slice(res[0].lastIndexOf("(")) 
    if(subRes){
        repVal='m_replace_val_'+subVarIndex
        
        if(!/^\(select/i.exec(subRes)){
            before=inVar.slice(inVar.lastIndexOf(' ',inVar.indexOf(subRes))+1,inVar.indexOf(subRes))
            console.log('String before:'+before)
            if(!/(select|where|from|group by|having|order by|limit)/i.exec(before))
                subRes=before+subRes
            else
                repVal=' '+repVal
            }else{
                //repVal=' '+repVal
                //console.log(subRes.slice(1,-1))
                //console.log(parse(subRes.slice(1,-1)))
            }
            subVar.set(repVal,subRes)
            subVarIndex++
            console.log('parsing:'+subRes+'\nparsed:'+parseSQL(subRes))
        inVar=inVar.replace(subRes,repVal)
        console.log(inVar)
    }
    res=paranSearch.exec(inVar)
    }
    
    return inVar
}


console.log(indexSearch(removeSpace("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS 'NOT NULL') / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums")))
//console.log(subVar.keys())

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

const havingTemplate = "select 1 from dual where 1=1 and "
var havingJSON = JSON.parse('{"having":null}')
/**@function buildHavingJSON
 * @description Converts the having clause to where genrating the JSON then adding that to having JSON
 * Uses ('node-sqlparser').parse and ('node-sqlparser').stringify libraries
 * @param inVar {string} - having clause condition
 * @return havingJSON {JSON} - JSON format of the having condition
 * @example buildHavingJSON('album_id=21')
 */
function buildHavingJSON(inVar){
    var astObj = parse(havingTemplate+inVar)
    
    //having clause is generated in right side after first where condition
    havingJSON.having=astObj.where.right
    return havingJSON
}

module.exports = buildHavingJSON