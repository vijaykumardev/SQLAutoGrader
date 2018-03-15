var preparser = require('./pre-parser')

module.exports = {
    replaceMapValues : replaceMapValues
}


function replaceFuncMap(store,columnValue){
    return new Promise((resolve,reject)=>{
        var argList = []
        var promise = []
        promise = columnValue.args.map((item)=>{
            if(item.type==='column_ref'&&item.column.includes(preparser.stringReplaceVal)||item.column.includes(preparser.notNullReplaceVal)){
            return    reccurReplaceValue(store,store.get(item.column))
            } else {
            return    reccurReplaceValue(store,item)
            }
        })

        Promise.all(promise).then((value)=>{
            
            argList.push(value)
        }).then(()=>{
         columnValue.args=argList[0]
         resolve(columnValue)
        })
         
    })
}

function replaceCaseCondResult(store,columnValue){
    return new Promise((resolve,reject)=>{
        reccurReplaceValue(store,columnValue.condition).then((condition)=>{
            reccurReplaceValue(store,columnValue.result).then((result)=>{
                resolve({condition:condition,result:result})
            })
        })
        //resolve({condition:reccurReplaceValue(store,columnValue.condition),result:reccurReplaceValue(store,columnValue.result)})
    })
}

//Implement this with promises
function replaceCaseMap(store,columnValue){
    return new Promise((resolve,reject)=>{
        var valueCase = columnValue.value.value
        var condResultCase = columnValue.value.cond_result
        var defaultCase = columnValue.value.default
        var condResultCaseNew = []
        reccurReplaceValue(store,valueCase).then((value)=>{
            valueCase = value
            columnValue.value.value=value
            reccurReplaceValue(store,defaultCase).then((value)=>{
                defaultCase=value
                columnValue.value.default=value
                if(condResultCase.length>0){
                    var promise = condResultCase.map((item)=>{
                        return replaceCaseCondResult(store,item)
                    })
                    Promise.all(promise).then((result)=>{
                        condResultCaseNew.push(result)
                    }).then(()=>{
                        columnValue.value.cond_result=condResultCaseNew[0]
                        //TODO: warning: check and see why 
                        resolve(columnValue)
                    })
                }
                //columnValue.value.default=value
            })
        })
    })
}

function reccurReplaceValue(store,columnValue){
    return new Promise((resolve,reject)=>{
        //console.log('call:'+JSON.stringify(columnValue))
        // If no substitution is necessary then return as it it
        if(columnValue==null||(columnValue.db!=null&&columnValue.table!=null)||columnValue.type==='number'||columnValue.type==='string'||columnValue.type==='bool'||columnValue.type==='null'||columnValue.type==='not null'){
            resolve(columnValue)
        }
        if(columnValue.expr!=null){
            reccurReplaceValue(store,columnValue.expr).then((value)=>{
                resolve({"expr":value,"as":columnValue.as})
            })
        }
       
        if(columnValue.type!=null&&columnValue.type==='column_ref'){
            if(columnValue.column.includes(preparser.stringReplaceVal)||columnValue.column.includes(preparser.notNullReplaceVal)){
                reccurReplaceValue(store,store.get(columnValue.column)).then((value)=>{
                    resolve(value)
                })
            } else {
                resolve(columnValue)
            }
        }

        //TODO: Implement for other type like case, function
        if(columnValue.type==='case_expr'){
            replaceCaseMap(store,columnValue).then((value)=>{
                resolve(value)
            })
        }

        //expr_func
        if(columnValue.type==='expr_func'){
         
         if(columnValue.args!==null){
             replaceFuncMap(store,columnValue).then((value)=>{
                 resolve(value)
             })
         }
     }

     //binary_expr
     if(columnValue.type==='binary_expr'){
         reccurReplaceValue(store,columnValue.left).then((left)=>{
                columnValue.left=left
                console.log('before:'+JSON.stringify(columnValue))
             reccurReplaceValue(store,columnValue.right).then((right)=>{
                columnValue.right=right
                resolve(columnValue)
             })
         })
     }

     //expr_list
     if(columnValue.type==='expr_list'){
         var exprList = []
         var promise = columnValue.value.map((item)=>{
             return reccurReplaceValue(store,item)
         })
         Promise.all(promise).then((value)=>{
            exprList.push(value)
         }).then(()=>{
             resolve(exprList[0])
         })
     }

    })
}

function replaceMapValues(result){
    return new Promise((resolve,reject)=>{
        sqlJSON = result.json
        var columns=from=limit=where=groupby=orderby=distinct = [];
        var JSONColumns = []
        var JSONFrom = []
        console.log(JSON.stringify(sqlJSON))
        if(sqlJSON.type==='select'){
        
            if(sqlJSON.columns!==null){
            columns = sqlJSON.columns.map((item)=>{
                return reccurReplaceValue(result.store,item)
            })
            Promise.all(columns).then((value)=>{
                JSONColumns.push(value)
            }).then(()=>{
                sqlJSON.columns = JSONColumns[0]
            })
            //resolve(sqlJSON)
            } //select
            
            if(sqlJSON.from!==null){
                console.log(sqlJSON.from)
            from = sqlJSON.from.map((item)=>{
                return reccurReplaceValue(result.store,item)
            })
            Promise.all(from).then((value)=>{
                JSONFrom.push(value)
            }).then(()=>{
                console.log(JSON.stringify(JSONFrom[0]))
                sqlJSON.from = JSONFrom[0]
            })
         } //from
        
         if(sqlJSON.where!==null){
            console.log('where1:'+sqlJSON.where)
        reccurReplaceValue(result.store,sqlJSON.where).then((where)=>{
            console.log('where:'+JSON.stringify(where))
            sqlJSON.where = where
        })
    }
        if(sqlJSON.having!==null){
            console.log(sqlJSON.having)
            reccurReplaceValue(result.store,sqlJSON.having).then((having)=>{
                console.log('having:'+JSON.stringify(having))
                sqlJSON.having = having
            })
        }
            // where = stringifyconditions(sqlJSON.where)
            
            // if(sqlJSON.limit!==null){
            // limit = sqlJSON.limit.map((item)=>{
            //     return item.value
            // }).join(",")
            // } //limit
            
            // if(sqlJSON.groupby!==null){
            //     groupby = sqlJSON.groupby.map((item)=>{
            //         if(item.type==='column_ref'){
            //             if(item.table !== '')
            //                 return item.table+'.'+item.column
            //             return item.column
            //         }
            //     }).join(",")
            // } //groupby
        
            // if(sqlJSON.orderby!==null){
            //     orderby = sqlJSON.orderby.map((item)=>{
            //         if(item.expr.type==='column_ref'){
            //             if(item.expr.table !== '')
            //                 return item.expr.table+'.'+item.expr.column+' '+item.type
            //             return item.expr.column+' '+item.type
            //         }
            //     }).join(",")
            } //orderby
})
}