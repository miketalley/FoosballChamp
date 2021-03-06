function FoosballChampViewModel(){
	var self = this,
		fbPlayers = 'https://blistering-fire-3558.firebaseio.com/players',
		fbGames = 'https://blistering-fire-3558.firebaseio.com/games';

	// #####  Observable constants  #####
	self.states = ko.observableArray(["AK","AL","AR","AS","AZ","CA","CO","CT","DC","DE","FL","GA",
		"GU","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MH","MI","MN","MO","MS","MT",
		"NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","PR","PW","RI","SC","SD","TN",
		"TX","UT","VA","VI","VT","WA","WI","WV","WY"]);
	self.scorePossibilities = ko.observableArray([0,1,2,3,4,5,6,7,8,9,10]);
	self.numPlayerOptions = ko.observableArray([2, 4, 8]);

	// #####  Player variables  #####
	self.players = ko.observableArray();
	self.playersData = ko.observable();

	self.games = ko.observableArray();
	self.gamesData = ko.observable();

	self.alphabeticalPlayers = ko.observableArray();
	self.rankedPlayers = ko.observableArray();
	self.playerNickName = ko.observable().extend({ required: "Please Enter Player's Nickname."});
	self.playerFirstName = ko.observable().extend({ required: "Please Enter Player's First Name."});
	self.playerLastName = ko.observable().extend({ required: "Please Enter Player's Last Name."});
	self.playerCity = ko.observable().extend({ required: "Please Enter Player's City."});
	self.playerState = ko.observable().extend({ required: "Please Select Player's State."});
	self.playerEmail = ko.observable();

	// #####  Game variables  #####
	self.numPlayers = ko.observable();
	self.teamA = ko.observableArray();
	self.teamB = ko.observableArray();
	self.teamAScore = ko.observable().extend({ required: "Please Enter Team A Score."});
	self.teamBScore = ko.observable().extend({ required: "Please Enter Team B Score."});
	self.gameDate = ko.observable();
	self.gameLocation = ko.observable();
	
	// This will adjust the array length to coordinate with view
	self.numPlayers.subscribe(function(updatedValue){
		// If selecting higher number of players than previously
		// selected, push blank placeholders for those player slots
		if(self.teamA && (self.teamA().length < (updatedValue / 2))){
			for(var i = self.teamA().length; i < updatedValue / 2; i++){
				self.teamA.push(" ");
				self.teamB.push(" ");
			}
		}
		// If selecting lower number of players than previously
		// selected, pop the extra player slots off the end
		else if(self.teamA() && (self.teamA().length > (updatedValue / 2))){
			for(var i = self.teamA().length; i > updatedValue / 2; i--){
				self.teamA.pop();
				self.teamB.pop();
			}
		}
	});

	// ####  Navigation variables  ####
	self.currentTemplate = ko.observable('home');

	// Initialize application data
	setupFirebase();

	// Used to control navigation around application
	self.changeTemplate = function(newTemplate){
		self.currentTemplate(newTemplate);
	};

	// Create a new player object with player input values
	self.addNewPlayer = function(){
		if(self.playerNickName()){
			var newPlayer = {
				nickName: self.playerNickName(),
				firstName: self.playerFirstName() || "",
				lastName: self.playerLastName() || "",
				city: self.playerCity() || "",
				state: self.playerState() || "",
				email: self.playerEmail() || "",
				wins: 0,
				losses: 0
			};

			var fbPlayersLocation = new Firebase(fbPlayers);
			fbPlayersLocation.push(newPlayer, updatePlayersData);
			self.playerNickName(null);
			self.playerFirstName(null);
			self.playerLastName(null);
			self.playerCity(null);
			self.playerState(null);
			self.playerEmail(null);
			statusMessage("Player Saved!");
		}
		else{
			statusMessage("Please enter a Nickname!");
		}
	};

	// Create new game object with teams, scores, date, and location
	self.addNewGame = function(){
		var d = new Date();
		// YYYY-MM-DD Format
		var formattedDateNow = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();

		var newGame = {
			teamA: {
				players: self.teamA(),
				score: self.teamAScore()
			},
			teamB: {
				players: self.teamB(),
				score: self.teamBScore()
			},
			date: self.gameDate() || formattedDateNow,
			location: self.gameLocation() || "Unknown"
		};

		// Add win if your team won and loss if your team lost
		if(self.teamAScore() > self.teamBScore()){
			addWin(newGame.teamA.players);
			addLoss(newGame.teamB.players);
			addGame(newGame);
		}
		else if(self.teamBScore() > self.teamAScore()){
			addWin(newGame.teamB.players);
			addLoss(newGame.teamA.players);
			addGame(newGame);
		}
		else{
			statusMessage('Game cannot end in a tie!');
		}
	};

	// Format Name -- "Nickname" - LastName, FirstName (City, State)
	self.formatName = function(viewModel, playerID){
		var player = self.playersData()[playerID];

		return "'" + player.nickName + "'" + " - " + player.lastName + ", " + player.firstName + " (" + player.city + ", " + player.state + ")";
	};

	// Add a new game to Firebase and clear inputs
	function addGame(game){
		var fbGamesLocation = new Firebase(fbGames);
		
		fbGamesLocation.push(game, updateGamesData);

		self.teamAScore(null);
		self.teamBScore(null);
		self.numPlayers(null);
		statusMessage("Game Saved!");
	}

	// Add a win to each player in the passed array
	// Congrats!
	function addWin(playersArray){
		$.each(playersArray, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playersData()[playerID];
				updatedPlayerObject.wins += 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	}

	// Add a loss to each player in the passed array
	// Sorry guys!
	function addLoss(playersArray){
		$.each(playersArray, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playersData()[playerID];
				updatedPlayerObject.losses += 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	}

	// Updates a player on firebase using the playerID and setting
	// the value equal to the passed player parameter
	// Calls updatePlayersData once Firebase update is complete
	function updatePlayer(playerID, player){
		var playerToUpdate = new Firebase(fbPlayers + '/' + playerID);

		playerToUpdate.update(player, updatePlayersData);
	}

	// Calculates the rank of each player and sorts them by rank
	// descending in rankedPlayers
	function rankPlayers(){
		var allPlayers = [];
		
		$.each(self.players(), function(i, player){
			allPlayers.push(self.playersData()[player]);
		});

		if(allPlayers.length > 1){
			self.rankedPlayers(allPlayers.sort(function(playera, playerb){
				return rankingScore(playera) === rankingScore(playerb) ? 0 : (rankingScore(playera) < rankingScore(playerb) ? 1 : -1);

				// 1 point for each game played, 2 additional points for a win
				function rankingScore(player){
					return (player.wins * 2) + (player.wins + player.losses);
				};
			}));
		}
		else if(allPlayers.length === 1){
			self.rankedPlayers(allPlayers);
		}
	}

	// Sort the self.players() array by the last name, and then first name of each player
	function alphabetizePlayers(){
		var alphabeticalListOfPlayers = self.players.sort(function(playera, playerb){
			playera = self.playersData()[playera];
			playerb = self.playersData()[playerb];

			return playera.lastName == playerb.lastName ? (playera.firstName == playerb.firstName ? 0 : (playera.firstName < playerb.firstName ? -1 : 1)) : (playera.lastName < playerb.lastName ? -1 : 1);
		});

		self.alphabeticalPlayers(alphabeticalListOfPlayers);
	}

	// Sends a status message to the #status-message element for 1.5 seconds
	function statusMessage(text){
		$("#status-message").text(text);
		setTimeout(function(){
			$("#status-message").text("");
		}, 1500);
	}

	// Gets data from Firebase for games and players
	function setupFirebase(){
		updateGamesData();
		updatePlayersData();
	}

	// Sets self.gamesData to games object and sets self.games to array of keys in that object
	function updateGamesData(){
		var allGamesData = $.get(fbGames + '.json');

		allGamesData.done(function(response){
			if(response){
				self.gamesData(response);
				self.games(Object.keys(response));
			}
		});
	}

	// Sets self.playersData to players object and sets self.players to array of keys in that object
	function updatePlayersData(){
		var allPlayerData = $.get(fbPlayers + '.json');

		allPlayerData.done(function(response){
			if(response){
				self.playersData(response);
				self.players(Object.keys(response));
				alphabetizePlayers();
				rankPlayers();
			}
		});
	}
}

$(document).ready(function(){
	ko.applyBindings(new FoosballChampViewModel());
});
