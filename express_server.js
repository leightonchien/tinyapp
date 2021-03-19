//GLOBAL CONSTANTS////////////////////////////////////////////////////////////////

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080; // Environment variable PORT (use when we want to keep something secret eg pwd/keys etc) || default port 8080
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const morgan = require('morgan');
const bcrypt = require('bcrypt');

//Bring in Helper functions from separate file
const {verifyShortUrl, randomString, checkIfAvail, addUser, getUserByEmail, currentUser, urlsForUser, checkOwner} = require('./helperFunctions');



//MIDDLEWARE////////////////////////////////////////////////////////////////////////

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs"); //set ejs as view engine
app.use(morgan('dev')); //Helper that identify the clients who are accessing our application, logger that collects request logs (server)
app.use(cookieSession({
  name: 'session',
  keys: ['userId']
}));

//DATABASES/////////////////////////////////////////////////////////////////////////

//shortURL: 'longURL'
const urlDatabase = {
  "b2xVn2": {longURL: "http://www.lighthouselabs.ca", userID: "userID"},
  "9sm5xK": {longURL: "http://www.google.com", userID: "userID"},
};

//store user as key object
const userDatabase = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  },
};



//GET requests/////////////////////////////////////////////////////////////////////

//Redirect from / to urls page if logged in; otherwise redirect to login page if user not logged in
app.get("/", (req, res) => {

  const user = currentUser(req.session.userId, userDatabase);

  if (!user) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

// Render the urls_index HTML for the urls page if user is logged in; provide error page to login or register pages if not logged in
//add /urls to send data to urls_index.ejs, all urls displayed on main page
app.get("/urls", (req, res) => {

  const user = currentUser(req.session.userId, userDatabase);

  if (!user) {
    res.render("urls_errors");
    } else {
      const usersLinks = urlsForUser(user, urlDatabase);
      let templateVars = { urls: usersLinks, currentUser: currentUser(req.session.userId, userDatabase)};
      res.render("urls_index", templateVars);
    }
});

//If logged in: render urls_new HTML; if not logged in: redirect to login page
//new url is created
app.get("/urls/new", (req, res) => { 
  
  const user = currentUser(req.session.userId, userDatabase);

  if (!user) {
    res.redirect('/login');
  } else {
    let templateVars = { currentUser: user };
    res.render("urls_new", templateVars);
  }
});


//If logged in: render urls_show HTML; If not logged in: This id does not match yours. Please check id and try again.
//tell browser to go to new page aka (redirect)
app.get("/urls/:shortURL", (req, res) => {

  const shortURL = req.params.shortURL;
  const user = currentUser(req.session.userId, userDatabase);

  if (verifyShortUrl(shortURL, urlDatabase)) {

    if (user !== urlDatabase[shortURL].userID) {
      res.send('This id does not match yours. Please check id and try again.');
  } else {
    
    const longURL = urlDatabase[shortURL].longURL;
    let templateVars = { shortURL: shortURL, longURL: longURL, currentUser: user};
    res.render("urls_show", templateVars);
  }
} else {
  res.send('This url does not exist');
  }  
  });

  
//Redirect to longURL associated with a short URL
app.get("/u/:shortURL", (req, res) => {

  let shortURL = req.params.shortURL;
  if (verifyShortUrl(shortURL, urlDatabase)) {
    const longURL = urlDatabase[shortURL].longURL;
    res.redirect(longURL);
  } else {
    res.status(404).send('Does not exist');
  }
});

//User registration form 
app.get("/register", (req, res) => {
  const user = currentUser(req.session.userId, userDatabase);
  if (user) {
    res.redirect('/urls');
  } else {
    let templateVars = { currentUser: user };
    res.render("urls_register", templateVars);
  }
});

//Redirect from login to url if user is logged in, render urls_login page if user not logged in.
app.get("/login", (req, res) => {
  const user = currentUser(req.session.userId, userDatabase);
  if (user) {
    res.redirect("/urls");
  } else {
    let templateVars = { currentUser: user };
    res.render("login", templateVars);
  }
});



//POST requests//////////////////////////////////////////////////////////////////////


//Post a new short url to the /urls page and redirect to the /urls/:shortURL page
app.post("/urls", (req, res) => {

  const user = currentUser(req.session.userId, userDatabase);

  if (!user) {
    res.redirect("/login");
  } else {
    const shortURL = randomString();
    const newURL = req.body.longURL;
    urlDatabase[shortURL] = { longURL: newURL, userID: user };
    res.redirect(`/urls/${shortURL}`);
  }
});


//Delete URL 
//Delete url from /urls page if logged in; send error message if url doesn't match their ID.
app.post('/urls/:shortURL/delete', (req, res) => {

  if (!checkOwner(currentUser(req.session.userId, userDatabase), req.params.shortURL, urlDatabase)) {
    res.send('This id does not match yours. Please check id and try again.');
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  }
});

//EDIT: Edit a long url with respect to a short url if ID checks out; send error message if ID does not belong to currentUser.
app.post("/urls/:shortURL/edit", (req, res) => {

  if (!checkOwner(currentUser(req.session.userId, userDatabase), req.params.shortURL, urlDatabase)) {
    res.send('This id does not belong to you');
  } else {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect('/urls');
    }
});
  



//Generate random ID for new user, hash their password, both stored in userDatabase. 
//Then redirect to /urls after registration is complete
//Warn user if email/password field left empty or email is already taken.
app.post("/register", (req, res) => {

  const {email, password} = req.body;

  if (email === '') {
    res.status(400).send('Email is required');
  } else if (password === '') {
    res.status(400).send('Password is required');
  } else if (!checkIfAvail(email, userDatabase)) {
    res.status(400).send('This email is already registered');
  } else {
    
  const newUser = addUser(req.body, userDatabase)
  req.session.userId = newUser.id;
  res.redirect('/urls');
  }
});
  

//LOGIN - getUserByEmail func check inputted email is matched with an user ID & password matches the hashed password in database
app.post("/login", (req, res) => {

  const emailUsed = req.body['email'];
  const pwdUsed = req.body['password'];

  if (getUserByEmail(emailUsed, userDatabase)) {

    const { password, id } = getUserByEmail(emailUsed, userDatabase);

    if (!bcrypt.compareSync(pwdUsed, password)) {
      res.status(403).send('Error 403... re-enter your password')
    } else {
      req.session.userId = id;
      res.redirect('/urls');
    }
  } else {
    res.status(403).send('Error 403... email not found')
  }

});

// endpoint to logout: clear cookies and redirect to /urls
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});




//LISTEN///////////////////////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});







