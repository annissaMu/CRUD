const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');

// our modules loaded from cwd

const { Connection } = require('./connection'); // Olivia's module
const cs304 = require('./cs304');
const e = require('connect-flash');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data

app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: [cs304.randomString(20)],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
app.use(flash());

// ================================================================
// custom routes here

const MY_UID = 1;

// Please use the following constants; don't change any values.
const DB = process.env.USER;    // will automatically use your userid
const STAFF = 'staff';
const MOVIES = 'movies';
const PEOPLE = 'people';

app.get("/", (req, res) => {
    // examples of flashing
    req.flash('error', 'no error yet!'); 
    req.flash('info', 'hello there!'); 
    return res.render("index.ejs");
});

app.get("/insert/", (req, res) => {
    return res.render("insert.ejs")
})

app.post("/insert/", async(req, res) => {
    let id = req.query.movieTt;
    console.log("tt in insert", id)
    let title = req.query.movieTitle;
    let release = req.query.movieRelease;
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({tt: id}).toArray();
    if (movie.length > 0) {
        await movies.insertOne({tt: id, title: title, release: release});
        res.redirect('/update/'+ id);
    } else {
        res.send('tt already in use');
    }
    })

// search bar page
app.get("/search/", (req, res) => {
    return res.render("search.ejs");
});


app.get("/do-search", async (req, res) => {
    let title = req.query.title;
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({title: new RegExp([title].join(""), "i")}).toArray();
    if (movie.length>0) {
        res.redirect(`/update/` + movie[0].tt);
    } else {
        return res.send("Sorry no movies found"); // fix this
    }
});

app.get("/update/:tt", async(req,res) => {
    const movieID = req.params.tt;
    console.log(movieID)
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({tt: movieID}).toArray();
    console.log("movie", movie)
    return res.render("update.ejs", {tt: movieID, title: movie[0].title, releaseYear: movie[0].release, addedBy: movie[0].addedby.name, directorId: movie[0].director.nm, director: movie[0].director.name})
})

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
