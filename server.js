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
    const id = req.body.movieTt;
    console.log("tt in insert", id)
    if (!id) {
        req.flash("info", "please enter a movie id")
        return // todo - do we need to rerender page or anything?
    }
    let title = req.body.movieTitle;
    let release = req.body.movieRelease;
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({tt: id}).toArray();
    if (!(id && title && release)) {
        console.log("should be flashing")
        req.flash("info", `please fill out all inputs in the form`);
        return res.render("insert.ejs")
    } else {
        if (movie.length == 0) { //if there is no existing movie, and the user submited all data
            console.log("inserted new movie", movie)
            await movies.insertOne({tt: id, title: req.body?.movieTitle, release: req.body?.movieRelease});
            res.redirect('/update/'+ id);
        } else {
            console.log("inserted existing tt", movie)
            req.flash("info", `tt ${id} is already in use, please change your input`); //todo - this isnt working
            return res.render("insert.ejs")        } 
    }
    
    })

// search bar page
app.get("/search/", (req, res) => {
    return res.render("search.ejs");
    //allowed to skip this feature
});


app.get("/select/", async (req, res) => {
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let releases = await movies.find({release: null}).toArray();
    let directors = await movies.find({director: null}).toArray()
    let movie = releases.concat(directors)
    return res.render("select.ejs", {movie: movie}) //need to render the results
});

app.get("/do-select/", async (req, res) => {
    const movieID = req.query.menuTt;
    console.log("movieTt", movieID)
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({tt: movieID}).toArray();
    if (movie.length>0) {
        console.log("should be rendering")
        res.redirect(`/update/` + movie[0].tt);
    } else {
         movie = await movies.find().toArray();
        console.log("should be flashing", movie)
        req.flash("info", `please select a different movie`); //todo - this isnt working
        //maybe should rerender page?
    }
});

app.get("/update/:tt", async(req,res) => {
    const movieID = req.params.tt;
    console.log(movieID)
    const db = await Connection.open(mongoUri, "am114");
    const movies = db.collection("movies");
    let movie = await movies.find({tt: movieID}).toArray();
    console.log("movie", movie)
    return res.render("update.ejs", {url: "update" + movieID, tt: movieID, title: movie[0]?.title, release: movie[0]?.release, addedBy: movie[0]?.addedby?.name, addedById: movie[0]?.addedby?.nm, directorId: movie[0]?.director?.nm, director: movie[0]?.director?.name})
})

app.post("/update/:tt", async(req,res) => {
    const id = req.params.tt;
    const movieTitle = req.body.movieTitle;
    const releaseYear = req.body.movieRelease;
    const movieAddedBy = req.body.movieAddedBy;
    const directorId = req.body.movieDirectorid;
    const db = await Connection.open(mongoUri, "am114");
    const people = db.collection("people"); //todo - we need to finish this
    const lookUpDirector = await people.find({nm: directorId}, {nm: 1, name: 1});
    const lookUpAddedBy = await people.find({nm: movieAddedBy}, {nm: 1, name: 1});
    const movieObject = {
        tt: id,
        title: movieTitle,
        release: releaseYear,
        director: lookUpDirector,
        addedby: lookUpAddedBy,
    }
    const movies = db.collection("movies");
    await movies.updateOne({tt: id}, { $set: movieObject});
    return res.render("update.ejs", {url: "update/" + id, tt: id, title: movieTitle, release: releaseYear, addedBy: lookUpAddedBy?.name, addedById: lookUpAddedBy?.nm, directorId: lookUpDirector?.nm, director: lookUpDirector?.name})

})

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
