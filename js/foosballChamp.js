function FoosballChampViewModel(){
	var self = this,
		fbPlayers = 'https://blistering-fire-3558.firebaseio.com/players',
		fbGames = 'https://blistering-fire-3558.firebaseio.com/games';

	// #####  Observable constants  #####
	self.states = ko.observableArray(["AK","AL","AR","AS","AZ","CA","CO","CT","DC","DE","FL","GA",
		"GU","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MH","MI","MN","MO","MS","MT",
		"NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","PR","PW","RI","SC","SD","TN",
		"TX","UT","VA","VI","VT","WA","WI","WV","WY"]);
	self.numPlayerOptions = ko.observableArray([2, 4, 8]);
	self.scorePossibilities = ko.observableArray([0,1,2,3,4,5,6,7,8,9,10]);

	// #####  Player variables  #####
	self.players = ko.observableArray();
	self.playersData = ko.observable();

	self.games = ko.observableArray();
	self.gamesData = ko.observable();

	self.alphabeticalPlayers = ko.observableArray();
	self.rankedPlayers = ko.observableArray();
	self.playerNickName = ko.observable();
	self.playerFirstName = ko.observable();
	self.playerLastName = ko.observable();
	self.playerCity = ko.observable();
	self.playerState = ko.observable();

	// #####  Game variables  #####
	self.numPlayers = ko.observable();

	self.playerA1 = ko.observable();
	self.playerA2 = ko.observable();
	self.playerA3 = ko.observable();
	self.playerA4 = ko.observable();
	self.playerB1 = ko.observable();
	self.playerB2 = ko.observable();
	self.playerB3 = ko.observable();
	self.playerB4 = ko.observable();

	self.teamA = ko.computed(function(){
		if(self.numPlayers() === 2){
			return [self.playerA1()];
		}
		else if(self.numPlayers() === 4){
			return [self.playerA1(), self.playerA2()];
		}
		else if(self.numPlayers() === 8){
			return [self.playerA1(), self.playerA2(), self.playerA3(), self.playerA4()];
		}
	});

	self.teamB = ko.computed(function(){
		if(self.numPlayers() === 2){
			return [self.playerB1()];
		}
		else if(self.numPlayers() === 4){
			return [self.playerB1(), self.playerB2()];
		}
		else if(self.numPlayers() === 8){
			return [self.playerB1(), self.playerB2(), self.playerB3(), self.playerB4()];
		}
	});

	self.teamAScore = ko.observable();
	self.teamBScore = ko.observable();
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
		statusMessage("Player Saved!");
	};

	self.addNewGame = function(){
		var newGame = {
			teamA: {
				players: self.teamA(),
				score: self.teamAScore()
			},
			teamB: {
				players: self.teamB(),
				score: self.teamBScore()
			}
			// ,
			// dateTime: self.gameDateTime(),
			// location: self.gameLocation()
		};

		// Add wins and losses to corresponding players
		if(self.teamAScore() > self.teamBScore()){
			addWin(self.teamA());
			addLoss(self.teamB());
			addGame(newGame);
		}
		else if(self.teamBScore() > self.teamAScore()){
			addWin(self.teamB());
			addLoss(self.teamA());
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

	function addWin(team){
		$.each(team, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playerData()[playerID]
				updatedPlayerObject.wins += 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	};

	function addLoss(team){
		$.each(team, function(i, playerID){
			if(playerID){
				var updatedPlayerObject = self.playerData()[playerID]
				updatedPlayerObject.wins -= 1;
				updatePlayer(playerID, updatedPlayerObject);
			}
		});
	};

	function updatePlayer(playerID, player){
		var playerToUpdate = new Firebase(fbPlayers + playerID);

		playerToUpdate.update(player, updatePlayersData);
	};

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
