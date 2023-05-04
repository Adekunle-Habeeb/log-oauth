require("dotenv").config();
const express= require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));


app.use(session({
  secret: "Ourlittlesecret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



// connect to DataBase
mongoose.set('strictQuery', false);
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});


// Database schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// mongoose model
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
  res.render("register")
});

app.get("/login", function(req, res){
  res.render("login");
});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/success');
  });

app.get("/success", function(req, res){
  if (req.isAuthenticated()) {
    res.render("success");
  } else {
    res.redirect("/login");
  }
});

app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


// get values from the register page
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password
  User.find({ email: email }, function (err, docs) {
    if (docs.length === 0) {
      User.register(
        {
          username: email,
        },
        password,
        function (err, user) {
          if (err) {
            console.log(err);
          } else {
            req.login(user, (err) => {
              if (err) {
                console.log(err);
              } else {
                passport.authenticate("local");
                req.session.save((error) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.render("login");
                  }
                });
              }
            });
          }
        }
      );
    } else {
      res.send("The accout already exists!");
    }
  });
});
// get inputs from login page
app.post("/login", (req, res) => {
  const email = req.body.email;
  User.findOne({ username: email }, function (err, u) {
    if (err) {
      console.log(err);
    } else {
      if (u) {
        u.authenticate(req.body.password, (err, model, info) => {
          if (info) {
            res.send("Wrong email or password!");
          }
          if (err) {
            console.log(err);
          } else if (model) {
            req.login(u, (err) => {
              if (err) {
                console.log(err);
              } else {
                passport.authenticate("local");
                req.session.save((error) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.render("success");
                  }
                });
              }
            });
          }
        });
      } else {
        res.send("Wrong email or password!");
      }
    }
  });
});

app.listen(3000, function(req, res){
  console.log("Server started on port 3000");
});
