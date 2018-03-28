const fs = require('fs')
const loadfile = require('./loadfile')

module.exports = {
    readLoadFiles : readLoadFiles
}

/**
 * @function readFileNames
 * @param {string} path - directory path name to read files
 * @description reads all file names from the directory returns filename as string else if error is found returns the error message
 * @return {string[]|NodeJS.ErrnoException} returns filename as string else if error is found returns the error message
 * @example readLoadFiles('./app/public/json/')
 */
function readLoadFiles(path){
    return new Promise((resolve,reject)=>{
        var fileList = fs.readdir(path,'utf8',(err,files)=>{
            if(err){
                reject(err)
            }else{
                var assignments = []
                var promise = []
                promise = files.map((fileName)=>{
                    return loadfile.loadFile(path+fileName)
                })
                Promise.all(promise).then((content)=>{
                    assignments.push(content)
                }).then(()=>{   
                    console.log(assignments[0])
                    resolve(assignments[0])
                }).catch((err)=>{
                    console.log(err)
                    reject(err)
                })
                
            }
        })
    })
}