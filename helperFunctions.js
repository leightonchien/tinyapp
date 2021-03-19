//Helper functions////////////////////////////////////////////////////////////////////

const bcrypt = require('bcrypt');

//Generate an "unique" shortURL, implement a function that returns a string of 6 random alphanumeric characters
const generateRandomString = () => {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
  
//Generate short url  
const randomString = () => {
  let randomString = '';
  while (randomString.length < 6) {
    randomString += generateRandomString();
  }
  return randomString;
}; 
  
//this func will show if short url exists
const verifyShortUrl = (URL, database) => {
  return database[URL];
};

//helpfer function: to check if emails are registered
const checkIfAvail = (newVal, database) => {
    for (let user in database) {
      if (database[user].email === newVal) {
        return false;
      }
    }
    return true;
  };
  
  //helper function: add user if available
  const addUser = (newUser, database) => {
    const newUserId = randomString();
    newUser.id = newUserId;
    newUser.password = bcrypt.hashSync(newUser.password, 10);
    database[newUserId] = newUser;
    return newUser;
  }
  
  const getUserByEmail = (email, database) => {
    for (let key in database) {
      if (database[key].email === email) {
        return database[key];
      }
    }
    return undefined;
  };
  
  const currentUser = (cookie, database) => {
    for (let ids in database) {
      if (cookie === ids) {
        return database[ids].email;
      }
    }
  };
  
  //return url when userID = id of current user
  const urlsForUser = (id, database) => {

    let currentUserId = id;
    let usersURLs = {};

    for (let key in database) {
      if (database[key].userID === currentUserId) {
        usersURLs[key] = database[key];
      }
    }
    return usersURLs;
  };

  const checkOwner = (userId, urlID, database) => {
    return userId === database[urlID].userID;
  }
  
  module.exports = {verifyShortUrl, randomString, checkIfAvail, addUser, getUserByEmail, currentUser, urlsForUser, checkOwner};  