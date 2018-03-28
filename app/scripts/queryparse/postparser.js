var preparser = require('./pre-parser')

module.exports = {
    replaceMapValues: replaceMapValues
}


function replaceFuncMap(store, columnValue) {
    return new Promise((resolve, reject) => {
        var argList = []
        var promise = []
        promise = columnValue.args.map((item) => {
            if (item.type === 'column_ref' && item.column.includes(preparser.stringReplaceVal) || item.column.includes(preparser.notNullReplaceVal)) {
                return reccurReplaceValue(store, store.get(item.column))
            } else {
                return reccurReplaceValue(store, item)
            }
        })

        Promise.all(promise).then((value) => {

            argList.push(value)
        }).then(() => {
            columnValue.args = argList[0]
            resolve(columnValue)
        })

    })
}

function replaceCaseCondResult(store, columnValue) {
    return new Promise((resolve, reject) => {
        reccurReplaceValue(store, columnValue.condition).then((condition) => {
            reccurReplaceValue(store, columnValue.result).then((result) => {
                resolve({ condition: condition, result: result })
            })
        })
        //resolve({condition:reccurReplaceValue(store,columnValue.condition),result:reccurReplaceValue(store,columnValue.result)})
    })
}

//Implement this with promises
function replaceCaseMap(store, columnValue) {
    return new Promise((resolve, reject) => {
        var valueCase = columnValue.value.value
        var condResultCase = columnValue.value.cond_result
        var defaultCase = columnValue.value.default
        var condResultCaseNew = []
        reccurReplaceValue(store, valueCase).then((value) => {
            valueCase = value
            console.log(value)
            console.log(defaultCase)
            columnValue.value.value = value
            reccurReplaceValue(store, defaultCase).then((value) => {
                defaultCase = value
                columnValue.value.default = value
                if (condResultCase.length > 0) {
                    var promise = condResultCase.map((item) => {
                        return replaceCaseCondResult(store, item)
                    })
                    Promise.all(promise).then((result) => {
                        condResultCaseNew.push(result)
                    }).then(() => {
                        columnValue.value.cond_result = condResultCaseNew[0]
                        //TODO: warning: check and see why 
                        resolve(columnValue)
                    })
                }
                //columnValue.value.default=value
            })
        })
    })
}

function reccurReplaceValue(store, columnValue) {
    return new Promise((resolve, reject) => {
        console.log('call:'+JSON.stringify(columnValue))
        
        // If no substitution is necessary then return as it it
        if (columnValue == null || (columnValue.db != null && columnValue.table != null) || columnValue.type === 'number' || columnValue.type === 'string' || columnValue.type === 'bool' || columnValue.type === 'null' || columnValue.type === 'not null' || columnValue.type === 'star') {
            console.log(columnValue)
            resolve(columnValue)
        }
        if (columnValue.expr != null) {
            reccurReplaceValue(store, columnValue.expr).then((value) => {
                columnValue.expr = value
                resolve(columnValue)
            })
        }

        if(columnValue!=null&&columnValue.type==='select'){
            var result = {
                store:store,
                json:columnValue
            }
            console.log('select:'+JSON.stringify(columnValue))
            //Reduce all inner query value terms
            replaceMapValues(result).then((innerQuery)=>{
                console.log('reduced:'+JSON.stringify(innerQuery))
                resolve(innerQuery.json)
            })            
        }

        if (columnValue.type != null && columnValue.type === 'column_ref') {
            if (columnValue.column.includes(preparser.stringReplaceVal) || columnValue.column.includes(preparser.notNullReplaceVal)) {
                reccurReplaceValue(store, store.get(columnValue.column)).then((value) => {
                    resolve(value)
                })
            } else {
                resolve(columnValue)
            }
        }

        if(columnValue.type === 'not null'){
            resolve(columnValue)
        }

        //TODO: Implement for other type like case, function
        if (columnValue.type === 'case_expr') {
            replaceCaseMap(store, columnValue).then((value) => {
                resolve(value)
            })
        }

        //expr_func
        if (columnValue.type === 'expr_func') {
            console.log(columnValue.args)
            if (columnValue.args !== null) {
                replaceFuncMap(store, columnValue).then((value) => {
                    resolve(value)
                })
            } else {
                resolve(columnValue)
            }
        }

        if(columnValue.type === 'aggr_func'){
            if(columnValue.args !== null){
                console.log(columnValue.args)
                reccurReplaceValue(store,columnValue.args).then((value)=>{
                    columnValue.args=value
                    resolve(columnValue)
                })
            } else {
                resolve(columnValue)
            }
        }

        //binary_expr
        if (columnValue.type === 'binary_expr') {
            console.log('---binary_expr:'+JSON.stringify(columnValue.left))
            console.log('---binary_expr:'+JSON.stringify(columnValue.right))
            reccurReplaceValue(store, columnValue.left).then((left) => {
                console.log('--left:'+left)
                columnValue.left = left
                reccurReplaceValue(store, columnValue.right).then((right) => {
                    console.log('---right:'+JSON.stringify(right))
                    columnValue.right = right
                    console.log('---right1:'+JSON.stringify(columnValue))
                    //resolve(columnValue)
                }).then(()=>{
                    resolve(columnValue)
                })
            })
        }

        //expr_list
        if (columnValue.type === 'expr_list') {
            var exprList = []
            var promise = columnValue.value.map((item) => {
                return reccurReplaceValue(store, item)
            })
            Promise.all(promise).then((value) => {
                exprList.push(value)
            }).then(() => {
                resolve(exprList[0])
            })
        }

        //inner_query
        //TODO: test inner query post parser
        if(columnValue.type === 'inner_query'){
            console.log(columnValue)
            reccurReplaceValue(store, columnValue.value).then((innerquery) => {
                console.log('&&&:'+JSON.stringify(innerquery))
                resolve(innerquery)
            })
        }
    })
}

function replaceMapValues(result) {
    return new Promise((resolve, reject) => {
        sqlJSON = result.json
        var columns = from = limit = where = groupby = orderby = distinct = [];

        console.log(JSON.stringify(sqlJSON))
        if (sqlJSON.type === 'select') {

            console.log('+++:'+JSON.stringify(sqlJSON.columns))
            //TODO: Error: it is returning previous result of columns then current result
            replaceClauseList(result.store, sqlJSON.columns).then((columns) => {
                sqlJSON.columns = columns
                replaceClauseList(result.store, sqlJSON.from).then((from) => {
                    sqlJSON.from = from
                    reccurReplaceValue(result.store,sqlJSON.where).then((where)=>{
                        sqlJSON.where = where
                        replaceClauseList(result.store, sqlJSON.groupby).then((groupby) => {
                            sqlJSON.groupby = groupby
                            replaceClauseList(result.store, sqlJSON.orderby).then((orderby) => {
                                sqlJSON.orderby = orderby
                                reccurReplaceValue(result.store, sqlJSON.having).then((having) => {
                                    sqlJSON.having = having
                                    replaceClauseList(result.store,sqlJSON.limit).then((limit)=>{
                                        sqlJSON.limit = limit
                                        //console.log('End:'+JSON.stringify(sqlJSON))
                                        result.json=sqlJSON
                                        resolve(result)
                                    })
                                })
                            })
                        })
                    })
                })
            })
        }

    })

    function replaceClauseList(store, columnValue) {
        return new Promise((resolve, reject) => {
            if (columnValue === null||columnValue===undefined) {
                resolve(null)
            } else if(columnValue==='*'){
                resolve(columnValue)
            }
            var jsonExpand = []
            var clause = columnValue.map((item) => {
                console.log('item:'+JSON.stringify(item))
                return reccurReplaceValue(store, item)
            })
            Promise.all(clause).then((value) => {
                console.log(value)
                jsonExpand.push(value)
            }).then(() => {
                console.log('jsonExpand:' + JSON.stringify(jsonExpand[0]))
                resolve(jsonExpand[0])
            })
        })
    }
}