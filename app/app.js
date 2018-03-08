// Import the HTTP library
const express = require('express')
const  bodyParser = require('body-parser')
const qs = require('querystring');
const app = express()
const reload = require('reload')
const session = require('express-session')
const passport = require('passport')
const flash = require('connect-flash')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')


const configMySQL = require('./scripts/config/mysql.js');

app.set('port',process.env.PORT||3546)
app.set('view engine','ejs')
app.set('views','app/views')

app.locals.siteTitle = 'Autograder'

app.use(morgan('dev')) // log every request to the console
app.use(cookieParser())
app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use(session({ secret: 'cats' })) //session secret
app.use(passport.initialize())
app.use(passport.session()) //persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in sessions
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