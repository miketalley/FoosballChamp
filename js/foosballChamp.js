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

	// #####  Game variables  #####
	self.numPlayers = ko.observable();
	self.teamA = ko.observableArray();
	self.teamB = ko.observableArray();

	// This will adjust the array length to coordinate with view
	self.numPlayers.subscribe(function(updatedValue){
		if(self.teamA && (self.teamA().length < (updatedValue / 2))){
			for(var i = self.teamA().length; i < updatedValue / 2; i++){
				self.teamA.push(" ");
				self.teamB.push(" ");
			}
		}
		else if(self.teamA() && (self.teamA().length > (updatedValue / 2))){
			for(var i = self.teamA().length; i > updatedValue / 2; i--){
				self.teamA.pop();
				self.teamB.pop();
			}
		}
	});
	self.teamAScore = ko.observable().extend({ required: "Please Enter Team A Score."});
	self.teamBScore = ko.observable().extend({ required: "Please Enter Team B Score."});
	self.gameDate = ko.observable();
	self.gameLocation = ko.observable();

	self.currentTemplate = ko.observable('home');
	setupFirebase();

	self.changeTemplate = function(newTemplate){
		self.currentTemplate(newTemplate);
	};

	self.addNewPlayer = function(){
		var newPlayer = {
			nickName: self.playerNickName(),
			firstName: self.playerFirstName(),
			lastName: self.playerLastName(),
			city: self.playerCity(),
			state: self.playerState(),
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
		statusMessage("Player Saved!");
	};

	self.addNewGame = function(){
		var d = new Date();
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

		// Add wins and losses to corresponding players
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

	self.formatName = function(viewModel, playerID){
		var player = self.playersData()[playerID];

		return "'" + player.nickName + "'" + " - " + player.lastName + ", " + player.firstName + " (" + player.city + ", " + player.state + ")";
	}

	function addGame(game){
		var fbGamesLocation = new Firebase(fbGames);
		
		fbGamesLocation.push(game, updateGamesData);

		self.teamAScore(null);
		self.teamBScore(null);
		self.numPlayers(null);
		statusMessage("Game Saved!");
	};

	function addWin(playersArray){
		$.each(playersArray, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playersData()[playerID];
				updatedPlayerObject.wins += 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	};

	function addLoss(playersArray){
		$.each(playersArray, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playersData()[playerID];
				updatedPlayerObject.losses += 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	};

	function updatePlayer(playerID, player){
		var playerToUpdate = new Firebase(fbPlayers + '/' + playerID);

		playerToUpdate.update(player, updatePlayersData);
	};

	// Calculates the rank of each player
	// 1 point is awarded for each game played
	// 2 additional points are awarded for each game won
	function rankPlayers(){
		var allPlayers = [];
		
		$.each(self.players(), function(i, player){
			allPlayers.push(self.playersData()[player]);
		});

		if(allPlayers.length > 1){
			self.rankedPlayers(allPlayers.sort(function(playera, playerb){
				return rankingScore(playera) === rankingScore(playerb) ? 0 : (rankingScore(playera) < rankingScore(playerb) ? 1 : -1);

				function rankingScore(player){
					return (player.wins * 2) + (player.wins + player.losses);
				};
			}));
		}
		else if(allPlayers.length === 1){
			self.rankedPlayers(allPlayers);
		}
	};

	// Sort the self.players() array by the last name, and then first name of each player
	function alphabetizePlayers(){
		var alphabeticalListOfPlayers = self.players.sort(function(playera, playerb){
			playera = self.playersData()[playera];
			playerb = self.playersData()[playerb];

			return playera.lastName == playerb.lastName ? (playera.firstName == playerb.firstName ? 0 : (playera.firstName < playerb.firstName ? -1 : 1)) : (playera.lastName < playerb.lastName ? -1 : 1);
		});

		self.alphabeticalPlayers(alphabeticalListOfPlayers);
	};

	// Sends a status message to the screen for 1.5 seconds
	function statusMessage(text){
		$("#status-message").text(text);
		setTimeout(function(){
			$("#status-message").text("");
		}, 1500);
	};

	// Gets data from Firebase for games and players
	function setupFirebase(){
		updateGamesData();
		updatePlayersData();
	};

	// Sets self.gamesData to games object and sets self.games to array of keys in object
	function updateGamesData(){
		var allGamesData = $.get(fbGames + '.json');

		allGamesData.done(function(response){
			if(response){
				self.gamesData(response);
				self.games(Object.keys(response));
			}
		});
	};

	// Sets self.playersData to players object and sets self.players to array of keys in object
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
	};
}

$(document).ready(function(){
	ko.applyBindings(new FoosballChampViewModel());
});
