// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyBo2y_xDrMzsF38FkPEINkoxE6KqyDtdWU",
  authDomain: "rps-auth.firebaseapp.com",
  databaseURL: "https://rps-auth.firebaseio.com",
  projectId: "rps-auth",
  storageBucket: "rps-auth.appspot.com",
  messagingSenderId: "309415135539",
  appId: "1:309415135539:web:a7a27d2b6e738fcd"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
//Set the persistance of auth to Session
//Users stay logged in until the tab / window is closed
firebase
  .auth()
  .setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .then(function() {
    //nothing to do here...
    console.log("Session status set");
  })
  .catch(function(err) {
    console.log("ERROR -" + err.code + ": " + err.message);
  });
//set a variable to reference the database
var database = firebase.database();
//on page load, determine the rank of all users
database.ref("/users").once("value", function(flash) {
  var userObject = flash.val();
  var keys = Object.keys(userObject);
  var standings = []; //an array of objects
  var nUsers = keys.length;
  var nOffset;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (parseInt(userObject[key].gamesPlayed) === 0) {
      //don't divide by zero
      continue;
    }
    var stand = parseInt(userObject[key].wins) / parseInt(userObject[key].gamesPlayed);
    var obj = {
      key,
      stand
    };
    standings.push(obj);
  }
  standings.sort(function(a, b) {
    return a.stand - b.stand;
  });
  nOffset = nUsers - standings.length;
  for (var i = 0; i < standings.length; i++) {
    var key = standings[i].key;
    var rank = nUsers - i - nOffset;
    database.ref("/users/" + key).set({
      rank
    }); //update the database
  }
  //clean up new players
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (parseInt(userObject[key].rank) === 0) {
      var rank = nUsers - nOffset;
      database.ref("/users/" + key).set({
        rank
      }); //update the database
    }
  }
});

//set a variable to hold the current user and their player number
//player (1 or 2) is dependent on if they create a game (1) or join a game (2)
var user;
var player;

//grab the necessary HTML components
var index = $("#index");
var signUpIn = $("#sign-up-in");
var toolbelt = $("#tool-belt");
var container = $("#container");
var playButton = $("#play");
var gameZone = $("#game-zone");
var main = $("#main");
var waitMessage = $("#wait-message");

//toggle the login sign in <-> sign up
$("#toggle-login").on("click", function() {
  var text = $("#submit").attr("value");
  if (text === "sign in") {
    //add a name element to the form at the start
    var nameLabel = $("<label>")
      .attr("for", "name")
      .attr("id", "name-label")
      .text("name");
    var nameInput = $("#name");
    nameInput.detach();

    $("#auth-form")
      .prepend(nameInput)
      .prepend(nameLabel);

    $("#title").text("sign up");
    $("#submit").attr("value", "sign up");
    $(this).text("sign in");
  } else {
    $("#name")
      .detach()
      .appendTo(toolbelt);
    $("#name-label").remove();
    $("#title").text("sign in");
    $("#submit").attr("value", "sign in");
    $(this).text("sign up");
  }
});

//handle the login / account generation
$("#submit").on("click", function(event) {
  event.preventDefault();
  //information that is always available:
  var state = $(this).attr("value");
  var email = $("#email")
    .val()
    .trim();
  var pword = $("#password")
    .val()
    .trim();

  var uname = $("#name")
    .val()
    .trim();

  if (state === "sign in") {
    //if the user is signing in
    signIn(email, pword);
  } else {
    if (user === undefined) {
      //sign them up for an account
      createUser(email, pword, uname);
    } else {
      //link their ananymous account to an email/password credential
      linkAnonymousUserToAccount(email, pword, uname);
    }
  }
  wipeInput();
});

//handle an anonymous login
$("#anonymous-login").on("click", function() {
  guestSignIn();
});

//sign-in dependent functions
function createUser(email, pword, uname) {
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, pword)
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    })
    .then(function() {
      //update the user profile
      user = firebase.auth().currentUser;
      user
        .updateProfile({
          displayName: uname
        })
        .then(function() {
          $("#user-name").text(user.displayName);
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
      //store initial statistics in unique directory
      database
        .ref("/users/" + user.uid)
        .set({
          wins: "0",
          losses: "0",
          rank: "0",
          gamesPlayed: "0"
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    });
}

function linkAnonymousUserToAccount(email, pword, uname) {
  var credential = firebase.auth.EmailAuthProvider.credential(email, pword);
  firebase
    .auth()
    .currentUser.linkAndRetrieveDataWithCredential(credential)
    .then(function(usercred) {
      user = usercred.user;
      //update the user profile
      user
        .updateProfile({
          displayName: uname
        })
        .then(function() {
          console.log("user profile updated successfully!");
          console.log(user.displayName);
          signUpIn.detach().appendTo(toolbelt);
          index.detach().appendTo(container);
          database.ref("/users/" + user.uid).once("value", function(flash) {
            displayUserData(flash);
          });
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    })
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    });
}

function signIn(email, pword) {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, pword)
    .then(function() {
      $("#user-name").text(user.displayName);
    })
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    });
}

function guestSignIn() {
  firebase
    .auth()
    .signInAnonymously()
    .then(function() {
      user = firebase.auth().currentUser;
      user
        .updateProfile({
          displayName: "guest-" + getHash(4)
        })
        .then(function() {
          $("#user-name").text(user.displayName);
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
      console.log(user);
      database
        .ref("/users/" + user.uid)
        .set({
          wins: "0",
          losses: "0",
          rank: "0",
          gamesPlayed: "0"
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    })
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    });
}

function wipeInput() {
  $("#email").val("");
  $("#password").val("");
  if ($("#submit").attr("value") === "sign up") {
    $("#name").val("");
  }
}

//track changes to user status
firebase.auth().onAuthStateChanged(function(usr) {
  if (usr) {
    //the user is signed in
    signUpIn.detach().appendTo(toolbelt);
    index.detach().appendTo(container);
    user = firebase.auth().currentUser;
    database.ref("/users/" + user.uid).on("value", function(flash) {
      displayUserData(flash);
    });
    if (user.isAnonymous) {
      $("#auth-link").text("sign up");
      if ($("#submit").val() === "sign in") {
        $("#toggle-login").trigger("click");
      }
    } else {
      $("#auth-link").text("sign out");
    }
  } else {
    user = undefined;
    signUpIn.detach().appendTo(container);
    index.detach().appendTo(toolbelt);
  }
});

//update the user data
function displayUserData(flash) {
  if (user.displayName === null) {
    setTimeout(function() {
      $("#user-name").text(user.displayName);
    }, 200);
  } else {
    $("#user-name").text(user.displayName);
  }
  $("#user-rank").text(flash.val().rank);
  $("#user-wins").text(flash.val().wins);
  $("#user-losses").text(flash.val().losses);
  $("#user-games-played").text(flash.val().gamesPlayed);
  if (player === 1) {
    $("#player-name").text(user.displayName);
  }
  if (player === 2) {
    $("#opponent-name").text(user.displayName);
  }
}

//handle logouts and signup/in for anonymous users
$("#auth-link").on("click", function() {
  var state = $(this).text();
  if (state === "sign out") {
    firebase
      .auth()
      .signOut()
      .then(function() {
        console.log("user signed out");
      });
  } else {
    signUpIn.detach().appendTo(container);
    index.detach().appendTo(toolbelt);
  }
});

//game logic -- to debug db connections or control flow, see auth.js
//global variables
var readyGames = [];
var gameDB;
var playing = false;

//when a player wants to play the game they click a button
//The server is checked for existing games that need a player
//If no games exist, a new game is created
playButton.on("click", function() {
  //if you joined a game and then foolishly refreshed the page...
  database.ref("/games").once("value", function(flash) {
    if (readyGames.length > 0) {
      var dbObject = flash.val();
      var keys = Object.keys(dbObject);
      //loop through all of the games, filtering by the isFull key
      for (var i = 0; i < keys.length; i++) {
        console.log(dbObject[keys[i]]);
        if (!dbObject[keys[i]].isFull && dbObject[keys[i]].player1 === user.displayName) {
          //check that your name is in the player1 key

          //if it is, lock yourself to that game with gameDB, update player = 1 and display the waiting message
          gameDB = database.ref("/games/" + keys[i]);
          console.log(gameDB);
          player = 1;
          playButton.detach().appendTo(toolbelt);
          waitMessage.detach().appendTo(main);
          return;
        }
        //if you are player 2 and you foolishly refreshed the page before inputting your choice
        if (!dbObject[keys[i]].isFinished && dbObject[keys[i]].player2 === user.displayName) {
          console.log("you started a game and then left without finishing");
          gameDB = database.ref("/games/" + keys[i]);
          console.log(gameDB);
          gameDB.update({
            isFull: false //update the db with a useless key to fire the on(value), which will handle the UI change
          });

          playing = false;
        }
      }
      //if your name doesn't appear in any games, proceed with the code below.
      //join the game as player 2 and update the database to show that the game is full
      player = 2;
      var yourGameKey = readyGames.shift();
      gameDB = database.ref("/games/" + yourGameKey);
      console.log(gameDB);
      gameDB.update({
        player2: user.displayName,
        isFull: true
      });
    } else {
      //if no open games exist, create one
      player = 1;
      var key = database.ref("/games/").push().key;
      database.ref("/games/" + key).update({
        player1: user.displayName,
        player2: "",
        isFull: false,
        isFinished: false
      });
      gameDB = database.ref("/games/" + key);
      console.log(gameDB);
      playButton.detach().appendTo(toolbelt);
      waitMessage.detach().appendTo(main);
    }
  });
});

//track changes to the games directory on the server
//this is how players are paired together and how games are initiated
database.ref("/games").on("value", function(child) {
  //for each child in /games, check to see if a game is waiting for another player
  //if it is, push the key for that game to readyGames, otherwise, do nothing...

  var obj = child.val();
  if (obj === null) return;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    if (!obj[keys[i]].isFull) {
      readyGames.push(keys[i]);
      database.ref("/games/" + keys[i]).on("value", function(flash) {
        if (playing) {
          if (flash.val().player1choice && flash.val().player2choice) {
            //update the screens for each player
            var rockSRC = "assets/images/rock.png";
            var paperSRC = "assets/images/paper.png";
            var scissorsSRC = "assets/images/scissors.png";
            var winColor = "#66ff66";
            var loseColor = "#ff6666";
            var tieColor = "#6666ff";
            var player1Div = $("#player-choice");
            var player2Div = $("#opponent-choice");
            var outcome = decide([flash.val().player1choice, flash.val().player2choice]);
            updateStats(outcome);
            if (player === 1) {
              var pick = flash.val().player2choice;
              console.log(pick);
              var img = $("<img>").attr("alt", pick);
              switch (pick) {
                case "rock":
                  img.attr("src", rockSRC);
                  break;
                case "paper":
                  img.attr("src", paperSRC);
                  break;
                case "scissors":
                  img.attr("src", scissorsSRC);
                  break;
              }
              $("#opponent-choice")
                .empty()
                .append(img);
            }
            if (player === 2) {
              var pick = flash.val().player1choice;
              console.log(pick);
              var img = $("<img>").attr("alt", pick);
              switch (pick) {
                case "rock":
                  img.attr("src", rockSRC);
                  break;
                case "paper":
                  img.attr("src", paperSRC);
                  break;
                case "scissors":
                  img.attr("src", scissorsSRC);
                  break;
              }
              $("#player-choice")
                .empty()
                .append(img);
            }

            //check for a tie
            if (outcome[0] && outcome[1]) {
              player1Div.css("background-color", tieColor);
              player2Div.css("background-color", tieColor);
            } else if (outcome[0]) {
              player1Div.css("background-color", winColor);
              player2Div.css("background-color", loseColor);
            } else {
              player1Div.css("background-color", loseColor);
              player2Div.css("background-color", winColor);
            }
          }

          return;
        }
        if (flash.val().player2.length > 0) {
          waitMessage.detach().appendTo(toolbelt);
          playButton.detach().appendTo(toolbelt);
          gameZone.detach().appendTo(main);
          //set each player's name
          $("#player-name").text(flash.val().player1);
          $("#opponent-name").text(flash.val().player2);
          playing = true;
        }
      });
    }
  }
});

//the player makes a choice (rock, paper, or scissors) by clicking the associated icon
//their choice is logged to the unique server game directory
$(".choice").on("click", function() {
  var choice = $(this).attr("id");
  var src = $(this).attr("src");
  if (player === 1) {
    gameDB.update({
      player1choice: choice
    });
    $("#player-choice")
      .empty()
      .append($('<img alt="' + choice + '" src="' + src + '" />'));
  } else {
    gameDB.update({
      player2choice: $(this).attr("id")
    });
    $("#opponent-choice")
      .empty()
      .append($('<img alt="' + choice + '" src="' + src + '" />'));
  }
});

//judge the game and return the outcome
function decide([p1, p2]) {
  var p1status = false;
  var p2status = false;
  //check for a tie
  if (p1 === p2) {
    return [true, true];
  }

  //rock beats scissors
  //paper beats rock
  //scissors beats paper

  if (p1 === "rock" && p2 === "scissors") {
    //p1 wins
    p1status = true;
  } else if (p1 === "paper" && p2 === "rock") {
    //p1 wins
    p1status = true;
  } else if (p1 === "scissors" && p2 === "paper") {
    //p1 wins
    p1status = true;
  } else {
    //p2 wins
    p2status = true;
  }
  return [p1status, p2status];
}

//after the game is played, update player statistics
function updateStats(outcome) {
  //outcome is an array of 2 boolean values
  if (outcome[0] && outcome[1]) {
    //this is a tie, so only update the games played for the player
    database.ref("/users/" + user.uid).once("value", function(flash) {
      var played = parseInt(flash.val().gamesPlayed);
      played++;
      database
        .ref("/users/" + user.uid)
        .update({
          gamesPlayed: played
        })
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    });
    resetGame();
    return;
  }
  //if there is no tie, then update user stats
  if (player === 1) {
    if (outcome[0]) {
      //you are player 1 and you won
      database.ref("/users/" + user.uid).once("value", function(flash) {
        var played = parseInt(flash.val().gamesPlayed);
        played++;
        var win = parseInt(flash.val().wins);
        win++;
        database
          .ref("/users/" + user.uid)
          .update({
            gamesPlayed: played,
            wins: win
          })
          .catch(function(err) {
            console.log("ERROR -" + err.code + ": " + err.message);
          });
      });
    } else {
      //you are player 1 and you lost
      database.ref("/users/" + user.uid).once("value", function(flash) {
        var played = parseInt(flash.val().gamesPlayed);
        played++;
        var loss = parseInt(flash.val().losses);
        loss++;
        database
          .ref("/users/" + user.uid)
          .update({
            gamesPlayed: played,
            losses: loss
          })
          .catch(function(err) {
            console.log("ERROR -" + err.code + ": " + err.message);
          });
      });
    }
  }
  if (player === 2) {
    if (outcome[1]) {
      //you are player 2 and you won
      database.ref("/users/" + user.uid).once("value", function(flash) {
        var played = parseInt(flash.val().gamesPlayed);
        played++;
        var win = parseInt(flash.val().wins);
        win++;
        database
          .ref("/users/" + user.uid)
          .update({
            gamesPlayed: played,
            wins: win
          })
          .catch(function(err) {
            console.log("ERROR -" + err.code + ": " + err.message);
          });
      });
    } else {
      //you are player 2 and you lost
      database.ref("/users/" + user.uid).once("value", function(flash) {
        var played = parseInt(flash.val().gamesPlayed);
        played++;
        var loss = parseInt(flash.val().losses);
        loss++;
        database
          .ref("/users/" + user.uid)
          .update({
            gamesPlayed: played,
            losses: loss
          })
          .catch(function(err) {
            console.log("ERROR -" + err.code + ": " + err.message);
          });
      });
    }
  }
  resetGame();
  //read the database again and update your stats on the screen
}

//a brief routine that generates a pseudo-random alpha-numeric-mixed-case string of length n
function getHash(n) {
  var base = "abcdefghijklmnop1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr.push(base[Math.floor(Math.random() * base.length)]);
  }
  arr.filter(function(a, b) {
    return 0.5 - Math.random();
  });
  var hash = "";
  while (arr.length > 0) {
    hash = hash + arr.shift();
  }
  return hash;
}

function resetGame() {
  gameDB
    .update({
      isFinished: true
    })
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    });
  setTimeout(function() {
    location.reload();
  }, 3000);
}
//TODO
// link anonymous accounts with new accounts if the user decides to sign up
// reset the game zone to "play" after a match
