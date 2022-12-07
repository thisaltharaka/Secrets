require('dotenv').config();
//console.log(process.env) // remove this after you've confirmed it working
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
var findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public")); //use public library to store public files such as styles sheets

//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
//mongoose
const mongoose = require('mongoose');
//MongoDB Atlas
// mongoose.connect('mongodb+srv://admin-thisal:Ch%40nG31T@cluster0.rtoqjvk.mongodb.net/wikiDB', {
//   useNewUrlParser: true
// });

//MongoDB local
mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true
});

//mongoose-encryption
//var encrypt = require('mongoose-encryption');
//var secret = process.env.SECRET;

const {
  Schema
} = mongoose;

const userSchema = new mongoose.Schema({
  username: {
    type: String
    //required: [true, "Username Field is Empty !"] //validation
  },
  password: {
    type: String
    //required: [true, "Password Field is Empty !"] //validation
  },
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//mongoose encryption
//userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//passport serialization and de-serialization
passport.serializeUser(function(user, done) {
    done(null, user._id);
    // if you use Model.id as your idAttribute maybe you'd want
    // done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Google Authentication
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// app.get("/", function(req, res) {
// // const newBlogPost = new article({
// //   title: "REST 2",
// //   content:"Something, something "
// // });
// // newBlogPost.save();
// });

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google",
passport.authenticate("google",{scope:["profile"]})
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {

const user = new User({
  username: req.body.username,
  password: req.body.password
});
req.login(user,(err)=>{
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req,res,()=>{
      res.redirect("/secrets");
    });
  }
});
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets",(req,res)=>{
  User.find({"secret":{$ne: null}}, (err,foundUsers)=>{
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", (req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", (req,res)=>{
  const submittedSecret = req.body.secret;
  console.log(req.user._id);
  User.findById(req.user._id, (err,foundUser)=>{
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
          res.redirect("/secrets");
        })
      }
    }
  });
})

app.get('/logout', (req, res, next)=> {
  req.logout((err)=> {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", (req, res) => {

  User.register({username:req.body.username}, req.body.password, (err,user)=>{
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets");
      });
    }
  });

});



app.listen(3000, function() {
  console.log("Server started on port 3000");
});
