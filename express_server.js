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
  "b2xVn2": {longURL: "http://www.lighthouselabs.ca", userID: "shark"},
  "9sm5xK": {longURL: "http://www.google.com", userID: "penguin"},
};

//store user as key object
const userDatabase = {
  "shark": {
    id: "shark", 
    email: "shark@ocean.com", 
    password: "fish123"
  },
 "penguin": {
    id: "penguin", 
    email: "penguin@ocean.com", 
    password: "swim123"
  },
};



//GET requests/////////////////////////////////////////////////////////////////////

app.get("/", (req, res) => {

  const user = currentUser(req.session.userId, userDatabase);

  if (!user) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


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


//new url added to be shown with all urls
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

// redirect to longURL
app.get("/u/:shortURL", (req, res) => {

  let shortURL = req.params.shortURL;
  if (verifyShortUrl(shortURL, urlDatabase)) {
    const longURL = urlDatabase[shortURL].longURL;
    res.redirect(longURL);
  } else {
    res.status(404).send('Does not exist');
  }
});

//delete URL (for post requests on server side)
//Post route: removes an URL resource
app.post('/urls/:shortURL/delete', (req, res) => {

  if (!checkOwner(currentUser(req.session.user_id, userDatabase), req.params.shortURL, urlDatabase)) {
    res.send('This id does not match yours. Please check id and try again.')
  }
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

//EDIT: allows us to edit existing shortened URLs in app
app.post("/urls/:shortURL/edit", (req, res) => {
  if (!checkOwner(currentUser(req.session.user_id, userDatabase), req.params.shortURL, urlDatabase)) {
    res.send('This id does not match yours. Please check id and try again.')
  }
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  res.redirect('/urls');
});
  




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
  

//LOGIN - helper func verify email & password match database
app.post("/login", (req, res) => {

  const emailUsed = req.body['email-address'];
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

// endpoint to logout
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});




//LISTEN///////////////////////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});







