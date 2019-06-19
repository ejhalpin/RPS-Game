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

firebase
  .auth()
  .setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .then(function() {
    //nothing to do here...
    console.log("Session status set");
  })
  .catch(function(error) {
    console.log(error.code);
    console.log(error.message);
  });

//set a variable to hold the current user
var user;
var player;
//set a variable to reference the database
var database = firebase.database();
//grab the login div and the main display div
var index = $("#index");
var signUpIn = $("#sign-up-in");
var toolbelt = $("#tool-belt");
var container = $("#container");
var playButton = $("#play");
var gameZone = $("#game-zone");
var main = $("#main");
var waitMessage = $("#wait-message");

//toggle the login from sign in -> sign up

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
  console.log(uname);

  if (state === "sign in") {
    //if the user is signing in
    signIn(email, pword);
  } else {
    //sign them up for an account
    createUser(email, pword, uname);
  }
  wipeInput();
});

function displayUserData(flash) {
  $("#user-name").text(user.displayName);
  $("#user-rank").text(flash.val().rank);
  $("#user-wins").text(flash.val().wins);
  $("#user-losses").text(flash.val().losses);
  $("#user-games-played").text(flash.val().gamesPlayed);
}

//track changes to logged in users
firebase.auth().onAuthStateChanged(function(usr) {
  if (usr) {
    //the user is signed in
    signUpIn.detach().appendTo(toolbelt);
    index.detach().appendTo(container);
    user = firebase.auth().currentUser;
    database.ref("/users/" + user.uid).on("value", function(flash) {
      displayUserData(flash);
    });
    $("#auth-link").text("sign out"); //check for anonymous user!
  } else {
    //no user
    console.log("no user");
    user = undefined;
    signUpIn.detach().appendTo(container);
    index.detach().appendTo(toolbelt);
  }
});

function createUser(email, pword, uname) {
  firebase
    .auth()
    .createUserWithEmailAndPassword(email, pword)
    .catch(function(error) {
      console.log(error.code);
      console.log(error.message);
    })
    .then(function() {
      //update the user profile
      user = firebase.auth().currentUser;
      user
        .updateProfile({
          displayName: uname
        })
        .then(function() {
          console.log("user profile updated successfully!");
          console.log(user.displayName);
        })
        .catch(function(error) {
          console.log(error.code);
          console.log(error.message);
        });
      //store initial statistics in unique directory
      database
        .ref("/users/" + user.uid)
        .set({
          status: "100",
          wins: "0",
          losses: "0",
          rank: "0",
          gamesPlayed: "0"
        })
        .catch(function(error) {
          console.log(error.code + ": " + error.message);
        });
    });
}

function wipeInput() {
  $("#email").val("");
  $("#password").val("");
  if ($("#submit").attr("value") === "sign up") {
    $("#name").val("");
  }
}

function signIn(email, pword) {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, pword)
    .catch(function(error) {
      console.log("huh");
      console.log(error.code);
      console.log(error.message);
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
        // .then(function() {
        //   console.log("user profile updated successfully!");
        //   console.log(user.displayName);
        // })
        .catch(function(error) {
          console.log(error.code);
          console.log(error.message);
        });
      console.log(user);
      database
        .ref("/users/" + user.uid)
        .set({
          status: "100",
          wins: "0",
          losses: "0",
          rank: "0",
          gamesPlayed: "0"
        })
        .catch(function(error) {
          console.log(error.code + ": " + error.message);
        });
    })
    .catch(function(error) {
      console.log("Error " + error.code + ": " + error.message);
    });
}

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

$("#anonymous-login").on("click", function() {
  guestSignIn();
});

//game logic -- to debug db connections or control flow, see auth.js

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

var readyGames = [];
var gameDB;
var playing = false;
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
          console.log(flash.val());
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
              $("#opponent-choice").append(img);
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
              $("#player-choice").append(img);
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
          console.log("ERROR " + err.code + ": " + err.message);
        });
    });
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
            console.log("ERROR " + err.code + ": " + err.message);
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
            console.log("ERROR " + err.code + ": " + err.message);
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
            console.log("ERROR " + err.code + ": " + err.message);
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
            console.log("ERROR " + err.code + ": " + err.message);
          });
      });
    }
  }

  //read the database again and update your stats on the screen
}

//how am I going to get data??
playButton.on("click", function() {
  if (readyGames.length > 0) {
    //join the game as player 2 and update the database to show that the game is full
    player = 2;
    var yourGameKey = readyGames.shift();
    gameDB = database.ref("/games/" + yourGameKey);
    gameDB.update({
      player2: user.displayName,
      isFull: true
    });

    return;
  }
  console.log("no game exists. creating a game...");
  console.log(user.displayName);
  //if no open games exist, create one
  player = 1;
  var key = database.ref("/games/").push().key;
  database.ref("/games/" + key).update({
    player1: user.displayName,
    player2: "",
    isFull: false
  });
  gameDB = database.ref("/games/" + key);
  playButton.detach().appendTo(toolbelt);
  waitMessage.detach().appendTo(main);
});

//how am I going to connect players??

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

$(".choice").on("click", function() {
  var choice = $(this).attr("id");
  var src = $(this).attr("src");
  if (player === 1) {
    gameDB.update({
      player1choice: choice
    });
    $("#player-choice").append($('<img alt="' + choice + '" src="' + src + '" />'));
  } else {
    gameDB.update({
      player2choice: $(this).attr("id")
    });
    $("#opponent-choice").append($('<img alt="' + choice + '" src="' + src + '" />'));
  }
});

console.log(parseInt(2));
