module.exports = {
    compareQueries: compareQueries
}

function compareQueries(solutionJSON, submittedJSON) {
    return new Promise((resolve,reject)=>{
        var comResult = { tables: null, columns: null }
        compareTables(solutionJSON.from, submittedJSON.from).then((item) => {
            comResult.tables = item
            return compareJoins(solutionJSON.where, submittedJSON.where)
        }).then((item) => {
            comResult.columns = item
            //TODO: handle for having and combine with the comResult.columns
            return compareJoins(solutionJSON.having, submittedJSON.having)
        }).then((item) => {
            console.log(item)
            comResult.columns.missing=comResult.columns.missing.concat(item.missing)
            comResult.columns.additional=comResult.columns.additional.concat(item.additional)
            resolve(comResult)
        })
    })
}

// var solutionTable = [{ db: '', table: 'albums', as: 'id' },
// { db: '', table: 'artists', as: 'aid' },
// { db: '', table: 'movies', as: 'aid' }]
// var submittedTable = [{ db: '', table: 'albums', as: 'id' },
// { db: '', table: 'artistss', as: 'aid' }]
// compareTables(solutionTable, submittedTable).then((item) => {
//     console.log(item)
// })
function compareTables(solutionTable, submittedTable) {
    return new Promise((resolve, reject) => {

        //Database is ignored for now
        solTableSet = new Set()
        subTableSet = new Set()
        var missingTable = []
        var additionalTable = []

        //Store the table into a map dataset which is used for comparision
        arrayTableToSet(solutionTable).then((setVar) => {
            solTableSet = setVar
            return arrayTableToSet(submittedTable)
        }).then((setVar) => {
            subTableSet = setVar
            return checkSets(solTableSet, subTableSet)
        }).then((extra) => {
            missingTable = extra
            return checkSets(subTableSet, solTableSet)
        }).then((extra) => {
            additionalTable = extra
        }).then(() => {
            resolve({ missing: missingTable, additional: additionalTable })
        })
    })
}

function arrayTableToSet(arrayVar){
    return new Promise((resolve,reject)=>{
        var setVar = new Set()
        arrayVar.map((item)=>{
            setVar.add(item.table)
        })
        resolve(setVar)
    })
}

function arrayToSet(arrayVar) {
    return new Promise((resolve, reject) => {
        var setVar = new Set()
        arrayVar.map((item) => {
            setVar.add(item)
        })
        resolve(setVar)
    })
}

function checkSets(fromSet, withSet) {
    return new Promise((resolve, reject) => {
        var extra = []
        for (var key of fromSet.keys()) {
            if (!withSet.has(key)) {
                extra.push(key)
            }
        }
        resolve(extra)
    })
}

// var whereJSON = { type: 'binary_expr',
// operator: '=',
// left: { type: 'column_ref', table: '', column: 'artists' },
// right: { type: 'binary_expr',
// operator: '>',
// left: { type: 'column_ref', table: '', column: 'year' },
// right: { type: 'column_ref', table: '', column: 'production' } }}

// var whereJSON1 = { type: 'binary_expr',
// operator: '=',
// left: { type: 'column_ref', table: '', column: 'artist' },
// right: { type: 'binary_expr',
// operator: '>',
// left: { type: 'column_ref', table: '', column: 'year' },
// right: { type: 'column_ref', table: '', column: 'development' } }}



// compareJoins(whereJSON,whereJSON1).then((item)=>{
//     console.log(item)
// })
function compareJoins(solutionWhere, submittedWhere) {
    return new Promise((resolve, reject) => {
        if ((typeof solutionWhere == 'undefined' || solutionWhere == null) && (typeof submittedWhere == 'undefined' || submittedWhere == null)) {
            resolve({ missing: [], additional: [] })
        }
        solWhereSet = new Set()
        subWhereSet = new Set()
        var missingColumns = []
        var additionalColumns = []
        //Get list of all columns and store in a set datatype
        fetchColumnList(solutionWhere).then((itemArray) => {
            return arrayToSet([].concat.apply([], itemArray))
        }).then((itemSet) => {
            solWhereSet = itemSet
            return fetchColumnList(submittedWhere)
        }).then((itemArray) => {
            return arrayToSet([].concat.apply([], itemArray))
        }).then((itemSet) => {
            subWhereSet = itemSet
            //Compare and identify missing items
            return checkSets(solWhereSet, subWhereSet)
        }).then((extra) => {
            missingColumns = [].concat.apply([],extra)
            return checkSets(subWhereSet, solWhereSet)
        }).then((extra) => {
            additionalColumns = [].concat.apply([],extra)
            resolve({ missing: missingColumns, additional: additionalColumns })
        })
    })
}

// fetchColumnList(whereJSON).then((item)=>{
//     console.log([].concat.apply([],item))
// })
function fetchColumnList(whereJSON) {
    return new Promise((resolve, reject) => {
        console.log('type:'+JSON.stringify(whereJSON))
        if(typeof whereJSON=='undefined'||whereJSON==null){
            resolve([])
        }else if(whereJSON instanceof Array){
            var columns = []
            var promises = whereJSON.map((item) => {
                return fetchColumnList(item)
            })
            Promise.all(promises).then((item) => {
                if (item) {
                    columns.push(item)
                }
            }).then(() => {
                resolve(columns)
            })
        }else if (whereJSON.type == 'column_ref') {
            //Ignoring table names for now
            //resolve((whereJSON.table == '' ? '' : whereJSON.table + '.') + whereJSON.column)
            resolve(whereJSON.column)
        } else if (whereJSON.type == 'string' || whereJSON.type == 'number' || whereJSON.type == 'bool' || whereJSON.type == 'null' || whereJSON.type == 'not null' || whereJSON.type == 'star') {
            resolve([])
        } else if (whereJSON.type == 'expr_func') {
            var columns = []
            var promises = whereJSON.args.map((item) => {
                return fetchColumnList(item)
            })
            Promise.all(promises).then((item) => {
                if (item) {
                    columns.push(item)
                }
            }).then(() => {
                resolve(columns)
            })
        } else if (whereJSON.type == 'aggr_func') {
            //whereJSON.args.map((item) => {
                fetchColumnList(whereJSON.args).then((result) => {
                    resolve(result)
                })
            //})
        } else if (typeof whereJSON.expr != 'undefined') {
            fetchColumnList(whereJSON.expr).then((item) => {
                resolve(item)
            })
        } else if (whereJSON === '*') {
            resolve([])
        } else if (whereJSON.type == 'binary_expr') {
            var columns = []
            fetchColumnList(whereJSON.left).then((item) => {
                if (item)
                    columns.push(item)
                return fetchColumnList(whereJSON.right)
            }).then((item) => {
                if (item)
                    columns.push(item)
                resolve(columns)
            })
        }
    })
}