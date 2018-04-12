const express = require('express')
const router = express.Router()
const cookie = require('cookie')

const JSON_PATH = 'app/public/json/questions/'

const mysqlconnect = require('../scripts/database/mysqlconnect')
const parsesql = require('../scripts/queryparse/parsesql')
const readdir = require('../scripts/file/read-directory')
const writeToFile = require('../scripts/file/write-file')
const compareresult = require('../scripts/evaluate/compare-result')
const noofrows = require('../scripts/evaluate/no-of-rows')
const stringify = require('../scripts/queryparse/stringify')
const comparequery = require('../scripts/evaluate/compare-query')

router.get('/mysql', (req, res) => {
    var questions = []
    if (req.session.user && req.session.user.database === 'mysql') {
        // readdir.readLoadFiles(JSON_PATH).then((contents)=>{
        //    contents.forEach((item)=>{
        //        questions.push(JSON.parse(item))
        //    })
        // }).then(()=>{
        res.render('./partials/content/queries.ejs', {
            pageTitle: 'MySQL',
            pageID: 'mysql',
            name: req.session.user.name,
            questions: req.session.questions
        })
        // })

    } else {
        //res.cookie('message','Please enter login details', { maxAge: 60, httpOnly: true }) // maxAge is 4 hours
        req.session.message = 'Please enter login details'
        res.redirect('login')
    }
})

router.post('/mysql', (req, res) => {
    console.log(req.body)

    if (!req.session.user) {
        res.cookie('warning', 'Redirecting from mysql page', { maxAge: 60, httpOnly: true }) // maxAge is 4 hours
        res.cookie('message', 'Please enter login details', { maxAge: 14400, httpOnly: true }) // maxAge is 4 hours
        res.cookie('pageTitle', 'Login', { maxAge: 60, httpOnly: true })
        res.cookie('pageID', 'login', { maxAge: 60, httpOnly: true })
        res.redirect('login')
    } else if (req.body.query == '') {
        res.render('./partials/content/queries.ejs', {
            pageTitle: 'MySQL',
            pageID: 'mysql',
            name: req.session.user.name,
            questions: req.session.questions
        })
    }
    else if (req.body.submit == 'run') {
        var query = req.body.query.replace('\n', ' ')
        if (req.session.user && req.session.user.database === 'mysql') {
            var returnVal = {
                pageTitle: 'Mysql result',
                pageID: 'mysql-result',
                name: req.body.name,
                query: query,
                err: null,
                result: null,
                fields: null,
                json: null,
                sqlClause:null,
                questions: req.session.questions,
                selectedAssign: req.body.assignment,
                selectedQuest: req.body.question[req.body.assignment],
                rowcount: null,
                outputCompare: null,
                queryCompare:null,
                parseErr:false
            }
            var solution = req.session.questions[req.body.assignment].questions[req.body.question[req.body.assignment]]
            console.log(solution)
            mysqlconnect.establishconnection(req.session.user)
                .then((connection) => {
                    //Execute and retrive the result from database
                    mysqlconnect.executequery(query, connection)
                        .then((result) => {
                            returnVal.err = result.err
                            returnVal.result = result.result
                            returnVal.fields = result.fields
                            if (!result.err) {
                                //Parse and get the json form of query
                                noofrows.getRowsCount(req.session.user, query).then((rowcount) => {
                                    console.log(rowcount)
                                    noofrows.getRowsCount(req.session.user, solution.answer).then((expectedcount) => {
                                        console.log(expectedcount)
                                        returnVal.rowcount = { obtained: rowcount, expected: expectedcount }
                                        parsesql.parse(query, new Map(), 0).then((submitParse) => {
                                            returnVal.json = submitParse.json
                                            var submitted = {query:query,json:submitParse.json}
                                            parsesql.parse(solution.answer, new Map(), 0).then((solutionParse) => {
                                                var solutions = {query:solution.answer,json:solutionParse.json}
                                                compareresult.checkOutput(submitted, solutions, req.session.user).then((difference) => {
                                                    console.log(difference)
                                                    returnVal.outputCompare = difference
                                                    console.log(returnVal)
                                                stringify.extractClause(returnVal.json).then((sqlClause)=>{
                                                    returnVal.sqlClause=sqlClause
                                                    comparequery.compareQueries(solutionParse.json,submitParse.json).then((queryDifference)=>{
                                                       returnVal.queryCompare=queryDifference
                                                       console.log(queryDifference)
                                                        res.render('./partials/content/queries.ejs', returnVal)
                                                    })
                                                })
                                                })
                                            })
                                        }).catch((err)=>{
                                            console.log(returnVal)
                                            returnVal.parseErr=true
                                            res.render('./partials/content/queries.ejs', returnVal)
                                        })
                                    })
                                })

                                // })
                            }else{
                                returnVal.parseErr=true
                                console.log(returnVal)
                                res.render('./partials/content/queries.ejs', returnVal)
                            }
                        })
                })

        }
    } else if (req.body.submit == 'save') {
        var assignment = Number(req.body.assignment) + 1
        var question = Number(req.body.question[req.body.assignment]) + 1
        writeToFile.writeSolution('assignment' + assignment, 'question' + question, req.body.query, req.session.user.name).then((result) => {
            console.log(result)
        })
    }

})

module.exports = router