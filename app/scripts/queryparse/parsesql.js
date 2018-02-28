const sqlparser = require('node-sqlparser')

/**
 * @function simplifyquery(sql)
 * @description creates key-value pairs of all the clause in the sql query
 * @param {JSON} sql - json representation of the query
 * @returns {JSON} 
 */
function simplifyquery(sql){
    return new Promise((resolve,reject)=>{

        sqlJSON = sqlparser.parse(sql)

        var select=from=limit=where=groupby=orderby=distinct = null;
        
        if(sqlJSON.type==='select'){
        
            if(sqlJSON.distinct)
                distinct=true
            
            if(sqlJSON.columns!==null){
            select = sqlJSON.columns.map((item)=>{
                if(item.expr.type==='number'||item.expr.type==='string')
                    return item.expr.value
                return item.expr.column
            }).join(",")
            } //select
            
            if(sqlJSON.from!==null){
            from = sqlJSON.from.map((item)=>{
                return item.table
            }).join(",")
            } //from
        
            where = stringifyconditions(sqlJSON.where)
            
            if(sqlJSON.limit!==null){
            limit = sqlJSON.limit.map((item)=>{
                return item.value
            }).join(",")
            } //limit
            
            if(sqlJSON.groupby!==null){
                groupby = sqlJSON.groupby.map((item)=>{
                    if(item.type==='column_ref'){
                        if(item.table !== '')
                            return item.table+'.'+item.column
                        return item.column
                    }
                }).join(",")
            } //groupby
        
            if(sqlJSON.orderby!==null){
                orderby = sqlJSON.orderby.map((item)=>{
                    if(item.expr.type==='column_ref'){
                        if(item.expr.table !== '')
                            return item.expr.table+'.'+item.expr.column+' '+item.type
                        return item.expr.column+' '+item.type
                    }
                }).join(",")
            } //orderby
        
        }
        
        var queryJSON = {
            select: select,
            from: from,
            where: where,
            groupby: groupby,
            orderby: orderby,
            limit: limit,
            distinct: distinct
        }
        resolve(queryJSON)

    })

} //simplifyquery


/**
 * @function stringifyconditions
 * @param {JSON} whereclause
 * @description  returns the string object of the where JSON 
 * @return {string} 
 */
function stringifyconditions(whereclause){
    if(whereclause!==null){
    if(whereclause.type==='binary_expr'){
        return stringifyconditions(whereclause.left)+' '+whereclause.operator+' '+stringifyconditions(whereclause.right)
    }else if(whereclause.type==='column_ref'){
        if(whereclause.table !== '')
            return whereclause.table+'.'+whereclause.column
        return whereclause.column
    }else if(whereclause.type==='number'){
        return whereclause.value
    }
}
} //stringifyconditions

module.exports = {
    simquery: simplifyquery
}