const fs = require('fs')

/**
 * @function loadFile
 * @description If the file is found then it's content is extracted and returned else an error is thrown
 * @param {string} filename 
 * @return if execution success then array of string as file content else error
 */
function loadFile(filename){
    return new Promise((resolve,reject)=>{
        fs.exists(filename,(exists)=>{
            if(exists){
                fs.readFile(filename,"utf8",(err,data)=>{
                    if(err)
                    reject(err)
                    //If no error then send the file content
                    resolve(data)
                })
            } else {
                reject('File ' + filename + ' does not exists')
            }
        })
    })
}

module.exports = {
    loadFile : loadFile
} 