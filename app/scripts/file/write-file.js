const fs = require('fs')
const loadfile = require('./loadfile.js')
const JSON_PATH='app/public/json/submissions/'

// writeSolution('assignment2','question1','select 5',"vijay").then((result)=>{
//     console.log(result)
// })

module.exports = {
    writeSolution:writeSolution
}

/**
 * @function writeSolution
 * @description write the query into the for the user, assignment number and question number
 * @param {String} assignmentNo referred to identify the filename to write
 * @param {String} questionNo update or add to the questionNo for the user
 * @param {String} query query to update for the questionNo
 * @param {String} username saved under this name
 * @return {true|false} status of whether successful written or failure
 * @example  writeSolution('assignment2','question1','select 5',"vijay")
 */
function writeSolution(assignmentNo,questionNo,query,username){
    return new Promise((resolve,resject)=>{
        const readFile = assignmentNo+'.json'
    const filename = assignmentNo+'_soln.json'
    var replaced = new Boolean(false)
    //loadfile.loadfile(JSON_PATH+readFile).then((contents)=>{
        //Extracts the existing content of the file
        loadfile.loadFile(JSON_PATH+filename)
        .then((contents)=>{
            //If the file content is empty
            if(Object.keys(contents).length === 0){
                contents=JSON.parse("[{\"name\":\""+username+"\",\"question\":[{\""+questionNo+"\":\""+query+"\"}]}]")
            }else{
                var contents=JSON.parse(contents)
                console.log(typeof contents)
                for(var i in contents){
                    console.log(contents[i]==username)
                    var record = contents[i]
                    if(record.name===username){
                        console.log('found')
                        for(var j in record.question){
                            for( var k in record.question[j]){
                                //If question is already attempted overwrite the content
                            if(k===questionNo){
                                record.question[j]=JSON.parse("{\""+k+"\":\""+query+"\"}")
                                replaced=true
                                break
                            }
                        }
                        }
                        //If question is not already attempted
                        if(replaced==false){
                            record.question.push(JSON.parse("{\""+questionNo+"\":\""+query+"\"}"))
                            replaced=true
                            break
                        }
                    }
                }
                //If the username is not already present in the file
                if(replaced==false){
                    contents.push(JSON.parse("{\"name\":\""+username+"\",\"question\":[{\""+questionNo+"\":\""+query+"\"}]}"))
                }
            }
            return contents
        })
        .catch((message)=>{
            console.log('err:'+message)
            //If file does not exists
            var contents = JSON.parse("[{\"name\":\""+username+"\",\"question\":[{\""+questionNo+"\":\""+query+"\"}]}]")
            console.log(contents)
            return contents
        })
        .then((contents)=>{
            console.log(contents)

            fs.writeFile(JSON_PATH+filename,JSON.stringify(contents),(err)=>{
                if(err){
                    console.log('Write to file error'+err)
                    resolve(false)
                }
                resolve(true)
            })
        })
    })
    //})
    

}