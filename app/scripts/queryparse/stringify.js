const sqlparser = require('node-sqlparser')
const valuetype = require('../utils/valuetype')

module.exports = {
    extractClause : simplifyquery
}

/**
 * @function simplifyquery(sql)
 * @description creates key-value pairs of all the clause in the sql query
 * @param {JSON} sql - json representation of the query
 * @returns {JSON} 
 */
function simplifyquery(sqlJSON){
    return new Promise((resolve,reject)=>{

        var queryJSON = {
            distinct: sqlJSON.distinct,
            columns:null,
            from:null,
            where:null,
            groupby:null,
            orderby:null,
            limit:null,
            having:null
        }
        console.log(sqlJSON)
            reduceJSON(sqlJSON.columns).then((item)=>{
               console.log(item) 
                queryJSON.columns=item
                return reduceJSON(sqlJSON.from)
            }).then((item)=>{
               console.log(item) 
                queryJSON.from=item
                return reduceJSON(sqlJSON.where)
            }).then((item)=>{
               console.log(item) 
                queryJSON.where=item
                return reduceJSON(sqlJSON.groupby)
            }).then((item)=>{
               console.log(item) 
                queryJSON.groupby=item
                return reduceJSON(sqlJSON.orderby)
            }).then((item)=>{
               console.log(item) 
                queryJSON.orderby = item
                return reduceJSON(sqlJSON.limit)
            }).then((item)=>{
               console.log(item) 
                queryJSON.limit = item
                return reduceJSON(sqlJSON.having)
            }).then((item)=>{
               console.log(item) 
                queryJSON.having = item
                resolve(queryJSON)
            }).catch((err)=>{
                console.log(err)
            })
    })

} //simplifyquery

function reduceJSON(JSONList){
    return new Promise((resolve,reject)=>{
        var reducedPromises = ''
        if(JSONList==null){
            resolve(JSONList)
        }else if(JSONList instanceof Array){
            var promises = JSONList.map((item)=>{
                return getSQLClause(item)
            })
            Promise.all(promises).then((item)=>{
                reducedPromises+=item
            }).then(()=>{
                console.log(reducedPromises)
                resolve(reducedPromises)
            })
        }else{
            getSQLClause(JSONList).then((item)=>{
                resolve(item)
            })
        }
        
    })
}

/**
 * @function getSQLClause
 * @param {JSON} clauseJSON
 * @description  returns the string object of the where JSON 
 * @return {string} 
 */
function getSQLClause(clauseJSON){
    return new Promise((resolve,reject)=>{
        //For between statement it returns array of two number below if condition reduce it
        if(clauseJSON instanceof Array){
            reduceJSON(clauseJSON).then((item)=>{
                resolve(item)
            })
        }else if(clauseJSON!==null){
             if(typeof clauseJSON.db!=='undefined'){
                //TODO: implement when basic identifier is working                
                // var database=''
                // getSQLClause(clauseJSON.db).then((db)=>{
                //     database=db
                //     return getSQLClause(clauseJSON.table)
                // }).then((table)=>{
                    console.log((clauseJSON.db!=''?clauseJSON.db+'.':'')+clauseJSON.table)
                    resolve((clauseJSON.db!=''?clauseJSON.db+'.':'')+clauseJSON.table)
                    // })
            }else if(clauseJSON.type==='binary_expr'){
                var left=right=null
                getSQLClause(clauseJSON.left).then((item)=>{
                    left=item
                    return getSQLClause(clauseJSON.right)
                }).then((item)=>{
                    right=item
                }).then(()=>{
                    resolve(left+' '+clauseJSON.operator+' '+right)
                })
            }else if(clauseJSON.type==='column_ref'){
                if(clauseJSON.table !== '')
                    resolve(clauseJSON.table+'.'+clauseJSON.column)
                resolve(clauseJSON.column)
            }else if(clauseJSON.type==='number'||clauseJSON.type==='string'||clauseJSON.type==='bool'||clauseJSON.type==='null'||clauseJSON.type==='not null'||clauseJSON.type==='star'){
                resolve(clauseJSON.value)
            }else if(clauseJSON.type==='expr_func'){
                var promises = clauseJSON.args.map((item)=>{return getSQLClause(item)})
                var args = []
                Promise.all(promises).then((item)=>{
                    args.push(item)
                }).then(()=>{
                    resolve(clauseJSON.name+'('+args[0].map((item)=>{return item}).join(',')+')')
                })
            }else if(clauseJSON.type==='aggr_func'){
                getSQLClause(clauseJSON.args).then((args)=>{
                resolve(clauseJSON.name+'('+args+')')
                })
             }else if(typeof clauseJSON.expr!=='undefined'){
                resolve(getSQLClause(clauseJSON.expr))
            }else if(valuetype.checkValueType(clauseJSON)!='NONE'){
                resolve(clauseJSON)
                //TODO: implement way to process promises
            }//else if(clauseJSON.type==='case_expr'){
            //     var value=defaultCase=null
            //     var cond_result=[]
            //     if(clauseJSON.value.value!==null){

            //     }
            //     resolve('case'+(clauseJSON.value.value==null?'':' '+getSQLClause(clauseJSON.value.value)+' '+clauseJSON.value.cond_result.map((item)=>{ return ' when '+getSQLClause(item.condition)+' then '+getSQLClause(item.result)}).join("")+(clauseJSON.value.default==null?' ':' default '+getSQLClause(clauseJSON.value.default))+' end'))
            // }
        }
    })
} //getSQLClause

// var aggr_func = { type: 'expr_func',
// name: 'COUNT',
// args: [{ expr: { type: 'string', value: '\'what\'' } },{ expr: { type: 'column_ref', table: 'b',column:'albums' } }] }

// getSQLClause(aggr_func).then((item)=>{
//     console.log(item)
// })


simplifyquery(sqlparser.parse('select count(id),aid from albums, artist where album.id=artist.id and album.id is null group by id,aid')).then((item)=>{
    console.log(item)
})