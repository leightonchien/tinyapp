const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookie = require('cookie-parser');
const morgan = require('morgan');

//MIDDLEWARE
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookie());
app.set("view engine", "ejs"); //set ejs as view engine

app.use(morgan('dev')); //Helper that identify the clients who are accessing our application, logger that collects request logs (server)

//shortURL: 'longURL'
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
  }
}

app.get("/", (req, res) => {
  res.send("Hello sunshine!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

//add /urls to send data to urls_index.ejs, all urls displayed on main page
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, user_id: req.cookies['user_id'] };
  res.render("urls_index", templateVars);
});

//new url is created
app.get("/urls/new", (req, res) => { 
  let templateVars = { user_id: req.cookies['user_id']}
  res.render("urls_new", templateVars);
});

//tell browser to go to new page aka (redirect)
app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  if (verifyShortUrl(shortURL)) {
    let longURL = urlDatabase[req.params.shortURL];
    let templateVars = { shortURL: shortURL, longURL: longURL, user_id: req.cookies['user_id']
  };
    res.render("urls_show", templateVars);
  } else {
    res.send('does not exist');
  }
});



//new url added to be shown with all urls
app.post("/urls", (req, res) => {

  const shortURL = generateShortURL();
  const newURL = req.body.longURL;
  urlDatabase[shortURL] = newURL;
  res.redirect(`/urls/${shortURL}`);
});

// redirect to longURL
app.get("/u/:shortURL", (req, res) => {

  const shortURL = req.params.shortURL;
  if (verifyShortUrl(shortURL)) {
    const longURL = urlDatabase[shortURL];
    res.redirect(longURL);
  } else {
    res.status(404);
    res.send('Does not exist');
  }
});

//delete URL (for post requests on server side)
//Post route: removes an URL resource
app.post('/urls/:shortURL/delete', (req, res) => {
  const urlToDelete = req.params.shortURL;
  delete urlDatabase[urlToDelete];
  res.redirect('/urls');
});

//EDIT: allows us to edit existing shortened URLs in app
app.post("/urls/:shortURL/edit", (req, res) => {
  const key = req.params.shortURL;
  urlDatabase[key] = req.body.longURL;
  res.redirect('/urls')
});
  
// endpoint to login
app.post("/login", (req, res) => {
  if (userDatabase[req.body.user_id]) {
    const user_id = req.body.user_id;
    res.cookie('user_id', user_id);
  }
  res.status(400).send('Oops! Something went wrong, please try again')
});

// endpoint to logout
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

//User registration form added/page added to register
app.get("/register", (req, res) => {
  templateVars = { user_id:req.cookies['user_id']}
  res.render("urls_register", templateVars);
  res.redirect('/urls');
})

//add user if available
const addUser = newUser => {
  const newUserId = generateShortURL();
  newUser.id = newUserId
  userDatabase[newUserId] = newUser;
  return newUser
}

//this is to check if emails are registered
const checkIfAvail = (newVal, database) => {
  for (user in database) {
    if (!user[newVal]) {
      return null;
    }
  }
  return true;
}

app.post("/register", (req, res) => {
  const {email, password} = req.body;
  if (email === '') {
    res.status(400).send('Email is required');
  } else if (password === '') {
    res.status(400).send('Password is required');
  } else if (!checkIfAvail(email, userDatabase)) {
    res.status(400), send('This email is already registered')
  }
  newUser = addUser(req.body)
  res.cookie('user_id', newUser.id)


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});





//Helper functions////////////////////////////////////////////////////////////////////

//Generate an "unique" shortURL, implement a function that returns a string of 6 random alphanumeric characters
const generateRandomString = () => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};


const generateShortURL = () => {
  let randomString = '';
  while (randomString.length < 6) {
    randomString += generateRandomString();
  }
  return randomString;
}; 

//this func will show if short url exists
const verifyShortUrl = URL => {
  return urlDatabase[URL];
}; 






////////////////////////////////////////////////////////////
//example code removed from main code
//a is not defined
////////////////////////////////////////////////////////////
//
// app.get("/set", (req, res) => {
//   const a = 1;
//   res.send(`a = ${a}`);
//  });
 
//  app.get("/fetch", (req, res) => {
//   res.send(`a = ${a}`);
//  });

// app.post('/urls', (req, res) => {
//   console.log(req.body);
//   res.send('Ok');
// });