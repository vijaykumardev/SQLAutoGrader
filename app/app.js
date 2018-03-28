// Import the HTTP library
const express = require('express')
const  bodyParser = require('body-parser')
const app = express()
const reload = require('reload')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const PORT = 3546

app.set('port',process.env.PORT||PORT)
app.set('view engine','ejs')
app.set('views','app/views')

app.locals.siteTitle = 'Autograder'

app.use(cookieParser())
app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(session({ secret: 'cats' })) //session secret
app.use(express.static('app/public'))

// routes
app.use(require('./routes/index'))
app.use(require('./routes/mysql'))
app.use(require('./routes/postgres'))
app.use(require('./routes/login'))

// Start listening on port 3546
 var server = app.listen(app.get('port'),()=>{
    console.log('server is listening on port',app.get('port'))
})

reload(app)