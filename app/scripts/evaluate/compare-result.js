const parsesql = require('../queryparse/parsesql')
const mysql = require('../database/mysqlconnect')
const parser = require('node-sqlparser')

module.exports = {
    checkOutput: checkOutput
}

function checkOutput(submitted, solutions, user) {
    return new Promise((resolve, reject) => {
        var submittedQuery = submitted.query
        var solutionQuery = solutions.query
        //Extract all the columns from both JSON
        getColumns(submitted.json, solutions.json).then((columns) => {
            console.log(columns)
            if (columns.solution.length == 1&&(columns.solution[0].type == 'expr_func' || columns.solution[0].type == 'aggr_func') && /count\(/i.exec(columns.solution[0].value)) {
                //Checking for query which result count
                    var query = `select (${solutionQuery})-(${submittedQuery}) a`
                    mysql.connectExecute(user, query).then((result) => {
                        resolve(result.result[0].a)
                    })
            } else {
                //Build projection names
                console.log('here')
                var solutionProj = columns.solution.map((item) => 'tableA.' + (item.as === '' ? item.value.substring(item.value.indexOf('.') > 0 ? item.value.indexOf('.') + 1 : 0) : item.as)).join(",")
                var submittedProj = columns.submitted.map((item) => 'tableB.' + (item.as === '' ? item.value : item.as)).join(",")
                //Build filter for solution query
                console.log('after')
                var solutionFilter = columns.solution.map((item) => 'tableA.' + (item.as === '' ? item.value.substring(item.value.indexOf('.') > 0 ? item.value.indexOf('.') + 1 : 0) : item.as)).join(" IS NULL OR ")
                solutionFilter += columns.solution.length > 0 ? ' IS NULL ' : ''
                //Build filter for submitted query
                console.log('after1')
                var submittedFilter = columns.submitted.map((item) => 'tableB.' + (item.as === '' ? item.value : item.as)).join(" IS NULL OR ")
                submittedFilter += columns.submitted.length > 0 ? ' IS NULL ' : ''
                //Build filter combining both solution and submitted filter
                console.log('after2')
                var filters = ''
                for (var i = 0; i < columns.solution.length; i++) {
                    if(typeof columns.submitted[i]!='undefined'){
                        var item = columns.solution[i].value
                        var solIndex = item.indexOf('.')
                        console.log(columns.solution.length)
                        filters += 'tableA.' + (columns.solution[i].as === '' ? item.substring(solIndex > 0 ? solIndex + 1 : 0) : columns.solution[i].as) + '=' + 'tableB.' + (columns.submitted[i].as === '' ? columns.submitted[i].value : columns.submitted[i].as) + ((i === (columns.solution.length - 1)||i == (columns.submitted.length-1)) ? '' : ' and ')
                    }
                }
                console.log(filters.length)
                //trim and at the end
                console.log('after3')
                var query = `select (select count(*) from (${submittedQuery}) tableB LEFT JOIN (${solutionQuery}) tableA ${filters.length>0?'ON '+filters:''} ${solutionFilter.length>0?'WHERE '+solutionFilter:''}) + (select count(*) from (${solutionQuery}) tableA LEFT JOIN (${submittedQuery}) tableB ${filters.length>0?'ON '+filters:''} ${submittedFilter.length>0?'WHERE '+submittedFilter:''}) as sum`
                console.log(query)
                mysql.connectExecute(user, query).then((result) => {
                    resolve(result.result[0].sum)
                })
            }
        }).then(() => {
        })
    })
}

function getColumns(submittedJSON, solutionJSON) {
    return new Promise((resolve, reject) => {
        var solutionColumns = []
        var submittedColumns = []
        //Fetch all the columns type and value for each JSON type
        reduceColumns(submittedJSON).then((columnsList) => {
            console.log('reduceColumns:submittedJSON')
            console.log(columnsList)
            submittedColumns = columnsList
            return reduceColumns(solutionJSON)
        }).then((columnsList) => {
            console.log('reduceColumns:solutionJSON')
            console.log(columnsList)
            solutionColumns = columnsList
        }).then(() => {
            console.log('reOrderColumns')
            console.log(solutionColumns)
            return reOrderColumns({ solution: solutionColumns, submitted: submittedColumns })
        }).then((submittedColumns) => {
            console.log('solution')
            console.log(solutionColumns)
            console.log('submitted')
            console.log(submittedColumns)
            resolve({ solution: solutionColumns, submitted: submittedColumns })
        })
    })
}

function reOrderColumns(columnJSONs) {
    return new Promise((resolve, reject) => {
        var reOrderColumns = []
        console.log(columnJSONs.solution)
        columnJSONs.solution.forEach((fromClause) => {
            console.log(fromClause)
            columnJSONs.submitted.forEach((toClause) => {
                console.log(toClause)
                if (fromClause.type == toClause.type) {
                    if (fromClause.type == 'column_ref') {
                        var fromName = fromClause.value.indexOf('.') > 0 ? fromClause.value.indexOf('.') + 1 : 0;
                        var toName = toClause.value.indexOf('.') > 0 ? toClause.value.indexOf('.') + 1 : 0;
                        //Check if the columnName is correct
                        if (fromClause.value.substring(fromName) == toClause.value.substring(toName)) {
                            console.log(fromClause.value.substring(fromName) + ':' + toClause.value.substring(toName))
                            reOrderColumns.push({ type: toClause.type, value: toClause.value.substring(toName), as: toClause.as })
                        }
                    } else if (fromClause.type == 'aggr_func') {
                        var fromName = fromClause.value.name
                        var toName = toClause.value.name
                        var fromColumn = fromClause.value.column.indexOf('.') > 0 ? fromClause.value.column.indexOf('.') + 1 : 0;
                        var toColumn = toClause.value.column.indexOf('.') > 0 ? toClause.value.column.indexOf('.') + 1 : 0;
                        if (fromName == toName && fromColumn == toColumn) {
                            reOrderColumns.push({ type: toClause.type, value: toName + "(" + toClause.value.column + ")", as: '' })
                        }
                    } else if (fromClause.type == 'expr_func') {
                        var fromName = fromClause.value.substring(0, fromClause.value.indexOf("("))
                        var toName = toClause.value.substring(0, toClause.value.indexOf("("))
                        console.log(fromName + ":" + toName)
                        if (fromName == toName) {
                            reOrderColumns.push(toClause)
                        }
                    }
                }
            })
        })
        resolve(reOrderColumns)
    })
}

function reduceColumns(queryJSON) {
    return new Promise((resolve, reject) => {
        var columnsList = []
        // for (var i in queryJSON.columns) {
        //     getType(queryJSON, queryJSON.columns[i]).then((values) => {
        //         columnsList.push(values)
        //     })
        // }
        var promises = queryJSON.columns.map((item) => {
            return getType(queryJSON, item)
        })
        Promise.all(promises).then((result) => {
            columnsList.push(result)
        }).then(() => {
            resolve(columnsList[0])
        })
    })
}

function getType(fullJSON, clause) {
    return new Promise((resolve, reject) => {
        //TODO:Try to identify the matching type and value in the projection
        if (clause == '*') {
            resolve({ type: 'string', value: '*', as: '' })
        } else if (typeof clause.type != 'undefined') {
            var name = ''
            if (clause.type === 'column_ref') {
                value = clause.title
                if (clause.table !== '') {
                    fullJSON.from.forEach((item) => {
                        if (typeof item.table != 'undefined') {
                            if (clause.table === item.as) {
                                clause.table = item.table
                            }
                        }
                        //if(typeof item.)
                    })
                }
                //If table name is not present then return without it
                resolve({ type: clause.type, value: (clause.table === '' ? '' : clause.table + '.') + clause.column, as: '' })
            } else if (clause.type === 'expr_func') {
                var columns = []
                //TODO: test the implementation when more than one argument in a function
                var promises = clause.args.map((item) => {
                    return getType(fullJSON, item)
                })
                Promise.all(promises).then((item) => {
                    columns.push(item)
                }).then(() => {
                    resolve({ type: clause.type, value: clause.name + "(" + columns[0].map((item) => { return item.value }).join(",") + ")", as: '' })
                })
            }
            else if (clause.type === 'aggr_func') {
                getType(fullJSON, clause.args).then((result) => {
                    var intern = ''
                    if (typeof result == 'object') {
                        intern = result.map((item) => { item }).join(",")
                    } else {
                        intern = result
                    }
                    resolve({ type: clause.type, value: clause.name + "(" + intern + ")", as: '' })
                })

            } else if (clause.type === 'number' || clause.type === 'string' || clause.type === 'bool' || clause.type === 'null' || clause.type === 'not null') {
                resolve({ type: clause.type, value: clause.value, as: '' })
            }
        }
        if (typeof clause.expr != 'undefined') {
            getType(fullJSON, clause.expr).then((result) => {
                if (clause.as != null) {
                    //result.value = clause.expr.value
                    result.as = clause.as
                }
                console.log(result)
                resolve(result)
            })
        }
    })
}

// checkOutput("SELECT	CASE ('released')  WHEN 1987 THEN CONCAT(title, ' | ', released, ' | ', 'before') WHEN 1988 THEN CONCAT(title, ' | ', released, ' | ', 'same') WHEN 1989 THEN CONCAT(title, ' | ', released, ' | ', 'after') END AS output FROM albums WHERE released BETWEEN 1987 AND '1989'","select distinct title, released, case released when x - 1 then 'before' when x then 'same' else 'after' end compared_to_me from albums where released between x-1 and x+1").then((values)=>{
//     console.log(values)
// })

// checkOutput("select title at, released ar from albums a where a.released % 4 = 0", "select title, released from albums where mod(released, 4) = 0",{name:'vijayv',password:'4JqcY8Tw',database:'mysql'}).then((values) => {
//     console.log(values)
// })

// function test(){
//  parsesql.parse('select count(*) from albums a where a.released % 4 = 0',new Map(),0).then((values)=>{
//      console.log(JSON.stringify(values.json))
//  })
// }