var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));


// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);

// Routes

app.get("/", function(req, res) {
  res.json(path.join(__dirname, "public/index.html"));
});

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.nytimes.com/search?query=soccer").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".css-138we14").each(function(i, element) {
      var title = $(element).find("h4").text();
      var link = "https://nytimes.com" + $(element).find("a").attr("href");
      var summary = $(element).find("p").text();
      db.Article.create({
        title,
        summary,
        link
      }, function (error, found) {
        if (error) throw error
      });
      
    });

    // Send a message to the client
    res.send("Scrape Complete");
    
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for getting all notes from the db
app.get("/Note", function(req, res) {
  // Grab every document in the Articles collection
  db.Note.find({})
    .then(function(dbNote) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbNote);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req,res){
  //Use the note id to find and delete it
  Note.findOneAndRemove({"_id": req.params.note_id}, function(err){
      //Log any errors
      if (err){
          console.log(err);
          res.send(err);
      }
      else{
          Article.findOneAndUpdate({"_id": req.params.article_id}, {$pull: {"notes": req.params.note}})
          .exec(function(err){
              if(err){
                  console.log(err);
                  res.send(err);
              }
              else{
                  //or send the note to the browser
                  res.send("Note Deleted");
              }
          });
      }
  });
});

//Delete an article
app.post("/articles/delete/:id", function(req,res){
  //Use the article id to find and update its saved boolean
  Article.findOneAndUpdate({"_id": req.params.id}, {"saved":false, "notes":[]})
  //Execute the above query
  .exec(function(err,doc){
      //Log any errors
      if (err){
          console.log(err);
      }
      else{
          //Or send the document to the browser
          res.send(doc);
      }
  });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
